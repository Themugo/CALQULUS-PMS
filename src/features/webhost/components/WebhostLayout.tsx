import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { Link, Navigate, useLocation } from "react-router-dom";
import {
  Activity,
  Building2,
  ChevronRight,
  CreditCard,
  FileCheck,
  Handshake,
  LayoutDashboard,
  Layers,
  Layers2,
  LogOut,
  Menu,
  Palette,
  Rocket,
  ScrollText,
  Settings,
  ShieldAlert,
  ShieldQuestion,
  TriangleAlert,
  Users,
  X,
} from "lucide-react";
import { useAuth } from "@/features/auth/AuthContext";
import { isDevAccessEnabled } from "@/features/auth/lib/devAccess";
import { BrandMark } from "@/shared/components/branding/BrandMark";
import { Footer } from "@/shared/components/layout/Footer";
import { PageHeader } from "@/shared/components/layout/PageHeader";
import { PortalAccentBar, deskNavClass, portalSurfaceProps } from "@/core/design";
import { supabase } from "@/integrations/supabase/client";
import {
  ADMIN_SURFACE_ACCENT,
  WEBHOST_LOGIN,
  WEBHOST_OPS_ROUTES,
  WEBHOST_ROUTES,
  webhostSurface,
  webhostSurfaceLabel,
} from "@/features/webhost/lib/webhostPaths";
import { cn } from "@/shared/lib/utils";

const NAV_GROUPS = [
  {
    label: "Control plane",
    items: [
      { label: "Dashboard", href: WEBHOST_ROUTES.dashboard, icon: LayoutDashboard, permission: null },
      { label: "Applications", href: WEBHOST_ROUTES.applications, icon: Layers2, permission: null },
      { label: "Deployments", href: WEBHOST_ROUTES.deployments, icon: Rocket, permission: null },
      { label: "Operations", href: WEBHOST_ROUTES.operations, icon: Activity, permission: null },
    ],
  },
  {
    label: "Administration",
    items: [
      { label: "Organizations", href: WEBHOST_ROUTES.organizations, icon: Building2, permission: "can_manage_managers" as const },
      { label: "Users", href: WEBHOST_ROUTES.users, icon: Users, permission: null },
      { label: "Properties", href: WEBHOST_OPS_ROUTES.properties, icon: Building2, permission: "can_manage_properties" as const },
      { label: "Landlords", href: WEBHOST_OPS_ROUTES.landlords, icon: Handshake, permission: "can_manage_system_landlords" as const },
      { label: "Subscriptions", href: WEBHOST_ROUTES.subscriptions, icon: CreditCard, permission: "can_manage_billing" as const },
      { label: "Tiers", href: WEBHOST_OPS_ROUTES.tiers, icon: Layers, permission: "can_manage_billing" as const },
      { label: "Contracts", href: WEBHOST_OPS_ROUTES.contracts, icon: FileCheck, permission: "can_manage_managers" as const },
      { label: "Audit Log", href: WEBHOST_ROUTES.audit, icon: ScrollText, permission: "can_view_activity_logs" as const },
      { label: "Security", href: WEBHOST_ROUTES.security, icon: ShieldAlert, permission: "can_view_activity_logs" as const },
      { label: "Issues", href: WEBHOST_OPS_ROUTES.issues, icon: TriangleAlert, permission: "can_view_activity_logs" as const },
      { label: "Unattached tenants", href: WEBHOST_ROUTES.unattachedTenants, icon: ShieldQuestion, permission: null },
    ],
  },
  {
    label: "Account",
    items: [
      { label: "Settings", href: WEBHOST_ROUTES.settings, icon: Settings, permission: null },
      { label: "Brand Studio", href: WEBHOST_ROUTES.brand, icon: Palette, permission: null },
    ],
  },
] as const;

type NavItem = (typeof NAV_GROUPS)[number]["items"][number];

interface WebhostLayoutProps {
  children: ReactNode;
  title: string;
  description?: string;
  actions?: ReactNode;
}

