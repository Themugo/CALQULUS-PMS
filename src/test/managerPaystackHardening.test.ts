import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const src = readFileSync("supabase/functions/initiate-manager-paystack-payment/index.ts", "utf8");

describe("initiate-manager-paystack-payment", () => {
  it("refuses fractional invoices that M-Pesa and the ledger cannot settle", () => {
    expect(src).toContain("fractional amount");
  });
  it("sends only one live prompt per invoice", () => {
    expect(src).toContain("livePending");
    expect(src).toContain('.eq("manager_invoice_id", invoice.id)');
  });
  it("blocks non-payable invoice states", () => {
    expect(src).toContain('"cancelled", "void", "waived"');
  });
});
