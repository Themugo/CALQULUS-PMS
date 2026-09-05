import type { ReactNode } from "react";
import { Building2 } from "lucide-react";
import { PROPERTY_IMAGES } from "@/features/marketing/propertyImages";
import { CALQULUS_PORTAL_ACCENT } from "@/shared/theme/tokens";
import { usePortalIdentity } from "@/core/product/PortalIdentityProvider";
import { PortalLoginLayout } from "@/features/auth/components/PortalLoginScreen";

/**
 * Manager portal entry chrome — a clean, single-purpose sign-in screen that
 * carries the manager portal's own identity (deep navy/blue, property
 * imagery, "Manager Portal" headline) using the shared PortalLoginLayout so
 * all four portals stay visually and structurally consistent.
 */

export const MANAGER_ACCENT = CALQULUS_PORTAL_ACCENT.manager.hex;

interface ManagerPortalShellProps {
  children: ReactNode;
}

export function ManagerPortalShell({ children }: ManagerPortalShellProps) {
  // This shell always represents the manager portal, regardless of the
  // ambient path-derived identity — look it up explicitly rather than via
  // the (route-dependent) current-portal identity.
  const { identities } = usePortalIdentity();
  const identity = identities.manager;
  return (
    <PortalLoginLayout
      portalId="manager"
      accentHex={MANAGER_ACCENT}
      backgroundImage={identity.backgroundImageUrl || PROPERTY_IMAGES.residential}
      badgeIcon={Building2}
      portalName="Manager"
      description="Run properties, tenants, leases, billing, payments and maintenance from one connected desk."
    >
      {children}
    </PortalLoginLayout>
  );
}
