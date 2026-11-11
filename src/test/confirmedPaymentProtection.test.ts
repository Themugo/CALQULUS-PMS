import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const sql = readFileSync("supabase/migrations/20260909000021_confirmed_payment_protection.sql", "utf8");
const cb = readFileSync("supabase/functions/mpesa-callback/index.ts", "utf8");
const poll = readFileSync("supabase/functions/verify-mpesa-stk-status/index.ts", "utf8");
const retry = readFileSync("supabase/functions/retry-confirmed-payments/index.ts", "utf8");
const cfg = readFileSync("supabase/config.toml", "utf8");

describe("confirmed money is never swept as failed", () => {
  it("the sweeper skips rows that carry a provider receipt", () => {
    const fn = sql.slice(sql.indexOf("expire_stale_payment_transactions_atomic(p_age_minutes"));
    expect(fn).toContain("AND mpesa_receipt_number IS NULL");
  });
  it("receipt stamping is service-only and only touches pending rows", () => {
    expect(sql).toContain("auth.role() IS DISTINCT FROM 'service_role'");
    expect(sql).toContain("status = 'pending' AND mpesa_receipt_number IS NULL");
    expect(sql).toContain("FROM PUBLIC, anon, authenticated");
  });
  it("callback and poller stamp the receipt before allocation is attempted", () => {
    expect(cb.indexOf("confirm_stk_receipt_atomic")).toBeGreaterThan(-1);
    expect(cb.indexOf("confirm_stk_receipt_atomic")).toBeLessThan(cb.indexOf("functions/v1/process-payment"));
    expect(poll.indexOf("confirm_stk_receipt_atomic")).toBeLessThan(poll.indexOf("functions/v1/process-payment"));
  });
  it("a failed stamp never blocks allocation", () => {
    expect(cb).toContain("continuing");
  });
  it("lists confirmed-but-unallocated rows for the retry job", () => {
    expect(sql).toContain("confirmed_unapplied_payments");
    expect(sql).toContain("NOT EXISTS (SELECT 1 FROM public.payment_allocations");
  });
  it("retry job is service-key only and replays through process-payment", () => {
    expect(retry).toContain("timingSafeEqual(auth");
    expect(retry).toContain("confirmed_unapplied_payments");
    expect(retry).toContain("functions/v1/process-payment");
    expect(cfg).toContain("[functions.retry-confirmed-payments]");
  });
});

describe("payment status lookup is scoped to the caller's portfolio", () => {
  const v = readFileSync("supabase/functions/verify-mpesa-payment/index.ts", "utf8");
  it("a manager can only read their own transactions", () => {
    expect(v).toContain('callerRole === "manager" && transaction.manager_id !== callerUserId');
  });
  it("a submanager must belong to the transaction's manager", () => {
    expect(v).toContain('.eq("submanager_user_id", callerUserId).eq("manager_id", transaction.manager_id)');
  });
  it("a shared provider reference no longer breaks the lookup", () => {
    expect(v).toContain(".limit(1).maybeSingle()");
  });
});
