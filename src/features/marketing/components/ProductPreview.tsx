import { Building2, LayoutDashboard, Users, Wallet, Wrench } from "lucide-react";
import { BrandMark } from "@/shared/components/branding/BrandMark";
import { invoiceStatusTone, statusBadgeClass } from "@/shared/lib/statusBadge";

const SIDEBAR_ITEMS = [
  { label: "Overview", icon: LayoutDashboard, active: true },
  { label: "Properties", icon: Building2, active: false },
  { label: "Tenants", icon: Users, active: false },
  { label: "Billing", icon: Wallet, active: false },
  { label: "Maintenance", icon: Wrench, active: false },
] as const;

const SNAPSHOT = [
  { label: "Occupancy", value: "92%" },
  { label: "Collected", value: "KES 1.24M" },
  { label: "Collection rate", value: "93%" },
  { label: "Open repairs", value: "2" },
] as const;

/** Relative bar heights only — illustrative, not measured data. */
const COLLECTION_TREND = [58, 64, 61, 74, 69, 83, 93] as const;

const MAINTENANCE_ACTIVITY = [
  { label: "Leaking tap · Kilimani Court A2", status: "pending" },
  { label: "Gate motor repaired · Westlands B4", status: "paid" },
  { label: "Inspection scheduled · Riverside C1", status: "pending" },
] as const;

/** Static illustration of the manager desk — not a live data view. */
export function ProductPreview() {
  return (
    <figure className="mx-auto w-full max-w-lg md:max-w-none">
      <div className="flex overflow-hidden rounded-lg border border-border bg-card shadow-sm">
        <nav
          aria-hidden
          className="hidden w-12 shrink-0 flex-col items-center gap-3 border-r border-border bg-sidebar py-3 sm:flex"
        >
          <BrandMark size="xs" forcePlatform />
          <ul className="mt-2 flex flex-col gap-2">
            {SIDEBAR_ITEMS.map((item) => (
              <li key={item.label}>
                <span
                  className={
                    item.active
                      ? "flex h-7 w-7 items-center justify-center rounded-md bg-primary/10 text-primary"
                      : "flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground"
                  }
                >
                  <item.icon className="h-3.5 w-3.5" />
                </span>
              </li>
            ))}
          </ul>
        </nav>

        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-3 border-b border-border bg-card px-4 py-2.5">
            <div className="min-w-0">
              <p className="truncate font-heading text-sm font-semibold text-foreground">Manager desk</p>
              <p className="truncate text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                Sample portfolio
              </p>
            </div>
            <span className="shrink-0 rounded-full border border-border px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
              Preview
            </span>
          </div>

          <div className="bg-background p-3 sm:p-4">
            <div className="grid grid-cols-4 gap-2">
              {SNAPSHOT.map((metric) => (
                <div key={metric.label} className="rounded-lg border border-border bg-card p-2">
                  <p className="truncate text-[9px] font-medium uppercase tracking-wide text-muted-foreground">
                    {metric.label}
                  </p>
                  <p className="mt-1 truncate font-heading text-sm font-semibold leading-none tracking-tight text-foreground">
                    {metric.value}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-3 rounded-lg border border-border bg-card p-3">
              <p className="type-label mb-2">Collections, last 7 weeks</p>
              <div className="flex h-14 items-end gap-1.5">
                {COLLECTION_TREND.map((height, index) => (
                  <div
                    key={index}
                    className="flex-1 rounded-sm bg-primary/70 last:bg-primary"
                    style={{ height: `${height}%` }}
                  />
                ))}
              </div>
            </div>

            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div>
                <p className="type-label mb-2">Maintenance activity</p>
                <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-card">
                  {MAINTENANCE_ACTIVITY.map((item) => (
                    <li key={item.label} className="flex items-center justify-between gap-2 px-2.5 py-2 text-xs">
                      <span className="min-w-0 truncate text-muted-foreground">{item.label}</span>
                      <span className={`${statusBadgeClass(invoiceStatusTone(item.status))} shrink-0`}>
                        {item.status === "paid" ? "Done" : "Open"}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="type-label mb-2">Property</p>
                <div className="rounded-lg border border-border bg-card p-2.5">
                  <p className="text-xs font-semibold text-foreground">Kilimani Court</p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">24 units · 22 occupied</p>
                  <p className="mt-1.5 text-[11px] text-muted-foreground">Next inspection: 12 Sep</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <figcaption className="mt-2.5 text-center text-xs text-muted-foreground">
        Illustrative view of the CALQULUS manager dashboard.
      </figcaption>
    </figure>
  );
}
