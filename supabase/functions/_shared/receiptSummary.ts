/**
 * _shared/receiptSummary.ts
 *
 * Pure helpers that describe EVERY invoice a payment settled, with each invoice's own
 * remaining balance, for the email and SMS receipts. Previously only the first invoice
 * was named and the "balance" was the tenant's whole-account total, which misled
 * multi-invoice and multi-unit payers.
 */
export interface ReceiptLine {
  invoiceId: string;
  invoiceNumber: string;
  unit: string | null;
  paid: number;
  balance: number;
}

interface AllocationIn { invoiceId: string; alloc: number }
interface InvoiceRowIn {
  id: string;
  invoice_number?: string | null;
  balance_due?: number | string | null;
  units?: { unit_number?: string | null } | { unit_number?: string | null }[] | null;
}

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

function unitOf(row: InvoiceRowIn | undefined): string | null {
  const u = row?.units;
  if (!u) return null;
  return (Array.isArray(u) ? u[0]?.unit_number : u.unit_number) ?? null;
}

export function buildReceiptLines(allocations: AllocationIn[], rows: InvoiceRowIn[]): ReceiptLine[] {
  const byId = new Map(rows.map((r) => [r.id, r]));
  return allocations
    .filter((a) => Number(a.alloc) > 0)
    .map((a) => {
      const row = byId.get(a.invoiceId);
      return {
        invoiceId: a.invoiceId,
        invoiceNumber: row?.invoice_number || a.invoiceId.slice(0, 8),
        unit: unitOf(row),
        paid: round2(Number(a.alloc)),
        balance: round2(Math.max(0, Number(row?.balance_due ?? 0))),
      };
    });
}

/** Total still owed on just the bills this payment touched. */
export function billsBalance(lines: ReceiptLine[]): number {
  return round2(lines.reduce((sum, l) => sum + l.balance, 0));
}

/** Compact SMS fragment: "INV-1 (3B) 12,000; INV-2 (4A) 3,000 +2 more". */
export function smsBillsText(lines: ReceiptLine[], fmt: (n: number) => string, max = 3): string {
  if (lines.length === 0) return "";
  const shown = lines.slice(0, max).map((l) => `${l.invoiceNumber}${l.unit ? ` (${l.unit})` : ""} ${fmt(l.paid)}`);
  const more = lines.length - shown.length;
  return shown.join("; ") + (more > 0 ? ` +${more} more` : "");
}
