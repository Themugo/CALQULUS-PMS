/**
 * _shared/commsPolicy.ts
 *
 * Pure decision logic for "may this message be sent right now?". No Deno or
 * Supabase imports; the caller supplies facts (opt-out lookup result, config).
 *
 * Categories
 *   security       Account/security messages (verification, password reset,
 *                  invitations the recipient is expecting, fraud alerts).
 *                  ALWAYS allowed: not suppressed by opt-outs or quiet hours.
 *   transactional  Receipts, payment confirmations, invoices, contract/legal
 *                  notices the recipient is a party to. Email is always
 *                  allowed. SMS/WhatsApp honour an explicit STOP. Quiet hours
 *                  do not apply (they respond to something the user did or to
 *                  a legal obligation).
 *   reminder       Payment reminders / overdue notices / digests. Honour
 *                  opt-outs on every channel and quiet hours on SMS/WhatsApp/
 *                  push (email is exempt from quiet hours).
 *   marketing      Optional promotional content. Requires recorded consent in
 *                  addition to the reminder rules. (No sender exists today.)
 *
 * Nothing here invents a business timezone or operating hours: quiet hours are
 * enforced only when COMMS_TIMEZONE + COMMS_QUIET_START + COMMS_QUIET_END are
 * all configured and valid. Otherwise quiet hours are DISABLED and the policy
 * reports `quietHoursConfigured: false` so the gap is visible.
 */

export type Channel = "email" | "sms" | "whatsapp" | "push";
export type Category = "security" | "transactional" | "reminder" | "marketing";

export interface QuietHoursConfig {
  timezone: string;
  /** minutes since local midnight */
  startMinutes: number;
  endMinutes: number;
}

export type PolicyReason =
  | "ok"
  | "opted_out"
  | "no_marketing_consent"
  | "quiet_hours"
  | "opt_out_lookup_failed";

export interface PolicyDecision {
  allow: boolean;
  reason: PolicyReason;
  /** For quiet hours: the next instant sending is allowed (UTC). */
  retryAfter?: Date;
}

export interface PolicyInput {
  channel: Channel;
  category: Category;
  /** true = the address has an active opt-out for this channel. */
  optedOut: boolean;
  /** true if the opt-out lookup itself failed (fail closed for non-security). */
  lookupFailed?: boolean;
  marketingConsent?: boolean;
  now?: Date;
  quietHours?: QuietHoursConfig | null;
}

/** Parse "HH:MM" -> minutes, or null if invalid. */
export function parseClock(value: string | undefined | null): number | null {
  const m = String(value ?? "").trim().match(/^([01]?\d|2[0-3]):([0-5]\d)$/);
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
}

export function isValidTimezone(tz: string | undefined | null): boolean {
  if (!tz) return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/** Returns null (disabled) unless all three settings are present and valid. */
export function parseQuietHours(env: {
  COMMS_TIMEZONE?: string; COMMS_QUIET_START?: string; COMMS_QUIET_END?: string;
}): QuietHoursConfig | null {
  const start = parseClock(env.COMMS_QUIET_START);
  const end = parseClock(env.COMMS_QUIET_END);
  if (start === null || end === null || start === end) return null;
  if (!isValidTimezone(env.COMMS_TIMEZONE)) return null;
  return { timezone: env.COMMS_TIMEZONE!, startMinutes: start, endMinutes: end };
}

function localMinutes(now: Date, timezone: string): number {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: timezone, hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(now);
  const h = Number(parts.find((p) => p.type === "hour")?.value ?? "0");
  const m = Number(parts.find((p) => p.type === "minute")?.value ?? "0");
  return h * 60 + m;
}

/** True if the local time falls in [start, end) (window may wrap past midnight). */
export function inQuietHours(now: Date, q: QuietHoursConfig): boolean {
  const t = localMinutes(now, q.timezone);
  return q.startMinutes < q.endMinutes
    ? t >= q.startMinutes && t < q.endMinutes
    : t >= q.startMinutes || t < q.endMinutes;
}

/** Next UTC instant (minute resolution) at which quiet hours have ended. */
export function nextAllowedTime(now: Date, q: QuietHoursConfig): Date {
  let t = new Date(Math.floor(now.getTime() / 60000) * 60000);
  for (let i = 0; i < 24 * 60 + 1; i++) {
    if (!inQuietHours(t, q)) return t;
    t = new Date(t.getTime() + 60000);
  }
  return t;
}

export function evaluateSendPolicy(input: PolicyInput): PolicyDecision {
  const { channel, category } = input;
  if (category === "security") return { allow: true, reason: "ok" };

  // Opt-out handling. Transactional email is essential service mail.
  const optOutApplies = !(category === "transactional" && channel === "email");
  if (optOutApplies) {
    if (input.lookupFailed) return { allow: false, reason: "opt_out_lookup_failed" };
    if (input.optedOut) return { allow: false, reason: "opted_out" };
  }

  if (category === "marketing" && input.marketingConsent !== true) {
    return { allow: false, reason: "no_marketing_consent" };
  }

  const quietApplies =
    (category === "reminder" || category === "marketing") && channel !== "email";
  if (quietApplies && input.quietHours) {
    const now = input.now ?? new Date();
    if (inQuietHours(now, input.quietHours)) {
      return { allow: false, reason: "quiet_hours", retryAfter: nextAllowedTime(now, input.quietHours) };
    }
  }
  return { allow: true, reason: "ok" };
}

// ── Inbound opt-out keywords (SMS / WhatsApp) ────────────────────────────

const STOP_WORDS = new Set(["STOP", "STOPALL", "UNSUBSCRIBE", "CANCEL", "END", "QUIT"]);
const START_WORDS = new Set(["START", "UNSTOP", "YES"]);

export type InboundCommand = "stop" | "start" | "none";

/** Interpret an inbound SMS body per common carrier keyword rules (whole message, case-insensitive). */
export function parseInboundKeyword(body: unknown): InboundCommand {
  const word = String(body ?? "").trim().toUpperCase().replace(/[.!]+$/g, "");
  if (STOP_WORDS.has(word)) return "stop";
  if (START_WORDS.has(word)) return "start";
  return "none";
}

/** Normalise an address for opt-out storage: lowercased email, or E.164-ish digits with leading +. */
export function normaliseAddress(channel: Channel, value: unknown): string | null {
  const v = String(value ?? "").trim();
  if (channel === "email") {
    const e = v.toLowerCase();
    return /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(e) && e.length <= 254 ? e : null;
  }
  const compact = v.replace(/[\s\-().]/g, "");
  if (/^\+[1-9]\d{7,14}$/.test(compact)) return compact;
  return null;
}
