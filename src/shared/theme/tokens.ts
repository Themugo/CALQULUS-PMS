/**
 * CALQULUS PMS design tokens — TypeScript source of truth.
 * Keep hex values in sync with CSS variables in src/index.css.
 *
 * Palette is taken from the Frameworks / CALQULUS identity card:
 *   Navy  — mid-navy chrome (nav, sidebar, footer)
 *   Cyan  — interaction (buttons, links, focus, active nav)
 *   White / mist — desks and the public website canvas
 *   Royal — atmospheric glow only, never body text
 *   Green / amber / red — success / warning / danger only
 *
 * The public site is a light operating system, not a navy marketing poster.
 * Header and footer stay navy. Operational desks stay light.
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

  /** Mid-navy identity scale — no near-black floor. */
  navyDeep: "#123056",
  navyPrimary: "#164272",
  navySecondary: "#1E558C",

  white: "#FFFFFF",
  secondary: "#F3F7FB",
  success: "#23856B",
  warning: "#B7791F",
  danger: "#C84B4B",
  info: "#1AD4E4",

  /** Royal blue glow — atmosphere on navy surfaces only. */
  glow: "#1B4FBF",
  /** Reserved spark — not used on the public website. */
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

/**
 * Portal identity accents — thin chrome only.
 * Not a second design system. Desks stay white + navy + cyan interaction.
 * Status colour (success / warning / danger) is never replaced by these.
 */
export const CALQULUS_PORTAL_ACCENT = {
  manager: {
    id: "manager",
    label: "Navy / Professional Blue",
    hex: CALQULUS_COLOR.navySecondary,
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
  lg: "0.625rem",
  card: "0.625rem",
} as const;

/** Shadows tint with navy, with a faint cyan lift on elevated cards. */
export const CALQULUS_SHADOW = {
  none: "none",
  card: "0 1px 2px 0 rgb(18 48 86 / 0.06), 0 1px 1px -1px rgb(18 48 86 / 0.04)",
  elevated: "0 8px 24px -12px rgb(18 48 86 / 0.16), 0 0 0 1px rgb(26 212 228 / 0.10)",
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
