/**
 * _shared/partyReceipts.ts
 *
 * Who must be told about a payment, and what each of them is told, when the money came from
 * a third-party payer or settled bills of several tenants (a parent paying for students).
 *
 *  - The PAYER receives one receipt that lists every bill they paid, across every unit,
 *    with each bill's own remaining balance. They never see another tenant's account total.
 *  - Each TENANT receives a receipt for ONLY their own bills, with their own account balance
 *    and who paid. A tenant who is also the payer is not told twice.
 *
 * Pure functions so the rules are unit-tested without a network.
 */
import type { ReceiptLine } from "./receiptSummary.ts";

export interface PartyLine extends ReceiptLine { tenantId: string }

export interface PayerInfo { name: string | null; email: string | null; phone: string | null }

export interface TenantInfo {
  tenantId: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  managerId: string | null;
  paid: number;
  accountBalance: number | null;
}

export interface PlannedReceipt {
  kind: "payer" | "tenant";
  tenantId: string | null;
  name: string;
  email: string | null;
  phone: string | null;
  lines: PartyLine[];
  paid: number;
  billsBalance: number;
  /** The tenant's whole-account balance. Never set on a payer receipt. */
  accountBalance: number | null;
  paidBy: string | null;
}

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
const norm = (s: string | null | undefined) => (s ?? "").trim().toLowerCase();
const digits = (s: string | null | undefined) => (s ?? "").replace(/\D/g, "").slice(-9);

const sum = (ls: PartyLine[], k: "paid" | "balance") => round2(ls.reduce((t, l) => t + l[k], 0));

export function planPartyReceipts(
  payer: PayerInfo | null,
  tenants: TenantInfo[],
  lines: PartyLine[],
): PlannedReceipt[] {
  const out: PlannedReceipt[] = [];
  const payerEmail = norm(payer?.email);
  const payerPhone = digits(payer?.phone);

  if (payer && lines.length > 0) {
    out.push({
      kind: "payer", tenantId: null, name: payer.name || "Payer",
      email: payer.email, phone: payer.phone, lines,
      paid: sum(lines, "paid"), billsBalance: sum(lines, "balance"),
      accountBalance: null, paidBy: null,
    });
  }

  for (const t of tenants) {
    const own = lines.filter((l) => l.tenantId === t.tenantId);
    if (own.length === 0) continue;
    const samePerson =
      !!payer &&
      ((payerEmail !== "" && norm(t.email) === payerEmail) ||
        (payerPhone !== "" && digits(t.phone) === payerPhone));
    if (samePerson) continue; // the payer receipt already covers their own bills
    out.push({
      kind: "tenant", tenantId: t.tenantId, name: t.name || "Tenant",
      email: t.email, phone: t.phone, lines: own,
      paid: sum(own, "paid"), billsBalance: sum(own, "balance"),
      accountBalance: t.accountBalance,
      paidBy: payer ? payer.name || "your payer" : null,
    });
  }
  return out;
}

/**
 * A pending transaction needs the multi-party path when a payer started it, or when the
 * bills it lists belong to more than one tenant.
 */
export function needsPartyPath(payerPartyId: string | null | undefined, invoiceTenantIds: Array<string | null>): boolean {
  if (payerPartyId) return true;
  return new Set(invoiceTenantIds.filter(Boolean)).size > 1;
}

/** Invoice ids recorded on a pending prompt (multi-invoice JSON note, else the primary invoice). */
export function invoiceIdsFromTransaction(notes: string | null | undefined, invoiceId: string | null | undefined): string[] {
  if (notes && notes.trim().startsWith("{")) {
    try {
      const parsed = JSON.parse(notes) as { invoice_ids?: unknown };
      if (Array.isArray(parsed.invoice_ids)) {
        const ids = parsed.invoice_ids.filter((x): x is string => typeof x === "string");
        if (ids.length > 0) return ids;
      }
    } catch { /* fall through */ }
  }
  return invoiceId ? [invoiceId] : [];
}
