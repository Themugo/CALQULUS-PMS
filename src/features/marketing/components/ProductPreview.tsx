import type { ReactNode } from "react";
import { Bell, Building2, LayoutDashboard, Search, Users, Wallet, Wrench, BarChart3 } from "lucide-react";
import { BrandMark } from "@/shared/components/branding/BrandMark";
import { invoiceStatusTone, statusBadgeClass } from "@/shared/lib/statusBadge";

const SIDEBAR_ITEMS = [
  { label: "Dashboard", icon: LayoutDashboard, active: true },
  { label: "Properties", icon: Building2, active: false },
  { label: "Tenants", icon: Users, active: false },
  { label: "Billing", icon: Wallet, active: false },
  { label: "Maintenance", icon: Wrench, active: false },
  { label: "Reports", icon: BarChart3, active: false },
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
  { label: "Leaking tap · Kilimani Court", status: "pending" },
  { label: "Gate motor repaired · West View", status: "paid" },
  { label: "Inspection scheduled · Block C", status: "pending" },
] as const;

interface ProductPreviewProps {
  /** Tone for the caption — dark heroes need a light caption. */
  captionClassName?: string;
  /** Stronger elevation for placement on dark hero surfaces. */
  elevated?: boolean;
}

const UNIT_REGISTER = [
  { unit: "A-01", status: "paid", note: "Occupied" },
  { unit: "A-02", status: "paid", note: "Occupied" },
  { unit: "A-03", status: "pending", note: "Vacant" },
  { unit: "B-01", status: "paid", note: "Occupied" },
  { unit: "B-02", status: "pending", note: "Notice given" },
  { unit: "B-03", status: "paid", note: "Occupied" },
] as const;

const BILLING_ROWS = [
  { label: "Rent · Kilimani Court", amount: "KES 1.24M", status: "paid" },
  { label: "Water · West View", amount: "KES 86K", status: "paid" },
  { label: "Rent · Block C", amount: "KES 210K", status: "pending" },
] as const;

function MiniPanel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <p className="type-label mb-2">{title}</p>
      {children}
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  return (
    <span className={`${statusBadgeClass(invoiceStatusTone(status))} shrink-0`}>
      {status === "paid" ? "Done" : "Open"}
    </span>
  );
}

function CollectionsChart({ compact = false }: { compact?: boolean }) {
  return (
    <div
      className={`relative flex items-end gap-1.5 ${compact ? "h-10" : "h-14"}`}
      role="img"
      aria-label="Illustrative collections chart for the last seven weeks"
    >
      <div className="pointer-events-none absolute inset-0 flex flex-col justify-between" aria-hidden>
        <span className="border-t border-border" />
        <span className="border-t border-border" />
        <span className="border-t border-border" />
        <span className="border-t border-border" />
      </div>
      {COLLECTION_TREND.map((height, index) => (
        <div
          key={index}
          className="relative z-[1] flex-1 rounded-sm bg-primary/70 last:bg-primary"
          style={{ height: `${height}%` }}
        />
      ))}
    </div>
  );
}

/**
 * Specialized lightweight visuals for the capability showcase — each presents
 * ONE product capability, so the full manager dashboard is never repeated
 * outside the hero. All figures are illustrative.
 */
export function PropertyOperationsVisual() {
  return (
    <div className="rounded-[14px] border border-border bg-background p-3 shadow-sm sm:p-4">
      <MiniPanel title="Property register">
        <div className="flex items-center justify-between gap-2 rounded-md bg-primary/5 px-2.5 py-2">
          <div className="min-w-0">
            <p className="truncate text-xs font-semibold text-foreground">Kilimani Court</p>
            <p className="text-[11px] text-muted-foreground">24 units · 22 occupied</p>
          </div>
          <p className="font-heading text-sm font-semibold text-primary">92%</p>
        </div>
      </MiniPanel>
      <div className="mt-3">
        <MiniPanel title="Unit occupancy">
          <ul className="divide-y divide-border">
            {UNIT_REGISTER.map((row) => (
              <li key={row.unit} className="flex items-center justify-between gap-2 py-1.5 text-xs">
                <span className="font-medium text-foreground">{row.unit}</span>
                <span className="min-w-0 truncate text-muted-foreground">{row.note}</span>
                <span className={`${statusBadgeClass(invoiceStatusTone(row.status))} shrink-0`}>
                  {row.note === "Vacant" ? "Open" : "Set"}
                </span>
              </li>
            ))}
          </ul>
        </MiniPanel>
      </div>
    </div>
  );
}

const FINANCE_SNAPSHOT = [
  { label: "Collected", value: "KES 1.24M" },
  { label: "Collection rate", value: "93%" },
  { label: "Outstanding", value: "KES 210K" },
] as const;

