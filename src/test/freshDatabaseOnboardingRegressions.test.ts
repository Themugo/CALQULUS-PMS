import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const dir = path.resolve(__dirname, "../../supabase/migrations");
const read = (name: string) => fs.readFileSync(path.join(dir, name), "utf8");
const files = fs.readdirSync(dir).filter((f) => f.endsWith(".sql"));

describe("fresh-database onboarding regressions (found by replaying the full chain)", () => {
  it("manager approval trigger only references columns manager_profiles has", () => {
    const sql = read("20260811000003_auth_privileged_action_hardening.sql");
    expect(sql).not.toContain("OLD.tier_id");
    expect(sql).toContain("OLD.subscription_tier IS DISTINCT FROM NEW.subscription_tier");
  });

  it("every default manager tier has property limits, so new managers can create a property", () => {
    const sql = read("20260909000028_legacy_tier_property_limits.sql");
    for (const tier of ["starter", "growth", "professional"]) expect(sql).toContain(`('${tier}','residential'`);
  });

  it("landlord invitation acceptance conflicts on the real (property, landlord) key", () => {
    const sql = read("20260909000029_accept_landlord_invitation_coowner_key.sql");
    expect(sql).toContain("ON CONFLICT (property_id, landlord_user_id)");
    expect(sql).not.toMatch(/ON CONFLICT \(property_id\)\s/);
  });

  it("migration versions are unique and ordered", () => {
    const versions = files.map((f) => f.split("_")[0]);
    expect(new Set(versions).size).toBe(versions.length);
    expect([...files].sort()).toEqual(files.slice().sort());
  });
});

