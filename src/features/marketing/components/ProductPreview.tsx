import { BrandMark } from "@/shared/components/branding/BrandMark";
import { invoiceStatusTone, statusBadgeClass } from "@/shared/lib/statusBadge";

const SNAPSHOT = [
  { label: "Occupancy", value: "92%", detail: "44 of 48 units" },
  { label: "Collected", value: "KES 1.24M", detail: "This month" },
  { label: "Collection", value: "93%", detail: "KES 86k still due" },
  { label: "Open repairs", value: "2", detail: "Needs assignment" },
] as const;

const QUEUE = [
  { label: "INV-2041 · Kilimani Court A2", status: "overdue", amount: "KES 45,000" },
  { label: "Water bill · Westlands B4", status: "pending", amount: "KES 2,400" },
  { label: "Lease · Riverside C1 expiring", status: "partially_paid", amount: "30 days" },
] as const;

/** Static illustration of the manager desk — not a live data view. */
export function ProductPreview() {
  return (
    <figure className="mx-auto w-full max-w-lg md:max-w-none">
      <div className="overflow-hidden rounded-lg border border-border bg-card">
        <div className="flex items-center justify-between gap-3 border-b border-border bg-navy-primary px-4 py-2.5 text-white">
          <div className="flex min-w-0 items-center gap-2.5">
            <BrandMark size="xs" forcePlatform inverse />
            <div className="min-w-0">
              <p className="truncate font-heading text-sm font-semibold">Manager desk</p>
              <p className="truncate text-[10px] font-medium uppercase tracking-wider text-white/70">
                Sample portfolio
              </p>
            </div>
          </div>
          <span className="rounded-full border border-white/20 px-2 py-0.5 text-[10px] font-semibold text-white/80">
            Preview
          </span>
        </div>

        <div className="bg-background p-3 sm:p-4">
          <p className="type-label mb-2">Needs attention</p>
          <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-card">
            {QUEUE.map((item) => (
              <li key={item.label} className="flex items-center justify-between gap-2 px-3 py-2 text-sm">
                <span className="min-w-0 truncate text-muted-foreground">{item.label}</span>
                <span className={`${statusBadgeClass(invoiceStatusTone(item.status))} shrink-0`}>
                  {item.amount}
                </span>
              </li>
            ))}
          </ul>

          <p className="type-label mb-2 mt-4">This month</p>
          <div className="grid grid-cols-2 gap-2">
            {SNAPSHOT.map((metric) => (
              <div key={metric.label} className="rounded-lg border border-border bg-card p-3">
                <p className="type-meta">{metric.label}</p>
                <p className="mt-1.5 font-heading text-lg font-semibold leading-none tracking-tight text-foreground">
                  {metric.value}
                </p>
                <p className="mt-1 text-[11px] text-muted-foreground">{metric.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
      <figcaption className="mt-2.5 text-center text-xs text-muted-foreground">
        Illustrative view of the CALQULUS manager dashboard.
      </figcaption>
    </figure>
  );
}
