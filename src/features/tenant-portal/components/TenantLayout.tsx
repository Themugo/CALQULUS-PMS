import { type ReactNode } from "react";
import { Link, Navigate, useLocation } from "react-router-dom";
import {
  CreditCard,
  FileText,
  Home,
  LogOut,
  Receipt,
  ScrollText,
  User,
  Wrench,
} from "lucide-react";
import { useAuth } from "@/features/auth/AuthContext";
import { isDevAccessEnabled } from "@/features/auth/lib/devAccess";
import { BrandMark } from "@/shared/components/branding/BrandMark";
import { Footer } from "@/shared/components/layout/Footer";
import { PageHeader } from "@/shared/components/layout/PageHeader";
import { PortalAccentBar, portalSurfaceProps } from "@/core/design";
import { TENANT_LOGIN, TENANT_ROUTES } from "@/features/tenant-portal/lib/tenantPaths";
import { cn } from "@/shared/lib/utils";

const DESK_NAV = [
  { label: "Dashboard", href: TENANT_ROUTES.dashboard, icon: Home },
  { label: "Payments", href: TENANT_ROUTES.payments, icon: CreditCard },
  { label: "Lease", href: TENANT_ROUTES.lease, icon: ScrollText },
  { label: "Maintenance", href: TENANT_ROUTES.maintenance, icon: Wrench },
  { label: "Receipts", href: TENANT_ROUTES.receipts, icon: Receipt },
  { label: "Documents", href: TENANT_ROUTES.documents, icon: FileText },
  { label: "Profile", href: TENANT_ROUTES.profile, icon: User },
] as const;

const MOBILE_NAV = [
  { label: "Home", href: TENANT_ROUTES.dashboard, icon: Home },
  { label: "Pay", href: TENANT_ROUTES.payments, icon: CreditCard },
  { label: "Fix", href: TENANT_ROUTES.maintenance, icon: Wrench },
  { label: "Docs", href: TENANT_ROUTES.documents, icon: FileText },
  { label: "Me", href: TENANT_ROUTES.profile, icon: User },
] as const;

interface TenantLayoutProps {
  children: ReactNode;
  title: string;
  description?: string;
  actions?: ReactNode;
  hideHeader?: boolean;
}

function isNavActive(pathname: string, href: string) {
  if (href === TENANT_ROUTES.dashboard) return pathname === href;
  if (href === TENANT_ROUTES.lease) {
    return pathname === href || pathname.startsWith("/portal/lease");
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function TenantLayout({
  children,
  title,
  description,
  actions,
  hideHeader = false,
}: TenantLayoutProps) {
  const { user, userRole, signOut, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background" {...portalSurfaceProps("tenant")}>
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
      </div>
    );
  }

  if (!isDevAccessEnabled() && (!user || userRole?.role !== "tenant")) {
    return <Navigate to={TENANT_LOGIN} replace />;
  }

  return (
    <div className="min-h-screen bg-background text-foreground" {...portalSurfaceProps("tenant")}>
      <PortalAccentBar className="fixed left-0 right-0 top-0 z-[60]" />
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:z-[100] focus:left-4 focus:top-4 focus:rounded-md focus:bg-primary focus:px-4 focus:py-2.5 focus:text-sm focus:font-semibold focus:text-primary-foreground"
      >
        Skip to main content
      </a>

      <aside className="fixed left-0 top-0 z-40 hidden h-full w-56 flex-col border-r border-border bg-card md:flex">
        <div className="flex h-14 flex-shrink-0 items-center border-b border-border px-4">
          <BrandMark size="md" showWordmark subtitle="Tenant" />
        </div>
        <nav className="flex-1 space-y-0.5 overflow-y-auto px-2 py-3" aria-label="Tenant">
          {DESK_NAV.map((item) => {
            const active = isNavActive(location.pathname, item.href);
            return (
              <Link
                key={item.href}
                to={item.href}
                className={cn(
                  "flex min-h-11 items-center gap-3 rounded-lg border px-3 py-2 text-sm font-medium",
                  active
                    ? "border-border bg-primary/10 text-foreground"
                    : "border-transparent text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <item.icon className="h-4 w-4 flex-shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="flex-shrink-0 border-t border-border p-3">
          {user ? (
            <p className="mb-2 truncate px-1 text-xs text-muted-foreground">{user.email}</p>
          ) : null}
          <button
            type="button"
            onClick={() => void signOut()}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </div>
      </aside>

      <div className="flex min-h-screen flex-col md:ml-56">
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-3 border-b border-border bg-background/90 px-4 backdrop-blur-xl md:px-6">
          <BrandMark size="sm" showWordmark subtitle="Tenant" className="md:hidden" />
          <p className="hidden truncate text-sm text-muted-foreground md:block">{title}</p>
          {user ? (
            <button
              type="button"
              onClick={() => void signOut()}
              className="inline-flex min-h-11 items-center gap-2 rounded-lg px-2 text-sm text-muted-foreground hover:text-destructive md:hidden"
              aria-label="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          ) : null}
        </header>

        {hideHeader ? null : (
          <PageHeader
            title={title}
            description={description}
            actions={actions}
            className="border-0 px-4 py-4 sm:px-6"
          />
        )}

        <main
          id="main-content"
          tabIndex={-1}
          className="flex-1 overflow-x-hidden px-4 pb-24 outline-none sm:px-6 md:pb-8"
        >
          {children}
        </main>

        <Footer variant="tenant" className="hidden md:block" />
      </div>

      <nav
        aria-label="Tenant"
        className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card md:hidden safe-area-bottom"
      >
        <div className="flex items-center justify-around h-16">
          {MOBILE_NAV.map((item) => {
            const active = isNavActive(location.pathname, item.href);
            return (
              <Link
                key={item.href}
                to={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-11 min-w-0 flex-1 flex-col items-center justify-center gap-1",
                  active ? "text-foreground" : "text-muted-foreground",
                )}
              >
                <item.icon className={cn("h-5 w-5", active && "text-primary")} />
                <span className={cn("text-[11px]", active && "font-medium")}>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
