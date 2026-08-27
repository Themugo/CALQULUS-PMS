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
    // Section ordering is a full-editor (webhost) capability only.
    expect(canEditLandingSection("webhost", "sections")).toBe(true);
    expect(canEditLandingSection("admin", "sections")).toBe(false);
    // Public users never edit.
    expect(canEditLandingSection(null, "hero")).toBe(false);
    expect(canEditLandingSection("manager", "hero")).toBe(false);
  });
});

describe("landing CMS refinements", () => {
  it("exposes sections in LandingSectionKey for runtime ordering", () => {
    // `sections` is a key of LandingPageConfig reachable through the editor.
    const editor = source("features/webhost/pages/AdminLandingContent.tsx");
    expect(editor).toContain('case "sections"');
    expect(editor).toContain("OrderEditor");
  });

  it("adds section ordering + move/hide controls to the editor UI", () => {
    const editor = source("features/webhost/pages/AdminLandingContent.tsx");
    expect(editor).toContain("Move");
    expect(editor).toContain("Hide");
    expect(editor).toContain("<OrderEditor");
  });

  it("adds an asset-store upload path with a safe bucket name", () => {
    const svc = source("features/marketing/landing/contentService.ts");
    expect(svc).toContain('LANDING_ASSET_BUCKET = "landing-images"');
    expect(svc).toContain("uploadLandingAsset");
    expect(svc).toContain(".storage.from");
    expect(svc).toContain("getPublicUrl");
    // Static adapter must not pretend to persist assets.
    expect(svc).toContain('"Static adapter has no asset store"');
    const editor = source("features/webhost/pages/AdminLandingContent.tsx");
    expect(editor).toContain("AssetField");
  });

  it("gates the Landing Content nav item to resolvable landing editors", () => {
    const layout = source("features/webhost/components/WebhostLayout.tsx");
    expect(layout).toContain("resolveLandingEditorRole");
    expect(layout).toContain("WEBHOST_ROUTES.landing");
    // Nav item must not be shown to users with no landing editor role.
    expect(/if \(item\.href === WEBHOST_ROUTES\.landing\)/.test(layout)).toBe(true);
    // Explicit branch resolves full OR scoped, not all webhost.
    expect(layout).toContain("userRole?.role");
  });

  it("records an audit entry (log_activity) after a section save", () => {
    const editor = source("features/webhost/pages/AdminLandingContent.tsx");
    expect(editor).toContain("logLandingEdit");
    expect(editor).toContain('p_action: "content_edit"');
    expect(editor).toContain('p_entity_type: "landing_page_content"');
    // Audit must never break the save flow.
    expect(editor).toContain("Audit failures must never break the save flow");
  });

  it("seeds a published landing-content row idempotently", () => {
    const seed = source("../supabase/seed/landing_content.sql");
    expect(seed).toContain("landing_page_content");
    expect(seed).toContain("'{}'::jsonb");
    expect(seed).toContain("NOT EXISTS");
    expect(seed).toMatch(/\btrue\b,\s*auth\.uid\(\)/);
    // The row is published.
    expect(seed).toContain("published");
  });
});