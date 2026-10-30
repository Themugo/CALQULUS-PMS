/**
 * _shared/email.ts — Deno-side adapter over emailConfig.ts.
 *
 * `getFromAddress()` THROWS EmailConfigError when RESEND_FROM_EMAIL is missing,
 * malformed or a sandbox/placeholder sender. There is no fallback sender.
 * Callers either let the error surface as a failed send or use sendEmail().
 */
import { getEnv } from "./env.ts";
import {
  EmailConfigError, resolveSender, sendEmailViaResend, sanitizeDisplayName,
  type EmailResult, type SendEmailInput,
} from "./emailConfig.ts";

export { EmailConfigError, sanitizeDisplayName };
export type { EmailResult, SendEmailInput };

export function getFromAddress(displayName?: string): string {
  return resolveSender(getEnv("RESEND_FROM_EMAIL", ""), displayName).from;
}

/** Classified send; never throws for provider/config problems. */
export function sendEmail(input: SendEmailInput): Promise<EmailResult> {
  return sendEmailViaResend(
    { RESEND_API_KEY: getEnv("RESEND_API_KEY", ""), RESEND_FROM_EMAIL: getEnv("RESEND_FROM_EMAIL", "") },
    input,
  );
}
