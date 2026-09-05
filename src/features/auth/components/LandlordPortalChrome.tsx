import type { ReactNode } from "react";
import { BarChart3, Home, WalletCards } from "lucide-react";
import landlordLivingRoom from "@/assets/marketing/landlord-living-room.svg";
import { usePortalIdentity } from "@/core/product/PortalIdentityProvider";
import { PortalLoginLayout } from "@/features/auth/components/PortalLoginScreen";

export const LANDLORD_ACCENT = "#109C94";

interface LandlordPortalShellProps { children: ReactNode; }

export function LandlordPortalShell({ children }: LandlordPortalShellProps) {
  const { identities } = usePortalIdentity();
  const identity = identities.landlord;
  return (
    <PortalLoginLayout
      portalId="landlord"
      accentHex={LANDLORD_ACCENT}
      backgroundImage={identity.backgroundImageUrl || landlordLivingRoom}
      badgeIcon={BarChart3}
      portalName="Landlord"
      eyebrow="LANDLORD PORTAL"
      description={identity.tagline || "Know your property, track performance and grow your return with a clear view of occupancy, earnings and portfolio health."}
      features={[
        { icon: WalletCards, label: "Earnings" },
        { icon: Home, label: "Properties" },
        { icon: BarChart3, label: "Insights" },
      ]}
      trustLabel="Secure owner workspace · Financial visibility · Property performance"
    >
      {children}
    </PortalLoginLayout>
  );
}
