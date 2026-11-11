import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { matchBankTransaction, refContainsToken, type OpenInvoice } from "../../supabase/functions/_shared/bankMatching";

const inv = (id: string, tenantId: string, over: Partial<OpenInvoice> = {}): OpenInvoice =>
  ({ id, tenantId, invoiceNumber: `INV-${id}`, unit: `U${id}`, balance: 10000, dueDate: "2026-10-01", ...over });

describe("bank reference token matching", () => {
  it("never matches a unit or invoice number inside a longer one", () => {
    expect(refContainsToken("RENT A12 NOV", "A1")).toBe(false);
    expect(refContainsToken("PAY INV-12", "INV-1")).toBe(false);
    expect(refContainsToken("RENT 12", "1")).toBe(false);
  });
  it("matches whole tokens regardless of case and punctuation", () => {
    expect(refContainsToken("rent a1/nov", "A1")).toBe(true);
    expect(refContainsToken("UNIT 3B.", "3b")).toBe(true);
    expect(refContainsToken("X (A+1) Y", "A+1")).toBe(true);
  });
  it("an empty or missing token never matches (the old includes(\"\") bug)", () => {
    expect(refContainsToken("anything", "")).toBe(false);
    expect(refContainsToken("anything", null)).toBe(false);
    expect(refContainsToken("anything", "   ")).toBe(false);
  });
});

describe("matching a bank transaction to an invoice", () => {
  it("matches by invoice number", () => {
    const m = matchBankTransaction("Payment INV-7 thanks", 5000, [inv("7", "t7"), inv("8", "t8")]);
    expect(m?.invoice.id).toBe("7");
    expect(m?.method).toBe("auto_reference");
  });
  it("matches unit + amount within 5% on the balance still owed", () => {
    const m = matchBankTransaction("RENT U3", 3000, [inv("3", "t3", { balance: 3050 })]);
    expect(m?.method).toBe("auto_amount_unit");
  });
  it("uses balance_due, so a part-paid bill can be settled", () => {
    expect(matchBankTransaction("RENT U3", 2000, [inv("3", "t3", { balance: 2000 })])).not.toBeNull();
    expect(matchBankTransaction("RENT U3", 2000, [inv("3", "t3", { balance: 10000 })])).toBeNull();
  });
  it("leaves it for a human when two tenants fit (same unit label in two buildings)", () => {
    const a = inv("3", "tA", { unit: "A1" });
    const b = inv("4", "tB", { unit: "A1" });
    expect(matchBankTransaction("RENT A1", 10000, [a, b])).toBeNull();
  });
  it("picks the oldest of one tenant's invoices", () => {
    const a = inv("3", "t", { unit: "A1", dueDate: "2026-11-01" });
    const b = inv("4", "t", { unit: "A1", dueDate: "2026-09-01" });
    expect(matchBankTransaction("RENT A1", 10000, [a, b])?.invoice.id).toBe("4");
  });
  it("matches nothing when the invoice has no number and no unit", () => {
    expect(matchBankTransaction("whatever", 10000, [inv("9", "t", { invoiceNumber: null, unit: null })])).toBeNull();
  });
});

describe("every recording channel announces the payment", () => {
  const read = (p: string) => readFileSync(p, "utf8");
  const sql = read("supabase/migrations/20260909000022_bank_matching_and_announcements.sql");

  it("webhook matching uses whole-token, single-tenant rules", () => {
    expect(sql).toContain("public.ref_contains_token(v_ref, i.invoice_number)");
    expect(sql).toContain("public.ref_contains_token(v_ref, t.unit)");
    expect(sql).toContain("count(DISTINCT i.tenant_id)");
    expect(sql).not.toContain("position(upper(t.unit) IN v_ref)");
    expect(sql).not.toContain("position(upper(i.invoice_number) IN v_ref)");
  });
  it("the claim makes an announcement happen once and is service-only", () => {
    expect(sql).toContain("announced_at IS NULL");
    expect(sql).toContain("auth.role() IS DISTINCT FROM 'service_role'");
  });
  it("an uploaded receipt without an invoice now records a payment", () => {
    const fn = sql.slice(sql.indexOf("verify_payment_receipt_atomic(\n  p_receipt_id"));
    expect(fn).not.toContain("IF v_receipt.invoice_id IS NOT NULL THEN");
    expect(fn).toContain("Payment could not be recorded for this receipt");
    expect(fn).toContain("'transaction_id', v_payment->>'transaction_id'");
  });
  it("manual recording, webhook, reconcile-bank, and the two screens call the announcer", () => {
    expect(read("supabase/functions/record-payment/index.ts")).toContain("announcePayment(ctx.supabase");
    expect(read("supabase/functions/bank-webhook/index.ts")).toContain("announcePayment(supabase, matchedTx)");
    const rb = read("supabase/functions/reconcile-bank/index.ts");
    expect(rb.match(/announcePayment\(supabase/g)?.length).toBe(2);
    expect(rb).toContain("matchBankTransaction(");
    expect(rb).not.toContain("auto-send-receipt");
    expect(read("src/features/payments/components/BankReconciliationPanel.tsx")).toContain("'announce-payment'");
    expect(read("src/features/payments/components/ReceiptVerification.tsx")).toContain("'announce-payment'");
  });
  it("announce-payment only serves the owning manager (or the service key) and completed payments", () => {
    const f = read("supabase/functions/announce-payment/index.ts");
    expect(f).toContain("outside your portfolio");
    expect(f).toContain('tx.status !== "completed"');
    expect(read("supabase/config.toml")).toContain("[functions.announce-payment]");
  });
  it("process-payment marks its own notifications as the announcement", () => {
    expect(read("supabase/functions/process-payment/index.ts")).toContain("claim_payment_announcement_atomic");
  });
});
