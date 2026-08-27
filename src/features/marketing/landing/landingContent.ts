/**
 * Landing-page content model — the single typed source of truth for the
 * public homepage.
 *
 * Every visible marketing element lives here: header, hero, trust strip,
 * capabilities, roles, property types, metrics, final CTA and footer. The
 * presentation layer is a pure projection of this data. Section ordering is
 * expressed in `landing.sections` so a future CMS can reorder without code
 * changes.
 *
 * Editability boundary (see `contentService.ts`): this file holds the TYPED
 * contract + shipped defaults. Persistence/authorization lives behind the
 * service adapter, which is intentionally inert today (no fabricated DB).
 */
import type { LandingTheme } from "@/features/marketing/theme/landingTheme";

/* ────────────────────────── reusable atoms ───────────────────────── */

export interface CtaLink {
  label: string;
  /** Route path or a section hash (e.g. "#platform"). Preserve real routes. */
  href: string;
  /** Only for landing buttons that do not navigate a SPA route. */
  external?: boolean;
}

/* ────────────────────────── brand ────────────────────────────────── */

export interface LandingBrand {
  name: string;
  product: string;
  tagline: string;
  /** Logo mark row → supplied by BrandMark; `logoNote` is optional small text. */
  wordmark: string;
}

/* ────────────────────────── header ───────────────────────────────── */

export interface LandingHeaderNavItem {
  label: string;
  /** Section anchor on the homepage. */
  hash: string;
}

export interface LandingHeader {
  nav: LandingHeaderNavItem[];
  signIn: CtaLink;
  primaryCta: CtaLink;
}

/* ────────────────────────── hero ─────────────────────────────────── */

export interface HeroTrustPoint {
  icon: string;
  label: string;
}

export interface LandingHero {
  eyebrow: string;
  lineA: string;
  lineB: string;
  supporting: string;
  primaryCta: CtaLink;
  secondaryCta: CtaLink;
  trustPoints: HeroTrustPoint[];
}

/* ────────────────────────── dashboard preview ────────────────────── */

export interface DashboardMetric {
  label: string;
  value: string;
  sub: string;
}

export interface DashboardAttentionItem {
  label: string;
  tone: "attention" | "ok";
}

export interface DashboardPreviewContent {
  title: string;
  caption: string;
  snapshot: DashboardMetric[];
  chartTitle: string;
  chartSeriesLabel: string;
  /** Illustrative weekly percentages — labelled as sample data on screen. */
  trend: number[];
  weekTicks: string[];
  portfolioTitle: string;
  portfolioLeft: { label: string; value: string };
  portfolioRight: { label: string; value: string };
  attentionTitle: string;
  attention: DashboardAttentionItem[];
  disclaimer: string;
}

/* ────────────────────────── trust strip ──────────────────────────── */

export interface LandingTrustStrip {
  eyebrow: string;
  items: string[];
}

/* ────────────────────────── capabilities ─────────────────────────── */

export interface LandingCapability {
  id: string;
  icon: string;
  title: string;
  copy: string;
  accent: string;
  /** Optional image; omitted → icon tile only. */
  image?: string;
}

/* ────────────────────────── roles ────────────────────────────────── */

export interface LandingRole {
  id: string;
  icon: string;
  title: string;
  visual: string;
  copy: string;
  cta: CtaLink;
  ctaLabel: string;
  accent: string;
}

/* ────────────────────────── property types ───────────────────────── */

export interface LandingPropertyType {
  id: "residential" | "commercial" | "office";
  icon: string;
  name: string;
  tagline: string;
}

/* ────────────────────────── metrics ──────────────────────────────── */

export interface LandingMetric {
  icon: string;
  value: string;
  /** "illustrative" flag surfaces on the page so nothing reads as a fake stat. */
  illustrative: boolean;
  label: string;
}

/* ────────────────────────── final CTA ────────────────────────────── */

export interface LandingFinalCta {
  eyebrow: string;
  title: string;
  copy: string;
  primary: CtaLink;
  secondary: CtaLink;
}

/* ────────────────────────── footer ───────────────────────────────── */

export interface LandingFooterColumn {
  id: string;
  title: string;
  links: CtaLink[];
  /** Anchor target on the landing when present. */
}

export interface LandingFooter {
  tagline: string;
  columns: LandingFooterColumn[];
  copyright: string;
  legal: string[];
  /* must be nullable so a CMS can leave it out without breaking */
  socials: CtaLink[];
}

/* ────────────────────────── section ordering ─────────────────────── */

export type LandingSectionId =
  | "hero"
  | "trust"
  | "capabilities"
  | "roles"
  | "propertyTypes"
  | "metrics"
  | "finalCta";

/* ────────────────────────── root model ───────────────────────────── */

export interface LandingPageConfig {
  /** Theme tokens — consumed via CSS variables, override per webhost. */
  theme: LandingTheme;
  brand: LandingBrand;
  header: LandingHeader;
  hero: LandingHero;
  dashboard: DashboardPreviewContent;
  trust: LandingTrustStrip;
  capabilities: LandingCapability[];
  roles: LandingRole[];
  propertyTypes: LandingPropertyType[];
  metrics: LandingMetric[];
  finalCta: LandingFinalCta;
  footer: LandingFooter;
  /** Display order — future CMS can reorder sections at runtime. */
  sections: LandingSectionId[];
}

export type LandingPageContent = LandingPageConfig;