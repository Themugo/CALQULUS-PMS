/**
 * _shared/unsubscribeToken.ts
 *
 * Stateless signed unsubscribe tokens (HMAC-SHA256, WebCrypto; works in Deno
 * and Node). A token binds ONE address + channel + purpose to an issue time
 * and expires, so a token for one recipient cannot change another's
 * preferences. The signing secret is supplied by the caller
 * (UNSUBSCRIBE_SIGNING_SECRET); it is never stored in source.
 */

const enc = new TextEncoder();

function b64url(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}
function fromB64url(s: string): Uint8Array {
  const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4));
  const bin = atob(s.replace(/-/g, "+").replace(/_/g, "/") + pad);
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

async function hmac(secret: string, data: string): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return new Uint8Array(await crypto.subtle.sign("HMAC", key, enc.encode(data)));
}

function constantTimeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

export interface UnsubscribePayload {
  channel: "email" | "sms" | "whatsapp";
  address: string;
  /** What is being unsubscribed from, e.g. "reminders". */
  scope: string;
}

export const DEFAULT_TTL_SECONDS = 60 * 60 * 24 * 365; // one year; links in old mail should keep working

export async function createUnsubscribeToken(
  secret: string,
  p: UnsubscribePayload,
  nowSeconds: number = Math.floor(Date.now() / 1000),
): Promise<string> {
  if (!secret || secret.length < 16) throw new Error("UNSUBSCRIBE_SIGNING_SECRET is missing or too short");
  const body = b64url(enc.encode(JSON.stringify({ c: p.channel, a: p.address, s: p.scope, t: nowSeconds })));
  const sig = b64url(await hmac(secret, body));
  return `${body}.${sig}`;
}

export type VerifyResult =
  | { valid: true; payload: UnsubscribePayload }
  | { valid: false; reason: "malformed" | "bad_signature" | "expired" };

export async function verifyUnsubscribeToken(
  secret: string,
  token: unknown,
  nowSeconds: number = Math.floor(Date.now() / 1000),
  ttlSeconds: number = DEFAULT_TTL_SECONDS,
): Promise<VerifyResult> {
  if (!secret || secret.length < 16 || typeof token !== "string" || token.length > 2048) {
    return { valid: false, reason: "malformed" };
  }
  const parts = token.split(".");
  if (parts.length !== 2 || !parts[0] || !parts[1]) return { valid: false, reason: "malformed" };
  let sigBytes: Uint8Array;
  let parsed: { c?: unknown; a?: unknown; s?: unknown; t?: unknown };
  try {
    sigBytes = fromB64url(parts[1]);
    parsed = JSON.parse(new TextDecoder().decode(fromB64url(parts[0])));
  } catch {
    return { valid: false, reason: "malformed" };
  }
  const expected = await hmac(secret, parts[0]);
  if (!constantTimeEqual(sigBytes, expected)) return { valid: false, reason: "bad_signature" };
  if (
    (parsed.c !== "email" && parsed.c !== "sms" && parsed.c !== "whatsapp") ||
    typeof parsed.a !== "string" || typeof parsed.s !== "string" || typeof parsed.t !== "number"
  ) return { valid: false, reason: "malformed" };
  if (nowSeconds - parsed.t > ttlSeconds || parsed.t > nowSeconds + 300) return { valid: false, reason: "expired" };
  return { valid: true, payload: { channel: parsed.c, address: parsed.a, scope: parsed.s } };
}
