/**
 * Shared chart color palette for CALQULUS PMS.
 * Series colors come from src/shared/theme/tokens.ts so charts match
 * the live primary (executive blue) instead of obsolete gold/navy chrome.
 */
import { CALQULUS_COLOR } from "@/shared/theme/tokens";

export const BRAND_CHART_COLORS = [
  CALQULUS_COLOR.primary,
  CALQULUS_COLOR.info,
  CALQULUS_COLOR.success,
  CALQULUS_COLOR.danger,
  "#4F46E5",
  "#17213D",
  "#7DD3FC",
  "#94A3B8",
] as const;

export const CHART_STATUS_COLORS = {
  positive: CALQULUS_COLOR.success,
  warning: CALQULUS_COLOR.warning,
  negative: CALQULUS_COLOR.danger,
  neutral: CALQULUS_COLOR.textMuted,
} as const;

export function brandChartColor(index: number): string {
  return BRAND_CHART_COLORS[index % BRAND_CHART_COLORS.length];
}
