import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

const mig = readFileSync("supabase/migrations/20260909000009_tenant_credit_recall.sql", "utf8");
const fn = readFileSync("supabase/functions/recall-credit/index.ts", "utf8");
const cfg = readFileSync("supabase/config.toml", "utf8");

describe("advance credit recall", () => {
  it("writes a refund ledger row and audit log", () => {
    expect(mig).toContain("'refund'");
    expect(mig).toContain("tenant_credit_recalled");
  });
  it("rejects tenants and enforces mandate", () => {
    expect(mig).toContain("Unauthorized credit recall");
    expect(mig).toContain("manager_payment_authority_for_property");
    expect(mig).toContain("can_record_payments");
  });
  it("locks and bounds against the balance", () => {
    expect(mig).toMatch(/FOR UPDATE/);
    expect(mig).toContain("exceeds available credit");
    expect(mig).toContain("Recall amount must be positive");
    expect(mig).toContain("A reason is required");
  });
  it("is not callable anonymously", () => {
    expect(mig).toMatch(/REVOKE ALL ON FUNCTION public\.recall_tenant_credit_atomic[^;]*FROM PUBLIC, anon/);
  });
  it("edge function calls as the user, not service role, and requires JWT", () => {
    expect(fn).toContain("SUPABASE_ANON_KEY");
    expect(fn).not.toContain("SERVICE_ROLE");
    expect(cfg).toMatch(/\[functions\.recall-credit\]\s*verify_jwt = true/);
  });
});
