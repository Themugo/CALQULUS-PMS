import { Link } from "react-router-dom";
import { Check, ArrowRight } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { cn } from "@/shared/lib/utils";
import { formatKes, type CommercialTier } from "@/shared/lib/commercialCatalog";

interface PublicPricingProps {
  tiers: CommercialTier[];
  variant?: "light" | "dark";
}

export function PublicPricing({ tiers, variant = "light" }: PublicPricingProps) {
  const dark = variant === "dark";

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      {tiers.map((tier) => (
        <article
          key={tier.tierKey}
          className={cn(
            "flex flex-col rounded-xl border p-5",
            dark ? "bg-slate-900 border-slate-800" : "enterprise-card",
            tier.featured && (dark ? "border-emerald-500/50 shadow-lg shadow-emerald-500/10" : "border-primary/40 bg-primary/5"),
          )}
        >
          {tier.featured && (
            <p className={cn("text-[10px] font-semibold uppercase tracking-wide mb-2", dark ? "text-emerald-400" : "text-primary")}>
              Most used
            </p>
          )}
          <h3 className={cn("text-lg font-semibold", dark ? "text-slate-100" : "text-foreground")}>{tier.displayName}</h3>
          <p className={cn("mt-1 text-sm", dark ? "text-slate-400" : "text-muted-foreground")}>{tier.audience}</p>
          <div className="mt-4">
            {tier.customPricing ? (
              <p className={cn("text-3xl font-bold", dark ? "text-slate-100" : "text-foreground")}>Custom</p>
            ) : (
              <p className={cn("text-3xl font-bold", dark ? "text-slate-100" : "text-foreground")}>
                {formatKes(tier.pricePerProperty)}
                <span className={cn("ml-1 text-sm font-normal", dark ? "text-slate-400" : "text-muted-foreground")}>
                  / property / month
                </span>
              </p>
            )}
            <p className={cn("mt-1 text-xs", dark ? "text-slate-500" : "text-muted-foreground")}>
              {tier.maxProperties >= 999 ? "Capacity by agreement" : `Up to ${tier.maxProperties} properties · ${tier.maxUnits} units`}
            </p>
          </div>
          <ul className={cn("mt-4 space-y-2 text-sm flex-1", dark ? "text-slate-300" : "text-muted-foreground")}>
            {tier.highlights.map((item) => (
              <li key={item} className="flex gap-2">
                <Check className={cn("h-4 w-4 shrink-0 mt-0.5", dark ? "text-emerald-400" : "text-primary")} />
                {item}
              </li>
            ))}
          </ul>
          <Button
            asChild
            className={cn("mt-5 w-full", dark && !tier.featured && "bg-slate-800 hover:bg-slate-700 text-slate-100")}
            variant={tier.customPricing ? "outline" : "default"}
          >
            <Link to={tier.customPricing ? "/#contact" : "/auth?tab=signup"}>
              {tier.customPricing ? "Talk to us" : `Start with ${tier.displayName}`}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </article>
      ))}
    </div>
  );
}
