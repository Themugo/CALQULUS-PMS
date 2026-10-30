/**
 * _shared/notificationDedup.ts
 *
 * Claim / complete / release protocol for scheduled and bulk senders, backed
 * by public.claim_notification / complete_notification / release_notification
 * (migration 20260909000002). FAILS CLOSED: if the claim cannot be verified
 * (missing table or function, permission error, network error) the outcome is
 * "error" and the caller MUST NOT send.
 *
 * Delivery guarantee (honest version):
 *   - At most one *claimed* send per key per window while a lease is live.
 *   - A definite provider rejection releases the claim so a retry can send.
 *   - An ambiguous outcome (timeout / connection reset / unknown) is NOT
 *     released: the claim stays "in flight" until its lease expires, after
 *     which another run may re-send. That makes ambiguous failures
 *     at-least-once, never silently dropped and never raced immediately.
 *   - This is NOT exactly-once: if the provider accepts a message and the
 *     process dies before complete_notification runs, the lease expiry will
 *     allow one duplicate after LEASE_SECONDS.
 *
 * This module has no Deno- or Supabase-specific imports so it can be unit
 * tested under Node with an in-memory fake.
 */

export const DEFAULT_LEASE_SECONDS = 900;

export type ClaimOutcome =
  | { status: "claimed" }
  | { status: "duplicate_sent" }
  | { status: "duplicate_in_flight" }
  | { status: "error"; reason: string };

/** Minimal slice of the supabase-js client used here (service-role client in practice). */
export interface RpcClient {
  rpc(
    fn: string,
    args: Record<string, unknown>,
  ): PromiseLike<{ data: unknown; error: { code?: string; message?: string } | null }>;
}

export type SendOutcome =
  /** Provider accepted the message. */
  | "sent"
  /** Provider (or config) definitively refused / we never reached it; safe to retry. */
  | "rejected"
  /** Timeout / network failure after the request may have been sent; do not release. */
  | "unknown";

export interface DedupKeyParts {
  /** Notification type, e.g. "invoice-overdue-email". */
  type: string;
  /** Invoice / tenant / recipient identity the message is about. */
  subject: string;
  /** Time window bucket, e.g. an ISO date. Defaults to today (UTC). */
  window?: string;
}

const KEY_PART = /^[A-Za-z0-9._:@+-]{1,128}$/;

/** key = `<type>:<subject>:<window>`; parts are validated so keys cannot collide via delimiters. */
export function buildDedupKey(parts: DedupKeyParts, now: Date = new Date()): string {
  const window = parts.window ?? now.toISOString().slice(0, 10);
  for (const [name, v] of [["type", parts.type], ["subject", parts.subject], ["window", window]] as const) {
    if (!KEY_PART.test(v) || v.includes("::")) throw new Error(`Invalid dedup key ${name}`);
  }
  return `${parts.type}:${parts.subject}:${window}`;
}

function errorReason(error: { code?: string; message?: string } | null): string {
  // Never include the key or message content; only a coarse, loggable reason.
  const code = error?.code ?? "";
  if (code === "42P01" || code === "PGRST205" || code === "42883" || code === "PGRST202") return "dedup_unavailable";
  if (code === "42501") return "dedup_permission_denied";
  return "dedup_error";
}

export async function claimNotification(
  client: RpcClient,
  key: string,
  leaseSeconds: number = DEFAULT_LEASE_SECONDS,
): Promise<ClaimOutcome> {
  try {
    const { data, error } = await client.rpc("claim_notification", { p_key: key, p_lease_seconds: leaseSeconds });
    if (error) return { status: "error", reason: errorReason(error) };
    if (data === "claimed" || data === "reclaimed") return { status: "claimed" };
    if (data === "duplicate_sent") return { status: "duplicate_sent" };
    if (data === "duplicate_in_flight") return { status: "duplicate_in_flight" };
    return { status: "error", reason: "dedup_unexpected_response" };
  } catch {
    return { status: "error", reason: "dedup_network_error" };
  }
}

/** Mark the claim as sent. Failure here is reported but must not trigger a resend. */
export async function completeNotification(client: RpcClient, key: string): Promise<boolean> {
  try {
    const { error } = await client.rpc("complete_notification", { p_key: key });
    return !error;
  } catch {
    return false;
  }
}

/** Release an in-flight claim after a DEFINITE non-delivery so a retry may send. */
export async function releaseNotification(client: RpcClient, key: string): Promise<boolean> {
  try {
    const { error } = await client.rpc("release_notification", { p_key: key });
    return !error;
  } catch {
    return false;
  }
}

export type GuardedResult =
  | { ran: true; outcome: SendOutcome; completed: boolean }
  | { ran: false; skipped: "duplicate_sent" | "duplicate_in_flight" | "dedup_error"; reason?: string };

/**
 * Claim -> send -> complete/release. `send` must classify its own result and
 * must not throw for provider failures; a throw is treated as "unknown"
 * (claim kept until lease expiry).
 */
export async function sendOnce(
  client: RpcClient,
  key: string,
  send: () => Promise<SendOutcome>,
  leaseSeconds: number = DEFAULT_LEASE_SECONDS,
): Promise<GuardedResult> {
  const claim = await claimNotification(client, key, leaseSeconds);
  if (claim.status === "error") return { ran: false, skipped: "dedup_error", reason: claim.reason };
  if (claim.status !== "claimed") return { ran: false, skipped: claim.status };

  let outcome: SendOutcome;
  try {
    outcome = await send();
  } catch {
    outcome = "unknown";
  }

  let completed = false;
  if (outcome === "sent") completed = await completeNotification(client, key);
  else if (outcome === "rejected") completed = await releaseNotification(client, key);
  // "unknown": deliberately leave the claim in flight until the lease expires.
  return { ran: true, outcome, completed };
}

/** Back-compat key helper used by older call sites: type = function name, subject = invoice id. */
export function dedupKey(fn: string, invoiceId: string, date = new Date()): string {
  return buildDedupKey({ type: fn, subject: invoiceId }, date);
}

/**
 * Classify a thrown error from a send attempt. Provider-answered failures
 * (we received a response) are "rejected" and safe to retry; fetch/abort/
 * timeout failures happen after the request may have left, so they are
 * "unknown" (claim kept until lease expiry). An error may carry an explicit
 * `sendOutcome` which wins.
 */
export function outcomeFromError(error: unknown): SendOutcome {
  const explicit = (error as { sendOutcome?: SendOutcome } | null)?.sendOutcome;
  if (explicit === "sent" || explicit === "rejected" || explicit === "unknown") return explicit;
  const name = (error as { name?: string } | null)?.name ?? "";
  if (name === "AbortError" || name === "TimeoutError" || name === "TypeError") return "unknown";
  return "rejected";
}
