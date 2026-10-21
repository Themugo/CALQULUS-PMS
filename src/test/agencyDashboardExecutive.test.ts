import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(__dirname, "..");
const source = readFileSync(resolve(root, "features/agency/pages/AgencyDashboard.tsx"), "utf8");

describe("Agency executive dashboard", () => {
  it("keeps the executive hierarchy and live workflow entry points", () => {
    // Copy updated for the landlord-first operations centre redesign
    // (239003b, "Your agency at a glance." / "Client portfolio performance").
    expect(source).toContain("Your agency at a glance.");
    expect(source).toContain('title="Portfolio"');
    expect(source).toContain("Needs attention");
    expect(source).toContain("Client portfolio performance");
    expect(source).toContain("Property performance");
    expect(source).toContain("Recent activity");
    expect(source).toContain("AGENCY_ROUTES.clients");
    expect(source).toContain("AGENCY_ROUTES.reports");
    expect(source).toContain("AGENCY_OPS_ROUTES.buildings");
    expect(source).toContain("AGENCY_OPS_ROUTES.invites");
    expect(source).toContain("AGENCY_ROUTES.billing");
  });

  it("uses agency-blue semantic chrome without success-green money styling", () => {
    expect(source).not.toContain("text-green");
    expect(source).not.toContain("text-success");
    expect(source).not.toMatch(/\b(?:emerald|green)-\d{2,3}\b/);
    expect(source).not.toContain("border-success");
    // Agency chrome comes from the shared agency theme + primary accent.
    expect(source).toContain("AGENCY_CARD");
    expect(source).toContain("bg-primary");
  });

  it("links arrears to the billing workflow and keeps lease/client actions contextual", () => {
    expect(source).toContain("?filter=overdue");
    expect(source).toContain("AGENCY_OPS_ROUTES.leases");
    expect(source).toContain("AGENCY_ROUTES.clients");
    expect(source).toContain("AGENCY_OPS_ROUTES.maintenance");
  });
});
