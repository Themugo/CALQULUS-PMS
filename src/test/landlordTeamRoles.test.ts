import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { LANDLORD_TEAM_ROLES, teamRolePreset } from "@/features/landlord/lib/teamRoles";
import { LANDLORD_ONBOARDING_STEPS } from "@/features/onboarding/components/landlord/LandlordOnboardingSteps";

describe("landlord-assigned team roles", () => {
  it("caretaker handles maintenance but never money", () => {
    const p = teamRolePreset("caretaker").permissions;
    expect(p.can_manage_maintenance).toBe(true);
    expect(p.can_record_payments).toBe(false);
    expect(p.can_create_invoices).toBe(false);
    expect(p.can_view_invoices).toBe(false);
  });
  it("family member can run day-to-day and record payments but not edit tenants or invoice", () => {
    const p = teamRolePreset("family_member").permissions;
    expect(p.can_record_payments).toBe(true);
    expect(p.can_edit_tenants).toBe(false);
    expect(p.can_create_invoices).toBe(false);
  });
  it("accountant handles billing but not tenants or maintenance", () => {
    const p = teamRolePreset("accountant").permissions;
    expect(p.can_record_payments && p.can_create_invoices).toBe(true);
    expect(p.can_edit_tenants).toBe(false);
    expect(p.can_manage_maintenance).toBe(false);
  });
  it("every role stays limited to assigned properties and none can read contracts or logs by default", () => {
    for (const r of LANDLORD_TEAM_ROLES) {
      expect(r.permissions.restrict_to_assigned_properties).toBe(true);
      expect(r.permissions.can_view_contracts).toBe(false);
      expect(r.permissions.can_view_activity_logs).toBe(false);
    }
  });
  it("permission keys match what save_landlord_team_member_atomic reads", () => {
    const sql = readFileSync("supabase/migrations/20260903000019_team_and_payer_atomic.sql", "utf8");
    for (const k of Object.keys(teamRolePreset("custom").permissions).filter((k) => k !== "restrict_to_assigned_properties")) {
      expect(sql).toContain(`'${k}'`);
    }
  });
  it("team screen offers roles and property choice; onboarding has an optional team step", () => {
    const ui = readFileSync("src/features/landlord/components/LandlordTeamSettings.tsx", "utf8");
    expect(ui).toContain("LANDLORD_TEAM_ROLES");
    expect(ui).toContain("Properties they can access");
    expect(LANDLORD_ONBOARDING_STEPS.map((s) => s.id)).toContain("team");
    const page = readFileSync("src/features/onboarding/pages/LandlordOnboardingPage.tsx", "utf8");
    expect(page).toContain('id !== "team"');
  });
});
