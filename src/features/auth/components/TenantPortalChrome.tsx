import type { ReactNode } from "react";
import { BellRing, FileText, Home, WalletCards } from "lucide-react";
import tenantLivingRoom from "@/assets/marketing/tenant-living-room.svg";
import { usePortalIdentity } from "@/core/product/PortalIdentityProvider";
import { PortalLoginLayout } from "@/features/auth/components/PortalLoginScreen";

export const TENANT_ACCENT = "#8B55D9";

interface TenantPortalShellProps { children: ReactNode; }

export function TenantPortalShell({ children }: TenantPortalShellProps) {
  const { identities } = usePortalIdentity();
  const identity = identities.tenant;
  return (
    <PortalLoginLayout
      portalId="tenant"
      accentHex={TENANT_ACCENT}
      backgroundImage={identity.backgroundImageUrl || tenantLivingRoom}
      badgeIcon={Home}
      portalName="Tenant"
      eyebrow="TENANT PORTAL"
      description={identity.tagline || "Everything you need for your home — rent, payments, maintenance, documents and updates in one secure place."}
      features={[
        { icon: WalletCards, label: "Payments" },
        { icon: FileText, label: "Requests" },
        { icon: BellRing, label: "Updates" },
      ]}
      trustLabel="Secure tenant workspace · Payments · Maintenance · Documents"
    >
      {children}
    </PortalLoginLayout>
  );
}

