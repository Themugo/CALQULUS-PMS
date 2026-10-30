/**
 * _shared/emailConfig.ts
 *
 * Central, FAIL-CLOSED validation of the email sender and a classified Resend
 * sender. No Deno imports: configuration is passed in so it is unit-testable.
 *
 * There is intentionally no fallback sender. If RESEND_FROM_EMAIL is missing,
 * malformed, or points at a sandbox/placeholder domain, no customer-facing
 * email is sent (EmailConfigError). Domain verification itself can only be
 * confirmed by an operator in the Resend dashboard; it is NOT checked here.
 */

export type EmailConfigErrorCode =
  | "SENDER_NOT_CONFIGURED"
  | "SENDER_INVALID"
  | "SENDER_SANDBOX_NOT_ALLOWED"
  | "API_KEY_MISSING";

export class EmailConfigError extends Error {
  constructor(public readonly code: EmailConfigErrorCode, message: string) {
    super(message);
    this.name = "EmailConfigError";
  }
}

/** Domains that can never be a verified production sender. */
const BLOCKED_DOMAIN_SUFFIXES = [
  "resend.dev",
  "example.com", "example.org", "example.net",
  "test", "invalid", "localhost", "local", "placeholder",
];
const PLACEHOLDER_FRAGMENTS = ["your-domain", "yourdomain", "your_domain", "changeme", "placeholder"];

const ADDRESS = /^[A-Za-z0-9._%+-]{1,64}@([A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+)$/;

export function sanitizeDisplayName(name: unknown): string {
  let out = "";
  for (const ch of String(name ?? "")) {
    const c = ch.codePointAt(0)!;
    if (c < 0x20 || c === 0x7f || ch === "<" || ch === ">" || ch === '"') continue;
    out += ch;
  }
  return out.trim().slice(0, 80);
}

export interface ResolvedSender {
  /** `Display Name <address@domain>` ready for the Resend `from` field. */
  from: string;
  address: string;
  domain: string;
}

/**
 * @param configured raw RESEND_FROM_EMAIL ("Name <a@b.c>" or "a@b.c")
 * @param displayName optional per-message display name (sanitised)
 */
export function resolveSender(configured: string | undefined | null, displayName?: string): ResolvedSender {
  const raw = (configured ?? "").trim();
  if (!raw) {
    throw new EmailConfigError("SENDER_NOT_CONFIGURED", "RESEND_FROM_EMAIL is not configured; email is disabled.");
  }
  const lowered = raw.toLowerCase();
  if (PLACEHOLDER_FRAGMENTS.some((p) => lowered.includes(p))) {
    throw new EmailConfigError("SENDER_INVALID", "RESEND_FROM_EMAIL contains a placeholder value.");
  }

  const m = raw.match(/^\s*(?:"?([^"<]*?)"?\s*)?<([^<>]+)>\s*$/);
  const address = (m ? m[2] : raw).trim();
  const parsed = address.match(ADDRESS);
  if (!parsed) {
    throw new EmailConfigError("SENDER_INVALID", "RESEND_FROM_EMAIL is not a valid sender address.");
  }
  const domain = parsed[1].toLowerCase();
  if (BLOCKED_DOMAIN_SUFFIXES.some((d) => domain === d || domain.endsWith("." + d))) {
    throw new EmailConfigError(
      "SENDER_SANDBOX_NOT_ALLOWED",
      "RESEND_FROM_EMAIL uses a sandbox or placeholder domain; configure a verified sending domain.",
    );
  }

  const defaultName = m && m[1] ? sanitizeDisplayName(m[1]) : "";
  const name = sanitizeDisplayName(displayName) || defaultName || "CALQULUS";
  return { from: `${name} <${address}>`, address, domain };
}

export type EmailResult =
  | { ok: true; id?: string }
  | { ok: false; kind: "config"; code: EmailConfigErrorCode }
  /** Provider answered 4xx: bad request / unverified domain / invalid recipient. Not retryable as-is. */
  | { ok: false; kind: "rejected"; status: number; reason: string }
  /** 429 / 5xx / timeout / network: outcome may be unknown. */
  | { ok: false; kind: "transient"; status?: number; ambiguous: boolean };

export interface SendEmailInput {
  to: string[];
  subject: string;
  html: string;
  displayName?: string;
  attachments?: { filename: string; content: string }[];
  headers?: Record<string, string>;
  replyTo?: string;
}

export interface EmailEnv {
  RESEND_API_KEY?: string;
  RESEND_FROM_EMAIL?: string;
}

/** Strip anything that could carry a secret or message body from a provider error. */
function safeReason(body: unknown): string {
  const msg = typeof body === "object" && body && "message" in body ? String((body as { message: unknown }).message) : "";
  return msg.replace(/re_[A-Za-z0-9_]+/g, "[redacted]").slice(0, 160) || "rejected";
}

export async function sendEmailViaResend(
  env: EmailEnv,
  input: SendEmailInput,
  fetchImpl: typeof fetch = fetch,
  timeoutMs = 15000,
): Promise<EmailResult> {
  let sender: ResolvedSender;
  try {
    sender = resolveSender(env.RESEND_FROM_EMAIL, input.displayName);
  } catch (e) {
    if (e instanceof EmailConfigError) return { ok: false, kind: "config", code: e.code };
    throw e;
  }
  if (!env.RESEND_API_KEY || !env.RESEND_API_KEY.trim()) {
    return { ok: false, kind: "config", code: "API_KEY_MISSING" };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetchImpl("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${env.RESEND_API_KEY}` },
      body: JSON.stringify({
        from: sender.from,
        to: input.to,
        subject: input.subject,
        html: input.html,
        ...(input.attachments ? { attachments: input.attachments } : {}),
        ...(input.headers ? { headers: input.headers } : {}),
        ...(input.replyTo ? { reply_to: input.replyTo } : {}),
      }),
      signal: controller.signal,
    });
    let body: unknown = null;
    try { body = await res.json(); } catch { /* non-JSON body */ }
    if (res.ok) return { ok: true, id: (body as { id?: string } | null)?.id };
    if (res.status === 429 || res.status >= 500) return { ok: false, kind: "transient", status: res.status, ambiguous: res.status >= 500 };
    return { ok: false, kind: "rejected", status: res.status, reason: safeReason(body) };
  } catch {
    // Timeout or network failure: the provider may or may not have accepted it.
    return { ok: false, kind: "transient", ambiguous: true };
  } finally {
    clearTimeout(timer);
  }
}

/** Map an EmailResult to the dedup SendOutcome. */
export function emailOutcome(r: EmailResult): "sent" | "rejected" | "unknown" {
  if (r.ok) return "sent";
  if (r.kind === "config" || r.kind === "rejected") return "rejected";
  return r.kind === "transient" && r.ambiguous ? "unknown" : "rejected";
}
