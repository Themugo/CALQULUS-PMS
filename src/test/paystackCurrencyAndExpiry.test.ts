import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (p: string) => readFileSync(`supabase/functions/${p}`, "utf8");

describe("paystack currency and expiry hardening", () => {
  it("only KES charges are allocated", () => {
    expect(read("_shared/paystackMobileMoney.ts")).toContain("export function isKesCharge");
    expect(read("paystack-webhook/index.ts")).toContain("isKesCharge(data.currency)");
    const r = read("reconcile-paystack/index.ts");
    expect((r.match(/isKesCharge\(/g) ?? []).length).toBeGreaterThanOrEqual(2);
  });
  it("reconciliation never expires a payment it could not verify", () => {
    const r = read("reconcile-paystack/index.ts");
    expect(r).toContain("canExpire");
    expect(r).toContain("canExpire && tx.created_at < expireCutoff");
    expect(r).toContain("canExpire && tx.initiated_at < expireCutoff");
  });
  it("reconciliation treats process-payment success:false as a failure", () => {
    expect(read("reconcile-paystack/index.ts")).toContain("processJson?.success === false");
  });
});
