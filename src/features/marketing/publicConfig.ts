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
