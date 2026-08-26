import type { ComponentType, ReactNode } from "react";
import {
  Building2,
  CreditCard,
  Receipt,
  Users,
  Wrench,
} from "lucide-react";
import { PROPERTY_IMAGES, PROPERTY_THUMBS } from "@/features/marketing/propertyImages";
import { portalSurfaceProps } from "@/core/design";
import {
  PortalBadge,
  PortalFooter,
  PortalHeader,
  PortalSwitcher,
} from "@/features/auth/components/PortalChrome";

/**
 * Manager portal entry chrome — operational desk, not marketing.
 * Owns the background, identity column, preview and shell composition for
 * the manager sign-in / account-creation screen; shared chrome parts live
 * in PortalChrome.tsx so the other portals adopt the same shell.
 */

const CAPABILITIES: { icon: ComponentType<{ className?: string }>; label: string }[] = [
  { icon: Building2, label: "Properties" },
  { icon: Users, label: "Tenants" },
  { icon: Receipt, label: "Billing" },
  { icon: CreditCard, label: "Payments" },
  { icon: Wrench, label: "Maintenance" },
];

const PREVIEW_STATS: { label: string; value: string }[] = [
  { label: "Units", value: "48" },
  { label: "Occupied", value: "92%" },
  { label: "Collected", value: "KES 1.24M" },
  { label: "Overdue", value: "4" },
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
            <div className="flex h-11 items-end">
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
    <figure className="rounded-2xl border border-white/10 bg-card shadow-lg shadow-navy-deep/30">
      <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-2.5">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Manager desk</p>
        <span className="rounded-full border border-primary/20 bg-soft-blue px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
          Illustrative data
        </span>
      </div>
      <div className="px-4 pb-4 pt-3">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {PREVIEW_STATS.map((stat) => (
            <div key={stat.label} className="rounded-lg border border-border bg-secondary-background/60 px-2.5 py-2">
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
            <ul className="mt-1.5 divide-y divide-border overflow-hidden rounded-lg border border-border bg-card">
              {MAINTENANCE_ACTIVITY.map((item) => (
                <li key={item.label} className="flex items-center justify-between gap-2 px-2.5 py-2 text-xs">
                  <span className="min-w-0 truncate text-muted-foreground">{item.label}</span>
                  <span
                    className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                      item.open ? "bg-warning/15 text-warning" : "bg-success/15 text-success"
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
            <div className="mt-1.5 overflow-hidden rounded-lg border border-border bg-card">
              <img
                src={PROPERTY_THUMBS.residential}
                alt="Kilimani Court building"
                loading="lazy"
                decoding="async"
                className="h-16 w-full object-cover"
              />
              <div className="flex items-center justify-between gap-2 px-2.5 py-2">
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
          className="h-full w-full scale-105 object-cover opacity-30 blur-[3px]"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-navy-deep/90 via-navy-deep/80 to-navy-deep/92" />
      </div>

      <div className="relative mx-auto flex min-h-screen max-w-[1140px] flex-col px-4 sm:px-6 lg:px-8">
        <PortalHeader subtitle="Manager" />

        <main className="grid flex-1 gap-7 pb-6 pt-2 lg:grid-cols-[1.2fr_1fr] lg:gap-12">
          {/* Identity — first on mobile and desktop col 1 */}
          <div className="flex flex-col justify-center lg:col-start-1 lg:row-start-1">
            <PortalBadge icon={Building2} label="Manager portal" />
            <h1 className="font-heading mt-4 max-w-md text-[2rem] font-bold leading-[1.12] tracking-tight text-white sm:text-[2.4rem]">
              <span className="block">Run your properties</span>{" "}
              <span className="block">from one desk.</span>
            </h1>
            <p className="mt-3 max-w-md text-sm leading-relaxed text-white/70 sm:text-[15px]">
              Manage properties, tenants, leases, rent, payments and maintenance from one connected workspace.
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2">
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
            <section className="rounded-2xl border border-white/10 bg-card p-6 shadow-2xl shadow-black/25" aria-label="Manager access">
              <div className="mb-4">
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
            <PortalSwitcher currentId="manager" />
          </div>
        </main>

        <footer className="pb-4">
          <PortalFooter />
        </footer>
      </div>
    </div>
  );
}
