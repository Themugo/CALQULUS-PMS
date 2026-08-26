import type { ComponentType, ReactNode } from "react";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  Building2,
  ChevronRight,
  CreditCard,
  Home,
  Receipt,
  Users,
  Wrench,
} from "lucide-react";
import { BrandMark } from "@/shared/components/branding/BrandMark";
import { PUBLIC_ROUTES } from "@/features/marketing/publicConfig";
import { PROPERTY_IMAGES, PROPERTY_THUMBS } from "@/features/marketing/propertyImages";
import { portalSurfaceProps } from "@/core/design";

/**
 * Manager portal entry chrome — operational desk, not marketing.
 * Owns the full background, header, identity column, preview, switcher
 * and legal footer for the manager sign-in / account-creation screen.
 */

const CAPABILITIES: { icon: ComponentType<{ className?: string }>; label: string }[] = [
  { icon: Building2, label: "Properties" },
  { icon: Users, label: "Tenants" },
  { icon: Receipt, label: "Billing" },
  { icon: CreditCard, label: "Payments" },
  { icon: Wrench, label: "Maintenance" },
];

const OTHER_PORTALS: { label: string; href: string; accent: string }[] = [
  { label: "Landlord", href: PUBLIC_ROUTES.landlordLogin, accent: "#0F8A6A" },
  { label: "Agency", href: PUBLIC_ROUTES.agencyLogin, accent: "#0F766E" },
  { label: "Tenant", href: PUBLIC_ROUTES.tenantLogin, accent: "#0284C7" },
];

const PREVIEW_STATS: { icon: ComponentType<{ className?: string }>; label: string; value: string }[] = [
  { icon: Home, label: "Units", value: "48" },
  { icon: Building2, label: "Occupied", value: "92%" },
  { icon: CreditCard, label: "Collected", value: "KES 1.24M" },
  { icon: AlertTriangle, label: "Overdue", value: "4" },
];

/** Relative bar heights only — illustrative, not measured data. */
const COLLECTION_TREND = [58, 64, 61, 74, 69, 83, 93] as const;
const WEEK_TICKS = ["W1", "W2", "W3", "W4", "W5", "W6", "W7"] as const;

const MAINTENANCE_ACTIVITY = [
  { label: "Leaking tap · Kilimani Court", open: true },
  { label: "Gate motor repaired · West View", open: false },
  { label: "Inspection scheduled · Block C", open: true },
] as const;

function CollectionsTrend() {
  return (
    <div className="relative flex items-end gap-[6px] pt-6" role="img" aria-label="Illustrative collections trend">
      <div className="pointer-events-none absolute inset-x-0 top-6 bottom-4 flex flex-col justify-between" aria-hidden>
        <span className="border-t border-border/50" />
        <span className="border-t border-border/50" />
        <span className="border-t border-border/50" />
      </div>
      {COLLECTION_TREND.map((height, index) => {
        const latest = index === COLLECTION_TREND.length - 1;
        return (
          <div key={WEEK_TICKS[index]} className="relative z-[1] flex-1">
            {latest ? (
              <span className="absolute -top-6 left-1/2 -translate-x-1/2 rounded-full bg-primary/10 px-1.5 py-0.5 font-heading text-[10px] font-semibold leading-none text-primary">
                {height}%
              </span>
            ) : null}
            <div className="flex h-12 items-end">
              <div
                className={`w-full rounded-t-[3px] transition-colors duration-200 ${latest ? "bg-primary" : "bg-primary/35"}`}
                style={{ height: `${height}%` }}
              />
            </div>
            <p className="mt-1 border-t border-border pt-1 text-center text-[8px] font-medium tracking-wide text-muted-foreground" aria-hidden>
              {WEEK_TICKS[index]}
            </p>
          </div>
        );
      })}
    </div>
  );
}

