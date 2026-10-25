/**
 * _shared/email.ts
 *
 * Single source of truth for the "From" address of platform emails.
 *
 * Set RESEND_FROM_EMAIL (e.g. "CALQULUS <notifications@yourdomain.com>") once a
 * sending domain is verified with Resend. If it is unset we fall back to
 * Resend's sandbox address, which only delivers to the Resend account owner,
 * so a warning is logged.
 */
import { getEnv } from "./env.ts";

const SANDBOX_ADDRESS = "onboarding@resend.dev";

/** Strip characters that could break or spoof the From header. */
export function sanitizeDisplayName(name: unknown): string {
  return String(name ?? "")
    // eslint-disable-next-line no-control-regex -- intentionally strips control characters
    .replace(/[<>"\r\n\u0000-\u001f]/g, "")
    .trim()
    .slice(0, 80);
}

export function getFromAddress(displayName?: string): string {
  const configured = getEnv("RESEND_FROM_EMAIL", "").trim();
  let address = configured;
  let defaultName = "CALQULUS";

  if (!address) {
    console.warn(
      "[email] RESEND_FROM_EMAIL is not set; falling back to the Resend sandbox sender. Emails will only reach the Resend account owner.",
    );
    address = SANDBOX_ADDRESS;
  }

  // Configured value may be "Name <addr>" or a bare address.
  const m = address.match(/^\s*(?:"?([^"<]*?)"?\s*)?<([^>]+)>\s*$/);
  const bare = (m ? m[2] : address).trim();
  if (m && m[1]) defaultName = sanitizeDisplayName(m[1]) || defaultName;

  const name = sanitizeDisplayName(displayName) || defaultName;
  return `${name} <${bare}>`;
}
