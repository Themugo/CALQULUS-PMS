/** Pure phone-number helpers (no Deno imports; unit-testable under Node). */

/**
 * Strict phone normalisation. Returns an E.164 number or null.
 * Kenyan forms accepted: +254XXXXXXXXX, 254XXXXXXXXX, 07XXXXXXXX, 01XXXXXXXX,
 * 7XXXXXXXX / 1XXXXXXXX (9 digits). Other countries must be supplied as
 * +<country><number> (or 00<country><number>), 8-15 digits total.
 * Anything with letters or other junk is rejected.
 */
export function tryFormatPhoneNumber(phoneNumber: string): string | null {
  if (typeof phoneNumber !== "string") return null;
  const compact = phoneNumber.trim().replace(/[\s\-().]/g, "");
  if (!/^\+?\d+$/.test(compact)) return null;

  let digits = compact.startsWith("+") ? compact.slice(1) : compact;
  const hadPlus = compact.startsWith("+");

  if (!hadPlus && digits.startsWith("00")) {
    digits = digits.slice(2);
    return /^[1-9]\d{7,14}$/.test(digits) ? "+" + digits : null;
  }
  if (hadPlus) {
    if (digits.startsWith("254")) return /^254[17]\d{8}$/.test(digits) ? "+" + digits : null;
    return /^[1-9]\d{7,14}$/.test(digits) ? "+" + digits : null;
  }
  if (digits.startsWith("254")) return /^254[17]\d{8}$/.test(digits) ? "+" + digits : null;
  if (digits.startsWith("0")) return /^0[17]\d{8}$/.test(digits) ? "+254" + digits.slice(1) : null;
  return /^[17]\d{8}$/.test(digits) ? "+254" + digits : null;
}

/** Throws on invalid numbers (callers that cannot tolerate a throw should use tryFormatPhoneNumber). */
export function formatPhoneNumber(phoneNumber: string): string {
  const formatted = tryFormatPhoneNumber(phoneNumber);
  if (!formatted) throw new Error("Invalid phone number");
  return formatted;
}