export function FinancialOperationsVisual() {
  return (
    <div className="rounded-[14px] border border-border bg-background p-3 shadow-sm sm:p-4">
      <div className="grid grid-cols-3 gap-2">
        {FINANCE_SNAPSHOT.map((metric) => (
          <div key={metric.label} className="rounded-lg border border-border bg-card p-2">
            <p className="truncate text-[9px] font-medium uppercase tracking-wide text-muted-foreground">
              {metric.label}
            </p>
            <p className="mt-1 truncate font-heading text-xs font-semibold leading-none tracking-tight text-foreground">
              {metric.value}
            </p>
          </div>
        ))}
      </div>
      <div className="mt-3">
        <MiniPanel title="Billing runs">
          <ul className="divide-y divide-border">
            {BILLING_ROWS.map((row) => (
              <li key={row.label} className="flex items-center justify-between gap-2 py-1.5 text-xs">
                <span className="min-w-0 truncate text-muted-foreground">{row.label}</span>
                <span className="shrink-0 font-medium text-foreground">{row.amount}</span>
                <StatusPill status={row.status} />
              </li>
            ))}
          </ul>
        </MiniPanel>
      </div>
      <div className="mt-3">
        <MiniPanel title="Collections, last 7 weeks">
          <CollectionsChart compact />
        </MiniPanel>
      </div>
    </div>
  );
}

export function MaintenanceVisual() {
  return (
    <div className="rounded-[14px] border border-border bg-background p-3 shadow-sm sm:p-4">
      <MiniPanel title="Maintenance activity">
        <ul className="divide-y divide-border">
          {MAINTENANCE_ACTIVITY.map((item) => (
            <li key={item.label} className="flex items-center justify-between gap-2 py-2 text-xs">
              <span className="min-w-0 truncate text-muted-foreground">{item.label}</span>
              <StatusPill status={item.status} />
            </li>
          ))}
        </ul>
      </MiniPanel>
      <div className="mt-3">
        <MiniPanel title="Property">
          <div className="flex items-center justify-between gap-2 text-xs">
            <div className="min-w-0">
              <p className="truncate font-semibold text-foreground">Kilimani Court</p>
              <p className="text-[11px] text-muted-foreground">Next inspection: 12 Sep</p>
            </div>
            <p className="shrink-0 font-heading text-sm font-semibold text-foreground">2 open</p>
          </div>
        </MiniPanel>
      </div>
    </div>
  );
}

/** Static illustration of the manager desk — not a live data view. */
export function ProductPreview({ captionClassName = "text-muted-foreground", elevated = false }: ProductPreviewProps) {
  return (
    <figure className="mx-auto w-full max-w-lg md:max-w-none">
      <div
        className={
          elevated
            ? "flex overflow-hidden rounded-[14px] border border-border bg-card shadow-2xl shadow-navy-primary/15"
            : "flex overflow-hidden rounded-[14px] border border-border bg-card shadow-sm"
        }
      >
        <nav
          aria-hidden
          className="hidden w-12 shrink-0 flex-col items-center gap-3 border-r border-border bg-sidebar py-3 sm:flex"
        >
          <BrandMark size="xs" forcePlatform />
          <ul className="mt-1 flex flex-col gap-2">
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
          <div className="flex items-center justify-between gap-3 border-b border-border bg-card px-3 py-2 sm:px-4">
            <div className="min-w-0">
              <p className="truncate font-heading text-sm font-semibold text-foreground">
                CALQULUS / Manager dashboard
              </p>
              <p className="truncate text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                Illustrative manager dashboard
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-1.5 text-muted-foreground" aria-hidden>
              <Search className="h-3.5 w-3.5" />
              <Bell className="h-3.5 w-3.5" />
              <span className="ml-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-navy-primary text-[9px] font-semibold text-white">
                JM
              </span>
            </div>
          </div>

          <div className="bg-background p-3 sm:p-4">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
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
              <div
                className="relative flex h-14 items-end gap-1.5"
                role="img"
                aria-label="Illustrative collections chart for the last seven weeks"
              >
                <div className="pointer-events-none absolute inset-0 flex flex-col justify-between" aria-hidden>
                  <span className="border-t border-border" />
                  <span className="border-t border-border" />
                  <span className="border-t border-border" />
                  <span className="border-t border-border" />
                </div>
                {COLLECTION_TREND.map((height, index) => (
                  <div
                    key={index}
                    className="relative z-[1] flex-1 rounded-sm bg-primary/70 last:bg-primary"
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
      <figcaption className={`mt-2.5 text-center text-xs ${captionClassName}`}>
        Illustrative manager dashboard. Sample figures only — not live customer data.
      </figcaption>
    </figure>
  );
}
