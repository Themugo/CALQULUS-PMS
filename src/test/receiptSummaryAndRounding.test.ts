import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { buildReceiptLines, billsBalance, smsBillsText } from "../../supabase/functions/_shared/receiptSummary";
import { stkChargeAmount as serverCharge, stkRoundingExtra as serverExtra } from "../../supabase/functions/_shared/mpesaAmount";
import { stkChargeAmount, stkRoundingExtra } from "@/features/payments/lib/stkAmount";

const fmt = (n: number) => `KES ${n.toLocaleString("en-KE")}`;
const rows = [
  { id: "a", invoice_number: "INV-1", balance_due: 0, units: { unit_number: "3B" } },
  { id: "b", invoice_number: "INV-2", balance_due: 500.5, units: [{ unit_number: "4A" }] },
  { id: "c", invoice_number: "INV-3", balance_due: 0, units: null },
  { id: "d", invoice_number: "INV-4", balance_due: 0, units: null },
];

describe("multi-invoice receipt lines", () => {
  const lines = buildReceiptLines([
    { invoiceId: "a", alloc: 12000 }, { invoiceId: "b", alloc: 2000 },
    { invoiceId: "c", alloc: 100 }, { invoiceId: "d", alloc: 50 }, { invoiceId: "zz", alloc: 0 },
  ], rows);
  it("names every settled invoice with its own unit, paid amount and balance", () => {
    expect(lines.map(l => l.invoiceNumber)).toEqual(["INV-1", "INV-2", "INV-3", "INV-4"]);
    expect(lines[0]).toMatchObject({ unit: "3B", paid: 12000, balance: 0 });
    expect(lines[1]).toMatchObject({ unit: "4A", paid: 2000, balance: 500.5 });
  });
  it("balance is the remaining on these bills only", () => {
    expect(billsBalance(lines)).toBe(500.5);
  });
  it("SMS lists up to three bills then counts the rest", () => {
    expect(smsBillsText(lines, fmt)).toBe("INV-1 (3B) KES 12,000; INV-2 (4A) KES 2,000; INV-3 KES 100 +1 more");
    expect(smsBillsText([], fmt)).toBe("");
  });
});

describe("whole-shilling STK amounts", () => {
  it("rounds UP so cents are never left on the invoice", () => {
    expect(stkChargeAmount(1250.4)).toBe(1251);
    expect(stkChargeAmount(1250)).toBe(1250);
    expect(stkChargeAmount(1250.0000001)).toBe(1250);
    expect(stkChargeAmount(0.2)).toBe(1);
    expect(stkChargeAmount(0)).toBe(0);
    expect(stkChargeAmount(-5)).toBe(0);
  });
  it("reports the excess that becomes advance credit", () => {
    expect(stkRoundingExtra(1250.4)).toBe(0.6);
    expect(stkRoundingExtra(1250)).toBe(0);
  });
  it("client and server helpers agree", () => {
    for (const v of [0, 0.01, 99.99, 1250.4, 1250.5, 1250.51, 35000, 35000.01]) {
      expect(stkChargeAmount(v)).toBe(serverCharge(v));
      expect(stkRoundingExtra(v)).toBe(serverExtra(v));
    }
  });
  it("STK push charges the server-computed amount, not the client's", () => {
    const stk = readFileSync("supabase/functions/initiate-mpesa-stk-push/index.ts", "utf8");
    expect(stk).toContain("stkChargeAmount(expectedTotal)");
    expect(stk).toContain("Amount: chargeAmount");
    expect(stk).not.toContain("Math.round(amount),");
  });
});

describe("destination snapshot for manual and bank payments", () => {
  const mig = readFileSync("supabase/migrations/20260909000014_payment_destination_snapshot.sql", "utf8");
  const proc = readFileSync("supabase/functions/process-payment/index.ts", "utf8");
  it("is service-only and never labels the wrong rail", () => {
    expect(mig).toContain("auth.role() <> 'service_role'");
    expect(mig).toContain("rail_mismatch");
    expect(mig).toContain("rail_unknown");
    expect(mig).toMatch(/REVOKE ALL ON FUNCTION public\.snapshot_payment_destination_atomic\(uuid\) FROM PUBLIC, anon, authenticated/);
  });
  it("masks bank account numbers to the last four digits", () => {
    expect(mig).toContain("right(regexp_replace(a.bank_account_number");
  });
  it("process-payment snapshots then reports the destination and every bill", () => {
    expect(proc).toContain("snapshot_payment_destination_atomic");
    expect(proc).toContain("smsBillsText(receiptLines, fmt)");
    expect(proc).toContain("lines: receiptLines.length > 1");
  });
});
