import { useEffect, type CSSProperties, type ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { Activity, Building2, CreditCard, FileCheck, Handshake, LayoutDashboard, Layers, Layers2, Palette, Rocket, ScrollText, Settings, ShieldAlert, ShieldQuestion, TriangleAlert, Users } from "lucide-react";
import { useAuth } from "@/features/auth/AuthContext";
import { isDevAccessEnabled } from "@/features/auth/lib/devAccess";
import { PortalDeskLoading, PortalDeskShell, type PortalDeskNavGroup } from "@/shared/components/layout/PortalDeskShell";
import { portalSurfaceProps } from "@/core/design";
import { supabase } from "@/integrations/supabase/client";
import { ADMIN_SURFACE_ACCENT, WEBHOST_LOGIN, WEBHOST_OPS_ROUTES, WEBHOST_ROUTES, webhostSurface, webhostSurfaceLabel } from "@/features/webhost/lib/webhostPaths";

const NAV_GROUPS: PortalDeskNavGroup[] = [
  { label: "Control plane", items: [
    { label: "Dashboard", href: WEBHOST_ROUTES.dashboard, icon: LayoutDashboard },
    { label: "Applications", href: WEBHOST_ROUTES.applications, icon: Layers2 },
    { label: "Deployments", href: WEBHOST_ROUTES.deployments, icon: Rocket },
    { label: "Operations", href: WEBHOST_ROUTES.operations, icon: Activity },
  ] },
  { label: "Administration", items: [
    { label: "Organizations", href: WEBHOST_ROUTES.organizations, icon: Building2, permission: "can_manage_managers" as const },
    { label: "Users", href: WEBHOST_ROUTES.users, icon: Users },
    { label: "Properties", href: WEBHOST_OPS_ROUTES.properties, icon: Building2, permission: "can_manage_properties" as const },
    { label: "Landlords", href: WEBHOST_OPS_ROUTES.landlords, icon: Handshake, permission: "can_manage_system_landlords" as const },
    { label: "Subscriptions", href: WEBHOST_ROUTES.subscriptions, icon: CreditCard, permission: "can_manage_billing" as const },
    { label: "Tiers", href: WEBHOST_OPS_ROUTES.tiers, icon: Layers, permission: "can_manage_billing" as const },
    { label: "Contracts", href: WEBHOST_OPS_ROUTES.contracts, icon: FileCheck, permission: "can_manage_managers" as const },
    { label: "Audit Log", href: WEBHOST_ROUTES.audit, icon: ScrollText, permission: "can_view_activity_logs" as const },
    { label: "Security", href: WEBHOST_ROUTES.security, icon: ShieldAlert, permission: "can_view_activity_logs" as const },
    { label: "Issues", href: WEBHOST_OPS_ROUTES.issues, icon: TriangleAlert, permission: "can_view_activity_logs" as const },
    { label: "Unattached tenants", href: WEBHOST_ROUTES.unattachedTenants, icon: ShieldQuestion },
  ] },
  { label: "Account", items: [
    { label: "Settings", href: WEBHOST_ROUTES.settings, icon: Settings },
    { label: "Brand Studio", href: WEBHOST_ROUTES.brand, icon: Palette },
  ] },
];

type PermissionKey = "can_manage_managers" | "can_manage_properties" | "can_manage_system_landlords" | "can_manage_billing" | "can_view_activity_logs";

export default function WebhostLayout({ children, title, description, actions }: { children: ReactNode; title: string; description?: string; actions?: ReactNode }) {
  const { user, userRole, signOut, loading, webhostPermissions, hasWebhostPermission, isSuperAdmin, platformAdminInfo } = useAuth();
  const location = useLocation();

  useEffect(() => {
    if (!loading && user && userRole?.role === "webhost" && !webhostPermissions) {
      void supabase.from("admin_permissions").select("id").eq("user_id", user.id).maybeSingle().then(({ data }) => {
        if (!data) {
          void supabase.from("admin_permissions").insert({
            user_id: user.id,
            admin_level: "super_admin",
            can_create_webhosts: true,
            can_manage_managers: true,
            can_manage_billing: true,
            can_manage_properties: true,
            can_manage_system_landlords: true,
            can_view_activity_logs: true,
          }).then(() => window.location.reload());
        }
      });
    }
  }, [loading, user, userRole, webhostPermissions]);

  if (loading) return <PortalDeskLoading />;
  if (!isDevAccessEnabled() && (!user || userRole?.role !== "webhost")) return <Navigate to={WEBHOST_LOGIN} replace />;

  const canSee = (item: (typeof NAV_GROUPS)[number]["items"][number]) => {
    if (item.href === WEBHOST_ROUTES.unattachedTenants) return isSuperAdmin || hasWebhostPermission("can_manage_managers") || platformAdminInfo?.can_read_unattached_tenants === true;
    const permission = item.permission as PermissionKey | undefined;
    return !permission || isSuperAdmin || hasWebhostPermission(permission);
  };

  const visibleGroups = NAV_GROUPS.map((group) => ({ ...group, items: group.items.filter(canSee) })).filter((group) => group.items.length > 0);
  const surface = webhostSurface(location.pathname);
  const style = surface === "admin" ? ({ "--portal-accent": ADMIN_SURFACE_ACCENT } as CSSProperties) : undefined;

  return (
    <PortalDeskShell
      title={title}
      description={description}
      actions={actions}
      portalLabel={webhostSurfaceLabel(surface)}
      navLabel="Platform admin"
      navGroups={visibleGroups}
      userEmail={user?.email ?? "Platform administrator"}
      onSignOut={() => void signOut()}
      settingsHref={WEBHOST_ROUTES.settings}
      brandSubtitle="Admin"
      forcePlatformBrand
      style={style}
      headerRight={
        <div className="hidden h-10 items-center gap-2.5 rounded-lg border border-border bg-muted/30 pl-2.5 pr-3 sm:flex" title={user?.email ?? "Platform administrator"}>
          <span aria-hidden className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[var(--portal-accent)]/15 text-[11px] font-bold uppercase text-[var(--portal-accent)]">{user?.email?.charAt(0) || "A"}</span>
          <span className="max-w-[120px] truncate text-xs font-medium text-foreground">{user?.email ?? "Platform admin"}</span>
        </div>
      }
      {...portalSurfaceProps("platform_admin")}
    >
      {children}
    </PortalDeskShell>
  );
}
