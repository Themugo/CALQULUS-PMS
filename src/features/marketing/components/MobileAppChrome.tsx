import { Link, useLocation } from "react-router-dom";
import { Building2, Home, LogIn, Search, Settings2, Tag, TrendingUp, Users, Building, LayoutGrid } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { usePortalIdentity } from "@/core/product/PortalIdentityProvider";
import { PUBLIC_ROUTES } from "@/features/marketing/publicConfig";
import type { PublicSiteConfig } from "@/features/marketing/publicSiteConfig";
import { CALQULUS_PORTAL_ACCENT } from "@/shared/theme/tokens";

const TAB_FOCUS = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-inset";

interface Tab { id: string; label: string; href: string; icon: LucideIcon; match: (path: string) => boolean }

const TABS: Tab[] = [
  { id: "home", label: "Home", href: PUBLIC_ROUTES.home, icon: Home, match: (p) => p === "/" },
  { id: "listings", label: "Listings", href: "/discover/residential", icon: Building, match: (p) => p.startsWith("/discover") },
  { id: "portals", label: "Portals", href: PUBLIC_ROUTES.portalAccess, icon: LayoutGrid, match: (p) => p.startsWith("/portal-access") },
  { id: "pricing", label: "Pricing", href: PUBLIC_ROUTES.pricing, icon: Tag, match: (p) => p === PUBLIC_ROUTES.pricing },
  { id: "signin", label: "Sign in", href: PUBLIC_ROUTES.portalAccessSignIn, icon: LogIn, match: () => false },
];

/** App-style bottom tab bar for phones. Hidden from `lg` up, where the header nav takes over. */
export function MobileTabBar() {
  const { pathname } = useLocation();
  return (
    <nav
      aria-label="App navigation"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-6px_24px_rgba(10,37,64,0.08)] backdrop-blur lg:hidden"
    >
      <ul className="mx-auto grid max-w-xl grid-cols-5">
        {TABS.map((tab) => {
          const active = tab.match(pathname);
          const Icon = tab.icon;
          return (
            <li key={tab.id}>
              <Link
                to={tab.href}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-[56px] flex-col items-center justify-center gap-0.5 px-1 text-[11px] font-medium transition-colors active:bg-muted ${TAB_FOCUS} ${active ? "text-primary" : "text-muted-foreground"}`}
              >
                <span className={`flex h-7 w-12 items-center justify-center rounded-full transition-colors ${active ? "bg-primary/12" : ""}`}>
                  <Icon className="h-[22px] w-[22px]" strokeWidth={active ? 2.4 : 1.9} aria-hidden />
                </span>
                {tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

const PORTAL_ICON = { agency: Building2, manager: Settings2, landlord: TrendingUp, tenant: Home } as const;
const PORTAL_LABEL = { agency: "Agency", manager: "Manager", landlord: "Landlord", tenant: "Tenant" } as const;
const ACCENT = {
  agency: CALQULUS_PORTAL_ACCENT.agency.hex,
  manager: CALQULUS_PORTAL_ACCENT.manager.hex,
  landlord: CALQULUS_PORTAL_ACCENT.landlord.hex,
  tenant: CALQULUS_PORTAL_ACCENT.tenant.hex,
} as const;

/** Launcher-style icon row: one tap to the right portal, plus search and listings. Phones only. */
export function MobileQuickAccess({ portals, searchVisible }: { portals: PublicSiteConfig["portals"]; searchVisible: boolean }) {
  const { identities } = usePortalIdentity();
  const items = portals.filter((p) => p?.enabled);
  const external = (href: string) => /^https?:\/\//i.test(href);
  const tile = "group flex min-w-0 flex-col items-center gap-1.5 rounded-2xl px-1 py-2 text-center active:bg-muted " + TAB_FOCUS;
  return (
    <section aria-label="Quick access" className="bg-background px-3 pb-2 pt-4 lg:hidden">
      <h2 className="px-1 font-heading text-lg font-semibold tracking-[-0.02em] text-navy-deep">Sign in to your portal</h2>
      <ul className="mt-3 grid grid-cols-4 gap-1">
        {items.map((item) => {
          const Icon = PORTAL_ICON[item.id] ?? Building2;
          const accent = identities[item.id]?.primaryHex || ACCENT[item.id];
          const label = PORTAL_LABEL[item.id] ?? item.title;
          return (
            <li key={item.id} className="min-w-0">
              {external(item.href) ? (
                <a href={item.href} className={tile} aria-label={`${label} portal`}>
                  <span className="flex h-14 w-14 items-center justify-center rounded-2xl text-white shadow-sm" style={{ backgroundColor: accent }}><Icon className="h-6 w-6" aria-hidden /></span>
                  <span className="text-xs font-medium text-navy-deep">{label}</span>
                </a>
              ) : (
                <Link to={item.href} className={tile} aria-label={`${label} portal`}>
                  <span className="flex h-14 w-14 items-center justify-center rounded-2xl text-white shadow-sm" style={{ backgroundColor: accent }}><Icon className="h-6 w-6" aria-hidden /></span>
                  <span className="text-xs font-medium text-navy-deep">{label}</span>
                </Link>
              )}
            </li>
          );
        })}
      </ul>
      <ul className="mt-1 grid grid-cols-2 gap-2">
        <li>
          <Link to="/discover/residential" className={`flex min-h-12 items-center gap-2.5 rounded-xl border border-border bg-card px-3 text-sm font-medium text-navy-deep active:bg-muted ${TAB_FOCUS}`}>
            <Building className="h-5 w-5 text-primary" aria-hidden />Browse listings
          </Link>
        </li>
        <li>
          {searchVisible ? (
            <a href="#quick-search" className={`flex min-h-12 items-center gap-2.5 rounded-xl border border-border bg-card px-3 text-sm font-medium text-navy-deep active:bg-muted ${TAB_FOCUS}`}>
              <Search className="h-5 w-5 text-primary" aria-hidden />Search
            </a>
          ) : (
            <Link to={PUBLIC_ROUTES.pricing} className={`flex min-h-12 items-center gap-2.5 rounded-xl border border-border bg-card px-3 text-sm font-medium text-navy-deep active:bg-muted ${TAB_FOCUS}`}>
              <Users className="h-5 w-5 text-primary" aria-hidden />See pricing
            </Link>
          )}
        </li>
      </ul>
    </section>
  );
}
