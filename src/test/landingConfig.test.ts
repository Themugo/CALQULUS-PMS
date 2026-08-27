import { describe, expect, it } from "vitest";
import {
  defaultLandingConfig,
  landingIcon,
  LANDING_ICON_NAMES,
  landingThemeToCssVars,
} from "@/features/marketing/landing/index";
import {
  canEditLandingSection,
  LANDING_PERMISSIONS,
  LANDING_EDITOR_ROLES,
} from "@/features/marketing/landing/contentService";
import { LANDING_THEME } from "@/features/marketing/theme/landingTheme";

describe("landing theme + content model", () => {
  it("uses the brilliant-navy marketing tokens", () => {
    expect(LANDING_THEME.primary).toBe("#123F8C");
    expect(LANDING_THEME.primaryDark).toBe("#0B2F6B");
    expect(LANDING_THEME.primaryLight).toBe("#EAF2FF");
    expect(LANDING_THEME.accent).toBe("#2F6FED");
    expect(LANDING_THEME.cyan).toBe("#16B8C4");
    expect(LANDING_THEME.background).toBe("#F7F9FC");
    expect(LANDING_THEME.surface).toBe("#FFFFFF");
    expect(LANDING_THEME.textPrimary).toBe("#10233F");
    expect(LANDING_THEME.border).toBe("#DCE5F0");
    expect(LANDING_THEME.danger).toBe("#D9535B");
  });

  it("maps the token set to CSS custom properties", () => {
    const vars = landingThemeToCssVars();
    expect(vars["--calqulus-landing-primary"]).toBe("#123F8C");
    expect(vars["--calqulus-landing-background"]).toBe("#F7F9FC");
  });

  it("all section order + content is declared in the default config", () => {
    expect(defaultLandingConfig.sections).toEqual([
      "hero",
      "trust",
      "capabilities",
      "roles",
      "propertyTypes",
      "metrics",
      "finalCta",
    ]);
    expect(defaultLandingConfig.capabilities).toHaveLength(6);
    expect(defaultLandingConfig.roles).toHaveLength(6);
    expect(defaultLandingConfig.propertyTypes).toHaveLength(3);
    expect(defaultLandingConfig.header.nav.length).toBeGreaterThanOrEqual(4);
    expect(defaultLandingConfig.footer.columns).toHaveLength(5);
  });

  it("uses only registered, safe icon names", () => {
    const iconNames = [
      ...defaultLandingConfig.hero.trustPoints.map((p) => p.icon),
      ...defaultLandingConfig.capabilities.map((c) => c.icon),
      ...defaultLandingConfig.roles.map((r) => r.icon),
      ...defaultLandingConfig.metrics.map((m) => m.icon),
    ];
    for (const name of iconNames) {
      expect(LANDING_ICON_NAMES, `unregistered icon: ${name}`).toContain(name);
    }
    // every registered name resolves to a component, unknown falls back safely
    for (const name of LANDING_ICON_NAMES) {
      expect(landingIcon(name)).toBeTypeOf("object");
    }
    // unknown names never throw and never execute user code
    expect(landingIcon("not-a-real-icon")).toBeDefined();
  });

  it("enforces a webhost > admin permission split and never allows public edits", () => {
    expect(LANDING_EDITOR_ROLES).toEqual(["webhost", "platform_admin", "admin"]);
    // Webhost owns everything.
    for (const perm of Object.values(LANDING_PERMISSIONS.webhost)) {
      expect(canEditLandingSection("webhost", perm)).toBe(true);
    }
    // Admin only gets the scoped subset.
    expect(canEditLandingSection("admin", "hero")).toBe(true);
    expect(canEditLandingSection("admin", "theme")).toBe(false);
    expect(canEditLandingSection("admin", "brand")).toBe(false);
    // A tenant or manager cannot edit landing content at all (backend authoritative).
    expect(canEditLandingSection("manager", "hero")).toBe(false);
    expect(canEditLandingSection("tenant", "hero")).toBe(false);
    expect(canEditLandingSection(null, "hero")).toBe(false);
  });
});