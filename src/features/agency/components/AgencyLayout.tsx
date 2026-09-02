import { type ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { BarChart3, Building2, Calendar, CreditCard, Droplets, FileSpreadsheet, FileText, Handshake, LayoutDashboard, Mail, Settings, Users, Wrench } from "lucide-react";
import { useAuth } from "@/features/auth/AuthContext";
import { isDevAccessEnabled } from "@/features/auth/lib/devAccess";
import { DeskEmbedProvider } from "@/shared/components/layout/DeskEmbed";
import { PortalDeskLoading, PortalDeskShell, type PortalDeskNavGroup } from "@/shared/components/layout/PortalDeskShell";
import { portalSurfaceProps } from "@/core/design";
import { AGENCY_LOGIN, AGENCY_OPS_ROUTES, AGENCY_ROUTES } from "@/features/agency/lib/agencyPaths";

const NAV_GROUPS: PortalDeskNavGroup[] = [
  { label: "Agency book", items: [
    { label: "Dashboard", href: AGENCY_ROUTES.dashboard, icon: LayoutDashboard },
    { label: "Clients", href: AGENCY_ROUTES.clients, icon: Handshake },
    { label: "Portfolio", href: AGENCY_ROUTES.portfolio, icon: Building2 },
  ]},
  { label: "Operations", items: [
    { label: "Tenants", href: AGENCY_ROUTES.tenants, icon: Users },
    { label: "Leases", href: AGENCY_OPS_ROUTES.leases, icon: FileText },
    { label: "Billing", href: AGENCY_ROUTES.billing, icon: CreditCard },
    { label: "Water Billing", href: AGENCY_OPS_ROUTES.waterBilling, icon: Droplets },
    { label: "Statements", href: AGENCY_OPS_ROUTES.statements, icon: FileSpreadsheet },
    { label: "Invites", href: AGENCY_OPS_ROUTES.invites, icon: Mail },
    { label: "Vacation Notices", href: AGENCY_OPS_ROUTES.vacationNotices, icon: Calendar },
    { label: "Maintenance", href: AGENCY_OPS_ROUTES.maintenance, icon: Wrench },
    { label: "Reports", href: AGENCY_ROUTES.reports, icon: BarChart3 },
    { label: "Settings", href: AGENCY_ROUTES.settings, icon: Settings },
  ]},
];

interface AgencyLayoutProps { children: ReactNode; title: string; description?: string; actions?: ReactNode; }

export default function AgencyLayout({ children, title, description, actions }: AgencyLayoutProps) {
  const { user, userRole, signOut, loading } = useAuth();
  if (loading) return <PortalDeskLoading />;
  if (!isDevAccessEnabled() && (!user || userRole?.role !== "agency")) return <Navigate to={AGENCY_LOGIN} replace />;

  const isActive = (href: string, pathname: string) => {
    if (href === AGENCY_ROUTES.dashboard) return pathname === href;
    if (href === AGENCY_ROUTES.portfolio) return pathname === href || pathname.startsWith("/agency/properties");
    if (href === AGENCY_ROUTES.clients) return pathname === href || pathname.startsWith("/agency/landlords");
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  return (
    <DeskEmbedProvider recordsHome={AGENCY_ROUTES.portfolio} propertyBase="/agency/properties">
      <PortalDeskShell
        title={title}
        description={description}
        actions={actions}
        portalLabel="Agency"
        navLabel="Agency"
        navGroups={NAV_GROUPS}
        userEmail={user?.email}
        onSignOut={() => void signOut()}
        settingsHref={AGENCY_ROUTES.settings}
        isActive={isActive}
        {...portalSurfaceProps("agency")}
      >
        {children}
      </PortalDeskShell>
    </DeskEmbedProvider>
  );
}
