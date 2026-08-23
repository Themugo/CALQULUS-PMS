import { Check } from "lucide-react";
import { FinancialOperationsVisual, MaintenanceVisual } from "@/features/marketing/components/ProductPreview";
import { ArchitecturalSurface } from "@/features/marketing/components/ArchitecturalSurface";
import { SHOWCASES } from "@/features/marketing/publicConfig";
import { cn } from "@/shared/lib/utils";

const EYEBROW = "text-[11px] font-semibold uppercase tracking-[0.16em] text-primary";

/** One dedicated lightweight visual per capability — the full dashboard lives only in the hero. */
const VISUALS = {
  financials: FinancialOperationsVisual,
  maintenance: MaintenanceVisual,
} as const;

/**
 * Alternating product showcase — text/visual rhythm flips per row; each row
 * renders the specialized visual for its capability. The maintenance row pairs
 * the interface with a premium property visual.
 */
export function ProductShowcase() {
  return (
    <section className="border-b border-border bg-background py-12 sm:py-16">
      <div className="mx-auto max-w-6xl space-y-14 px-4 sm:space-y-20 sm:px-6 lg:px-8">
        {SHOWCASES.map((item, index) => {
          const reversed = index % 2 === 1;
          const Visual = VISUALS[item.id];
          return (
            <article
              key={item.id}
              className="grid items-center gap-8 lg:grid-cols-2 lg:gap-12"
            >
              <div className={cn(reversed && "lg:order-2")}>
                <p className={EYEBROW}>{item.category}</p>
                <h3 className="public-section-title mt-2">{item.headline}</h3>
                <p className="mt-3 max-w-lg text-[15px] leading-relaxed text-muted-foreground sm:text-base">
                  {item.copy}
                </p>
                <ul className="mt-5 space-y-2.5">
                  {item.points.map((point) => (
                    <li key={point} className="flex items-center gap-2.5 text-sm text-foreground">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                        <Check className="h-3 w-3" aria-hidden />
                      </span>
                      {point}
                    </li>
                  ))}
                </ul>
              </div>
              <div className={cn("relative", reversed && "lg:order-1")}>
                {item.id === "maintenance" && (
                  <div
                    className="pointer-events-none absolute -right-3 -top-8 hidden h-40 w-56 overflow-hidden rounded-[14px] border border-border opacity-70 shadow-sm sm:block"
                    aria-hidden
                  >
                    <ArchitecturalSurface slot="residential" />
                    <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent" />
                  </div>
                )}
                <div className="relative">
                  <Visual />
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
