/**
 * CALQULUS landing-page theme — a self-contained design-token layer for the
 * PUBLIC marketing surface.
 *
 * This is deliberately separate from the in-app design system. The public
 * homepage needs a *premium brilliant-navy* identity that reads as a
 * conversion surface, while the product desks keep their light operational
 * palette. Component code never hard-codes a colour — it consumes these
 * tokens (as CSS variables via `applyLandingTheme`) so a webhost can later
 * restyle the whole page from one place.
 *
 * Values mirror `--calqulus-landing-*` CSS variables (see src/index.css).
 */

export interface LandingTheme {
  /** Brilliant navy — brand identity, hero bands, CTA fills. */
  primary: string;
  /** Deep step of the brilliant navy — buttons/dark sections under it. */
  primaryDark: string;
  /** Soft tinted blue used behind light surfaces/icons. */
  primaryLight: string;
  /** Electric blue — interactive highlights, links, progress. */
  accent: string;
  /** Cyan accent — thin markers, charts, data accents. */
  cyan: string;
  /** Page background — light, neutral, breathing room. */
  background: string;
  /** Card / lighter surfaces on top of `background`. */
  surface: string;
  /** Headings & strong text. */
  textPrimary: string;
  /** Secondary body text. */
  textSecondary: string;
  /** Hairline borders & card edges. */
  border: string;
  success: string;
  warning: string;
  danger: string;
}

export const LANDING_THEME: LandingTheme = {
  primary: "#123F8C",
  primaryDark: "#0B2F6B",
  primaryLight: "#EAF2FF",
  accent: "#2F6FED",
  cyan: "#16B8C4",
  background: "#F7F9FC",
  surface: "#FFFFFF",
  textPrimary: "#10233F",
  textSecondary: "#5E6F86",
  border: "#DCE5F0",
  success: "#159A72",
  warning: "#D99A25",
  danger: "#D9535B",
} as const;

/** Serialize the token set into CSS custom-property declarations. */
export function landingThemeToCssVars(theme: LandingTheme = LANDING_THEME): Record<string, string> {
  return Object.fromEntries(
    Object.entries(theme).map(([key, val]) => [`--calqulus-landing-${key}`, val]),
  );
}

/** Brute luminance check used to keep role-accent text legible on cards. */
export function isLight(hex: string): boolean {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return false;
  const n = parseInt(m[1], 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return luminance >= 140;
}