import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const src = readFileSync("supabase/functions/initiate-shared-payment/index.ts", "utf8");

describe("initiate-shared-payment", () => {
  it("charges the server balance rounded up to a whole shilling", () => {
    expect(src).toContain("stkChargeAmount(expected)");
    expect(src).toContain("amount: chargeAmount");
    expect(src).toContain("Amount: chargeAmount");
    expect(src).not.toContain("Amount: Math.round(amount)");
  });
  it("stamps the destination account on the transaction", () => {
    expect(src).toContain("collection_account_id: route.id");
    expect(src).toContain("destination_label: destinationLabel");
  });
  it("does not fail the payer after the STK prompt is sent", () => {
    expect(src).not.toMatch(/if \(consumeError\) throw/);
  });
});

describe("initiate-paystack-payment", () => {
  const p = readFileSync("supabase/functions/initiate-paystack-payment/index.ts", "utf8");
  it("charges the outstanding balance rounded up, not the invoice total", () => {
    expect(p).toContain("balance_due");
    expect(p).toContain("stkChargeAmount(balance)");
    expect(p).toContain("amountKes: chargeAmount");
    expect(p).toContain("amount: chargeAmount");
    expect(p).not.toContain("Number(invoice.amount))) > 1");
  });
});
