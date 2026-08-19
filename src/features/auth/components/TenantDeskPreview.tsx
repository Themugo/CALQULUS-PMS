import { FileText, Receipt, Smartphone, Wrench } from "lucide-react";

/** Compact sample of the tenant desk — this tenancy only, no other tenants or landlord PII. */
export function TenantDeskPreview() {
  return (
    <figure className="enterprise-card overflow-hidden">
      <div className="flex items-center justify-between border-b border-border bg-card px-3 py-2">
        <p className="text-xs font-semibold text-foreground">Your unit · sample</p>
        <span className="rounded-full border border-primary/20 bg-soft-blue px-2 py-0.5 text-[10px] font-semibold text-primary">
          Preview
        </span>
      </div>
      <div className="grid grid-cols-2 gap-px bg-border sm:grid-cols-4">
        {[
          { label: "Balance due", value: "KES 45k", icon: Smartphone },
          { label: "Last receipt", value: "Paid", icon: Receipt },
          { label: "Open repair", value: "1", icon: Wrench },
          { label: "Lease", value: "Active", icon: FileText },
        ].map((item) => (
          <div key={item.label} className="bg-secondary-background px-2.5 py-2.5">
            <item.icon className="h-3 w-3 text-primary" aria-hidden />
            <p className="mt-1 font-heading text-sm font-semibold leading-none">{item.value}</p>
            <p className="mt-1 text-[10px] text-muted-foreground">{item.label}</p>
          </div>
        ))}
      </div>
      <figcaption className="sr-only">Illustrative tenant desk for one unit: balance, receipt, repair, lease.</figcaption>
    </figure>
  );
}
