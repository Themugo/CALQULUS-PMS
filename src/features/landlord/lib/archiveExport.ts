export const ARCHIVE_RECORD_TYPES: ReadonlyArray<{ id: string; label: string }> = [
  { id: "invoices", label: "Invoices" },
  { id: "payment_transactions", label: "Payments" },
  { id: "payment_allocations", label: "Payment allocations" },
  { id: "issued_payment_receipts", label: "Receipts" },
  { id: "leases", label: "Leases" },
  { id: "maintenance_requests", label: "Maintenance" },
  { id: "expenditures", label: "Expenses" },
  { id: "physical_receipts", label: "Physical receipts" },
];

const cell = (v: unknown): string => {
  if (v === null || v === undefined) return "";
  const s = typeof v === "object" ? JSON.stringify(v) : String(v);
  // Neutralise spreadsheet formula injection, then quote.
  const safe = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
  return `"${safe.replace(/"/g, '""')}"`;
};

/** CSV of archived rows: union of keys, stable order, safe against formula injection. */
export function archiveRowsToCsv(rows: Array<Record<string, unknown>>): string {
  const keys = Array.from(rows.reduce((set, r) => { Object.keys(r).forEach((k) => set.add(k)); return set; }, new Set<string>()));
  return [keys.map(cell).join(","), ...rows.map((r) => keys.map((k) => cell(r[k])).join(","))].join("\n");
}
