import { AlertTriangle, Building2, CreditCard, Home } from "lucide-react";
import { BrandMark } from "@/shared/components/branding/BrandMark";

const METRICS = [
  { label: "Units", value: "48", detail: "12 vacant", icon: Home },
  { label: "Occupancy", value: "92%", detail: "Portfolio rate", icon: Building2 },
  { label: "Collected", value: "KES 1.24M", detail: "This month", icon: CreditCard },
  { label: "Outstanding", value: "KES 86k", detail: "4 overdue invoices", icon: AlertTriangle },
] as const;

const ATTENTION = [
  { label: "Overdue invoices", value: "4" },
  { label: "Open maintenance", value: "2" },
  { label: "Leases expiring", value: "1" },
] as const;

/** Static illustration of the manager dashboard — not a live data view. */
export function ProductPreview() {
  return (
    <figure className="mx-auto w-full max-w-lg md:max-w-none">
      <div className="enterprise-card overflow-hidden">
        <div className="flex items-center justify-between gap-3 border-b border-border bg-navy-primary px-4 py-2.5">
          <div className="flex min-w-0 items-center gap-2.5">
            <BrandMark size="xs" imgClassName="ring-white/15" />
            <div className="min-w-0">
              <p className="truncate font-heading text-sm font-semibold text-white">CALQULUS</p>
              <p className="truncate text-[10px] font-medium uppercase tracking-wider text-white/60">
                Manager dashboard
              </p>
            </div>
          </div>
          <span className="hidden rounded-full border border-white/15 px-2 py-0.5 text-[10px] font-medium text-white/70 sm:inline">
            Preview
          </span>
        </div>

        <div className="bg-secondary-background p-3 sm:p-4">
          <p className="type-label mb-2">Portfolio health</p>
          <div className="grid grid-cols-2 gap-2">
            {METRICS.map((metric) => (
              <div key={metric.label} className="rounded-lg border border-border bg-card p-3">
                <div className="flex items-center gap-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-md bg-soft-blue text-primary">
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
            <p className="type-label mb-2">Needs attention</p>
            <ul className="space-y-2">
              {ATTENTION.map((item) => (
                <li key={item.label} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{item.label}</span>
                  <span className="font-medium text-foreground">{item.value}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
      <figcaption className="mt-3 text-center text-xs text-muted-foreground">
        Illustrative view of the CALQULUS manager dashboard.
      </figcaption>
    </figure>
  );
}
