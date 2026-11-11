/**
 * _shared/bankMatching.ts
 *
 * Safe matching of a bank transaction to an open invoice. Mirrors ingest_bank_webhook_atomic
 * (migration 20260909000022): a unit or invoice number must appear in the reference as a WHOLE
 * token ("A1" is not in "A12"), an empty unit/invoice number never matches, and when more than
 * one tenant fits the transaction is left for a human instead of guessed.
 */
export function refContainsToken(ref: string | null | undefined, token: string | null | undefined): boolean {
  const t = (token ?? "").trim();
  if (!t) return false;
  const escaped = t.toUpperCase().replace(/[\\^$.|?*+()[\]{}-]/g, "\\$&");
  return new RegExp(`(^|[^A-Z0-9])${escaped}([^A-Z0-9]|$)`).test((ref ?? "").toUpperCase());
}

export interface OpenInvoice {
  id: string;
  tenantId: string;
  invoiceNumber: string | null;
  unit: string | null;
  /** What is still owed: balance_due, falling back to the invoice amount. */
  balance: number;
  dueDate?: string | null;
}

const byDueDate = (a: OpenInvoice, b: OpenInvoice) => (a.dueDate ?? "9999").localeCompare(b.dueDate ?? "9999");

/** The one invoice this transaction belongs to, or null when none or several tenants fit. */
export function matchBankTransaction(
  reference: string | null | undefined,
  amount: number,
  invoices: OpenInvoice[],
): { invoice: OpenInvoice; method: "auto_reference" | "auto_amount_unit" } | null {
  const oneTenant = (list: OpenInvoice[]) =>
    new Set(list.map((i) => i.tenantId)).size === 1 ? [...list].sort(byDueDate)[0] : null;

  const byNumber = invoices.filter((i) => refContainsToken(reference, i.invoiceNumber));
  const refHit = oneTenant(byNumber);
  if (refHit) return { invoice: refHit, method: "auto_reference" };

  const byUnit = invoices.filter(
    (i) => i.balance > 0 && refContainsToken(reference, i.unit) && Math.abs(amount - i.balance) / Math.max(i.balance, 1) < 0.05,
  );
  const unitHit = oneTenant(byUnit);
  return unitHit ? { invoice: unitHit, method: "auto_amount_unit" } : null;
}
