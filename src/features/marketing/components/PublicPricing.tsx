import { Link } from "react-router-dom";
import { Check, ArrowRight } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { cn } from "@/shared/lib/utils";
import { formatKes, type CommercialTier } from "@/shared/lib/commercialCatalog";
import { CONTACT_EMAIL } from "@/features/marketing/publicConfig";

interface PublicPricingProps {
  tiers: CommercialTier[];
}

export function PublicPricing({ tiers }: PublicPricingProps) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      {tiers.map((tier) => (
        <article
          key={tier.tierKey}
          className={cn(
            "flex flex-col rounded-lg border border-border bg-card p-5",
            tier.featured && "border-primary/40",
          )}
        >
          {tier.featured && (
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-primary">
              Most used
            </p>
          )}
          <h3 className="text-lg font-semibold text-foreground">{tier.displayName}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{tier.audience}</p>
          <div className="mt-4">
            {tier.customPricing ? (
              <p className="text-3xl font-bold text-foreground">Custom</p>
            ) : (
              <p className="text-3xl font-bold text-foreground">
                {formatKes(tier.pricePerProperty)}
                <span className="ml-1 text-sm font-normal text-muted-foreground">
                  / property / month
                </span>
              </p>
            )}
            <p className="mt-1 text-xs text-muted-foreground">
              {tier.maxProperties >= 999
                ? "Capacity by agreement"
                : `Up to ${tier.maxProperties} properties · ${tier.maxUnits} units`}
            </p>
          </div>
          <ul className="mt-4 flex-1 space-y-2 text-sm text-muted-foreground">
            {tier.highlights.map((item) => (
              <li key={item} className="flex gap-2">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                {item}
              </li>
            ))}
          </ul>
          <Button
            asChild
            className={cn("mt-5 min-h-11 w-full", !tier.customPricing && "btn-brand")}
            variant={tier.customPricing ? "outline" : "default"}
          >
            {tier.customPricing ? (
              <a href={`mailto:${CONTACT_EMAIL}`} className="inline-flex w-full items-center justify-center gap-2">
                {tier.customPricing ? "Talk to us" : `Start with ${tier.displayName}`}
                <ArrowRight className="h-4 w-4" />
              </a>
            ) : (
              <Link to="/auth?tab=signup" className="inline-flex w-full items-center justify-center gap-2">
                {tier.customPricing ? "Talk to us" : `Start with ${tier.displayName}`}
                <ArrowRight className="h-4 w-4" />
              </Link>
            )}
          </Button>
        </article>
      ))}
    </div>
  );
}
