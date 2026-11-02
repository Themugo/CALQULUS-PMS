import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { receiptMethodLabel, receiptReconciles } from "@/features/billing/lib/issuedPaymentReceiptPdf";

const mig = readFileSync("supabase/migrations/20260909000013_payment_trace_end_to_end.sql", "utf8");
const stk = readFileSync("supabase/functions/initiate-mpesa-stk-push/index.ts", "utf8");
const proc = readFileSync("supabase/functions/process-payment/index.ts", "utf8");
const email = readFileSync("supabase/functions/send-receipt-email/index.ts", "utf8");

describe("receipt helpers", () => {
  it("labels methods, never raw enums", () => {
    expect(receiptMethodLabel("mpesa_stk")).toBe("M-Pesa (STK Push)");
    expect(receiptMethodLabel("bank_transfer")).toBe("Bank transfer");
    expect(receiptMethodLabel("some_new_method")).toBe("Some new method");
    expect(receiptMethodLabel(null)).toBe("Payment");
  });
  it("receipt reconciles: allocations + advance credit = total", () => {
    const receipt = { id: "r", receipt_number: "RCP", issued_at: "", total_amount: 15000 };
    expect(receiptReconciles({ receipt, allocations: [{ amount: 12000 }, { amount: 2000 }], advance_credit: 1000 })).toBe(true);
    expect(receiptReconciles({ receipt, allocations: [{ amount: 12000 }], advance_credit: 0 })).toBe(false);
  });
});

describe("payment trace migration", () => {
  it("stamps unit and property on every allocation and repairs history", () => {
    expect(mig).toContain("BEFORE INSERT ON public.payment_allocations");
    expect(mig).toContain("UPDATE public.payment_allocations pa");
  });
  it("records the destination account on the transaction", () => {
    expect(mig).toContain("collection_account_id");
    expect(mig).toContain("destination_label");
    expect(stk).toContain("collection_account_id: route.id");
    expect(stk).toContain("destination_label: destinationLabel");
  });
  it("destination label holds public numbers only, never credentials", () => {
    const i = stk.indexOf("const destinationLabel");
    const block = stk.slice(i, i + 300);
    expect(block).not.toMatch(/passkey|consumer_|secret/i);
  });
  it("receipt payload exposes tenant, per-invoice balance, advance credit and destination", () => {
    for (const k of ["tenant_name", "invoice_balance_due", "advance_credit", "'destination'"]) expect(mig).toContain(k);
  });
  it("email shows where the money was paid", () => {
    expect(proc).toContain("destination: destinationLabel");
    expect(email).toContain("Paid to");
  });
});
