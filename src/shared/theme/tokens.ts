/**
 * CALQULUS PMS design tokens — TypeScript source of truth.
 * Keep hex values in sync with CSS variables in src/index.css.
 *
 * Canonical CALQULUS foundation:
 *   Ivory          — dominant application canvas
 *   Deep teal      — brand chrome, primary actions and focus
 *   Ink            — primary content typography
 *   Warm borders   — quiet structure
 *   Portal accents — identity only, never a replacement for semantic status
 *   Green / amber / red — success / warning / danger only
 *
 * Outfit stays for UI. Georgia is the local/system serif display fallback; no runtime webfont dependency.
 * Desks stay light. Never fill pages with black or deep navy.
 */

export const CALQULUS_BRAND = {
  name: "CALQULUS",
  product: "CALQULUS PMS",
  iconFamily: "lucide-react",
} as const;

export const CALQULUS_COLOR = {
  ivory: "#F3EEE3",
  ivorySoft: "#F7F3EA",
  ivoryDeep: "#EAE4D7",
  teal: "#1F625C",
  tealDeep: "#174F4A",
  tealMid: "#2D7069",
  tealSoft: "#DDEBE7",
  tealPale: "#EDF4F1",
  ink: "#24221E",
  inkMuted: "#625F57",
  inkSubtle: "#817C72",
  sage: "#B9D0C9",
  white: "#FFFFFF",
  border: "#D8CFBE",
  borderSoft: "#E4DDCF",

  primary: "#1F625C",
  primaryHover: "#174F4A",
  primaryActive: "#123F3B",
  accent: "#1F625C",

  navyDeep: "#1F625C",
  navyPrimary: "#174F4A",
  navySecondary: "#1F625C",
  navy600: "#2D7069",

  secondary: "#F7F3EA",
  success: "#2F8061",
  warning: "#A66A16",
  danger: "#B94A48",
  info: "#356F6A",
  glow: "#1F625C",
  spark: "#EDF4F1",

  background: "#F3EEE3",
  surface: "#FFFFFF",
  surfaceElevated: "#F7F3EA",
  textPrimary: "#24221E",
  textSecondary: "#625F57",
  textMuted: "#625F57",
  focus: "#1F625C",
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
    hex: CALQULUS_COLOR.teal,
  },
  landlord: {
    id: "landlord",
    label: "Emerald",
    /** Secondary accent only; status colors stay semantic. Approved vs
        the white-desk check in deriveBrandPalette. */
    hex: CALQULUS_COLOR.success,
  },
  agency: {
    id: "agency",
    label: "Cyan",
    /** Indigo/cyan family — matches the agency portal chrome + marketing role
        accent so the token is the single source of truth. Status colours stay
        semantic; the cyan is only identity. */
    hex: CALQULUS_COLOR.tealMid,
  },
  tenant: {
    id: "tenant",
    label: "Sky",
    /** Sky/cool blue family — matches the tenant portal chrome + marketing role
       accent. Status colours stay semantic; the sky is only identity. */
    hex: CALQULUS_COLOR.info,
  },
  platform_admin: {
    id: "platform_admin",
    label: "Teal",
    /** Deep teal step — keeps cyan identity legible on white chrome. */
    hex: CALQULUS_COLOR.tealMid,
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
  sm: "0.25rem",
  md: "0.375rem",
  lg: "0.5rem",
  card: "0.5rem",
} as const;

/** Restrained warm-neutral shadows. No decorative glow. */
export const CALQULUS_SHADOW = {
  none: "none",
  card: "0 1px 2px rgba(36, 34, 30, 0.05)",
  elevated: "0 8px 24px rgba(36, 34, 30, 0.08)",
  modal: "0 20px 50px rgba(36, 34, 30, 0.12)",
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
