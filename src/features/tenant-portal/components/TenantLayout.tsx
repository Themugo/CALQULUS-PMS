import { type ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { CreditCard, FileText, Home, Receipt, ScrollText, User, Wrench } from "lucide-react";
import { useAuth } from "@/features/auth/AuthContext";
import TenantNotificationBell from "@/features/tenant-portal/components/TenantNotificationBell";
import { isDevAccessEnabled } from "@/features/auth/lib/devAccess";
import { PortalDeskLoading, PortalDeskShell, type PortalDeskNavGroup } from "@/shared/components/layout/PortalDeskShell";
import { portalSurfaceProps } from "@/core/design";
import { TENANT_LOGIN, TENANT_ROUTES } from "@/features/tenant-portal/lib/tenantPaths";

const DESK_NAV: PortalDeskNavGroup[] = [{ label: "Home", items: [
  { label: "Dashboard", href: TENANT_ROUTES.dashboard, icon: Home },
  { label: "Payments", href: TENANT_ROUTES.payments, icon: CreditCard },
  { label: "Lease", href: TENANT_ROUTES.lease, icon: ScrollText },
  { label: "Maintenance", href: TENANT_ROUTES.maintenance, icon: Wrench },
  { label: "Receipts", href: TENANT_ROUTES.receipts, icon: Receipt },
  { label: "Documents", href: TENANT_ROUTES.documents, icon: FileText },
  { label: "Profile", href: TENANT_ROUTES.profile, icon: User },
]}];
const MOBILE_NAV = [
  { label: "Home", href: TENANT_ROUTES.dashboard, icon: Home },
  { label: "Bills", href: TENANT_ROUTES.payments, icon: CreditCard },
  { label: "Fix", href: TENANT_ROUTES.maintenance, icon: Wrench },
  { label: "Docs", href: TENANT_ROUTES.documents, icon: FileText },
  { label: "Me", href: TENANT_ROUTES.profile, icon: User },
];

interface TenantLayoutProps { children: ReactNode; title: string; description?: string; actions?: ReactNode; hideHeader?: boolean; }

export default function TenantLayout({ children, title, description, actions, hideHeader = false }: TenantLayoutProps) {
  const { user, userRole, signOut, loading } = useAuth();
  if (loading) return <PortalDeskLoading />;
  if (!isDevAccessEnabled() && (!user || userRole?.role !== "tenant")) return <Navigate to={TENANT_LOGIN} replace />;

  const isActive = (href: string, pathname: string) => {
    if (href === TENANT_ROUTES.dashboard) return pathname === href;
    if (href === TENANT_ROUTES.lease) return pathname === href || pathname.startsWith("/portal/lease");
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  return (
    <PortalDeskShell
      title={title}
      description={description}
      actions={actions}
      portalLabel="Tenant"
      navLabel="Tenant"
      navGroups={DESK_NAV}
      mobileNav={MOBILE_NAV}
      userEmail={user?.email}
      onSignOut={() => void signOut()}
      hideHeader={hideHeader}
      sidebarWidthClass="w-56"
      sidebarOffsetClass="md:ml-56"
      mobileContentPadding="pb-24 md:pb-8"
      headerRight={user ? <TenantNotificationBell /> : null}
      {...portalSurfaceProps("tenant")}
    >
      {children}
    </PortalDeskShell>
  );
}
