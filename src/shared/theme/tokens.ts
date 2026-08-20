/**
 * CALQULUS PMS design tokens — TypeScript source of truth.
 * Keep hex values in sync with CSS variables in src/index.css.
 *
 * Palette is taken from the Frameworks / CALQULUS identity card:
 *   Navy  — night chrome (nav, sidebar, footer, marketing close)
 *   Cyan  — interaction (buttons, links, focus, active nav)
 *   White — type on navy; card surfaces in the operational app
 *   Royal — atmospheric glow only, never body text
 *   Spark — city-light flecks on marketing only, never chrome
 *   Green / amber / red — success / warning / danger only
 *
 * Marketing and app chrome are navy. Operational desks stay light
 * so tables, forms, and invoices remain readable.
 */

export const CALQULUS_BRAND = {
  name: "CALQULUS",
  product: "CALQULUS PMS",
  iconFamily: "lucide-react",
} as const;

export const CALQULUS_COLOR = {
  /** Electric cyan — buttons, links, focus, selected controls. */
  primary: "#1AD4E4",
  primaryHover: "#3DDBF0",
  primaryActive: "#12B8C8",
  accent: "#1AD4E4",

  /** Navy identity scale from the card. */
  navyDeep: "#040B16",
  navyPrimary: "#0A1A32",
  navySecondary: "#123056",

  white: "#FFFFFF",
  secondary: "#F3F7FB",
  success: "#23856B",
  warning: "#B7791F",
  danger: "#C84B4B",
  info: "#1AD4E4",

  /** Royal blue glow — atmosphere on navy surfaces only. */
  glow: "#1B4FBF",
  /** Warm city-light fleck — marketing sparkle only. */
  spark: "#F5A524",

  background: "#F3F7FB",
  surface: "#FFFFFF",
  surfaceElevated: "#F3F7FB",

  textPrimary: "#0E1C2E",
  textSecondary: "#5A6E82",
  textMuted: "#5A6E82",

  border: "#D7E2EC",
  focus: "#1AD4E4",
} as const;

/** PWA chrome matches the navy identity, not a light browser default. */
export const CALQULUS_PWA = {
  themeColor: CALQULUS_COLOR.navyPrimary,
  backgroundColor: CALQULUS_COLOR.background,
} as const;

/**
 * Dark mode is classified dormant: the toggle may persist a preference,
 * but production UI always renders the light token set for desks.
 * Marketing chrome is navy by class, not by `.dark`.
 */
export const CALQULUS_DARK_MODE = {
  status: "dormant",
  productionExperience: "light-desk",
  marketingChrome: "navy-night",
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

/** Shadows tint with navy, with a faint cyan lift on elevated cards. */
export const CALQULUS_SHADOW = {
  none: "none",
  card: "0 1px 2px 0 rgb(4 11 22 / 0.05), 0 1px 1px -1px rgb(4 11 22 / 0.04)",
  elevated: "0 8px 24px -12px rgb(4 11 22 / 0.18), 0 0 0 1px rgb(26 212 228 / 0.08)",
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