/** Compact manager desk mini-preview — figures are illustrative. */
export function ManagerOperationalPreview() {
  return (
    <figure className="rounded-[14px] border border-white/10 bg-card shadow-xl shadow-navy-deep/20">
      <div className="flex items-center justify-between gap-2 border-b border-border px-3.5 py-2.5">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Manager desk</p>
        <span className="rounded-full border border-primary/20 bg-soft-blue px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
          Illustrative data
        </span>
      </div>
      <div className="p-3.5">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {PREVIEW_STATS.map((stat) => (
            <div key={stat.label} className="rounded-lg border border-border bg-secondary-background p-2.5">
              <p className="text-[9px] font-medium uppercase tracking-wide text-muted-foreground">{stat.label}</p>
              <p className="mt-1 truncate font-heading text-sm font-semibold leading-none tracking-tight text-foreground">
                {stat.value}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-3">
          <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Collection trend</p>
          <CollectionsTrend />
        </div>

        <div className="mt-3.5 grid gap-3.5 sm:grid-cols-2">
          <div>
            <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Maintenance activity</p>
            <ul className="mt-2 divide-y divide-border overflow-hidden rounded-lg border border-border bg-card">
              {MAINTENANCE_ACTIVITY.map((item) => (
                <li key={item.label} className="flex items-center justify-between gap-2 px-2.5 py-2 text-xs">
                  <span className="min-w-0 truncate text-muted-foreground">{item.label}</span>
                  <span
                    className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                      item.open ? "bg-warning/15 text-warning-foreground" : "bg-success/15 text-success"
                    }`}
                  >
                    {item.open ? "Open" : "Done"}
                  </span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Property</p>
            <div className="mt-2 overflow-hidden rounded-lg border border-border bg-card">
              <img
                src={PROPERTY_THUMBS.residential}
                alt="Kilimani Court building"
                loading="lazy"
                decoding="async"
                className="h-14 w-full object-cover"
              />
              <div className="flex items-center justify-between gap-2 p-2.5">
                <div className="min-w-0">
                  <p className="truncate text-xs font-semibold text-foreground">Kilimani Court</p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">24 units · 22 occupied</p>
                </div>
                <span className="shrink-0 rounded-md bg-primary/10 px-1.5 py-0.5 font-heading text-[10px] font-semibold leading-none text-primary">
                  92%
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
      <figcaption className="sr-only">Illustrative manager desk. Sample figures only — not live customer data.</figcaption>
    </figure>
  );
}

/** Compact switcher for the other CALQULUS portals. */
function PortalSwitcher() {
  return (
    <nav aria-label="Other CALQULUS portals" className="mt-6">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-white/40">Other CALQULUS portals</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {OTHER_PORTALS.map((portal) => (
          <Link
            key={portal.href}
            to={portal.href}
            className="group inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-medium text-white/70 transition-colors hover:bg-white/10 hover:text-white"
          >
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: portal.accent }} aria-hidden />
            {portal.label}
            <ChevronRight className="h-3 w-3 text-white/30 transition-transform group-hover:translate-x-0.5" aria-hidden />
          </Link>
        ))}
      </div>
    </nav>
  );
}

/** Footer strip — legal only. */
function CompactPortalFooter() {
  return (
    <div className="mt-4 flex items-center gap-3 text-[11px] text-white/40">
      <Link to={PUBLIC_ROUTES.legalPrivacy} className="transition-colors hover:text-white/80">
        Privacy
      </Link>
      <span aria-hidden>·</span>
      <Link to={PUBLIC_ROUTES.legalTerms} className="transition-colors hover:text-white/80">
        Terms
      </Link>
      <span className="ml-auto">© 2026 CALQULUS Limited</span>
    </div>
  );
}

interface ManagerPortalShellProps {
  /** e.g. "Welcome back" (sign-in tab) or "Create your manager account". */
  formTitle: string;
  children: ReactNode;
}

export function ManagerPortalShell({ formTitle, children }: ManagerPortalShellProps) {
  return (
    <div className="relative min-h-screen bg-navy-deep" {...portalSurfaceProps("manager")}>
      {/* Property imagery behind a deep-navy veil — context, not poster. */}
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <img
          src={PROPERTY_IMAGES.residential}
          alt=""
          loading="lazy"
          decoding="async"
          className="h-full w-full object-cover opacity-[0.22]"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-navy-deep/85 via-navy-deep/80 to-navy-deep/92" />
      </div>

      <div className="relative mx-auto flex min-h-screen max-w-5xl flex-col px-4 sm:px-6 lg:px-8">
        <header className="flex items-center justify-between py-5">
          <Link to={PUBLIC_ROUTES.home} aria-label="CALQULUS home">
            <BrandMark size="nav" showWordmark subtitle="Manager" inverse forcePlatform />
          </Link>
          <Link to={PUBLIC_ROUTES.home} className="text-xs font-medium text-white/60 transition-colors hover:text-white">
            Back to CALQULUS
          </Link>
        </header>

        <main className="grid flex-1 gap-8 pb-6 lg:grid-cols-[1.05fr_0.95fr] lg:gap-12">
          {/* Identity — first on mobile and desktop col 1 */}
          <div className="flex flex-col justify-center lg:col-start-1 lg:row-start-1">
            <div className="inline-flex items-center gap-2 self-start rounded-full border border-white/15 bg-white/[0.04] px-3 py-1.5">
              <Building2 className="h-3.5 w-3.5 text-primary" aria-hidden />
              <span className="text-[11px] font-semibold uppercase tracking-wider text-white/90">Manager portal</span>
            </div>
            <h1 className="font-heading mt-5 max-w-md text-[1.9rem] font-bold leading-tight tracking-tight text-white sm:text-4xl">
              Run your properties from one desk.
            </h1>
            <p className="mt-3 max-w-md text-sm leading-relaxed text-white/70 sm:text-[15px]">
              Manage properties, tenants, leases, rent, payments and maintenance from one connected workspace.
            </p>
            <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2">
              {CAPABILITIES.map(({ icon: Icon, label }) => (
                <span key={label} className="inline-flex items-center gap-1.5 text-[13px] font-medium text-white/80">
                  <Icon className="h-[15px] w-[15px] text-primary" aria-hidden />
                  {label}
                </span>
              ))}
            </div>
          </div>

          {/* Auth card — second on mobile, spans identity+preview rows on desktop */}
          <div className="lg:col-start-2 lg:row-span-3 lg:row-start-1 lg:flex lg:flex-col lg:justify-center">
            <section className="rounded-[16px] border border-white/10 bg-card p-6 shadow-2xl shadow-black/25 sm:p-7" aria-label="Manager access">
              <div className="mb-5">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-soft-blue px-2.5 py-1">
                  <Building2 className="h-3 w-3 text-primary" aria-hidden />
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-primary">Manager</span>
                </span>
                <h2 className="font-heading mt-3 text-2xl font-bold tracking-tight text-foreground">{formTitle}</h2>
              </div>
              {children}
            </section>
          </div>

          {/* Preview — third on mobile, under identity on desktop */}
          <div className="lg:col-start-1 lg:row-start-2 lg:row-end-4">
            <ManagerOperationalPreview />
            <PortalSwitcher />
          </div>
        </main>

        <footer className="pb-5">
          <CompactPortalFooter />
        </footer>
      </div>
    </div>
  );
}
