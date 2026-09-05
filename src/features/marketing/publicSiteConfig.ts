import { PROPERTY_IMAGES } from "@/features/marketing/propertyImages";
import { PUBLIC_ROUTES } from "@/features/marketing/publicConfig";

export type PublicSiteSectionId = "hero" | "property-types" | "featured" | "portals" | "promotions" | "platform" | "cta";
export type HeroFitMode = "screen" | "window";

export interface PublicSiteHeroSlide {
  id: string;
  eyebrow: string;
  title: string;
  copy: string;
  primaryLabel: string;
  primaryHref: string;
  secondaryLabel: string;
  secondaryHref: string;
  image: string | null;
  mobileImage: string | null;
  enabled: boolean;
}

export interface PublicSitePropertyType {
  id: string;
  title: string;
  description: string;
  image: string | null;
  icon: "home" | "building" | "office" | "landmark";
  href: string;
  enabled: boolean;
}

export interface PublicSitePortal {
  id: "manager" | "landlord" | "agency" | "tenant";
  eyebrow: string;
  title: string;
  description: string;
  image: string | null;
  href: string;
  enabled: boolean;
}

export interface PublicSiteFeaturedCard {
  id: string;
  eyebrow: string;
  title: string;
  location: string;
  detail: string;
  price: string;
  image: string | null;
  href: string;
  enabled: boolean;
}

export interface PublicSitePromotion {
  id: string;
  label: string;
  title: string;
  copy: string;
  image: string | null;
  href: string;
  enabled: boolean;
}

export interface PublicSiteConfig {
  version: 1;
  shell: {
    header: { pricingLabel: string; signInLabel: string; getStartedLabel: string };
    footer: { tagline: string; showPlatform: boolean; showPortals: boolean; showCompany: boolean };
  };
  platformValue: {
    eyebrow: string;
    title: string;
    copy: string;
    cards: Array<{ id: string; title: string; copy: string; icon: "property" | "money" | "operations" }>;
  };
  cta: { eyebrow: string; title: string; copy: string; primaryLabel: string; primaryHref: string; secondaryLabel: string; secondaryHref: string };
  hero: {
    fitMode: HeroFitMode;
    autoplay: boolean;
    intervalMs: number;
    overlay: "soft" | "medium" | "strong";
    slides: PublicSiteHeroSlide[];
  };
  propertyTypes: PublicSitePropertyType[];
  featured: PublicSiteFeaturedCard[];
  portals: PublicSitePortal[];
  promotions: PublicSitePromotion[];
  sections: Array<{ id: PublicSiteSectionId; visible: boolean; order: number; variant: "default" | "compact" | "wide" }>;
}

