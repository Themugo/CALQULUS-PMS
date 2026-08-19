import { describe, expect, it } from "vitest";
import { BRAND_CHART_COLORS, CHART_STATUS_COLORS } from "@/shared/lib/chartColors";
import {
  CALQULUS_BRAND,
  CALQULUS_COLOR,
  CALQULUS_DARK_MODE,
  CALQULUS_FIELD,
  CALQULUS_ICON,
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

  it("uses executive blue as primary, not gold", () => {
    expect(CALQULUS_COLOR.primary).toBe("#155EEF");
    expect(CALQULUS_COLOR.primaryHover).toBe("#0E4FCC");
    expect(CALQULUS_COLOR.primaryActive).toBe("#0C3FA8");
    expect(CALQULUS_COLOR.primary).not.toBe("#C9A84C");
  });

  it("keeps light surfaces as the production background", () => {
    expect(CALQULUS_COLOR.background).toBe("#EEF2F8");
    expect(CALQULUS_COLOR.surface).toBe("#FFFFFF");
    expect(CALQULUS_COLOR.surfaceElevated).toBe("#F4F7FB");
  });

  it("defines the full semantic palette", () => {
    expect(CALQULUS_COLOR.success).toBe("#12B76A");
    expect(CALQULUS_COLOR.warning).toBe("#F59E0B");
    expect(CALQULUS_COLOR.danger).toBe("#F04438");
    expect(CALQULUS_COLOR.info).toBe("#0EA5E9");
    expect(CALQULUS_COLOR.border).toBe("#D5DDEA");
    expect(CALQULUS_COLOR.focus).toBe(CALQULUS_COLOR.primary);
  });

  it("aligns PWA chrome with the live brand", () => {
    expect(CALQULUS_PWA.themeColor).toBe(CALQULUS_COLOR.primary);
    expect(CALQULUS_PWA.backgroundColor).toBe(CALQULUS_COLOR.background);
    expect(CALQULUS_PWA.themeColor).not.toBe("#C9A84C");
    expect(CALQULUS_PWA.backgroundColor).not.toBe("#0A1628");
  });

  it("classifies dark mode as dormant light-mirror", () => {
    expect(CALQULUS_DARK_MODE.status).toBe("dormant");
    expect(CALQULUS_DARK_MODE.productionExperience).toBe("light");
    expect(CALQULUS_DARK_MODE.cssStrategy).toBe("light-mirror");
  });

  it("exposes spacing, radius, shadow, type, and field tokens", () => {
    expect(CALQULUS_SPACE[4]).toBe("1rem");
    expect(CALQULUS_RADIUS.card).toBe("0.625rem");
    expect(CALQULUS_SHADOW.card).toContain("23 33 61");
    expect(CALQULUS_TYPE.pageTitle).toBe("type-page-title");
    expect(CALQULUS_FIELD.error).toContain("text-destructive");
    expect(CALQULUS_ICON.md).toBe("h-4 w-4");
  });
});

describe("chart palette follows tokens", () => {
  it("leads with primary blue", () => {
    expect(BRAND_CHART_COLORS[0]).toBe(CALQULUS_COLOR.primary);
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
});
