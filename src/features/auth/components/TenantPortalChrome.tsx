import type { ReactNode } from "react";
import { Home, Wallet, Wrench, BellRing } from "lucide-react";
import { PROPERTY_IMAGES } from "@/features/marketing/propertyImages";
import { usePortalIdentity } from "@/core/product/PortalIdentityProvider";
import { PortalLoginLayout } from "@/features/auth/components/PortalLoginScreen";

/**
 * Tenant portal entry chrome — a clean, single-purpose sign-in screen
 * carrying the tenant portal's own identity (violet, residential imagery,
 * "Tenant Portal" headline) via the shared PortalLoginLayout.
 */

export const TENANT_ACCENT = "#7C5FD3";

interface TenantPortalShellProps {
  children: ReactNode;
}

export function TenantPortalShell({ children }: TenantPortalShellProps) {
  // This shell always represents the tenant portal, regardless of the
  // ambient path-derived identity — look it up explicitly rather than via
  // the (route-dependent) current-portal identity.
  const { identities } = usePortalIdentity();
  const identity = identities.tenant;
  return (
    <PortalLoginLayout
      portalId="tenant"
      accentHex={TENANT_ACCENT}
      backgroundImage={identity.backgroundImageUrl || PROPERTY_IMAGES.residential}
      badgeIcon={Home}
      portalName={identity.shortName}
      slogan={identity.tagline}
      description="Your home, connected — rent, payments, maintenance and lease information in one secure place."
      features={[
        { icon: Wallet, label: "Payments", text: "View rent, invoices and payment activity." },
        { icon: Wrench, label: "Requests", text: "Report and follow maintenance from one place." },
        { icon: BellRing, label: "Updates", text: "Stay informed about your tenancy and home." },
      ]}
      trustLabel="Secure tenant access · Easy service · Timely updates"
    >
      {children}
    </PortalLoginLayout>
  );
}
