import { AlertTriangle, Building2, CreditCard, Home } from "lucide-react";

/** Compact sample of the manager desk — not live data. */
export function ManagerDeskPreview() {
  return (
    <figure className="enterprise-card overflow-hidden">
      <div className="flex items-center justify-between border-b border-border bg-card px-3 py-2">
        <p className="text-xs font-semibold text-foreground">Today · sample portfolio</p>
        <span className="rounded-full border border-primary/20 bg-soft-blue px-2 py-0.5 text-[10px] font-semibold text-primary">
          Preview
        </span>
      </div>
      <div className="grid grid-cols-2 gap-px bg-border sm:grid-cols-4">
        {[
          { label: "Units", value: "48", icon: Home },
          { label: "Occupied", value: "92%", icon: Building2 },
          { label: "Collected", value: "1.24M", icon: CreditCard },
          { label: "Overdue", value: "4", icon: AlertTriangle },
        ].map((item) => (
          <div key={item.label} className="bg-secondary-background px-2.5 py-2.5">
            <item.icon className="h-3 w-3 text-primary" aria-hidden />
            <p className="mt-1 font-heading text-sm font-semibold leading-none">{item.value}</p>
            <p className="mt-1 text-[10px] text-muted-foreground">{item.label}</p>
          </div>
        ))}
      </div>
      <figcaption className="sr-only">Illustrative manager desk metrics.</figcaption>
    </figure>
  );
}
