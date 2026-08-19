import { AlertTriangle, Building2, CreditCard, Droplets, Home, Wrench } from "lucide-react";
import { BrandMark } from "@/shared/components/branding/BrandMark";
import { invoiceStatusTone, statusBadgeClass } from "@/shared/lib/statusBadge";

const METRICS = [
  { label: "Units", value: "48", detail: "4 vacant", icon: Home, tint: "bg-soft-blue text-primary" },
  { label: "Occupancy", value: "92%", detail: "44 occupied", icon: Building2, tint: "bg-teal-bg text-teal" },
  { label: "Collected", value: "KES 1.24M", detail: "This month", icon: CreditCard, tint: "bg-gold-bg text-primary" },
  { label: "Outstanding", value: "KES 86k", detail: "4 overdue", icon: AlertTriangle, tint: "bg-indigo-bg text-indigo" },
] as const;

const QUEUE = [
  { label: "INV-2041 · Kilimani Court A2", status: "overdue", amount: "KES 45,000" },
  { label: "Water bill · Westlands B4", status: "pending", amount: "KES 2,400" },
  { label: "Lease · Riverside C1 expiring", status: "partially_paid", amount: "30 days" },
] as const;

const WORK = [
  { label: "Open repairs", value: "2", icon: Wrench },
  { label: "Water readings due", value: "6", icon: Droplets },
] as const;

/** Static illustration of the manager dashboard — not a live data view. */
export function ProductPreview() {
  return (
    <figure className="mx-auto w-full max-w-lg md:max-w-none">
      <div className="enterprise-card overflow-hidden shadow-[0_18px_40px_-24px_rgb(21_94_239_/_0.35)]">
        <div className="flex items-center justify-between gap-3 border-b border-border bg-card px-4 py-2.5">
          <div className="flex min-w-0 items-center gap-2.5">
            <BrandMark size="xs" />
            <div className="min-w-0">
              <p className="truncate font-heading text-sm font-semibold text-foreground">Manager desk</p>
              <p className="truncate text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                Today · sample portfolio
              </p>
            </div>
          </div>
          <span className="rounded-full border border-primary/20 bg-soft-blue px-2 py-0.5 text-[10px] font-semibold text-primary">
            Preview
          </span>
        </div>

        <div className="bg-secondary-background p-3 sm:p-4">
          <p className="type-label mb-2">Portfolio health</p>
          <div className="grid grid-cols-2 gap-2">
            {METRICS.map((metric) => (
              <div key={metric.label} className="rounded-lg border border-border bg-card p-3">
                <div className="flex items-center gap-2">
                  <span className={`flex h-7 w-7 items-center justify-center rounded-md ${metric.tint}`}>
                    <metric.icon className="h-3.5 w-3.5" aria-hidden />
                  </span>
                  <p className="type-meta">{metric.label}</p>
                </div>
                <p className="mt-2 font-heading text-lg font-semibold leading-none tracking-tight text-foreground">
                  {metric.value}
                </p>
                <p className="mt-1 text-[11px] text-muted-foreground">{metric.detail}</p>
              </div>
            ))}
          </div>

          <div className="mt-3 rounded-lg border border-border bg-card p-3">
            <div className="flex items-center justify-between gap-3">
              <p className="type-label">Collections this month</p>
              <p className="text-xs font-semibold text-primary">93%</p>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-soft-blue">
              <div className="h-full w-[93%] rounded-full bg-gradient-to-r from-primary to-teal" />
            </div>
            <p className="mt-2 text-[11px] text-muted-foreground">KES 1.24M received · KES 86k still due</p>
          </div>

          <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_auto]">
            <div className="rounded-lg border border-border bg-card p-3">
              <p className="type-label mb-2">Needs attention</p>
              <ul className="space-y-2">
                {QUEUE.map((item) => (
                  <li key={item.label} className="flex items-center justify-between gap-2 text-sm">
                    <span className="min-w-0 truncate text-muted-foreground">{item.label}</span>
                    <span className={`${statusBadgeClass(invoiceStatusTone(item.status))} shrink-0`}>
                      {item.amount}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:w-36 sm:grid-cols-1">
              {WORK.map((item) => (
                <div key={item.label} className="rounded-lg border border-border bg-card p-3">
                  <item.icon className="h-3.5 w-3.5 text-primary" aria-hidden />
                  <p className="mt-1 font-heading text-lg font-semibold leading-none">{item.value}</p>
                  <p className="mt-1 text-[11px] text-muted-foreground">{item.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      <figcaption className="mt-3 text-center text-xs text-muted-foreground">
        Illustrative view of the CALQULUS manager dashboard.
      </figcaption>
    </figure>
  );
}
