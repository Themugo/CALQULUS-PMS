import { describe, expect, it } from "vitest";
import { BRAND_CHART_COLORS, CHART_STATUS_COLORS } from "@/shared/lib/chartColors";
import { CALQULUS_BRAND, CALQULUS_COLOR } from "@/shared/theme/tokens";

describe("CALQULUS design tokens", () => {
  it("names the product CALQULUS PMS", () => {
    expect(CALQULUS_BRAND.name).toBe("CALQULUS");
    expect(CALQULUS_BRAND.product).toBe("CALQULUS PMS");
  });

  it("uses executive blue as primary, not gold", () => {
    expect(CALQULUS_COLOR.primary).toBe("#155EEF");
    expect(CALQULUS_COLOR.primary).not.toBe("#C9A84C");
  });

  it("keeps light surfaces as the production background", () => {
    expect(CALQULUS_COLOR.background).toBe("#EEF2F8");
    expect(CALQULUS_COLOR.surface).toBe("#FFFFFF");
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
