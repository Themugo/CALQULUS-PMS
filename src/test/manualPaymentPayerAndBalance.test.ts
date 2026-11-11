import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (p: string) => readFileSync(p, "utf8");
const sql = read("supabase/migrations/20260909000023_manual_payment_payer_and_balance.sql");
const rp = read("supabase/functions/record-payment/index.ts");

describe("manual payment names the payer", () => {
  it("validates the payer is this tenant's own, active and in date", () => {
    expect(sql).toContain("v_payer.tenant_id <> p_tenant_id");
    expect(sql).toContain("v_payer.manager_id <> v_effective_manager");
    expect(sql).toContain("NOT v_payer.is_active");
    expect(sql).toContain("v_payer.end_date < COALESCE(p_payment_date, CURRENT_DATE)");
  });
  it("stamps the payer on the transaction in the same call, never for 'self'", () => {
    expect(sql).toContain("v_payer.payer_type <> 'self'");
    expect(sql).toContain("paid_by_payer_id = v_payer.id");
    expect(sql.indexOf("process_payment_atomic(")).toBeLessThan(sql.indexOf("paid_by_payer_id = v_payer.id"));
  });
  it("replaces the old signature instead of adding an ambiguous overload", () => {
    expect(sql).toContain("DROP FUNCTION IF EXISTS public.record_payment_with_installment_atomic(");
    expect(sql).toContain("p_payer_id uuid DEFAULT NULL");
  });
  it("instalment arrears include part-paid invoices", () => {
    expect(sql).toContain("i.status IN ('pending', 'overdue', 'partially_paid')");
  });
  it("record-payment passes only the payer id; identity comes from the server record", () => {
    expect(rp).toContain("p_payer_id:");
    expect(rp).not.toContain("payerName");
    expect(rp).not.toContain("payerPhone");
    expect(rp).toContain("Payer is (not registered|no longer active)");
  });
});

describe("one balance everywhere", () => {
  it("receipt parties use get_tenant_balance, not a sum of open invoices", () => {
    expect(sql).toContain("get_tenant_balance(t.id)");
    expect(sql).not.toMatch(/sum\(GREATEST\(COALESCE\(i2\.balance_due/);
  });
  it("falls back to the registered payer's name and contacts for the payer receipt", () => {
    expect(sql).toContain("paid_by_payer_id");
    expect(sql).toContain("py.payer_type <> 'self'");
    expect(sql).toContain("COALESCE(py.payer_phone, py.mpesa_number)");
  });
  it("stays service-role only", () => {
    expect(sql).toContain("GRANT EXECUTE ON FUNCTION public.get_payment_receipt_parties(uuid) TO service_role");
    expect(sql).toContain("FROM PUBLIC, anon, authenticated");
  });
});
