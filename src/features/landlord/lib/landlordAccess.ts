/**
 * Landlord portal firewall — manager/tenant/agency/webhost desks stay out.
 * UI (ProtectedRoute) and tests share this list.
 */
export const LANDLORD_BLOCKED_PREFIXES = [
  "/tenants",
  "/leases",
  "/billing",
  "/water-billing",
  "/invites",
  "/vacation-notices",
  "/tenant-screening",
  "/maintenance",
  "/reports",
  "/properties",
  "/landlords",
  "/contracts",
  "/statements",
  "/settings",
  "/platform-billing",
  "/my-billing",
  "/my-contracts",
  "/services",
  "/portal",
  "/agency",
  "/webhost",
] as const;

export function isLandlordBlockedPath(pathname: string): boolean {
  const path = pathname.replace(/\/$/, "") || "/";
  if (path === "/") return true;
  if (path.startsWith("/tenant")) return true;
  return LANDLORD_BLOCKED_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}/`));
}
