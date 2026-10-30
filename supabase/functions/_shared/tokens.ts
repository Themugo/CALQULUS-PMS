/**
 * _shared/tokens.ts — secure token generation and hashing (WebCrypto; Deno + Node).
 *
 * Raw tokens are shown/sent to the recipient exactly once; only the SHA-256
 * hex digest is stored. Lookup is by hash equality in the database (the raw
 * token never appears in a WHERE clause or a log line).
 */
const enc = new TextEncoder();

/** 256-bit random token, hex encoded (64 chars). */
export function generateToken(bytes = 32): string {
  const buf = new Uint8Array(bytes);
  crypto.getRandomValues(buf);
  return Array.from(buf, (b) => b.toString(16).padStart(2, "0")).join("");
}

export async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", enc.encode(value));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

/** Cheap shape check before hashing/looking up (rejects obviously malformed input). */
export function isWellFormedToken(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f]{64}$/.test(value);
}

/**
 * Shape check for invitation tokens during the hash-at-rest transition: new
 * tokens are 64 hex chars; invitations issued before the transition used
 * gen_random_uuid()::text (admin_invitations) and must keep working.
 */
export function isWellFormedInviteToken(value: unknown): value is string {
  return (
    typeof value === "string" &&
    (/^[0-9a-f]{64}$/.test(value) ||
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value))
  );
}
