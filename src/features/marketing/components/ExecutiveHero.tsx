import { KeyboardEvent, useCallback, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { ArchitecturalSurface, type PropertyVisualSlot } from "@/features/marketing/components/ArchitecturalSurface";
import { ProductPreview } from "@/features/marketing/components/ProductPreview";
import { HERO_CONTENT, PUBLIC_ROUTES } from "@/features/marketing/publicConfig";
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
      className="public-hero-surface relative -mt-[72px] overflow-hidden pt-[72px]"
      aria-roledescription="carousel"
      aria-label="Property operations overview"
      onKeyDown={onKeyDown}
    >
      <ArchitecturalSurface slot={slide.id} className="pointer-events-none opacity-[0.32]" />
      <div className="public-hero-grid-dark pointer-events-none absolute inset-0" aria-hidden />
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-navy-deep/80 to-transparent"
        aria-hidden
      />

      <div className="relative mx-auto grid max-w-6xl items-center gap-10 px-4 pb-16 pt-12 sm:px-6 lg:min-h-[640px] lg:grid-cols-[minmax(0,0.46fr)_minmax(0,0.54fr)] lg:gap-10 lg:px-8 lg:pb-20 lg:pt-16 xl:gap-12">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--calqulus-primary-light)]">
            {HERO_CONTENT.eyebrow}
          </p>
          <p className="mt-2 text-xs font-medium text-white/55">{slide.context}</p>
          <h1 className="public-hero-title-dark mt-3 max-w-[540px]">
            {HERO_CONTENT.titleLines.join(" ")}
          </h1>
          <p className="mt-5 max-w-[520px] text-base leading-relaxed text-white/72 sm:text-[17px]">
            {HERO_CONTENT.copy}
          </p>
          <div className="mt-8 flex flex-col gap-2.5 sm:flex-row sm:items-center">
            <Button asChild size="lg" className="btn-brand h-12 min-h-11 px-6">
              <Link to={PUBLIC_ROUTES.managerSignUp}>
                {HERO_CONTENT.primaryCta}
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="h-12 min-h-11 border-white/25 bg-white/5 px-6 text-white hover:bg-white/10 hover:text-white"
            >
              <a href="#platform">{HERO_CONTENT.secondaryCta}</a>
            </Button>
          </div>
          <div className="mt-7 flex items-center gap-2" role="tablist" aria-label="Hero slides">
            {SLIDES.map((item, i) => (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={i === index}
                aria-label={item.context}
                className={cn(
                  "h-2 rounded-full transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70",
                  i === index ? "w-6 bg-white" : "w-2 bg-white/30 hover:bg-white/50",
                )}
                onClick={() => setIndex(i)}
              />
            ))}
          </div>
        </div>

        <div className="relative">
          <ProductPreview elevated captionClassName="text-white/60" />
        </div>
      </div>

      <button
        type="button"
        className="absolute left-2 top-1/2 z-10 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white backdrop-blur-sm transition-colors hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 md:inline-flex lg:left-4"
        aria-label="Previous slide"
        onClick={() => go(index - 1)}
      >
        <ChevronLeft className="h-4 w-4" aria-hidden />
      </button>
      <button
        type="button"
        className="absolute right-2 top-1/2 z-10 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white backdrop-blur-sm transition-colors hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 md:inline-flex lg:right-4"
        aria-label="Next slide"
        onClick={() => go(index + 1)}
      >
        <ChevronRight className="h-4 w-4" aria-hidden />
      </button>
    </section>
  );
}