export default function WebhostLayout({ children, title, description, actions }: WebhostLayoutProps) {
  const { user, userRole, signOut, loading, webhostPermissions, hasWebhostPermission, isSuperAdmin, platformAdminInfo } = useAuth();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!loading && user && userRole?.role === "webhost" && !webhostPermissions) {
      void supabase
        .from("admin_permissions")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle()
        .then(({ data }) => {
          if (!data) {
            void supabase
              .from("admin_permissions")
              .insert({
                user_id: user.id,
                admin_level: "super_admin",
                can_create_webhosts: true,
                can_manage_managers: true,
                can_manage_billing: true,
                can_manage_properties: true,
                can_manage_system_landlords: true,
                can_view_activity_logs: true,
              })
              .then(() => window.location.reload());
          }
        });
    }
  }, [loading, user, userRole, webhostPermissions]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background" {...portalSurfaceProps("platform_admin")}>
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
      </div>
    );
  }

  if (!isDevAccessEnabled() && (!user || userRole?.role !== "webhost")) {
    return <Navigate to={WEBHOST_LOGIN} replace />;
  }

  const canSee = (item: NavItem) => {
    // Recovery surface is gated by a platform-admins flag (granted to
    // business + System Admins). Legacy owners/super-admins with manager
    // management retain access.
    if (item.href === WEBHOST_ROUTES.unattachedTenants) {
      return (
        isSuperAdmin ||
        hasWebhostPermission("can_manage_managers") ||
        platformAdminInfo?.can_read_unattached_tenants === true
      );
    }
    if (!item.permission) return true;
    return isSuperAdmin || hasWebhostPermission(item.permission);
  };

  const isActive = (href: string) => {
    if (href === WEBHOST_ROUTES.dashboard) return location.pathname === href;
    if (href === WEBHOST_ROUTES.organizations) {
      return location.pathname === href || location.pathname.startsWith(`${href}/`);
    }
    return location.pathname === href || location.pathname.startsWith(`${href}/`);
  };

  const surface = webhostSurface(location.pathname);

  return (
    <div
      className="min-h-screen bg-background text-foreground"
      {...portalSurfaceProps("platform_admin")}
      style={surface === "admin" ? ({ "--portal-accent": ADMIN_SURFACE_ACCENT } as CSSProperties) : undefined}
    >
      <PortalAccentBar className="fixed left-0 right-0 top-0 z-[60]" />
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:z-[100] focus:left-4 focus:top-4 focus:rounded-md focus:bg-primary focus:px-4 focus:py-2.5 focus:text-sm focus:font-semibold focus:text-primary-foreground"
      >
        Skip to main content
      </a>

      {sidebarOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-muted/80 backdrop-blur-sm lg:hidden"
          aria-label="Close menu"
          onClick={() => setSidebarOpen(false)}
        />
      ) : null}

      <aside
        className={`fixed left-0 top-0 z-50 flex h-full w-64 flex-col border-r border-border bg-card transform transition-transform duration-300 lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-16 flex-shrink-0 items-center justify-between border-b border-border px-4">
          <BrandMark size="md" showWordmark subtitle="Admin" forcePlatform />
          <button
            type="button"
            className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md text-muted-foreground hover:text-foreground lg:hidden"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close menu"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <nav className="flex-1 space-y-4 overflow-y-auto px-2 py-4" aria-label="Platform admin">
          {NAV_GROUPS.map((group) => {
            const visible = group.items.filter((item) => canSee(item));
            if (visible.length === 0) return null;
            return (
              <div key={group.label} className="space-y-0.5">
                <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  {group.label}
                </p>
                {visible.map((item) => {
                  const active = isActive(item.href);
                  return (
                    <Link
                      key={item.href}
                      to={item.href}
                      onClick={() => setSidebarOpen(false)}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "group flex min-h-11 items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                        deskNavClass(active),
                      )}
                    >
                      <item.icon className="h-4 w-4 flex-shrink-0" />
                      <span className="flex-1 truncate">{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            );
          })}
        </nav>

        <div className="flex-shrink-0 border-t border-border p-3">
          {user ? (
            <div className="mb-2 rounded-lg border border-border bg-muted/40 px-3 py-2">
              <p className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">Platform admin</p>
              <p className="truncate text-xs font-medium text-foreground">{user.email}</p>
            </div>
          ) : null}
          <button
            type="button"
            onClick={() => void signOut()}
            className="flex w-full items-center gap-3 rounded-lg border border-transparent px-3 py-2.5 text-sm font-medium text-muted-foreground hover:border-destructive/20 hover:bg-destructive/10 hover:text-destructive"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </div>
      </aside>

      <div className="flex min-h-screen min-w-0 flex-col lg:ml-64">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b border-border bg-background/90 px-4 backdrop-blur-xl sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              aria-label="Open menu"
              className="-ml-1.5 inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg p-2 text-muted-foreground hover:bg-muted/50 hover:text-foreground lg:hidden"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="hidden min-w-0 items-center gap-2 text-sm text-muted-foreground sm:flex">
              <span className="font-medium text-foreground">{webhostSurfaceLabel(surface)}</span>
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50" />
              <span className="truncate">{title}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              to={WEBHOST_ROUTES.settings}
              className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
              aria-label="Platform settings"
              title="Platform settings"
            >
              <Settings className="h-5 w-5" />
            </Link>
            <div
              className="hidden h-10 items-center gap-2.5 rounded-lg border border-border bg-muted/30 pl-2.5 pr-3 sm:flex"
              title={user?.email ?? "Platform administrator"}
            >
              <span
                aria-hidden
                className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[var(--portal-accent)]/15 text-[11px] font-bold uppercase text-[var(--portal-accent)]"
              >
                {(user?.email?.charAt(0) || "A")}
              </span>
              <span className="max-w-[120px] truncate text-xs font-medium text-foreground">{user?.email ?? "Platform admin"}</span>
            </div>
          </div>
        </header>

        <PageHeader title={title} description={description} actions={actions} className="border-0 px-4 py-4 sm:px-6 lg:px-8" />

        <main id="main-content" tabIndex={-1} className="flex-1 min-w-0 overflow-x-clip px-4 pb-8 outline-none sm:px-6 lg:px-8">
          {children}
        </main>

        <Footer variant="compact" />
      </div>
    </div>
  );
}
