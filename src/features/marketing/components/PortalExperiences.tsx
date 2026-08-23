import type { ComponentType } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Building2, LayoutGrid, User, Users, type LucideIcon } from "lucide-react";
import { CALQULUS_COLOR, CALQULUS_PORTAL_ACCENT } from "@/shared/theme/tokens";
import { statusBadgeClass } from "@/shared/lib/statusBadge";
import { PUBLIC_ROUTES } from "@/features/marketing/publicConfig";

/** Mini preview — mirrors the manager dashboard KPI + collections pattern. */
function ManagerPreview() {
  const bars = [58, 70, 64, 82, 93];
  return (
    <div className="rounded-lg border border-border bg-card p-2.5" aria-hidden>
      <div className="flex items-center justify-between">
        <p className="text-[9px] font-medium uppercase tracking-wide text-muted-foreground">Occupancy</p>
        <p className="font-heading text-xs font-semibold text-foreground">92%</p>
      </div>
      <div className="mt-2 flex h-8 items-end gap-1">
        {bars.map((height, i) => (
          <span
            key={i}
            className="flex-1 rounded-sm bg-primary/70 last:bg-primary"
            style={{ height: `${height}%` }}
          />
        ))}
      </div>
      <p className="mt-1.5 truncate text-[10px] text-muted-foreground">KES 1.24M collected</p>
    </div>
  );
}

/** Mini preview — mirrors the landlord property card revenue + occupancy bar. */
function LandlordPreview() {
  return (
    <div className="rounded-lg border border-border bg-card p-2.5" aria-hidden>
      <div className="flex items-center justify-between">
        <p className="text-[9px] font-medium uppercase tracking-wide text-muted-foreground">Portfolio revenue</p>
        <span className={statusBadgeClass("success")}>Paid out</span>
      </div>
      <p className="mt-1 font-heading text-xs font-semibold text-foreground">KES 1.24M</p>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
        <div className="h-full w-[86%] rounded-full bg-primary" />
      </div>
      <p className="mt-1 text-[10px] text-muted-foreground">86% occupied · 3 properties</p>
    </div>
  );
}

/** Mini preview — mirrors the agency client/property rows with commission. */
function AgencyPreview() {
  return (
    <div className="rounded-lg border border-border bg-card p-2.5" aria-hidden>
      <div className="flex items-center justify-between gap-2">
        <p className="truncate text-[10px] font-medium text-foreground">Kilimani Court</p>
        <span className={statusBadgeClass("success")}>Collected</span>
      </div>
      <div className="mt-1.5 flex items-center justify-between gap-2">
        <p className="truncate text-[10px] font-medium text-foreground">West View</p>
        <span className={statusBadgeClass("warning")}>Pending</span>
      </div>
      <p className="mt-2 text-[10px] text-muted-foreground">4 clients · revenue shared</p>
    </div>
  );
}

/** Mini preview — mirrors the tenant balance hero card states. */
function TenantPreview() {
  return (
    <div className="rounded-lg border border-border bg-card p-2.5" aria-hidden>
      <p className="text-[9px] font-medium uppercase tracking-wide text-muted-foreground">Balance due</p>
      <p className="mt-1 font-heading text-xs font-semibold text-foreground">KES 0</p>
      <span className={`${statusBadgeClass("success")} mt-2`}>Fully paid</span>
      <p className="mt-1.5 text-[10px] text-muted-foreground">Receipts and lease documents</p>
    </div>
  );
}

const PORTALS: {
  id: "manager" | "landlord" | "agency" | "tenant";
  icon: LucideIcon;
  title: string;
  descriptor: string;
  href: string;
  accent: string;
  Preview: ComponentType;
}[] = [
  {
    id: "manager",
    icon: LayoutGrid,
    title: "Manager",
    descriptor: "Run operations",
    href: PUBLIC_ROUTES.managerSignUp,
    accent: CALQULUS_PORTAL_ACCENT.manager.hex,
    Preview: ManagerPreview,
  },
  {
    id: "landlord",
    icon: Building2,
    title: "Landlord",
    descriptor: "Track your portfolio",
    href: PUBLIC_ROUTES.landlordLogin,
    accent: CALQULUS_PORTAL_ACCENT.landlord.hex,
    Preview: LandlordPreview,
  },
  {
    id: "agency",
    icon: Users,
    title: "Agency",
    descriptor: "Manage properties",
    href: PUBLIC_ROUTES.agencyLogin,
    accent: CALQULUS_PORTAL_ACCENT.agency.hex,
    Preview: AgencyPreview,
  },
  {
    id: "tenant",
    icon: User,
    title: "Tenant",
    descriptor: "Manage your home",
    href: PUBLIC_ROUTES.tenantLogin,
    accent: CALQULUS_PORTAL_ACCENT.tenant.hex,
    Preview: TenantPreview,
  },
];

/** "One system. Every role." — portal cards with previews of the real dashboards. */
export function PortalExperiences() {
  return (
    <section id="solutions" className="scroll-mt-20 bg-card py-12 sm:py-14">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="public-section-title">One system. Every role.</h2>
          <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground sm:text-base">
            Each role gets its own portal on the same data.
          </p>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {PORTALS.map((portal) => (
            <article
              key={portal.title}
              data-portal={portal.id}
              className="flex flex-col rounded-[14px] border p-4 shadow-sm transition-shadow duration-200 hover:shadow-md"
              style={{
                backgroundColor: `color-mix(in srgb, ${portal.accent} 8%, ${CALQULUS_COLOR.white})`,
                borderColor: `color-mix(in srgb, ${portal.accent} 28%, ${CALQULUS_COLOR.border})`,
              }}
            >
              <portal.Preview />
              <div className="mt-3 flex items-center gap-2">
                <span
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md"
                  style={{ backgroundColor: `color-mix(in srgb, ${portal.accent} 14%, #FFFFFF)`, color: portal.accent }}
                >
                  <portal.icon className="h-3.5 w-3.5" aria-hidden />
                </span>
                <div className="min-w-0">
                  <h3 className="font-heading text-sm font-semibold leading-tight text-foreground">
                    {portal.title}
                  </h3>
                  <p className="truncate text-xs text-foreground/70">{portal.descriptor}</p>
                </div>
              </div>
              <Link
                to={portal.href}
                aria-label={`View ${portal.title} portal`}
                className="mt-3 inline-flex min-h-11 items-center gap-1 text-sm font-medium hover:underline"
                style={{ color: `color-mix(in srgb, ${portal.accent} 72%, var(--navy-deep))` }}
              >
                View portal
                <ArrowRight className="h-3.5 w-3.5" aria-hidden />
              </Link>
            </article>
          ))}
        </div>
        <p className="mt-4 text-center text-xs text-muted-foreground">
          Previews are miniature illustrations of the real portals.
        </p>
      </div>
    </section>
  );
}
