/**
 * _shared/mpesaPhone.ts
 *
 * Pure Kenyan MSISDN normalisation for M-Pesa. Returns the 12-digit
 * 2547XXXXXXXX / 2541XXXXXXXX form, or null when the input cannot be a
 * Kenyan mobile number. Never sends a malformed number to Safaricom.
 */
export function normalizeKenyanMsisdn(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const digits = raw.replace(/[\s\-().]/g, "").replace(/^\+/, "");
  if (!/^\d+$/.test(digits)) return null;
  let national: string;
  if (digits.startsWith("254")) national = digits.slice(3);
  else if (digits.startsWith("0")) national = digits.slice(1);
  else national = digits;
  // Kenyan mobile numbers: 9 digits starting 7 or 1 (Safaricom, Airtel, Telkom).
  if (!/^[17]\d{8}$/.test(national)) return null;
  return `254${national}`;
}
