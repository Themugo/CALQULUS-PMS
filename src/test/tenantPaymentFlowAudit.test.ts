import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { normalizeKenyanMsisdn } from "../../supabase/functions/_shared/mpesaPhone";
import { functionErrorMessage } from "@/features/payments/lib/functionError";

const root = resolve(__dirname, "../..");
const read = (p: string) => readFileSync(resolve(root, p), "utf8");
const migration = read("supabase/migrations/20260909000008_payment_self_credit_lockdown.sql");
const initiate = read("supabase/functions/initiate-mpesa-stk-push/index.ts");
const callback = read("supabase/functions/mpesa-callback/index.ts");
const verify = read("supabase/functions/verify-mpesa-stk-status/index.ts");
const dialog = read("src/features/tenant-portal/components/TenantPayNowDialog.tsx");

describe("self-credit lockdown migration", () => {
  it("no longer authorises the tenant as a caller of process_payment_atomic", () => {
    const wrapper = migration.slice(migration.indexOf("CREATE OR REPLACE FUNCTION public.process_payment_atomic("), migration.indexOf("process_payment_atomic_core\n  FROM") === -1 ? undefined : undefined);
    expect(wrapper).not.toMatch(/v_is_tenant/);
    expect(wrapper).not.toMatch(/role='tenant'/);
    expect(wrapper).toMatch(/Unauthorized payment processing attempt/);
  });
  it("closes the renamed core and the payer RPC to browser roles", () => {
    expect(migration).toMatch(/REVOKE ALL ON FUNCTION public\.process_payment_atomic_core[\s\S]*?FROM PUBLIC, anon, authenticated/);
    expect(migration).toMatch(/GRANT EXECUTE ON FUNCTION public\.process_payment_atomic_core[\s\S]*?TO service_role/);
    expect(migration).toMatch(/REVOKE ALL ON FUNCTION public\.process_payer_payment_atomic[\s\S]*?FROM PUBLIC, anon, authenticated/);
    expect(migration).toMatch(/GRANT EXECUTE ON FUNCTION public\.process_payer_payment_atomic[\s\S]*?TO service_role/);
  });
  it("keeps manager mandate gating and the service path", () => {
    expect(migration).toMatch(/manager_payment_authority_for_property/);
    expect(migration).toMatch(/v_is_service/);
  });
});

describe("normalizeKenyanMsisdn", () => {
  it.each([
    ["0712345678", "254712345678"],
    ["+254 712 345 678", "254712345678"],
    ["254112345678", "254112345678"],
    ["712345678", "254712345678"],
    ["0712-345-678", "254712345678"],
  ])("accepts %s", (input, expected) => expect(normalizeKenyanMsisdn(input)).toBe(expected));
  it.each(["", "12345", "0612345678", "25471234567", "abcdefghij", "+1 415 555 0100", 712345678 as unknown as string])(
    "rejects %s", (input) => expect(normalizeKenyanMsisdn(input)).toBeNull());
});

describe("STK initiation safeguards", () => {
  it("validates the phone with the shared normaliser, not by prefixing 254", () => {
    expect(initiate).toMatch(/normalizeKenyanMsisdn\(phoneNumber\)/);
    expect(initiate).not.toMatch(/formattedPhone = "254" \+ formattedPhone/);
  });
  it("refuses a second prompt while one is open, before contacting Safaricom", () => {
    const guard = initiate.indexOf("already waiting");
    expect(guard).toBeGreaterThan(-1);
    expect(guard).toBeLessThan(initiate.indexOf("generate?grant_type"));
    expect(initiate).toMatch(/\.eq\("status", "pending"\)/);
  });
  it("closes the pending record when the STK request itself fails", () => {
    expect(initiate).toMatch(/Could not reach M-Pesa/);
  });
});

describe("callback and status verification", () => {
  it("treats every non-zero ResultCode as a failed prompt", () => {
    expect(callback).not.toMatch(/resultCode !== 0 && resultCode !== 1/);
    expect(callback).toMatch(/mark_payment_transaction_failed_atomic/);
  });
  it("lets the linked third-party payer follow their own payment", () => {
    expect(verify).toMatch(/isLinkedPayer/);
  });
  it("does not report completed while the ledger credit is still unapplied", () => {
    const failBranch = verify.indexOf("Do not pay again");
    expect(failBranch).toBeGreaterThan(-1);
    expect(failBranch).toBeLessThan(verify.indexOf("source:             'safaricom_query'"));
  });
});

describe("tenant pay dialog", () => {
  it("shows the server's reason instead of the generic edge-function text", () => {
    expect(dialog).toMatch(/functionErrorMessage/);
  });
  it("never invites a second payment while the first is unresolved", () => {
    expect(dialog).toMatch(/'unconfirmed'/);
    expect(dialog).not.toMatch(/'timeout'/);
    expect(dialog).toMatch(/do not pay again/i);
  });
});

describe("functionErrorMessage", () => {
  it("prefers the body error", async () => {
    expect(await functionErrorMessage(null, { error: "Amount mismatch" }, "x")).toBe("Amount mismatch");
  });
  it("reads the unread Response on error.context", async () => {
    const context = new Response(JSON.stringify({ error: "Some selected bills are no longer payable" }), { status: 400 });
    expect(await functionErrorMessage({ message: "Edge Function returned a non-2xx status code", context }, null, "fallback"))
      .toBe("Some selected bills are no longer payable");
  });
  it("falls back when only the generic text exists", async () => {
    expect(await functionErrorMessage({ message: "Edge Function returned a non-2xx status code" }, null, "Try again"))
      .toBe("Try again");
  });
});

describe("manager MpesaPaymentDialog hardening", () => {
  const dlg = readFileSync("src/features/billing/components/MpesaPaymentDialog.tsx", "utf8");
  it("reads the real function error instead of the generic non-2xx text", () => {
    expect(dlg).toContain("functionErrorMessage");
  });
  it("stops polling on close/unmount and does not treat a timeout as a retryable failure", () => {
    expect(dlg).toContain("stopPolling");
    expect(dlg).toContain('"unconfirmed"');
    expect(dlg).toContain("Do not pay again");
    expect(dlg).not.toContain("clearInterval(timer)");
  });
  it("charges the outstanding balance and labels the button with it", () => {
    expect(dlg).toContain("Number(invoice.balance_due ?? invoice.amount)");
    expect(dlg).toContain("stkChargeAmount");
  });
});

describe("late-confirmed money on a failed transaction", () => {
  const mig = readFileSync("supabase/migrations/20260909000012_revive_failed_payment_on_confirmed_money.sql", "utf8");
  const mp = readFileSync("supabase/functions/mpesa-callback/index.ts", "utf8");
  const ps = readFileSync("supabase/functions/paystack-webhook/index.ts", "utf8");
  it("revive RPC is service-only, failed-only and allocation-safe", () => {
    expect(mig).toContain("auth.role() <> 'service_role'");
    expect(mig).toContain("v_tx.status <> 'failed'");
    expect(mig).toContain("payment_allocations WHERE transaction_id");
    expect(mig).toMatch(/REVOKE ALL ON FUNCTION public\.revive_failed_payment_transaction_atomic\(uuid\) FROM PUBLIC, anon, authenticated/);
  });
  it("both providers reopen a failed transaction before the already-processed exit", () => {
    for (const src of [mp, ps]) {
      expect(src).toContain("revive_failed_payment_transaction_atomic");
    }
    expect(mp).toContain('transaction.status === "failed" && resultCode === 0');
  });
});
