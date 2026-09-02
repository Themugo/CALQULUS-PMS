import { type ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { BarChart3, Building2, FileSpreadsheet, FileText, LayoutDashboard, Settings, Wrench } from "lucide-react";
import { useAuth } from "@/features/auth/AuthContext";
import { isDevAccessEnabled } from "@/features/auth/lib/devAccess";
import { PortalDeskLoading, PortalDeskShell, type PortalDeskNavGroup } from "@/shared/components/layout/PortalDeskShell";
import { portalSurfaceProps } from "@/core/design";
import { LANDLORD_LOGIN, LANDLORD_ROUTES } from "@/features/landlord/lib/landlordPaths";

const NAV_GROUPS: PortalDeskNavGroup[] = [
  { label: "Overview", items: [{ label: "Dashboard", href: LANDLORD_ROUTES.dashboard, icon: LayoutDashboard }] },
  { label: "Portfolio", items: [{ label: "Portfolio", href: LANDLORD_ROUTES.portfolio, icon: Building2 }] },
  { label: "Financials", items: [
    { label: "Financials", href: LANDLORD_ROUTES.financials, icon: BarChart3 },
    { label: "Statements", href: LANDLORD_ROUTES.statements, icon: FileSpreadsheet },
  ] },
  { label: "Operations", items: [
    { label: "Maintenance", href: LANDLORD_ROUTES.maintenance, icon: Wrench },
    { label: "Documents", href: LANDLORD_ROUTES.documents, icon: FileText },
  ] },
  { label: "Account", items: [{ label: "Settings", href: LANDLORD_ROUTES.settings, icon: Settings }] },
];

interface LandlordLayoutProps { children: ReactNode; title: string; description?: string; actions?: ReactNode; }

export default function LandlordLayout({ children, title, description, actions }: LandlordLayoutProps) {
  const { user, userRole, signOut, loading } = useAuth();
  if (loading) return <PortalDeskLoading />;
  if (!isDevAccessEnabled() && (!user || userRole?.role !== "landlord")) return <Navigate to={LANDLORD_LOGIN} replace />;

  return (
    <PortalDeskShell
      title={title}
      description={description}
      actions={actions}
      portalLabel="Landlord"
      navLabel="Landlord"
      navGroups={NAV_GROUPS}
      userEmail={user?.email}
      onSignOut={() => void signOut()}
      settingsHref={LANDLORD_ROUTES.settings}
      contentMaxWidth="max-w-6xl"
      {...portalSurfaceProps("landlord")}
    >
      {children}
    </PortalDeskShell>
  );
}
