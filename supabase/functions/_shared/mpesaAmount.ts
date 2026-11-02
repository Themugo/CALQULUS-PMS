/**
 * _shared/mpesaAmount.ts
 *
 * M-Pesa STK only accepts whole shillings. Rounding a balance to the NEAREST shilling
 * can leave cents unpaid (1,250.40 -> 1,250), so the invoice never clears. We round UP
 * instead: the payer sends at most 99 cents extra, which the allocator already holds as
 * advance credit, and the invoice closes.
 */
export function stkChargeAmount(balance: number): number {
  const cents = Math.round((Number(balance) + Number.EPSILON) * 100) / 100; // kill float noise
  if (!Number.isFinite(cents) || cents <= 0) return 0;
  return Math.ceil(cents);
}

/** Cents of overpayment created by rounding up (0 when the balance is already whole). */
export function stkRoundingExtra(balance: number): number {
  const charge = stkChargeAmount(balance);
  return Math.round((charge - Number(balance)) * 100) / 100;
}
