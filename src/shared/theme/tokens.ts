/**
 * CALQULUS PMS design tokens — TypeScript source of truth.
 * Keep hex values in sync with CSS variables in src/index.css.
 *
 * Production experience is light. Dark-mode CSS exists only as a
 * classified dormant mirror of these light tokens.
 */
export const CALQULUS_BRAND = {
  name: "CALQULUS",
  product: "CALQULUS PMS",
} as const;

export const CALQULUS_COLOR = {
  primary: "#155EEF",
  primaryHover: "#0E4FCC",
  primaryActive: "#0C3FA8",
  secondary: "#F4F7FB",
  accent: "#155EEF",
  success: "#12B76A",
  warning: "#F59E0B",
  danger: "#F04438",
  info: "#0EA5E9",

  background: "#EEF2F8",
  surface: "#FFFFFF",
  surfaceElevated: "#F4F7FB",

  textPrimary: "#17213D",
  textSecondary: "#5B6B88",
  textMuted: "#5B6B88",

  border: "#D5DDEA",
  focus: "#155EEF",
} as const;

export const CALQULUS_SPACE = {
  1: "0.25rem",
  2: "0.5rem",
  3: "0.75rem",
  4: "1rem",
  5: "1.25rem",
  6: "1.5rem",
  8: "2rem",
  10: "2.5rem",
  12: "3rem",
} as const;

export const CALQULUS_RADIUS = {
  sm: "0.375rem",
  md: "0.5rem",
  lg: "0.625rem",
  card: "0.625rem",
} as const;

export const CALQULUS_ICON = {
  xs: "h-3 w-3",
  sm: "h-3.5 w-3.5",
  md: "h-4 w-4",
  lg: "h-5 w-5",
} as const;
