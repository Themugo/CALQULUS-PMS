/**
 * Public marketing surface — verified against src/app/routes.ts.
 * Do not invent portal paths here.
 */

export const CONTACT_EMAIL = "enterprise@calqulusrms.com";

export const PUBLIC_ROUTES = {
  home: "/",
  pricing: "/pricing",
  legalPrivacy: "/legal?tab=privacy",
  legalTerms: "/legal?tab=terms",
  legalCookies: "/legal?tab=privacy",
  designPreview: "/design-preview",
  shellPreview: "/design-preview/shell",
  managerDashboardPreview: "/design-preview/manager-dashboard",
  managerPropertiesPreview: "/design-preview/manager-properties",
  managerTenantsPreview: "/design-preview/manager-tenants",
  managerSignIn: "/auth",
  managerSignUp: "/auth?tab=signup",
  landlordLogin: "/landlord/login",
  agencyLogin: "/agency/login",
  tenantLogin: "/tenant/login",
  webhostLogin: "/webhost/login",
} as const;

export const PUBLIC_NAV = [
  { label: "Platform", hash: "platform" },
  { label: "Solutions", hash: "solutions" },
  { label: "How it works", hash: "how-it-works" },
] as const;

/** Homepage hero copy — single source of truth. */
export const HERO_CONTENT = {
  eyebrow: "Property operations",
  titleLines: ["Run every property", "from one place."],
  copy: "Properties, tenants, billing and maintenance — connected.",
  primaryCta: "Start managing",
  secondaryCta: "Explore platform",
} as const;

/** Illustrative portfolio cards for the property carousel. Sample figures only. */
export const PORTFOLIO_PROPERTIES = [
  {
    name: "Kilimani Court",
    slot: "residential",
    units: 24,
    occupied: 22,
    occupancy: 92,
    collected: "KES 1.24M collected",
    status: "paid",
  },
  {
    name: "West View",
    slot: "office",
    units: 18,
    occupied: 15,
    occupancy: 83,
    collected: "KES 0.86M collected",
    status: "pending",
  },
  {
    name: "Block C",
    slot: "residential",
    units: 30,
    occupied: 23,
    occupancy: 77,
    collected: "KES 2.10M collected",
    status: "overdue",
  },
  {
    name: "Parklands Plaza",
    slot: "commercial",
    units: 12,
    occupied: 12,
    occupancy: 100,
    collected: "KES 0.64M collected",
    status: "paid",
  },
  {
    name: "Ngong View",
    slot: "residential",
    units: 16,
    occupied: 14,
    occupancy: 88,
    collected: "KES 0.72M collected",
    status: "pending",
  },
] as const;

/** Platform overview — capability tiles (verified features, see src/features/*). */
export const PLATFORM_CAPABILITIES = [
  "Properties",
  "Units",
  "Tenants",
  "Leases",
  "Billing",
  "Payments",
  "Maintenance",
  "Reporting",
] as const;

/** Operational lifecycle shown in the visual flow section. */
export const WORKFLOW_STEPS = [
  { label: "Property", note: "Register buildings" },
  { label: "Units", note: "Track rentable spaces" },
  { label: "Tenants", note: "Onboard with invitations" },
  { label: "Leases", note: "Keep terms current" },
  { label: "Billing", note: "Raise rent and water" },
  { label: "Payments", note: "Collect and reconcile" },
  { label: "Maintenance", note: "Resolve repairs" },
  { label: "Reporting", note: "See the portfolio" },
] as const;

/** Product showcase items — each reuses a dedicated lightweight visual. */
export const SHOWCASES = [
  {
    id: "financials",
    category: "Financial operations",
    headline: "Know what came in.",
    copy: "Billing, payments and statements in sync.",
    points: ["KES collected vs billed", "Billing runs and receipts", "Outstanding per property"],
  },
  {
    id: "maintenance",
    category: "Maintenance",
    headline: "Maintenance, under control.",
    copy: "Requests, assignments and resolution in one list.",
    points: ["Open and completed repairs", "Inspections per property", "Status visible end to end"],
  },
] as const;

/** Trust points — only capabilities that exist in the application today. */
export const TRUST_POINTS = [
  {
    title: "Role-based",
    copy: "Access by role — managers, landlords, agencies and tenants.",
  },
  {
    title: "Secure",
    copy: "Controlled data access scoped to each workspace.",
  },
  {
    title: "Auditable",
    copy: "Activity history across billing, payments and maintenance.",
  },
  {
    title: "Reliable",
    copy: "Financial records following one consistent path.",
  },
] as const;

/** Final call-to-action copy. */
export const FINAL_CTA = {
  title: "Ready to run your portfolio?",
  copy: "Start with CALQULUS.",
  primary: "Get started",
  secondary: "Explore platform",
} as const;

export const RESOURCE_LINKS = [
  { label: "Documentation", hash: "platform" },
  { label: "Help center", href: `mailto:${CONTACT_EMAIL}` },
  { label: "Support", href: `mailto:${CONTACT_EMAIL}` },
] as const;

export function homeSectionHref(hash: string, pathname: string): string {
  return pathname === PUBLIC_ROUTES.home ? `#${hash}` : `/#${hash}`;
}

export const PLATFORM_LINKS = [
  { label: "Features", hash: "platform" },
  { label: "Security", href: PUBLIC_ROUTES.legalPrivacy },
  { label: "Integrations", hash: "solutions" },
  { label: "API", hash: "platform" },
] as const;

export const PORTAL_LINKS = [
  { label: "Property Managers", href: PUBLIC_ROUTES.managerSignUp },
  { label: "Landlords", href: PUBLIC_ROUTES.landlordLogin },
  { label: "Real Estate Agencies", href: PUBLIC_ROUTES.agencyLogin },
  { label: "Tenants", href: PUBLIC_ROUTES.tenantLogin },
] as const;

export const COMPANY_LINKS = [
  { label: "About us", hash: "contact" },
  { label: "Careers", hash: "contact" },
  { label: "Partners", hash: "contact" },
  { label: "News", hash: "contact" },
] as const;

export const RESOURCE_FOOTER_LINKS = [
  { label: "Documentation", hash: "platform" },
  { label: "Help center", href: `mailto:${CONTACT_EMAIL}` },
  { label: "Support", href: `mailto:${CONTACT_EMAIL}` },
] as const;

export const LEGAL_LINKS = [
  { label: "Privacy policy", href: PUBLIC_ROUTES.legalPrivacy },
  { label: "Terms of service", href: PUBLIC_ROUTES.legalTerms },
  { label: "Cookie policy", href: PUBLIC_ROUTES.legalCookies },
] as const;
