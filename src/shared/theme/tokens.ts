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
  primary: "#356FE5",
  primaryHover: "#285FCC",
  primaryActive: "#214FAE",
  accent: "#356FE5",

  /** Navy identity scale — chrome only, never a page fill. */
  navyDeep: "#0B2239",
  navyPrimary: "#173650",
  navySecondary: "#31577E",

  white: "#FFFFFF",
  secondary: "#F6F8FB",
  success: "#2F8061",
  warning: "#A66A16",
  danger: "#B94A48",
  info: "#3E6FAE",

  /** Atmosphere on navy chrome only. */
  glow: "#356FE5",
  /** Reserved spark — not used as chrome. */
  spark: "#FFF4DF",

  background: "#F6F8FB",
  surface: "#FFFFFF",
  surfaceElevated: "#F6F8FB",

  textPrimary: "#102A43",
  textSecondary: "#5F7185",
  textMuted: "#5F7185",

  border: "#DCE5EF",
  focus: "#356FE5",
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
    hex: CALQULUS_COLOR.warning,
  },
  tenant: {
    id: "tenant",
    label: "Slate Navy",
    hex: "#6388AE",
  },
  platform_admin: {
    id: "platform_admin",
    label: "Steel Navy",
    hex: "#426B94",
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
  card: "0 1px 2px rgba(16, 42, 67, 0.05)",
  elevated: "0 8px 24px rgba(16, 42, 67, 0.08)",
  modal: "0 20px 50px rgba(16, 42, 67, 0.12)",
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
  /** H4 (16-18px) - a subsection heading nested inside a card/section. */
  subTitle: "type-subtitle",
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
