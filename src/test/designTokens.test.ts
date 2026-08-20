import { describe, expect, it } from "vitest";
import { BRAND_CHART_COLORS, CHART_STATUS_COLORS } from "@/shared/lib/chartColors";
import {
  CALQULUS_BRAND,
  CALQULUS_COLOR,
  CALQULUS_DARK_MODE,
  CALQULUS_FIELD,
  CALQULUS_ICON,
  CALQULUS_PORTAL_ACCENT,
  CALQULUS_PWA,
  CALQULUS_RADIUS,
  CALQULUS_SHADOW,
  CALQULUS_SPACE,
  CALQULUS_TYPE,
} from "@/shared/theme/tokens";

describe("CALQULUS design tokens", () => {
  it("names the product CALQULUS PMS", () => {
    expect(CALQULUS_BRAND.name).toBe("CALQULUS");
    expect(CALQULUS_BRAND.product).toBe("CALQULUS PMS");
    expect(CALQULUS_BRAND.iconFamily).toBe("lucide-react");
  });

  it("uses electric cyan as primary, not gold", () => {
    expect(CALQULUS_COLOR.primary).toBe("#1AD4E4");
    expect(CALQULUS_COLOR.primaryHover).toBe("#3DDBF0");
    expect(CALQULUS_COLOR.primaryActive).toBe("#12B8C8");
    expect(CALQULUS_COLOR.accent).toBe(CALQULUS_COLOR.primary);
    expect(CALQULUS_COLOR.primary).not.toBe("#C9A84C");
    expect(CALQULUS_COLOR.primary).not.toBe("#155EEF");
    expect(CALQULUS_COLOR.primary).not.toBe("#2F6FED");
  });

  it("establishes navy as the identity scale", () => {
    expect(CALQULUS_COLOR.navyDeep).toBe("#123056");
    expect(CALQULUS_COLOR.navyPrimary).toBe("#164272");
    expect(CALQULUS_COLOR.navySecondary).toBe("#1E558C");
    expect(CALQULUS_COLOR.navyDeep).not.toBe("#040B16");
    expect(CALQULUS_COLOR.navyPrimary).not.toBe("#0A1A32");
  });

  it("keeps light surfaces as the production background", () => {
    expect(CALQULUS_COLOR.background).toBe("#F3F7FB");
    expect(CALQULUS_COLOR.surface).toBe("#FFFFFF");
    expect(CALQULUS_COLOR.surfaceElevated).toBe("#F3F7FB");
    expect(CALQULUS_COLOR.white).toBe("#FFFFFF");
  });

  it("defines the full semantic palette", () => {
    expect(CALQULUS_COLOR.success).toBe("#23856B");
    expect(CALQULUS_COLOR.warning).toBe("#B7791F");
    expect(CALQULUS_COLOR.danger).toBe("#C84B4B");
    expect(CALQULUS_COLOR.info).toBe(CALQULUS_COLOR.primary);
    expect(CALQULUS_COLOR.border).toBe("#D7E2EC");
    expect(CALQULUS_COLOR.textPrimary).toBe("#0E1C2E");
    expect(CALQULUS_COLOR.textMuted).toBe("#5A6E82");
    expect(CALQULUS_COLOR.focus).toBe(CALQULUS_COLOR.primary);
    expect(CALQULUS_COLOR.glow).toBe("#1B4FBF");
    expect(CALQULUS_COLOR.spark).toBe("#F5A524");
  });

  it("aligns PWA chrome with the live brand", () => {
    expect(CALQULUS_PWA.themeColor).toBe(CALQULUS_COLOR.navyPrimary);
    expect(CALQULUS_PWA.backgroundColor).toBe(CALQULUS_COLOR.background);
    expect(CALQULUS_PWA.themeColor).not.toBe("#C9A84C");
    expect(CALQULUS_PWA.backgroundColor).not.toBe("#0A1628");
  });

  it("classifies dark mode as dormant light-mirror", () => {
    expect(CALQULUS_DARK_MODE.status).toBe("dormant");
    expect(CALQULUS_DARK_MODE.productionExperience).toBe("light-desk");
    expect(CALQULUS_DARK_MODE.marketingChrome).toBe("navy-mid");
    expect(CALQULUS_DARK_MODE.cssStrategy).toBe("light-mirror");
  });

  it("exposes portal accents without replacing the desk system", () => {
    expect(CALQULUS_PORTAL_ACCENT.manager.hex).toBe(CALQULUS_COLOR.navySecondary);
    expect(CALQULUS_PORTAL_ACCENT.landlord.hex).toBe(CALQULUS_COLOR.success);
    expect(CALQULUS_PORTAL_ACCENT.agency.hex).toBe("#9A5A16");
    expect(CALQULUS_PORTAL_ACCENT.tenant.hex).toBe("#5C4A8A");
    expect(CALQULUS_PORTAL_ACCENT.platform_admin.hex).toBe("#3E4C94");
  });

  it("exposes spacing, radius, shadow, type, and field tokens", () => {
    expect(CALQULUS_SPACE[4]).toBe("1rem");
    expect(CALQULUS_RADIUS.card).toBe("0.625rem");
    expect(CALQULUS_SHADOW.card).toContain("18 48 86");
    expect(CALQULUS_TYPE.pageTitle).toBe("type-page-title");
    expect(CALQULUS_FIELD.error).toContain("text-destructive");
    expect(CALQULUS_ICON.md).toBe("h-4 w-4");
  });
});