export const DEFAULT_PUBLIC_SITE_CONFIG: PublicSiteConfig = {
  version: 1,
  shell: {
    header: { pricingLabel: "Pricing", signInLabel: "Sign in", getStartedLabel: "Get started" },
    footer: { tagline: "Property operations, connected — from the portfolio to the people who use it.", showPlatform: true, showPortals: true, showCompany: true },
  },
  platformValue: {
    eyebrow: "THE CALQULUS DIFFERENCE",
    title: "One connected view of the property lifecycle.",
    copy: "Built around the work property teams actually do — not a pile of disconnected tools.",
    cards: [
      { id: "property", title: "Property control", copy: "Buildings, units, occupancy and portfolio context in one place.", icon: "property" },
      { id: "money", title: "Financial clarity", copy: "Billing, collections, payments and reconciliation with a clear trail.", icon: "money" },
      { id: "operations", title: "Operational follow-through", copy: "Maintenance and daily work move from request to resolution.", icon: "operations" },
    ],
  },
  cta: {
    eyebrow: "READY WHEN YOU ARE",
    title: "Bring your property operation into focus.",
    copy: "Start with the essentials and grow the platform around your operation.",
    primaryLabel: "Get started",
    primaryHref: PUBLIC_ROUTES.managerSignUp,
    secondaryLabel: "Sign in",
    secondaryHref: PUBLIC_ROUTES.managerSignIn,
  },
  hero: {
    fitMode: "window",
    autoplay: false,
    intervalMs: 6000,
    overlay: "soft",
    slides: [
      {
        id: "hero-1",
        eyebrow: "PROPERTY OPERATIONS, CONNECTED",
        title: "Property management, without the clutter.",
        copy: "CALQULUS brings properties, tenants, leases, billing, payments and maintenance into one focused workspace.",
        primaryLabel: "Start managing",
        primaryHref: PUBLIC_ROUTES.managerSignUp,
        secondaryLabel: "Explore the platform",
        secondaryHref: "#platform",
        image: PROPERTY_IMAGES.residential,
        mobileImage: PROPERTY_IMAGES.residential,
        enabled: true,
      },
      {
        id: "hero-2",
        eyebrow: "ONE CONNECTED PROPERTY EXPERIENCE",
        title: "From portfolio to people, one system.",
        copy: "Give managers, landlords, agencies and tenants a clear place to work, communicate and stay on top of the property lifecycle.",
        primaryLabel: "Explore portals",
        primaryHref: "#portals",
        secondaryLabel: "See the platform",
        secondaryHref: "#platform",
        image: PROPERTY_IMAGES.commercial,
        mobileImage: PROPERTY_IMAGES.commercial,
        enabled: true,
      },
    ],
  },
  propertyTypes: [
    { id: "residential", title: "Residentials", description: "Homes, apartments and rental communities.", image: PROPERTY_IMAGES.residential, icon: "home", href: "/discover/residential", enabled: true },
    { id: "estates", title: "Estates", description: "Managed estates and multi-unit communities.", image: PROPERTY_IMAGES.commercial, icon: "building", href: "/discover/estates", enabled: true },
    { id: "offices", title: "Offices", description: "Professional spaces and managed work environments.", image: PROPERTY_IMAGES.office, icon: "office", href: "/discover/offices", enabled: true },
    { id: "institutions", title: "Institutions", description: "Purpose-built property portfolios and facilities.", image: PROPERTY_IMAGES.commercial, icon: "landmark", href: "/discover/institutions", enabled: true },
  ],
  featured: [
    { id: "featured-1", eyebrow: "FEATURED", title: "Featured property showcase", location: "Add location from Admin", detail: "Add bedrooms, units or key attributes", price: "Add price or rent", image: PROPERTY_IMAGES.residential, href: "/discover/residential", enabled: false },
    { id: "featured-2", eyebrow: "FEATURED", title: "Your next listing", location: "Add location from Admin", detail: "Add property highlights", price: "Add price or rent", image: PROPERTY_IMAGES.office, href: "/discover/offices", enabled: false },
    { id: "featured-3", eyebrow: "FEATURED", title: "Promote a property", location: "Add location from Admin", detail: "Add key property details", price: "Add price or rent", image: PROPERTY_IMAGES.commercial, href: "/discover/estates", enabled: false },
  ],
  portals: [
    { id: "manager", eyebrow: "OPERATIONS", title: "Manager", description: "Run properties, people, billing and maintenance from one desk.", image: PROPERTY_IMAGES.office, href: PUBLIC_ROUTES.managerSignIn, enabled: true },
    { id: "landlord", eyebrow: "OWNERSHIP", title: "Landlord", description: "See your portfolio, financials, statements and property performance.", image: PROPERTY_IMAGES.residential, href: PUBLIC_ROUTES.landlordLogin, enabled: true },
    { id: "agency", eyebrow: "CLIENT PORTFOLIOS", title: "Agency", description: "Manage client portfolios with a connected operational view.", image: PROPERTY_IMAGES.commercial, href: PUBLIC_ROUTES.agencyLogin, enabled: true },
    { id: "tenant", eyebrow: "YOUR HOME", title: "Tenant", description: "Keep rent, documents, maintenance and communication together.", image: PROPERTY_IMAGES.residential, href: PUBLIC_ROUTES.tenantLogin, enabled: true },
  ],
  promotions: [
    { id: "promo-1", label: "PROMOTED", title: "Your next featured property can live here.", copy: "Replace this placeholder with an active listing, campaign or platform message from Admin.", image: PROPERTY_IMAGES.commercial, href: "/discover/estates", enabled: true },
    { id: "promo-2", label: "CALQULUS", title: "A clearer way to run property operations.", copy: "Keep the platform message fresh without changing the page structure.", image: PROPERTY_IMAGES.office, href: PUBLIC_ROUTES.managerSignUp, enabled: true },
  ],
  sections: [
    { id: "hero", visible: true, order: 10, variant: "default" },
    { id: "property-types", visible: true, order: 20, variant: "default" },
    { id: "featured", visible: true, order: 30, variant: "default" },
    { id: "portals", visible: true, order: 40, variant: "default" },
    { id: "promotions", visible: true, order: 50, variant: "wide" },
    { id: "platform", visible: true, order: 60, variant: "default" },
    { id: "cta", visible: true, order: 70, variant: "compact" },
  ],
};

