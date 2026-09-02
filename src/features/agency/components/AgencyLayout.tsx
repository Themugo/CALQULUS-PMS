import { type ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/features/auth/AuthContext";
import { isDevAccessEnabled } from "@/features/auth/lib/devAccess";
import { DeskEmbedProvider } from "@/shared/components/layout/DeskEmbed";
import { PortalDeskLoading, PortalDeskShell } from "@/shared/components/layout/PortalDeskShell";
import { portalSurfaceProps } from "@/core/design";
import { AGENCY_LOGIN, AGENCY_ROUTES } from "@/features/agency/lib/agencyPaths";
import { AGENCY_NAV_GROUPS, isAgencyNavActive } from "@/shared/navigation/portalNavigation";
interface AgencyLayoutProps { children: ReactNode; title: string; description?: string; actions?: ReactNode; }

export default function AgencyLayout({ children, title, description, actions }: AgencyLayoutProps) {
  const { user, userRole, signOut, loading } = useAuth();
  if (loading) return <PortalDeskLoading />;
  if (!isDevAccessEnabled() && (!user || userRole?.role !== "agency")) return <Navigate to={AGENCY_LOGIN} replace />;

  return (
    <DeskEmbedProvider recordsHome={AGENCY_ROUTES.portfolio} propertyBase="/agency/properties">
      <PortalDeskShell
        title={title}
        description={description}
        actions={actions}
        portalLabel="Agency"
        navLabel="Agency"
        navGroups={AGENCY_NAV_GROUPS}
        userEmail={user?.email}
        onSignOut={() => void signOut()}
        settingsHref={AGENCY_ROUTES.settings}
        isActive={isAgencyNavActive}
        {...portalSurfaceProps("agency")}
      >
        {children}
      </PortalDeskShell>
    </DeskEmbedProvider>
  );
}
