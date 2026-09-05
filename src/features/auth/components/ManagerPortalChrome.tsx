import type { ReactNode } from "react";
import { ClipboardList, Settings2, ShieldCheck } from "lucide-react";
import { PROPERTY_IMAGES } from "@/features/marketing/propertyImages";
import { CALQULUS_PORTAL_ACCENT } from "@/shared/theme/tokens";
import { usePortalIdentity } from "@/core/product/PortalIdentityProvider";
import { PortalLoginLayout } from "@/features/auth/components/PortalLoginScreen";

export const MANAGER_ACCENT = CALQULUS_PORTAL_ACCENT.manager.hex;

interface ManagerPortalShellProps { children: ReactNode; }

export function ManagerPortalShell({ children }: ManagerPortalShellProps) {
  const { identities } = usePortalIdentity();
  const identity = identities.manager;
  return (
    <PortalLoginLayout
      portalId="manager"
      accentHex={MANAGER_ACCENT}
      backgroundImage={identity.backgroundImageUrl || PROPERTY_IMAGES.residential}
      badgeIcon={Settings2}
      portalName="Property Manager"
      eyebrow="PROPERTY MANAGER PORTAL"
      description={identity.tagline || "Run properties, tenants, leases, billing, payments and maintenance from one connected command desk."}
      features={[
        { icon: ClipboardList, label: "Operations" },
        { icon: Settings2, label: "Maintenance" },
        { icon: ShieldCheck, label: "Compliance" },
      ]}
      trustLabel="Secure manager workspace · Operations control · Real-time visibility"
    >
      {children}
    </PortalLoginLayout>
  );
}
