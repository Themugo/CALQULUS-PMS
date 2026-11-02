import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

const card = readFileSync("src/features/tenants/components/TenantCreditCard.tsx", "utf8");
const page = readFileSync("src/features/tenants/pages/Tenants.tsx", "utf8");
const lock = readFileSync("supabase/migrations/20260909000011_credit_ledger_write_lockdown.sql", "utf8");

describe("manager credit UI and ledger lockdown", () => {
  it("card uses atomic edge functions and never writes the ledger directly", () => {
    expect(card).toContain('"apply-credit"');
    expect(card).toContain('"recall-credit"');
    expect(card).not.toMatch(/tenant_credit_ledger"\)\s*\.(insert|update|delete|upsert)/);
  });
  it("recall is bounded by balance and requires a reason", () => {
    expect(card).toContain("Number(amount) > balance");
    expect(card).toContain("reason.trim()");
  });
  it("is mounted on the tenant payments tab", () => {
    expect(page).toContain("<TenantCreditCard tenantId={selectedTenant.id} />");
  });
  it("ledger becomes read-only for clients", () => {
    expect(lock).toContain("DROP POLICY IF EXISTS \"manager_manages_credit\"");
    expect(lock).toMatch(/FOR SELECT TO authenticated/);
    expect(lock).toMatch(/REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public\.tenant_credit_ledger/);
  });
});
