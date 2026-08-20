import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const src = (relative: string) => readFileSync(join(process.cwd(), relative), "utf8");

describe("Manager billing and payments layout contracts", () => {
  it("keeps Billing stats and invoice columns without changing money math", () => {
    const billing = src("src/features/billing/pages/Billing.tsx");
    expect(billing).toContain('title="Billing"');
    expect(billing).toContain("Create Invoice");
    expect(billing).toContain("View payments");
    expect(billing).toContain("MpesaPaymentDialog");
    expect(billing).toContain("generate-monthly-invoices");
    expect(billing).toContain("send-overdue-notifications");
    expect(billing).toContain("TenantInvoiceForm");
    expect(src("src/features/billing/hooks/useBillingData.ts")).toContain("record-payment");
    expect(billing).toContain("ReceiptsTab");
    expect(billing).toContain("ReceiptVerification");
    expect(billing).toContain("ExpendituresTab");
    expect(billing).not.toMatch(/KES 1\.24M/);

    const stats = src("src/features/billing/components/BillingStatsBar.tsx");
    expect(stats).toContain('label: "Billed"');
    expect(stats).toContain('label: "Collected"');
    expect(stats).toContain('label: "Outstanding"');
    expect(stats).toContain('label: "Overdue"');
    expect(stats).toContain("original_amount");
    expect(stats).toContain("paid_amount");
    expect(stats).toContain("invoiceOwedMinor");
    expect(stats).not.toContain("text-success");
    expect(stats).not.toContain("text-destructive");

    const table = src("src/features/billing/components/InvoiceTable.tsx");
    expect(table).toContain('label="Invoice"');
    expect(table).toContain('label="Tenant"');
    expect(table).toContain('label="Property"');
    expect(table).toContain('label="Amount"');
    expect(table).toContain('label="Due date"');
    expect(table).toContain('label="Status"');
    expect(table).toContain("M-Pesa");
    expect(table).toContain("invoiceOwedMinor");
    expect(table).toContain("onMpesa");
    expect(table).toContain("onMarkPaid");
  });

  it("keeps Payments ledger columns, methods, and references", () => {
    const payments = src("src/features/payments/pages/ManagerPaymentHistory.tsx");
    expect(payments).toContain('title="Payments"');
    expect(payments).toContain("Record Payment");
    expect(payments).toContain("RecordPaymentDialog");
    expect(payments).toContain('.from("payment_transactions")');
    expect(payments).toContain("mpesa_receipt_number");
    expect(payments).toContain("bank_reference");
    expect(payments).toContain("checkout_request_id");
    expect(payments).toContain("paymentMethodLabel");
    expect(payments).toContain("paymentStatusLabel");
    expect(payments).toContain("paymentStatusTone");
    expect(payments).toContain(">Date</TableHead>");
    expect(payments).toContain(">Tenant</TableHead>");
    expect(payments).toContain("Invoice / reference");
    expect(payments).toContain(">Amount</TableHead>");
    expect(payments).toContain(">Method</TableHead>");
    expect(payments).toContain(">Status</TableHead>");
    expect(payments).toContain("BankReconciliationPanel");
    expect(payments).toContain("PaymentAnalytics");
    expect(payments).not.toContain("bg-green-600");
    expect(payments).not.toMatch(/KES 1\.24M/);

    const methods = src("src/shared/lib/statusBadge.ts");
    expect(methods).toContain("mpesa_stk");
    expect(methods).toContain("stripe_checkout");
    expect(methods).toContain("M-Pesa STK");
    expect(methods).toContain("Stripe Checkout");
  });
});
