import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from "@/shared/components/ui/carousel";
import { ArchitecturalSurface, type PropertyVisualSlot } from "@/features/marketing/components/ArchitecturalSurface";
import { PORTFOLIO_PROPERTIES } from "@/features/marketing/publicConfig";
import { invoiceStatusTone, statusBadgeClass } from "@/shared/lib/statusBadge";
import { cn } from "@/shared/lib/utils";

const STATUS_LABEL: Record<string, string> = {
  paid: "On track",
  pending: "Watch",
  overdue: "Arrears",
};

/** Shared portfolio card — property visual, stats, occupancy bar, status. */
function PortfolioCard({
  property,
}: {
  property: (typeof PORTFOLIO_PROPERTIES)[number];
}) {
  return (
    <article className="h-full overflow-hidden rounded-[14px] border border-border bg-card shadow-sm transition-shadow duration-200 hover:shadow-md">
      <div className="relative h-32 overflow-hidden">
        <ArchitecturalSurface slot={property.slot as PropertyVisualSlot} />
        <div
          className="absolute inset-0 bg-gradient-to-t from-navy-deep/60 via-navy-deep/10 to-transparent"
          aria-hidden
        />
        <span className={`${statusBadgeClass(invoiceStatusTone(property.status))} absolute right-3 top-3`}>
          {STATUS_LABEL[property.status] ?? "Status"}
        </span>
      </div>
      <div className="p-4">
        <h3 className="font-heading text-base font-semibold text-foreground">{property.name}</h3>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {property.units} units · {property.occupied} occupied
        </p>
        <div
          className="mt-3 h-1.5 rounded-full bg-muted"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={property.occupancy}
          aria-label={`${property.occupancy} percent occupied`}
        >
          <div className="h-full rounded-full bg-primary" style={{ width: `${property.occupancy}%` }} />
        </div>
        <div className="mt-2.5 flex items-center justify-between text-xs">
          <span className="font-medium text-foreground">{property.occupancy}% occupied</span>
          <span className="font-heading font-semibold text-foreground">{property.collected}</span>
        </div>
      </div>
    </article>
  );
}

/**
 * "YOUR PORTFOLIO" property carousel — built on the shared embla carousel
 * (src/shared/components/ui/carousel). Touch/swipe, arrows, dots, keyboard.
 */
export function PropertyCarousel() {
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (!api) return;
    const onSelect = () => setCurrent(api.selectedScrollSnap());
    onSelect();
    api.on("select", onSelect);
    return () => {
      api.off("select", onSelect);
    };
  }, [api]);

  const goTo = useCallback((index: number) => api?.scrollTo(index), [api]);

  return (
    <section className="scroll-mt-20 border-b border-border bg-background py-12 sm:py-16">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
              Your portfolio
            </p>
            <h2 className="public-section-title mt-2">
              See what&apos;s happening across your properties.
            </h2>
          </div>
          <p className="text-xs font-medium text-muted-foreground">Sample properties — illustrative data.</p>
        </div>

        <Carousel
          setApi={setApi}
          opts={{ align: "start", loop: true }}
          aria-label="Property portfolio"
          className="mt-8"
        >
          <CarouselContent className="-ml-3">
            {PORTFOLIO_PROPERTIES.map((property) => (
              <CarouselItem
                key={property.name}
                className="basis-[86%] pl-3 sm:basis-[48%] lg:basis-[33%]"
              >
                <PortfolioCard property={property} />
              </CarouselItem>
            ))}
          </CarouselContent>

          <div className="mt-5 flex items-center justify-between">
            <div className="flex gap-1.5" role="tablist" aria-label="Portfolio pages">
              {PORTFOLIO_PROPERTIES.map((property, index) => (
                <button
                  key={property.name}
                  type="button"
                  role="tab"
                  aria-selected={index === current}
                  aria-label={`Go to ${property.name}`}
                  className={cn(
                    "h-1.5 rounded-full transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    index === current ? "w-8 bg-primary" : "w-3 bg-border hover:bg-muted-foreground",
                  )}
                  onClick={() => goTo(index)}
                />
              ))}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                aria-label="Previous properties"
                onClick={() => api?.scrollPrev()}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <ChevronLeft className="h-4 w-4" aria-hidden />
              </button>
              <button
                type="button"
                aria-label="Next properties"
                onClick={() => api?.scrollNext()}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <ChevronRight className="h-4 w-4" aria-hidden />
              </button>
            </div>
          </div>
        </Carousel>
      </div>
    </section>
  );
}
