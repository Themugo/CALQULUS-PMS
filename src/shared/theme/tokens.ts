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
  iconFamily: "lucide-react",
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

/** PWA / native chrome must match the live light brand, not legacy gold/navy. */
export const CALQULUS_PWA = {
  themeColor: CALQULUS_COLOR.primary,
  backgroundColor: CALQULUS_COLOR.background,
} as const;

/**
 * Dark mode is classified dormant: the toggle may persist a preference,
 * but production UI always renders the light token set. Do not delete
 * `.dark` CSS — keep it as a 1:1 light mirror so leftover `dark:`
 * utilities cannot reintroduce a heavy dark dashboard.
 */
export const CALQULUS_DARK_MODE = {
  status: "dormant",
  productionExperience: "light",
  cssStrategy: "light-mirror",
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

export const CALQULUS_SHADOW = {
  none: "none",
  card: "0 1px 2px 0 rgb(23 33 61 / 0.04), 0 1px 1px -1px rgb(23 33 61 / 0.03)",
  elevated: "0 4px 12px -2px rgb(23 33 61 / 0.06)",
} as const;

export const CALQULUS_ICON = {
  xs: "h-3 w-3",
  sm: "h-3.5 w-3.5",
  md: "h-4 w-4",
  lg: "h-5 w-5",
} as const;

/** CSS class names for the global type scale in src/index.css. */
export const CALQULUS_TYPE = {
  pageTitle: "type-page-title",
  sectionTitle: "type-section-title",
  cardTitle: "type-card-title",
  metric: "type-metric",
  body: "type-body",
  meta: "type-meta",
  label: "type-label",
} as const;

/** Shared field chrome — label / control / helper / error. */
export const CALQULUS_FIELD = {
  label: "type-label",
  helper: "text-sm text-muted-foreground",
  error: "text-sm font-medium text-destructive",
  control:
    "flex h-10 w-full rounded-md border border-input bg-surface px-3 py-2 text-sm text-foreground ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive",
} as const;
