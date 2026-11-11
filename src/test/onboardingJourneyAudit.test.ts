import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolveRoleOnboarding } from "@/features/onboarding/lib/roleOnboarding";
import { buildCompanySettingsPayload } from "@/features/onboarding/lib/saveOnboarding";

const read = (p: string) => readFileSync(p, "utf8");
const routes = read("src/app/routes.ts");
const roleLib = read("src/features/onboarding/lib/roleOnboarding.ts");
const manager = read("src/features/onboarding/pages/ManagerOnboardingPage.tsx");
const landlord = read("src/features/onboarding/pages/LandlordOnboardingPage.tsx");
const agency = read("src/features/onboarding/pages/AgencyOnboardingPage.tsx");

describe("onboarding links never dead-end", () => {
  const hrefs = Array.from(roleLib.matchAll(/href: "([^"]+)"/g)).map((m) => m[1].split("?")[0]);
  it("every role step links to a registered route", () => {
    expect(hrefs.length).toBeGreaterThan(10);
    for (const href of hrefs) {
      expect(routes, `no route for ${href}`).toContain(`path: "${href}"`);
    }
  });
  it("no placeholder tokens leak into links", () => {
    expect(roleLib).not.toContain(":firstPropertyId");
  });
});

describe("optional steps do not block completion", () => {
  it("manager is complete once required steps are done, even with optional ones skipped", () => {
    const done = new Set(["property", "units", "tenants", "billing"]);
    const p = resolveRoleOnboarding("manager", done);
    expect(p.isComplete).toBe(true);
    expect(p.percent).toBe(100);
    expect(p.nextAction).toBeNull();
  });
  it("an unfinished required step is still the current one", () => {
    const p = resolveRoleOnboarding("manager", new Set(["company", "property"]));
    expect(p.currentStepId).toBe("units");
    expect(p.isComplete).toBe(false);
    expect(p.percent).toBe(25);
  });
});

describe("saving a wizard step never erases the profile", () => {
  const company = {
    company_name: "Mugo Realty", address: "Moi Ave", phone: "0712", email: "a@b.co",
    logo_url: "http://l/x.png", brand_primary_hex: "#123456", white_label_enabled: true,
    brand_config: { theme: "navy", onboarding: { organizationComplete: true } },
  };
  it("keeps every stored field and merges onboarding progress", () => {
    const payload = buildCompanySettingsPayload(company, null, { onboardingPatch: { propertyGroups: ["residential"] } });
    expect(payload).toMatchObject({ company_name: "Mugo Realty", address: "Moi Ave", phone: "0712", logo_url: "http://l/x.png", white_label_enabled: true });
    expect(payload.brand_config).toEqual({ theme: "navy", onboarding: { organizationComplete: true, propertyGroups: ["residential"] } });
  });
  it("never invents a placeholder name", () => {
    expect(buildCompanySettingsPayload(null, null, { onboardingPatch: { x: 1 } })).not.toHaveProperty("company_name");
    expect(buildCompanySettingsPayload(company, null, { companyName: "  " }).company_name).toBe("Mugo Realty");
    expect(buildCompanySettingsPayload(company, null, { companyName: "New Name" }).company_name).toBe("New Name");
  });
  it("carries agency fields so the agencies row is not blanked", () => {
    const p = buildCompanySettingsPayload(company, { county: "Nairobi", kra_pin: "A001", registration_number: null, whatsapp: null }, {});
    expect(p).toMatchObject({ county: "Nairobi", kra_pin: "A001" });
  });
  it("no onboarding page sends a partial or placeholder payload any more", () => {
    for (const src of [manager, landlord, agency]) {
      expect(src).not.toContain("CALQULUS Workspace");
      expect(src).not.toContain("My property business");
      expect(src).not.toMatch(/rpc\(\s*['"]save_manager_company_settings_atomic/);
      expect(src).toContain("saveOnboardingSettings");
    }
  });
});

describe("wizard navigation", () => {
  it("Back goes back, in every wizard", () => {
    for (const src of [manager, landlord, agency]) {
      expect(src).toContain("goBack");
      expect(src).not.toMatch(/onClick=\{skipStep\}>\s*<ArrowLeft/);
    }
  });
  it("steps are only ticked when actually complete, and the wizards resume", () => {
    for (const src of [manager, landlord, agency]) {
      expect(src).not.toContain("i < stepIdx ||");
      expect(src).toContain("resumed");
    }
  });
  it("team invite uses the real Settings flow instead of a password-less signUp", () => {
    expect(manager).not.toContain("auth.signUp");
    expect(manager).toContain("/settings?tab=submanagers");
  });
  it("landlord facts count linked properties, not managed ones", () => {
    expect(landlord).toContain('from("property_landlords")');
    expect(landlord).toContain("landlordPropertyTypes");
  });
});

describe("entry points exist", () => {
  it("manager dashboard and landlord empty state both lead into the guided setup", () => {
    expect(read("src/features/dashboard/components/ManagerQuickActions.tsx")).toContain("/onboarding/manager");
    expect(read("src/features/landlord/pages/LandlordDashboard.tsx")).toContain("/landlord/onboarding");
  });
  it("the resume screen reuses the dashboard facts and routes other roles to their own flow", () => {
    const page = read("src/features/onboarding/pages/OnboardingPage.tsx");
    expect(page).toContain("fetchActivationFacts");
    expect(page).not.toContain("hasPaymentMethod: false");
    expect(page).toContain("/agency/onboarding");
    expect(page).toContain("/landlord/onboarding");
  });
});

describe("company settings RPC is partial-save safe", () => {
  const mig = read("supabase/migrations/20260909000015_company_settings_partial_save.sql");
  it("only touches columns whose key is present and merges brand_config", () => {
    expect(mig).toContain("CASE WHEN p_payload ? 'address'");
    expect(mig).toContain("CASE WHEN p_payload ? 'logo_url'");
    expect(mig).toContain("COALESCE(v_current->'onboarding'");
    expect(mig).toContain("v_current := COALESCE(v_current, '{}'::jsonb)");
  });
});
