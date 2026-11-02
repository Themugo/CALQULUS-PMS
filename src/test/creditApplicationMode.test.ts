import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

const mig = readFileSync("supabase/migrations/20260909000010_credit_application_mode.sql", "utf8");
const ui = readFileSync("src/features/settings/components/CreditApplicationSettings.tsx", "utf8");
const settings = readFileSync("src/features/settings/pages/Settings.tsx", "utf8");

describe("credit application mode", () => {
  it("defaults to manual and only allows manual/auto", () => {
    expect(mig).toContain("DEFAULT 'manual'");
    expect(mig).toContain("CHECK (apply_mode IN ('manual', 'auto'))");
  });
  it("is owner-scoped under RLS", () => {
    expect(mig).toContain("ENABLE ROW LEVEL SECURITY");
    expect(mig).toMatch(/USING \(manager_id = auth\.uid\(\)\)/);
    expect(mig).toMatch(/REVOKE ALL ON public\.manager_credit_settings FROM PUBLIC, anon/);
  });
  it("auto-applies via a deferred trigger that cannot block invoice creation", () => {
    expect(mig).toContain("CREATE CONSTRAINT TRIGGER");
    expect(mig).toContain("INITIALLY DEFERRED");
    expect(mig).toContain("apply_tenant_credit_atomic");
    expect(mig).toContain("EXCEPTION WHEN OTHERS");
    expect(mig).toMatch(/REVOKE ALL ON FUNCTION public\.auto_apply_credit_after_invoice\(\) FROM PUBLIC, anon, authenticated/);
  });
  it("setting is offered to manager, landlord and agency on the payments tab", () => {
    for (const r of ["manager", "landlord", "agency"]) expect(ui).toContain(`"${r}"`);
    expect(settings).toContain("<CreditApplicationSettings />");
  });
});
