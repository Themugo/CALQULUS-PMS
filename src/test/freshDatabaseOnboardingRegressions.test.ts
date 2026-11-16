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
