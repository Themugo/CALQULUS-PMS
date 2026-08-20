import { useState, type ReactNode } from "react";
import { Link, Navigate, useLocation } from "react-router-dom";
import {
  BarChart3,
  Building2,
  ChevronRight,
  FileSpreadsheet,
  FileText,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings,
  Wrench,
  X,
} from "lucide-react";
import { useAuth } from "@/features/auth/AuthContext";
import { isDevAccessEnabled } from "@/features/auth/lib/devAccess";
import { BrandMark } from "@/shared/components/branding/BrandMark";
import { Footer } from "@/shared/components/layout/Footer";
import { PageHeader } from "@/shared/components/layout/PageHeader";
import { PortalAccentBar, deskNavClass, portalSurfaceProps } from "@/core/design";
import { LANDLORD_LOGIN, LANDLORD_ROUTES } from "@/features/landlord/lib/landlordPaths";

const NAV = [
  { label: "Dashboard", href: LANDLORD_ROUTES.dashboard, icon: LayoutDashboard },
  { label: "Portfolio", href: LANDLORD_ROUTES.portfolio, icon: Building2 },
  { label: "Financials", href: LANDLORD_ROUTES.financials, icon: BarChart3 },
  { label: "Statements", href: LANDLORD_ROUTES.statements, icon: FileSpreadsheet },
  { label: "Maintenance", href: LANDLORD_ROUTES.maintenance, icon: Wrench },
  { label: "Documents", href: LANDLORD_ROUTES.documents, icon: FileText },
  { label: "Settings", href: LANDLORD_ROUTES.settings, icon: Settings },
] as const;

interface LandlordLayoutProps {
  children: ReactNode;
  title: string;
  description?: string;
  actions?: ReactNode;
}

export default function LandlordLayout({ children, title, description, actions }: LandlordLayoutProps) {
  const { user, userRole, signOut, loading } = useAuth();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background" {...portalSurfaceProps("landlord")}>
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
      </div>
    );
  }

  if (!isDevAccessEnabled() && (!user || userRole?.role !== "landlord")) {
    return <Navigate to={LANDLORD_LOGIN} replace />;
  }

  const isActive = (href: string) => {
    if (href === LANDLORD_ROUTES.dashboard) {
      return location.pathname === href;
    }
    return location.pathname === href || location.pathname.startsWith(`${href}/`);
  };

  return (
    <div className="min-h-screen bg-background text-foreground" {...portalSurfaceProps("landlord")}>
      <PortalAccentBar className="fixed top-0 left-0 right-0 z-[60]" />
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
          <BrandMark size="md" showWordmark subtitle="Landlord" />
          <button
            type="button"
            className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md text-muted-foreground hover:text-foreground lg:hidden"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close menu"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <nav className="flex-1 space-y-0.5 overflow-y-auto px-2 py-4" aria-label="Landlord">
          {NAV.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                to={item.href}
                onClick={() => setSidebarOpen(false)}
                aria-current={active ? "page" : undefined}
                className={`group flex min-h-11 items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${deskNavClass(active)}`}
              >
                <item.icon className="h-4 w-4 flex-shrink-0" />
                <span className="flex-1 truncate">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="flex-shrink-0 border-t border-border p-3">
          {user ? (
            <div className="mb-2 rounded-lg border border-border bg-muted/40 px-3 py-2">
              <p className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">Landlord</p>
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
              <span className="font-medium text-foreground">Landlord</span>
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50" />
              <span className="truncate">{title}</span>
            </div>
          </div>
        </header>

        <PageHeader
          title={title}
          description={description}
          actions={actions}
          className="border-0 px-4 py-4 sm:px-6 lg:px-8"
        />

        <main id="main-content" tabIndex={-1} className="flex-1 min-w-0 overflow-x-clip px-4 pb-8 outline-none sm:px-6 lg:px-8">
          {children}
        </main>

        <Footer variant="compact" />
      </div>
    </div>
  );
}
