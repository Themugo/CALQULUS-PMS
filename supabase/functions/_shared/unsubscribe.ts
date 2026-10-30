/**
 * _shared/unsubscribe.ts — builds signed unsubscribe links for optional email.
 * Returns null (and warns) when UNSUBSCRIBE_SIGNING_SECRET is not configured;
 * callers then omit the link rather than sending an unsigned/guessable one.
 */
import { getEnv } from "./env.ts";
import { createUnsubscribeToken } from "./unsubscribeToken.ts";

export interface UnsubscribeLink {
  url: string;
  /** Extra headers enabling mail-client one-click unsubscribe (RFC 8058). */
  headers: Record<string, string>;
  /** Small HTML footer snippet (URL is attribute-safe: base64url token only). */
  footerHtml: string;
}

export async function buildUnsubscribeLink(address: string, scope = "reminders"): Promise<UnsubscribeLink | null> {
  const secret = getEnv("UNSUBSCRIBE_SIGNING_SECRET", "");
  const base = getEnv("SUPABASE_URL", "");
  if (!secret || !base) {
    console.warn("[unsubscribe] UNSUBSCRIBE_SIGNING_SECRET/SUPABASE_URL not set; unsubscribe link omitted");
    return null;
  }
  const token = await createUnsubscribeToken(secret, { channel: "email", address: address.trim().toLowerCase(), scope });
  const url = `${base.replace(/\/$/, "")}/functions/v1/unsubscribe?token=${token}`;
  return {
    url,
    headers: { "List-Unsubscribe": `<${url}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" },
    footerHtml: `<p style="font-size:12px;color:#6b7280;text-align:center;">Don't want these reminders? <a href="${url}">Unsubscribe</a>. Receipts, invoices and security messages are not affected.</p>`,
  };
}
