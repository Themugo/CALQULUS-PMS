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
  managerSignIn: "/auth",
  managerSignUp: "/auth?tab=signup",
  landlordLogin: "/landlord/login",
  agencyLogin: "/agency/login",
  tenantLogin: "/tenant/login",
} as const;

export const PUBLIC_NAV = [
  { label: "Platform", hash: "platform" },
  { label: "How it works", hash: "how-it-works" },
  { label: "Solutions", hash: "solutions" },
] as const;

export function homeSectionHref(hash: string, pathname: string): string {
  return pathname === PUBLIC_ROUTES.home ? `#${hash}` : `/#${hash}`;
}
