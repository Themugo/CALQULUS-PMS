import type { ReactNode } from "react";
import { BadgeDollarSign, BarChart3, BriefcaseBusiness, Building2, UsersRound } from "lucide-react";
import { PROPERTY_IMAGES } from "@/features/marketing/propertyImages";
import { PUBLIC_ROUTES } from "@/features/marketing/publicConfig";
import { usePortalIdentity } from "@/core/product/PortalIdentityProvider";
import { PortalLoginLayout } from "@/features/auth/components/PortalLoginScreen";

export const AGENCY_ACCENT = "#0867E8";

interface AgencyPortalShellProps { children: ReactNode; }

export function AgencyPortalShell({ children }: AgencyPortalShellProps) {
  const { identities } = usePortalIdentity();
  const identity = identities.agency;
  return (
    <PortalLoginLayout
      portalId="agency"
      accentHex={AGENCY_ACCENT}
      backgroundImage={identity.backgroundImageUrl || PROPERTY_IMAGES.office}
      badgeIcon={BriefcaseBusiness}
      portalName="Agency"
      eyebrow="AGENCY PORTAL"
      description={identity.tagline || "Run your client portfolio with confidence — properties, landlords, collections and revenue share in one connected workspace."}
      features={[
        { icon: UsersRound, label: "Clients" },
        { icon: Building2, label: "Portfolios" },
        { icon: BadgeDollarSign, label: "Collections" },
      ]}
      trustLabel="Secure agency workspace · Portfolio operations · Client visibility"
    >
      {children}
    </PortalLoginLayout>
  );
}
