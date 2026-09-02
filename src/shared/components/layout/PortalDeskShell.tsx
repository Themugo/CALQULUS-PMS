import { useState, type CSSProperties, type ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { ChevronRight, LogOut, Menu, Settings, X } from "lucide-react";
import { BrandMark } from "@/shared/components/branding/BrandMark";
import { Footer } from "@/shared/components/layout/Footer";
import { PageHeader } from "@/shared/components/layout/PageHeader";
import { PortalAccentBar, deskNavClass } from "@/core/design";
import { cn } from "@/shared/lib/utils";

export interface PortalDeskNavItem {
  label: string;
  href: string;
  icon: ComponentType<{ className?: string }>;
  permission?: string;
}

export interface PortalDeskNavGroup {
  label: string;
  items: PortalDeskNavItem[];
}

interface PortalDeskShellProps {
  children: ReactNode;
  title: string;
  description?: string;
  actions?: ReactNode;
  portalLabel: string;
  navLabel: string;
  navGroups: PortalDeskNavGroup[];
  userEmail?: string | null;
  onSignOut: () => void;
  settingsHref?: string;
  brandSubtitle?: string;
  forcePlatformBrand?: boolean;
  isActive?: (href: string, pathname: string) => boolean;
  headerRight?: ReactNode;
  mobileNav?: PortalDeskNavItem[];
  hideHeader?: boolean;
  className?: string;
  style?: CSSProperties;
  contentMaxWidth?: string;
  sidebarWidthClass?: string;
  sidebarOffsetClass?: string;
  mobileContentPadding?: string;
}

export function PortalDeskLoading({ className }: { className?: string }) {
  return (
    <div className={cn("flex min-h-screen items-center justify-center bg-background", className)}>
      <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" aria-label="Loading" />
    </div>
  );
}

export function PortalDeskShell({
  children,
  title,
  description,
  actions,
  portalLabel,
  navLabel,
  navGroups,
  userEmail,
  onSignOut,
  settingsHref,
  brandSubtitle,
  forcePlatformBrand = false,
  isActive = defaultIsActive,
  headerRight,
  mobileNav,
  hideHeader = false,
  className,
  style,
  contentMaxWidth = "max-w-[1800px]",
  sidebarWidthClass = "w-64",
  sidebarOffsetClass = "lg:ml-64",
  mobileContentPadding = "pb-8",
}: PortalDeskShellProps) {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const closeSidebar = () => setSidebarOpen(false);

  return (
    <div className={cn("min-h-screen bg-background text-foreground", className)} style={style}>
      <PortalAccentBar className="fixed left-0 right-0 top-0 z-[60]" />
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-primary focus:px-4 focus:py-2.5 focus:text-sm focus:font-semibold focus:text-primary-foreground"
      >
        Skip to main content
      </a>

      {sidebarOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-muted/80 backdrop-blur-sm lg:hidden"
          aria-label="Close menu"
          onClick={closeSidebar}
        />
      ) : null}

      <aside
        className={cn(
          "fixed left-0 top-0 z-50 flex h-full flex-col border-r border-border bg-card transform transition-transform duration-300 lg:translate-x-0",
          sidebarWidthClass,
          sidebarOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-16 flex-shrink-0 items-center justify-between border-b border-border px-4">
          <BrandMark size="md" showWordmark subtitle={brandSubtitle ?? portalLabel} forcePlatform={forcePlatformBrand} />
          <button
            type="button"
            className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground lg:hidden"
            onClick={closeSidebar}
            aria-label="Close menu"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <nav className="flex-1 space-y-4 overflow-y-auto px-2 py-4" aria-label={navLabel}>
          {navGroups.map((group) => {
            if (group.items.length === 0) return null;
            return (
              <div key={group.label} className="space-y-0.5">
                <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  {group.label}
                </p>
                {group.items.map((item) => {
                  const active = isActive(item.href, location.pathname);
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      to={item.href}
                      onClick={closeSidebar}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "group flex min-h-11 items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                        deskNavClass(active),
                      )}
                    >
                      <Icon className="h-4 w-4 flex-shrink-0" />
                      <span className="flex-1 truncate">{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            );
          })}
        </nav>

        <div className="flex-shrink-0 border-t border-border p-3">
          {userEmail ? (
            <div className="mb-2 rounded-lg border border-border bg-muted/40 px-3 py-2">
              <p className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">{portalLabel}</p>
              <p className="truncate text-xs font-medium text-foreground">{userEmail}</p>
            </div>
          ) : null}
          <button
            type="button"
            onClick={onSignOut}
            className="flex w-full items-center gap-3 rounded-lg border border-transparent px-3 py-2.5 text-sm font-medium text-muted-foreground hover:border-destructive/20 hover:bg-destructive/10 hover:text-destructive"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </div>
      </aside>

      <div className={cn("flex min-h-screen min-w-0 flex-col", sidebarOffsetClass)}>
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
              <span className="font-medium text-foreground">{portalLabel}</span>
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50" aria-hidden />
              <span className="truncate">{title}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">{headerRight}{settingsHref ? <Link to={settingsHref} aria-label={`${portalLabel} settings`} className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted/50 hover:text-foreground"><Settings className="h-4 w-4" /></Link> : null}</div>
        </header>

        {!hideHeader ? <PageHeader title={title} description={description} actions={actions} className="border-0 px-4 py-4 sm:px-6 lg:px-8" /> : null}

        <main id="main-content" tabIndex={-1} className={cn("mx-auto w-full flex-1 min-w-0 overflow-x-clip px-4 outline-none sm:px-6 lg:px-8", mobileContentPadding, contentMaxWidth)}>
          {children}
        </main>

        <Footer variant="compact" className={mobileNav ? "hidden md:block" : undefined} />
      </div>

      {mobileNav ? (
        <nav aria-label={`${navLabel} mobile`} className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card md:hidden safe-area-bottom">
          <div className="flex h-16 items-stretch justify-around">
            {mobileNav.map((item) => {
              const active = isActive(item.href, location.pathname);
              const Icon = item.icon;
              return (
                <Link key={item.href} to={item.href} aria-current={active ? "page" : undefined} className={cn("flex min-h-11 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 px-0.5", active ? "text-foreground" : "text-muted-foreground")}>
                  <Icon className={cn("h-5 w-5 shrink-0", active && "text-primary")} />
                  <span className={cn("max-w-full text-center text-[10px] leading-tight", active && "font-medium")}>{item.label}</span>
                </Link>
              );
            })}
          </div>
        </nav>
      ) : null}
    </div>
  );
}

function defaultIsActive(href: string, pathname: string) {
  return href === "/" ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
}
