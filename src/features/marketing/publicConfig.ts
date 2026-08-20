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
  designPreview: "/design-preview",
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

export function homeSectionHref(hash: string, pathname: string): string {
  return pathname === PUBLIC_ROUTES.home ? `#${hash}` : `/#${hash}`;
}

export const PLATFORM_LINKS = [
  { label: "Property management", hash: "platform" },
  { label: "Rent & payments", hash: "how-it-works" },
  { label: "Maintenance", hash: "platform" },
  { label: "Reporting", hash: "how-it-works" },
] as const;

export const PORTAL_LINKS = [
  { label: "Property managers", href: PUBLIC_ROUTES.managerSignUp },
  { label: "Landlords", href: PUBLIC_ROUTES.landlordLogin },
  { label: "Agencies", href: PUBLIC_ROUTES.agencyLogin },
  { label: "Tenants", href: PUBLIC_ROUTES.tenantLogin },
] as const;

export const COMPANY_LINKS = [
  { label: "How it works", hash: "how-it-works" },
  { label: "Pricing", href: PUBLIC_ROUTES.pricing },
  { label: "Contact", hash: "contact" },
] as const;

export const LEGAL_LINKS = [
  { label: "Privacy", href: PUBLIC_ROUTES.legalPrivacy },
  { label: "Terms", href: PUBLIC_ROUTES.legalTerms },
] as const;
