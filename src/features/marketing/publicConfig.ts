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
  eyebrow: "Property operations, connected",
  titleLines: ["Run your properties", "with clarity and control."],
  copy: "CALQULUS brings properties, tenants, leases, billing, payments and maintenance into one focused operational system.",
  primaryCta: "Start managing",
  secondaryCta: "Explore the platform",
} as const;

/** Platform overview summary — verified capabilities only (see src/features/*). */
export const PLATFORM_SUMMARY = [
  "Properties, units and occupancy in one register",
  "Tenants, leases and vacation notices kept current",
  "Billing, payments and statements reconciled",
  "Maintenance requests tracked to resolution",
] as const;

/** Operational lifecycle shown in the "Everything connected." section. */
export const WORKFLOW_STEPS = [
  { label: "Property", note: "Register buildings and portfolios" },
  { label: "Units", note: "Track rentable spaces per property" },
  { label: "Tenants", note: "Onboard residents with invitations" },
  { label: "Leases", note: "Keep terms, deposits and renewals current" },
  { label: "Billing", note: "Raise rent and water invoices" },
  { label: "Payments", note: "Collect and reconcile receipts" },
  { label: "Maintenance", note: "Resolve repairs end to end" },
  { label: "Reporting", note: "See performance across the portfolio" },
] as const;

/** Product showcase items — each reuses the shared ProductPreview visual. */
export const SHOWCASES = [
  {
    id: "operations",
    category: "Property operations",
    headline: "Every property, unit and occupant in one desk.",
    copy: "Stop reconciling spreadsheets. CALQULUS keeps the property register, unit occupancy and tenant records in a single operational view.",
    points: ["Property and unit register", "Occupancy at a glance", "Tenant records and invitations"],
  },
  {
    id: "financials",
    category: "Financial operations",
    headline: "Billing, collections and statements that reconcile.",
    copy: "Rent and water billing flow into recorded payments, receipts and per-property statements — so the numbers always add up.",
    points: ["Rent and water billing", "Payment recording and receipts", "Property statements and reports"],
  },
  {
    id: "maintenance",
    category: "Maintenance",
    headline: "Repairs tracked from request to resolution.",
    copy: "Tenants raise requests in their portal; managers assign, track and close work without losing sight of open items.",
    points: ["Tenant maintenance requests", "Open-repair visibility", "Resolution tracking"],
  },
] as const;

/** Trust points — only capabilities that exist in the application today. */
export const TRUST_POINTS = [
  {
    title: "Role-based access",
    copy: "Managers, landlords, agencies and tenants each see only what their role allows.",
  },
  {
    title: "Controlled data access",
    copy: "Row-level security keeps every account's data scoped to its own workspace.",
  },
  {
    title: "Operational visibility",
    copy: "Activity is recorded across billing, payments and maintenance for accountable operations.",
  },
  {
    title: "Reliable financial workflows",
    copy: "Invoices, payments and receipts follow one consistent, auditable path.",
  },
] as const;

/** Final call-to-action copy. */
export const FINAL_CTA = {
  title: "Ready to run your properties with clarity?",
  copy: "Bring your properties, tenants, leases, billing and maintenance into one operational system.",
  primary: "Get started",
  secondary: "Explore the platform",
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
