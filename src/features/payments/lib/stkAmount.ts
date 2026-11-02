/**
 * Mirrors supabase/functions/_shared/mpesaAmount.ts (a test keeps them identical).
 * M-Pesa takes whole shillings, so a balance with cents is charged rounded UP; the
 * under-a-shilling excess is kept as advance credit rather than leaving cents unpaid.
 */
export function stkChargeAmount(balance: number): number {
  const cents = Math.round((Number(balance) + Number.EPSILON) * 100) / 100;
  if (!Number.isFinite(cents) || cents <= 0) return 0;
  return Math.ceil(cents);
}

export function stkRoundingExtra(balance: number): number {
  return Math.round((stkChargeAmount(balance) - Number(balance)) * 100) / 100;
}
