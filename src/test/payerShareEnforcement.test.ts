import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (p: string) => readFileSync(p, "utf8");
const sql = read("supabase/migrations/20260909000024_payer_share_enforcement.sql");
const dlg = read("src/features/payments/components/RecordPaymentDialog.tsx");
const rp = read("supabase/functions/record-payment/index.ts");

describe("payer share enforcement (database)", () => {
  it("share is the fixed amount (capped at the invoice) else the percentage of the original amount", () => {
    expect(sql).toContain("LEAST(py.pays_amount, COALESCE(i.original_amount, i.amount))");
    expect(sql).toContain("COALESCE(i.original_amount, i.amount) * py.pays_percentage / 100");
  });
  it("counts what this payer already paid toward the invoice", () => {
    expect(sql).toContain("pt.paid_by_payer_id = p_payer_id");
  });
  it("is checked after allocation so it is exact, and aborts the whole payment", () => {
    const body = sql.slice(sql.indexOf("CREATE OR REPLACE FUNCTION public.record_payment_with_installment_atomic"));
    expect(body.indexOf("paid_by_payer_id = v_payer.id")).toBeLessThan(body.indexOf("agreed share of invoice"));
    expect(body).toContain("USING ERRCODE = '23514'");
  });
  it("never limits a self payer or a payer with no share set", () => {
    expect(sql).toContain("v_payer.payer_type <> 'self'");
    expect(sql).toContain("v_payer.pays_amount IS NOT NULL OR v_payer.pays_percentage IS NOT NULL");
  });
  it("share status is manager/submanager scoped and authenticated-only", () => {
    expect(sql).toContain("Tenant is outside your managed portfolio");
    expect(sql).toContain("GRANT EXECUTE ON FUNCTION public.get_payer_share_status(uuid, uuid) TO authenticated");
    expect(sql).toContain("REVOKE ALL ON FUNCTION public.payer_invoice_share(uuid, uuid) FROM PUBLIC, anon, authenticated");
  });
});

describe("payer share enforcement (screens and edge)", () => {
  it("record-payment returns the share message to the manager", () => {
    expect(rp).toContain("exceeds .* agreed share");
  });
  it("the dialog shows the remaining share and blocks a submit that would be refused", () => {
    expect(dlg).toContain("get_payer_share_status");
    expect(dlg).toContain("exceedsShare");
    expect(dlg).toContain("|| exceedsShare}");
  });
});
