import { PUBLIC_ROUTES } from "@/features/marketing/publicConfig";

export interface PortalSwitcherItem {
  /** Lowercase portal key, e.g. "manager". */
  id: string;
  label: string;
  href: string;
  /** Portal accent used for the identity dot. */
  accent: string;
}

/** The four customer-facing portals, in master-identity order. */
export const PORTALS: PortalSwitcherItem[] = [
  { id: "manager", label: "Manager", href: PUBLIC_ROUTES.managerSignIn, accent: "#2F6FED" },
  { id: "landlord", label: "Landlord", href: PUBLIC_ROUTES.landlordLogin, accent: "#0F8A6A" },
  { id: "agency", label: "Agency", href: PUBLIC_ROUTES.agencyLogin, accent: "#0F766E" },
  { id: "tenant", label: "Tenant", href: PUBLIC_ROUTES.tenantLogin, accent: "#0284C7" },
];
