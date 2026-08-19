import { Building2, PieChart, TrendingUp, Wallet } from "lucide-react";

const PROPERTIES = [
  { name: "Kilimani Court", occupancy: 92, share: "80%" },
  { name: "Westlands House", occupancy: 75, share: "80%" },
] as const;

/** Compact sample of the landlord desk — occupancy and share only, no tenant PII. */
export function LandlordDeskPreview() {
  return (
    <figure className="enterprise-card overflow-hidden">
      <div className="flex items-center justify-between border-b border-border bg-card px-3 py-2">
        <p className="text-xs font-semibold text-foreground">Today · sample portfolio</p>
        <span className="rounded-full border border-primary/20 bg-soft-blue px-2 py-0.5 text-[10px] font-semibold text-primary">
          Preview
        </span>
      </div>
      <div className="grid grid-cols-4 gap-px bg-border">
        {[
          { label: "Properties", value: "2", icon: Building2 },
          { label: "Occupancy", value: "84%", icon: PieChart },
          { label: "Collected", value: "980k", icon: Wallet },
          { label: "Net to you", value: "784k", icon: TrendingUp },
        ].map((item) => (
          <div key={item.label} className="bg-secondary-background px-2.5 py-2.5">
            <item.icon className="h-3 w-3 text-primary" aria-hidden />
            <p className="mt-1 font-heading text-sm font-semibold leading-none">{item.value}</p>
            <p className="mt-1 text-[10px] text-muted-foreground">{item.label}</p>
          </div>
        ))}
      </div>
      <ul className="space-y-2 bg-card p-3">
        {PROPERTIES.map((property) => (
          <li key={property.name}>
            <div className="flex items-center justify-between gap-2 text-xs">
              <span className="font-medium text-foreground">{property.name}</span>
              <span className="text-muted-foreground">Your share {property.share}</span>
            </div>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-soft-blue">
              <div
                className="h-full rounded-full bg-gradient-to-r from-primary to-teal"
                style={{ width: `${property.occupancy}%` }}
              />
            </div>
            <p className="mt-1 text-[10px] text-muted-foreground">{property.occupancy}% occupied</p>
          </li>
        ))}
      </ul>
      <figcaption className="sr-only">
        Illustrative landlord desk: occupancy and revenue share, without tenant names.
      </figcaption>
    </figure>
  );
}
