/**
 * _shared/inboundSms.ts — pure helpers for inbound SMS opt-out callbacks.
 * No Deno imports (unit-testable under Node).
 */

const enc = new TextEncoder();

function constantTimeEqual(a: string, b: string): boolean {
  const x = enc.encode(a), y = enc.encode(b);
  if (x.length !== y.length) return false;
  let d = 0;
  for (let i = 0; i < x.length; i++) d |= x[i] ^ y[i];
  return d === 0;
}

/** Twilio: base64(HMAC-SHA1(authToken, fullUrl + concat(sorted key+value))). */
export async function verifyTwilioSignature(
  authToken: string,
  fullUrl: string,
  params: Record<string, string>,
  signature: string | null | undefined,
): Promise<boolean> {
  if (!authToken || !signature) return false;
  const data = fullUrl + Object.keys(params).sort().map((k) => k + params[k]).join("");
  const key = await crypto.subtle.importKey("raw", enc.encode(authToken), { name: "HMAC", hash: "SHA-1" }, false, ["sign"]);
  const mac = new Uint8Array(await crypto.subtle.sign("HMAC", key, enc.encode(data)));
  let bin = "";
  for (const b of mac) bin += String.fromCharCode(b);
  return constantTimeEqual(btoa(bin), signature);
}

/** Africa's Talking sends no signature: require a shared secret supplied by the operator. */
export function verifySharedSecret(expected: string, provided: string | null | undefined): boolean {
  if (!expected || expected.length < 16 || !provided) return false;
  return constantTimeEqual(expected, provided);
}

export interface InboundMessage { from: string; body: string; provider: "twilio" | "africastalking" }

export function parseInbound(params: Record<string, string>): InboundMessage | null {
  if (params.From && typeof params.Body === "string") {
    return { from: params.From, body: params.Body, provider: "twilio" };
  }
  if (params.from && typeof params.text === "string") {
    return { from: params.from, body: params.text, provider: "africastalking" };
  }
  return null;
}
