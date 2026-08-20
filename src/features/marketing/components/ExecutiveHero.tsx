import { KeyboardEvent, useCallback, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { ArchitecturalSurface, type PropertyVisualSlot } from "@/features/marketing/components/ArchitecturalSurface";
import { ProductPreview } from "@/features/marketing/components/ProductPreview";
import { PUBLIC_ROUTES } from "@/features/marketing/publicConfig";
import { cn } from "@/shared/lib/utils";

const SLIDES: { id: PropertyVisualSlot; context: string }[] = [
  { id: "residential", context: "Residential property operations" },
  { id: "commercial", context: "Commercial property operations" },
  { id: "office", context: "Office property operations" },
];

export function ExecutiveHero() {
  const [index, setIndex] = useState(0);
  const slide = SLIDES[index];

  const go = useCallback((next: number) => {
    setIndex((next + SLIDES.length) % SLIDES.length);
  }, []);

  const onKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      go(index - 1);
    }
    if (event.key === "ArrowRight") {
      event.preventDefault();
      go(index + 1);
    }
  };

  return (
    <section
      className="relative overflow-hidden border-b border-border bg-card"
      aria-roledescription="carousel"
      aria-label="Property operations overview"
      onKeyDown={onKeyDown}
    >
      <ArchitecturalSurface slot={slide.id} className="pointer-events-none opacity-[0.18]" />
      <div className="public-hero-grid pointer-events-none absolute inset-0" aria-hidden />
      <div
        className="pointer-events-none absolute -right-24 top-10 h-64 w-64 rounded-full bg-primary/10 blur-3xl"
        aria-hidden
      />

      <div className="relative mx-auto grid max-w-6xl items-center gap-8 px-4 py-10 sm:px-6 lg:px-8 xl:min-h-[580px] xl:grid-cols-[minmax(0,0.46fr)_minmax(0,0.54fr)] xl:gap-12 xl:py-12">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
            Property operations, connected
          </p>
          <p className="mt-2 text-xs font-medium text-muted-foreground">{slide.context}</p>
          <h1 className="public-hero-title mt-2 max-w-[520px] text-foreground">
            Run your properties
            <br className="hidden sm:block" /> with clarity and control.
          </h1>
          <p className="mt-4 max-w-[520px] text-base leading-relaxed text-muted-foreground sm:text-[17px]">
            CALQULUS brings properties, tenants, leases, billing, payments and maintenance into
            one focused operational system.
          </p>
          <div className="mt-7 flex flex-col gap-2.5 sm:flex-row sm:items-center">
            <Button asChild size="lg" className="btn-brand h-12 min-h-11 px-6">
              <Link to={PUBLIC_ROUTES.managerSignUp}>
                Start managing
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="h-12 min-h-11 bg-card px-6 text-foreground">
              <a href="#platform">Explore the platform</a>
            </Button>
          </div>
          <div className="mt-6 flex items-center gap-2" role="tablist" aria-label="Hero slides">
            {SLIDES.map((item, i) => (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={i === index}
                aria-label={item.context}
                className={cn(
                  "h-2 rounded-full transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  i === index ? "w-6 bg-primary" : "w-2 bg-border hover:bg-muted-foreground/40",
                )}
                onClick={() => setIndex(i)}
              />
            ))}
          </div>
        </div>

        <div className="relative">
          <ProductPreview />
        </div>
      </div>

      <button
        type="button"
        className="absolute left-2 top-1/2 z-10 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-card/90 text-foreground shadow-sm transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:inline-flex lg:left-4"
        aria-label="Previous slide"
        onClick={() => go(index - 1)}
      >
        <ChevronLeft className="h-4 w-4" aria-hidden />
      </button>
      <button
        type="button"
        className="absolute right-2 top-1/2 z-10 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-card/90 text-foreground shadow-sm transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:inline-flex lg:right-4"
        aria-label="Next slide"
        onClick={() => go(index + 1)}
      >
        <ChevronRight className="h-4 w-4" aria-hidden />
      </button>
    </section>
  );
}
