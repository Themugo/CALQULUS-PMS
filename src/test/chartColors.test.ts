import { describe, it, expect } from "vitest";
import {
  BRAND_CHART_COLORS,
  CHART_STATUS_COLORS,
  brandChartColor,
} from "@/shared/lib/chartColors";

describe("BRAND_CHART_COLORS", () => {
  it("leads with the gold primary brand accent", () => {
    expect(BRAND_CHART_COLORS[0]).toBe("#C9A84C");
  });

  it("places the blue secondary accent second", () => {
    expect(BRAND_CHART_COLORS[1]).toBe("#1E6FD9");
  });

  it("contains a fixed palette of 8 colors", () => {
    expect(BRAND_CHART_COLORS).toHaveLength(8);
  });

  it("reserves emerald for positive values", () => {
    expect(BRAND_CHART_COLORS).toContain("#10b981");
  });

  it("reserves red for negative values", () => {
    expect(BRAND_CHART_COLORS).toContain("#ef4444");
  });
});

describe("CHART_STATUS_COLORS", () => {
  it("maps positive to emerald", () => {
    expect(CHART_STATUS_COLORS.positive).toBe("#10b981");
  });

  it("maps warning to amber", () => {
    expect(CHART_STATUS_COLORS.warning).toBe("#f59e0b");
  });

  it("maps negative to red", () => {
    expect(CHART_STATUS_COLORS.negative).toBe("#ef4444");
  });

  it("maps neutral to slate", () => {
    expect(CHART_STATUS_COLORS.neutral).toBe("#94a3b8");
  });
});

describe("brandChartColor", () => {
  it("returns the first palette color for index 0", () => {
    expect(brandChartColor(0)).toBe(BRAND_CHART_COLORS[0]);
  });

  it("returns the last palette color for the maximum in-bounds index", () => {
    expect(brandChartColor(BRAND_CHART_COLORS.length - 1)).toBe(
      BRAND_CHART_COLORS[BRAND_CHART_COLORS.length - 1]
    );
  });

  it("wraps around to the start when the index equals the palette length", () => {
    expect(brandChartColor(BRAND_CHART_COLORS.length)).toBe(BRAND_CHART_COLORS[0]);
  });

  it("wraps around correctly for large indices", () => {
    expect(brandChartColor(BRAND_CHART_COLORS.length + 3)).toBe(BRAND_CHART_COLORS[3]);
  });

  it("wraps around for a multiple of the palette length", () => {
    expect(brandChartColor(BRAND_CHART_COLORS.length * 2)).toBe(BRAND_CHART_COLORS[0]);
  });
});
