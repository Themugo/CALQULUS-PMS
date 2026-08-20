import { Building2, Handshake, Percent, Wallet } from "lucide-react";

/** Compact sample of the agency desk — portfolio and share, not tenant names. */
export function AgencyDeskPreview() {
  return (
    <figure className="enterprise-card overflow-hidden">
      <div className="flex items-center justify-between border-b border-border bg-card px-3 py-2">
        <p className="text-xs font-semibold text-foreground">Today · sample agency book</p>
        <span className="rounded-full border border-primary/20 bg-soft-blue px-2 py-0.5 text-[10px] font-semibold text-primary">
          Preview
        </span>
      </div>
      <div className="grid grid-cols-2 gap-px bg-border sm:grid-cols-4">
        {[
          { label: "Properties", value: "6", icon: Building2 },
          { label: "Landlords", value: "4", icon: Handshake },
          { label: "Collected", value: "2.1M", icon: Wallet },
          { label: "Your split", value: "8%", icon: Percent },
        ].map((item) => (
          <div key={item.label} className="bg-secondary-background px-2.5 py-2.5">
            <item.icon className="h-3 w-3 text-primary" aria-hidden />
            <p className="mt-1 font-heading text-sm font-semibold leading-none">{item.value}</p>
            <p className="mt-1 text-[10px] text-muted-foreground">{item.label}</p>
          </div>
        ))}
      </div>
      <figcaption className="sr-only">Illustrative agency desk: properties, landlords, collections, and split.</figcaption>
    </figure>
  );
}