describe("chart palette follows tokens", () => {
  it("leads with primary cyan", () => {
    expect(BRAND_CHART_COLORS[0]).toBe(CALQULUS_COLOR.primary);
  });

  it("does not introduce decorative indigo or sky leftovers", () => {
    expect(BRAND_CHART_COLORS).not.toContain("#4F46E5");
    expect(BRAND_CHART_COLORS).not.toContain("#7DD3FC");
  });

  it("maps status colors to semantic tokens", () => {
    expect(CHART_STATUS_COLORS.positive).toBe(CALQULUS_COLOR.success);
    expect(CHART_STATUS_COLORS.warning).toBe(CALQULUS_COLOR.warning);
    expect(CHART_STATUS_COLORS.negative).toBe(CALQULUS_COLOR.danger);
  });
});

describe("index.css Tailwind v4 production safety", () => {
  it("does not @apply custom type classes that break vite build", async () => {
    const { readFileSync } = await import("node:fs");
    const { join } = await import("node:path");
    const css = readFileSync(join(process.cwd(), "src/index.css"), "utf8");
    for (const name of ["page-title", "section-title", "card-title-exec", "metric-value", "meta-text"]) {
      expect(css).not.toMatch(new RegExp(`@apply\\s+${name}\\b`));
    }
  });

  it("keeps CSS variables in lockstep with the TypeScript palette", async () => {
    const { readFileSync } = await import("node:fs");
    const { join } = await import("node:path");
    const css = readFileSync(join(process.cwd(), "src/index.css"), "utf8");
    expect(css).toContain(`--primary: ${CALQULUS_COLOR.primary}`);
    expect(css).toContain(`--navy-deep: ${CALQULUS_COLOR.navyDeep}`);
    expect(css).toContain(`--navy-primary: ${CALQULUS_COLOR.navyPrimary}`);
    expect(css).toContain(`--navy-mid: ${CALQULUS_COLOR.navySecondary}`);
    expect(css).toContain(`--success: ${CALQULUS_COLOR.success}`);
    expect(css).toContain(`--warning: ${CALQULUS_COLOR.warning}`);
    expect(css).toContain(`--destructive: ${CALQULUS_COLOR.danger}`);
    expect(css).toContain(`--background: ${CALQULUS_COLOR.background}`);
    expect(css).toContain(`--border: ${CALQULUS_COLOR.border}`);
    expect(css).toContain(`--foreground: ${CALQULUS_COLOR.textPrimary}`);
    expect(css).toContain(`--muted-foreground: ${CALQULUS_COLOR.textMuted}`);
    expect(css).toContain(`--glow: ${CALQULUS_COLOR.glow}`);
    expect(css).toContain(`--spark: ${CALQULUS_COLOR.spark}`);
    expect(css).toContain(`[data-portal="manager"] { --portal-accent: ${CALQULUS_PORTAL_ACCENT.manager.hex}`);
    expect(css).toContain(`[data-portal="landlord"] { --portal-accent: ${CALQULUS_PORTAL_ACCENT.landlord.hex}`);
    expect(css).toContain(`[data-portal="agency"] { --portal-accent: ${CALQULUS_PORTAL_ACCENT.agency.hex}`);
    expect(css).toContain(`[data-portal="tenant"] { --portal-accent: ${CALQULUS_PORTAL_ACCENT.tenant.hex}`);
    expect(css).toContain(`[data-portal="platform_admin"] { --portal-accent: ${CALQULUS_PORTAL_ACCENT.platform_admin.hex}`);
  });
});
