export const WEBHOST_LOGIN = "/webhost/login";

export const WEBHOST_ROUTES = {
  dashboard: "/webhost",
  organizations: "/webhost/organizations",
  users: "/webhost/users",
  subscriptions: "/webhost/subscriptions",
  audit: "/webhost/audit",
  security: "/webhost/security",
  settings: "/webhost/settings",
  brand: "/webhost/brand",
} as const;

/** Existing screens — also linked from the primary webhost nav. */
export const WEBHOST_OPS_ROUTES = {
  properties: "/webhost/properties",
  landlords: "/webhost/landlords",
  tiers: "/webhost/tiers",
  billingRules: "/webhost/billing-rules",
  customPricing: "/webhost/custom-pricing",
  contracts: "/webhost/contracts",
  issues: "/webhost/issues",
} as const;

export function webhostOrganizationPath(userId: string): string {
  return `${WEBHOST_ROUTES.organizations}/${userId}`;
}

export function isWebhostPublicPath(pathname: string): boolean {
  return pathname === WEBHOST_LOGIN || pathname.startsWith(`${WEBHOST_LOGIN}/`);
}

export function isWebhostDeskPath(pathname: string): boolean {
  if (pathname === "/webhost") return true;
  if (!pathname.startsWith("/webhost/")) return false;
  return !isWebhostPublicPath(pathname);
}
