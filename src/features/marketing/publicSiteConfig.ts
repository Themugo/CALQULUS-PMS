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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function nonEmptyString(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim() ? value : fallback;
}

function booleanValue(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function sanitizeHeroSlides(value: unknown): PublicSiteHeroSlide[] {
  if (!Array.isArray(value)) return DEFAULT_PUBLIC_SITE_CONFIG.hero.slides;
  const defaults = DEFAULT_PUBLIC_SITE_CONFIG.hero.slides;
  const result = value.filter(isRecord).map((item, index) => {
    const fallback = defaults[index % defaults.length];
    return {
      id: nonEmptyString(item.id, fallback.id),
      eyebrow: nonEmptyString(item.eyebrow, fallback.eyebrow),
      title: nonEmptyString(item.title, fallback.title),
      copy: nonEmptyString(item.copy, fallback.copy),
      primaryLabel: nonEmptyString(item.primaryLabel, fallback.primaryLabel),
      primaryHref: nonEmptyString(item.primaryHref, fallback.primaryHref),
      secondaryLabel: nonEmptyString(item.secondaryLabel, fallback.secondaryLabel),
      secondaryHref: nonEmptyString(item.secondaryHref, fallback.secondaryHref),
      image: typeof item.image === "string" && item.image ? item.image : fallback.image,
      mobileImage: typeof item.mobileImage === "string" && item.mobileImage ? item.mobileImage : fallback.mobileImage,
      enabled: booleanValue(item.enabled, fallback.enabled),
    };
  });
  return result.length ? result : defaults;
}

function sanitizePropertyTypes(value: unknown): PublicSitePropertyType[] {
  if (!Array.isArray(value)) return DEFAULT_PUBLIC_SITE_CONFIG.propertyTypes;
  const defaults = DEFAULT_PUBLIC_SITE_CONFIG.propertyTypes;
  const result = value.filter(isRecord).map((item, index) => {
    const fallback = defaults[index % defaults.length];
    const icon = item.icon === "home" || item.icon === "building" || item.icon === "office" || item.icon === "landmark" ? item.icon : fallback.icon;
    return {
      id: nonEmptyString(item.id, fallback.id),
      title: nonEmptyString(item.title, fallback.title),
      description: nonEmptyString(item.description, fallback.description),
      image: typeof item.image === "string" && item.image ? item.image : fallback.image,
      icon,
      href: nonEmptyString(item.href, fallback.href),
      enabled: booleanValue(item.enabled, fallback.enabled),
    };
  });
  return result.length ? result : defaults;
}

function sanitizePortals(value: unknown): PublicSitePortal[] {
  if (!Array.isArray(value)) return DEFAULT_PUBLIC_SITE_CONFIG.portals;
  const defaults = DEFAULT_PUBLIC_SITE_CONFIG.portals;
  const result = value.filter(isRecord).map((item, index) => {
    const fallback = defaults[index % defaults.length];
    const id = item.id === "manager" || item.id === "landlord" || item.id === "agency" || item.id === "tenant" ? item.id : fallback.id;
    return {
      id,
      eyebrow: nonEmptyString(item.eyebrow, fallback.eyebrow),
      title: nonEmptyString(item.title, fallback.title),
      description: nonEmptyString(item.description, fallback.description),
      image: typeof item.image === "string" && item.image ? item.image : fallback.image,
      href: nonEmptyString(item.href, fallback.href),
      enabled: booleanValue(item.enabled, fallback.enabled),
    };
  });
  return result.length ? result : defaults;
}

function sanitizeFeatured(value: unknown): PublicSiteFeaturedCard[] {
  if (!Array.isArray(value)) return DEFAULT_PUBLIC_SITE_CONFIG.featured;
  const defaults = DEFAULT_PUBLIC_SITE_CONFIG.featured;
  return value.filter(isRecord).map((item, index) => {
    const fallback = defaults[index % defaults.length];
    return {
      id: nonEmptyString(item.id, fallback.id),
      eyebrow: nonEmptyString(item.eyebrow, fallback.eyebrow),
      title: nonEmptyString(item.title, fallback.title),
      location: nonEmptyString(item.location, fallback.location),
      detail: nonEmptyString(item.detail, fallback.detail),
      price: nonEmptyString(item.price, fallback.price),
      image: typeof item.image === "string" && item.image ? item.image : fallback.image,
      href: nonEmptyString(item.href, fallback.href),
      enabled: booleanValue(item.enabled, fallback.enabled),
    };
  });
}

function sanitizePromotions(value: unknown): PublicSitePromotion[] {
  if (!Array.isArray(value)) return DEFAULT_PUBLIC_SITE_CONFIG.promotions;
  const defaults = DEFAULT_PUBLIC_SITE_CONFIG.promotions;
  return value.filter(isRecord).map((item, index) => {
    const fallback = defaults[index % defaults.length];
    return {
      id: nonEmptyString(item.id, fallback.id),
      label: nonEmptyString(item.label, fallback.label),
      title: nonEmptyString(item.title, fallback.title),
      copy: nonEmptyString(item.copy, fallback.copy),
      image: typeof item.image === "string" && item.image ? item.image : fallback.image,
      href: nonEmptyString(item.href, fallback.href),
      enabled: booleanValue(item.enabled, fallback.enabled),
    };
  });
}

function sanitizePlatformCards(value: unknown) {
  if (!Array.isArray(value)) return DEFAULT_PUBLIC_SITE_CONFIG.platformValue.cards;
  const defaults = DEFAULT_PUBLIC_SITE_CONFIG.platformValue.cards;
  const result = value.filter(isRecord).map((item, index) => {
    const fallback = defaults[index % defaults.length];
    const icon = item.icon === "property" || item.icon === "money" || item.icon === "operations" ? item.icon : fallback.icon;
    return {
      id: nonEmptyString(item.id, fallback.id),
      title: nonEmptyString(item.title, fallback.title),
      copy: nonEmptyString(item.copy, fallback.copy),
      icon,
    };
  });
  return result.length ? result : defaults;
}

export function mergePublicSiteConfig(input: unknown): PublicSiteConfig {
  if (!isRecord(input)) return DEFAULT_PUBLIC_SITE_CONFIG;
  const source = input;
  const sourceShell = isRecord(source.shell) ? source.shell : {};
  const sourceHeader = isRecord(sourceShell.header) ? sourceShell.header : {};
  const sourceFooter = isRecord(sourceShell.footer) ? sourceShell.footer : {};
  const sourcePlatform = isRecord(source.platformValue) ? source.platformValue : {};
  const sourceCta = isRecord(source.cta) ? source.cta : {};
  const sourceHero = isRecord(source.hero) ? source.hero : {};

  const sections = Array.isArray(source.sections)
    ? source.sections.filter(isRecord).map((item, index) => {
        const fallback = DEFAULT_PUBLIC_SITE_CONFIG.sections[index % DEFAULT_PUBLIC_SITE_CONFIG.sections.length];
        const id = DEFAULT_PUBLIC_SITE_CONFIG.sections.some((section) => section.id === item.id) ? item.id as PublicSiteSectionId : fallback.id;
        const variant = item.variant === "compact" || item.variant === "wide" ? item.variant : "default";
        const order = typeof item.order === "number" && Number.isFinite(item.order) ? item.order : fallback.order;
        return { id, visible: booleanValue(item.visible, fallback.visible), order, variant };
      })
    : DEFAULT_PUBLIC_SITE_CONFIG.sections;

  const result: PublicSiteConfig = {
    ...DEFAULT_PUBLIC_SITE_CONFIG,
    version: 1,
    shell: {
      header: {
        pricingLabel: nonEmptyString(sourceHeader.pricingLabel, DEFAULT_PUBLIC_SITE_CONFIG.shell.header.pricingLabel),
        signInLabel: nonEmptyString(sourceHeader.signInLabel, DEFAULT_PUBLIC_SITE_CONFIG.shell.header.signInLabel),
        getStartedLabel: nonEmptyString(sourceHeader.getStartedLabel, DEFAULT_PUBLIC_SITE_CONFIG.shell.header.getStartedLabel),
      },
      footer: {
        tagline: nonEmptyString(sourceFooter.tagline, DEFAULT_PUBLIC_SITE_CONFIG.shell.footer.tagline),
        showPlatform: booleanValue(sourceFooter.showPlatform, DEFAULT_PUBLIC_SITE_CONFIG.shell.footer.showPlatform),
        showPortals: booleanValue(sourceFooter.showPortals, DEFAULT_PUBLIC_SITE_CONFIG.shell.footer.showPortals),
        showCompany: booleanValue(sourceFooter.showCompany, DEFAULT_PUBLIC_SITE_CONFIG.shell.footer.showCompany),
      },
    },
    platformValue: {
      eyebrow: nonEmptyString(sourcePlatform.eyebrow, DEFAULT_PUBLIC_SITE_CONFIG.platformValue.eyebrow),
      title: nonEmptyString(sourcePlatform.title, DEFAULT_PUBLIC_SITE_CONFIG.platformValue.title),
      copy: nonEmptyString(sourcePlatform.copy, DEFAULT_PUBLIC_SITE_CONFIG.platformValue.copy),
      cards: sanitizePlatformCards(sourcePlatform.cards),
    },
    cta: {
      eyebrow: nonEmptyString(sourceCta.eyebrow, DEFAULT_PUBLIC_SITE_CONFIG.cta.eyebrow),
      title: nonEmptyString(sourceCta.title, DEFAULT_PUBLIC_SITE_CONFIG.cta.title),
      copy: nonEmptyString(sourceCta.copy, DEFAULT_PUBLIC_SITE_CONFIG.cta.copy),
      primaryLabel: nonEmptyString(sourceCta.primaryLabel, DEFAULT_PUBLIC_SITE_CONFIG.cta.primaryLabel),
      primaryHref: nonEmptyString(sourceCta.primaryHref, DEFAULT_PUBLIC_SITE_CONFIG.cta.primaryHref),
      secondaryLabel: nonEmptyString(sourceCta.secondaryLabel, DEFAULT_PUBLIC_SITE_CONFIG.cta.secondaryLabel),
      secondaryHref: nonEmptyString(sourceCta.secondaryHref, DEFAULT_PUBLIC_SITE_CONFIG.cta.secondaryHref),
    },
    hero: {
      fitMode: sourceHero.fitMode === "screen" ? "screen" : "window",
      autoplay: booleanValue(sourceHero.autoplay, DEFAULT_PUBLIC_SITE_CONFIG.hero.autoplay),
      intervalMs: typeof sourceHero.intervalMs === "number" && Number.isFinite(sourceHero.intervalMs) && sourceHero.intervalMs >= 1000 ? sourceHero.intervalMs : DEFAULT_PUBLIC_SITE_CONFIG.hero.intervalMs,
      overlay: sourceHero.overlay === "medium" || sourceHero.overlay === "strong" ? sourceHero.overlay : "soft",
      slides: sanitizeHeroSlides(sourceHero.slides),
    },
    propertyTypes: sanitizePropertyTypes(source.propertyTypes),
    featured: sanitizeFeatured(source.featured),
    portals: sanitizePortals(source.portals),
    promotions: sanitizePromotions(source.promotions),
    sections: sections.length ? sections : DEFAULT_PUBLIC_SITE_CONFIG.sections,
  };
  return result;
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
