/**
 * CALQULUS PMS design tokens — TypeScript source of truth.
 * Keep hex values in sync with CSS variables in src/index.css.
 *
 * Master redesign foundation:
 *   White / mist — dominant application surfaces
 *   Navy          — brand chrome (header, sidebar, footer), not page fill
 *   Interactive   — professional blue for buttons, links, focus
 *   Portal accents — 2px identity only, not separate design systems
 *   Green / amber / red — success / warning / danger only
 *
 * Outfit stays. Do not switch to Inter.
 * Desks stay light. Never fill pages with black or deep navy.
 */

export const CALQULUS_BRAND = {
  name: "CALQULUS",
  product: "CALQULUS PMS",
  iconFamily: "lucide-react",
} as const;

export const CALQULUS_COLOR = {
  /** Interactive blue — buttons, links, focus, selected controls. */
  primary: "#2F6FED",
  primaryHover: "#4C84F0",
  primaryActive: "#2459D6",
  accent: "#2F6FED",

  /** Navy identity scale — chrome only, never a page fill. */
  navyDeep: "#081A2E",
  navyPrimary: "#0D2744",
  navySecondary: "#173F67",

  white: "#FFFFFF",
  secondary: "#F7F9FC",
  success: "#23856B",
  warning: "#B7791F",
  danger: "#C84B4B",
  info: "#2F6FED",

  /** Atmosphere on navy chrome only. */
  glow: "#2F6FED",
  /** Reserved spark — not used as chrome. */
  spark: "#F5A524",

  background: "#F7F9FC",
  surface: "#FFFFFF",
  surfaceElevated: "#F7F9FC",

  textPrimary: "#102033",
  textSecondary: "#637286",
  textMuted: "#637286",

  border: "#E5EAF0",
  focus: "#2F6FED",
} as const;

/**
 * Portal identity accents — thin chrome only.
 * Not a second design system. Desks stay white + navy + shared interactive blue.
 * Status colour (success / warning / danger) is never replaced by these.
 */
export const CALQULUS_PORTAL_ACCENT = {
  manager: {
    id: "manager",
    label: "Professional Blue",
    hex: CALQULUS_COLOR.primary,
  },
  landlord: {
    id: "landlord",
    label: "Emerald",
    hex: CALQULUS_COLOR.success,
  },
  agency: {
    id: "agency",
    label: "Amber",
    /** Darker than marketing spark so text/chrome on white meets contrast. */
    hex: "#9A5A16",
  },
  tenant: {
    id: "tenant",
    label: "Violet",
    hex: "#5C4A8A",
  },
  platform_admin: {
    id: "platform_admin",
    label: "Indigo",
    hex: "#3E4C94",
  },
} as const;

/** PWA chrome matches navy identity, not a light browser default. */
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
  marketingChrome: "navy-mid",
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
  lg: "0.75rem",
  card: "0.75rem",
} as const;

/** Shadows tint with navy. No decorative glow. */
export const CALQULUS_SHADOW = {
  none: "none",
  card: "0 1px 2px 0 rgb(13 39 68 / 0.06), 0 1px 1px -1px rgb(13 39 68 / 0.04)",
  elevated: "0 8px 24px -12px rgb(13 39 68 / 0.16), 0 0 0 1px rgb(13 39 68 / 0.06)",
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
