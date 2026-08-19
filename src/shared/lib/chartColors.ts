/**
 * Shared chart color palette for CALQULUS PMS.
 *
 * Mirrors the documented brand palette in src/index.css ("CALQULUS PMS
 * Design Tokens" comment block) so that recharts/visx-style data series
 * across the app lead with the actual brand identity (gold + blue accent)
 * instead of each dashboard reaching for its own arbitrary Tailwind
 * defaults (indigo-500, violet-500, sky-500, etc.), which is how several
 * charts ended up looking unrelated to the navy/gold landing page.
 *
 * Use BRAND_CHART_COLORS for ordered/categorical series (pie slices, bar
 * groups, line series) — brand colors first, then a curated extended set
 * for series beyond the first two.
 */
export const BRAND_CHART_COLORS = [
  "#C9A84C", // Gold — brand primary accent
  "#1E6FD9", // Blue Accent — brand secondary accent
  "#10b981", // Emerald — reserved for "good"/positive values across the app
  "#ef4444", // Red — reserved for "bad"/negative or overdue values
  "#8B6E2A", // Gold Dim — deeper brand gold for a 5th series
  "#0F2040", // Navy Mid — brand navy for a 6th series
  "#E8C96E", // Gold Light — lighter brand gold for a 7th series
  "#5B8FE0", // Lighter blue accent for an 8th series
] as const;

/** Semantic status colors — keep these consistent with success/warning/destructive
 *  tokens in index.css so "green = good, red = bad" reads the same everywhere. */
export const CHART_STATUS_COLORS = {
  positive: "#10b981",
  warning: "#f59e0b",
  negative: "#ef4444",
  neutral: "#94a3b8",
} as const;

/** Convenience getter for a color by series index, wrapping around the palette. */
export function brandChartColor(index: number): string {
  return BRAND_CHART_COLORS[index % BRAND_CHART_COLORS.length];
}