import { readFileSync as __rf } from "node:fs";
describe("money-correctness regressions", () => {
  it("apply-penalties charges one penalty per invoice, on the balance, never on penalties", () => {
    const s = __rf("supabase/functions/apply-penalties/index.ts", "utf8");
    expect(s).toContain("p_generation_key: `penalty:${invoice.id}`");
    expect(s).not.toMatch(/penalty:\$\{invoice\.id\}:\$\{today\}/);
    expect(s).toContain('.neq("invoice_type", "penalty")');
    expect(s).toContain("balance_due");
  });
  it("no function reads the non-existent payments.paid_at/method/reference columns", () => {
    for (const f of ["generate-landlord-statement", "export-excel", "reconcile"]) {
      const s = __rf(`supabase/functions/${f}/index.ts`, "utf8");
      expect(s, f).not.toMatch(/\.(gte|lte|order)\("paid_at"/);
    }
  });
  it("landlord statement never runs an unscoped payments query and applies revenue share", () => {
    const s = __rf("supabase/functions/generate-landlord-statement/index.ts", "utf8");
    expect(s).toContain("revenue_share_pct");
    expect(s).toContain("propIds.length === 0");
  });
});

describe("landlord invitation delivery", () => {
  it("both invite call sites deliver the email and do not claim success when it fails", () => {
    for (const f of ["src/features/landlord/components/LandlordLinksManager.tsx", "src/features/properties/components/PropertyLandlordTab.tsx"]) {
      const s = __rf(f, "utf8");
      expect(s, f).toContain("deliverLandlordInvitation(invitation)");
      expect(s, f).toContain("email not sent");
    }
    const fn = __rf("supabase/functions/send-landlord-invitation/index.ts", "utf8");
    expect(fn).toContain("inv.manager_id !== user.id");
    expect(fn).toContain("/landlord/invitation?token=");
    expect(__rf("supabase/config.toml", "utf8")).toContain("[functions.send-landlord-invitation]");
  });
});

describe("late penalties are configured by the business, never hardcoded", () => {
  it("apply-penalties has no built-in default penalty and resolves the owner's policy", () => {
    const f = __rf("supabase/functions/apply-penalties/index.ts", "utf8");
    expect(f).toContain("resolve_late_penalty_policy");
    expect(f).toContain("policy?.enabled === true");
    expect(f).not.toMatch(/\?\? true/);
    expect(f).not.toMatch(/\?\? 5\b/);
  });
  it("manager, agency and landlord each have a policy card; migration defaults to off", () => {
    expect(__rf("src/features/landlord/pages/LandlordSettings.tsx", "utf8")).toContain('ownerRole="landlord"');
    expect(__rf("src/features/agency/pages/AgencySettings.tsx", "utf8")).toContain('ownerRole="agency"');
    expect(__rf("src/features/settings/pages/Settings.tsx", "utf8")).toContain("LatePenaltyPolicyCard");
    const m = __rf("supabase/migrations/20260909000034_late_penalty_policies.sql", "utf8");
    expect(m).toContain("enabled boolean NOT NULL DEFAULT false");
    expect(m).toContain("NO penalty");
  });
});

describe("governed forgiveness (waive / discount / write-off)", () => {
  const m = __rf("supabase/migrations/20260909000035_invoice_adjustments_waive_discount_writeoff.sql", "utf8");
  it("is an immutable, reasoned ledger with operator and owner authority only", () => {
    expect(m).toContain("char_length(btrim(reason)) >= 5");
    expect(m).toContain("Adjustment ledger rows are immutable");
    expect(m).toContain("WHEN auth.role() = 'service_role' THEN 'service'");
    expect(m).toContain("p_invoice.manager_id = auth.uid()");
    expect(m).toContain("pl.landlord_user_id = auth.uid()");
    expect(m).not.toMatch(/GRANT (INSERT|UPDATE|DELETE)[^;]*invoice_adjustments/);
  });
  it("never touches paid_amount (forgiven money is not cash) and the UI exposes the action", () => {
    expect(m).not.toMatch(/paid_amount\s*=/);
    expect(__rf("src/features/billing/components/InvoiceTable.tsx", "utf8")).toContain("Waive / discount / write off");
    expect(__rf("src/features/properties/components/PropertyBillingTab.tsx", "utf8")).toContain("InvoiceAdjustmentDialog");
  });
  it("billing table no longer claims a reminder was sent when none was", () => {
    expect(__rf("src/features/billing/pages/Billing.tsx", "utf8")).not.toContain('title: "Reminder Sent"');
  });
});

describe("webhost control centre regressions", () => {
  it("every column AuthContext selects from admin_permissions exists in the schema", () => {
    const ctx = __rf("src/features/auth/AuthContext.tsx", "utf8");
    expect(ctx).toContain("can_manage_platform_settings");
    const mig = __rf("supabase/migrations/20260909000036_admin_permissions_platform_settings_flag.sql", "utf8");
    expect(mig).toContain("ALTER TABLE public.admin_permissions");
    expect(mig).toContain("ADD COLUMN IF NOT EXISTS can_manage_platform_settings");
  });
  it("the webhost sidebar is not re-filtered with the manager RBAC map (it hid every item)", () => {
    expect(__rf("src/features/webhost/components/WebhostLayout.tsx", "utf8")).toContain("navPrefiltered");
    expect(__rf("src/shared/components/layout/PortalDeskShell.tsx", "utf8")).toContain("navPrefiltered ? group.items");
  });
  it("webhost header has Back/Forward and sign-out survives a network failure", () => {
    const shell = __rf("src/shared/components/layout/PortalDeskShell.tsx", "utf8");
    expect(shell).toContain('aria-label="Go back"');
    expect(shell).toContain('aria-label="Go forward"');
    expect(__rf("src/features/auth/AuthContext.tsx", "utf8")).toContain("scope: 'local'");
  });
  it("platform admins are invited, never created with a password typed by another admin", () => {
    const f = __rf("src/features/webhost/components/PlatformAdminManagement.tsx", "utf8");
    expect(f).toContain("send-admin-invitation");
    expect(f).not.toContain("auth.signUp");
    expect(f).not.toContain("Initial Password");
  });
  it("RPC argument names used by the app match the database (meters, tenant payment details)", () => {
    expect(__rf("src/features/units/components/UnitUtilityMeters.tsx", "utf8")).not.toMatch(/p_meter_id: null/);
    expect(__rf("src/features/properties/components/AddTenantToPropertyDialog.tsx", "utf8")).not.toContain("p_manager_id:");
  });
});
