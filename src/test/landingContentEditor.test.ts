import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { roleRouteConfigs } from "@/app/routes";
import { WEBHOST_ROUTES } from "@/features/webhost/lib/webhostPaths";
import {
  canEditLandingSection,
  LANDING_PERMISSIONS,
  resolveLandingEditorRole,
} from "@/features/marketing/landing/contentService";

const root = resolve(__dirname, "..");

function source(rel: string): string {
  return readFileSync(resolve(root, rel), "utf8");
}

describe("webhost landing-content editor wiring", () => {
  const routes = roleRouteConfigs.find((c) => c.role === "webhost");

  it("registers the protected landing-content route", () => {
    expect(routes?.routes.map((r) => r.path)).toContain("/webhost/landing");
  });

  it("links Landing Content in the Account nav group", () => {
    const layout = source("features/webhost/components/WebhostLayout.tsx");
    expect(layout).toContain('label: "Landing Content"');
    // the nav item references the route constant
    expect(layout).toContain("WEBHOST_ROUTES.landing");
    // and the route constant maps to /webhost/landing
    expect(WEBHOST_ROUTES.landing).toBe("/webhost/landing");
  });

  it("points the route at the editor page", () => {
    const routesSrc = source("app/routes.ts");
    expect(routesSrc).toContain("AdminLandingContent");
    expect(routesSrc).toContain("features/webhost/pages/AdminLandingContent");
  });

  it("uses a Supabase-backed content provider (not a static adapter) for persistence", () => {
    const svc = source("features/marketing/landing/contentService.ts");
    expect(svc).toContain("createSupabaseLandingContentProvider");
    expect(svc).toContain("landing_page_content");
    expect(svc).toContain("upsert_landing_section");
  });
});

describe("landing editability authorization", () => {
  it("resolves editor role from the platform tier (webhost > admin)", () => {
    // owner/business (or platform-settings management) → full webhost editor.
    expect(resolveLandingEditorRole("webhost", "owner")).toBe("webhost");
    expect(resolveLandingEditorRole("webhost", "business")).toBe("webhost");
    expect(resolveLandingEditorRole("webhost", "admin", true)).toBe("webhost");
    // plain 'admin' → scoped editor.
    expect(resolveLandingEditorRole("webhost", "admin", false)).toBe("admin");
    // non-webhost users have no editor role.
    expect(resolveLandingEditorRole("manager", "owner")).toBeNull();
    expect(resolveLandingEditorRole("tenant", "admin")).toBeNull();
    expect(resolveLandingEditorRole(null)).toBeNull();
  });

  it("webhost owns every section; admin only the scoped subset", () => {
    for (const perm of Object.values(LANDING_PERMISSIONS.webhost)) {
      expect(canEditLandingSection("webhost", perm)).toBe(true);
    }
    expect(canEditLandingSection("admin", "hero")).toBe(true);
    expect(canEditLandingSection("admin", "capabilities")).toBe(true);
    expect(canEditLandingSection("admin", "roles")).toBe(true);
    expect(canEditLandingSection("admin", "metrics")).toBe(true);
    // Webhost-only sections are locked for admins.
    expect(canEditLandingSection("admin", "theme")).toBe(false);
    expect(canEditLandingSection("admin", "brand")).toBe(false);
    expect(canEditLandingSection("admin", "header")).toBe(false);
    // Public users never edit.
    expect(canEditLandingSection(null, "hero")).toBe(false);
    expect(canEditLandingSection("manager", "hero")).toBe(false);
  });
});