export function mergePublicSiteConfig(input: unknown): PublicSiteConfig {
  if (!input || typeof input !== "object") return DEFAULT_PUBLIC_SITE_CONFIG;
  const source = input as Partial<PublicSiteConfig>;
  const hero = source.hero && typeof source.hero === "object" ? source.hero : {};
  return {
    ...DEFAULT_PUBLIC_SITE_CONFIG,
    ...source,
    shell: { ...DEFAULT_PUBLIC_SITE_CONFIG.shell, ...(source.shell || {}), header: { ...DEFAULT_PUBLIC_SITE_CONFIG.shell.header, ...(source.shell?.header || {}) }, footer: { ...DEFAULT_PUBLIC_SITE_CONFIG.shell.footer, ...(source.shell?.footer || {}) } },
    platformValue: { ...DEFAULT_PUBLIC_SITE_CONFIG.platformValue, ...(source.platformValue || {}) },
    cta: { ...DEFAULT_PUBLIC_SITE_CONFIG.cta, ...(source.cta || {}) },
    hero: {
      ...DEFAULT_PUBLIC_SITE_CONFIG.hero,
      ...hero,
      slides: Array.isArray((hero as PublicSiteConfig["hero"]).slides) && (hero as PublicSiteConfig["hero"]).slides.length
        ? (hero as PublicSiteConfig["hero"]).slides
        : DEFAULT_PUBLIC_SITE_CONFIG.hero.slides,
    },
    propertyTypes: Array.isArray(source.propertyTypes) && source.propertyTypes.length ? source.propertyTypes : DEFAULT_PUBLIC_SITE_CONFIG.propertyTypes,
    featured: Array.isArray(source.featured) ? source.featured : DEFAULT_PUBLIC_SITE_CONFIG.featured,
    portals: Array.isArray(source.portals) && source.portals.length ? source.portals : DEFAULT_PUBLIC_SITE_CONFIG.portals,
    promotions: Array.isArray(source.promotions) ? source.promotions : DEFAULT_PUBLIC_SITE_CONFIG.promotions,
    sections: Array.isArray(source.sections) && source.sections.length ? source.sections : DEFAULT_PUBLIC_SITE_CONFIG.sections,
  } as PublicSiteConfig;
}

export const PUBLIC_SITE_SECTION_LABELS: Record<PublicSiteSectionId, string> = {
  hero: "Hero",
  "property-types": "Property types",
  featured: "Featured properties",
  portals: "Portals",
  promotions: "Promotions / adverts",
  platform: "Platform value",
  cta: "Conversion CTA",
};
