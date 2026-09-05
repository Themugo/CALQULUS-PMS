import type { ReactNode } from "react";
import { Handshake } from "lucide-react";
import { PROPERTY_IMAGES } from "@/features/marketing/propertyImages";
import { usePortalIdentity } from "@/core/product/PortalIdentityProvider";
import { PortalLoginLayout } from "@/features/auth/components/PortalLoginScreen";

/**
 * Agency portal entry chrome — a clean, single-purpose sign-in screen
 * carrying the agency portal's own identity (blue, office imagery,
 * "Agency Portal" headline) via the shared PortalLoginLayout.
 */

export const AGENCY_ACCENT = "#4658C9";

interface AgencyPortalShellProps {
  children: ReactNode;
}

export function AgencyPortalShell({ children }: AgencyPortalShellProps) {
  // This shell always represents the agency portal, regardless of the
  // ambient path-derived identity — look it up explicitly rather than via
  // the (route-dependent) current-portal identity.
  const { identities } = usePortalIdentity();
  const identity = identities.agency;
  return (
    <PortalLoginLayout
      portalId="agency"
      accentHex={AGENCY_ACCENT}
      backgroundImage={identity.backgroundImageUrl || PROPERTY_IMAGES.office}
      badgeIcon={Handshake}
      portalName="Agency"
      description="Run your client portfolio — properties, landlords, collections and revenue share — with control."
    >
      {children}
    </PortalLoginLayout>
  );
}
