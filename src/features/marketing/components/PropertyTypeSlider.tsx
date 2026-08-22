import { KeyboardEvent, useCallback, useRef, useState } from "react";
import { Briefcase, Building2, ChevronLeft, ChevronRight, Home } from "lucide-react";
import { ArchitecturalSurface, type PropertyVisualSlot } from "@/features/marketing/components/ArchitecturalSurface";
import { CALQULUS_PORTAL_ACCENT } from "@/shared/theme/tokens";
import { cn } from "@/shared/lib/utils";

const TYPES = [
  {
    id: "residential" as PropertyVisualSlot,
    name: "Residential",
    tagline: "Apartments and estates — rent, repairs and residents under control.",
    icon: Home,
    accent: CALQULUS_PORTAL_ACCENT.manager.hex,
  },
  {
    id: "commercial" as PropertyVisualSlot,
    name: "Commercial",
    tagline: "Retail and mixed spaces — leases and collections in one view.",
    icon: Building2,
    accent: CALQULUS_PORTAL_ACCENT.landlord.hex,
  },
  {
    id: "office" as PropertyVisualSlot,
    name: "Office",
    tagline: "Office buildings — occupancy and service workflows connected.",
    icon: Briefcase,
    accent: CALQULUS_PORTAL_ACCENT.tenant.hex,
  },
];

export function PropertyTypeSlider() {
  const [index, setIndex] = useState(0);
  const scrollerRef = useRef<HTMLUListElement>(null);

  const go = useCallback((next: number) => {
    const clamped = (next + TYPES.length) % TYPES.length;
    setIndex(clamped);
    const node = scrollerRef.current;
    const card = node?.children[clamped] as HTMLElement | undefined;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    card?.scrollIntoView({
      behavior: reduceMotion ? "auto" : "smooth",
      inline: "center",
      block: "nearest",
    });
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
      className="scroll-mt-20 border-b border-border bg-background py-12 sm:py-16"
      onKeyDown={onKeyDown}
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="public-section-title">Designed for every property type</h2>
          <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground sm:text-base">
            Choose your property category to see how CALQULUS works for you.
          </p>
        </div>

        <div className="mt-8 flex min-w-0 items-center gap-3">
          <button
            type="button"
            className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border bg-card text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring lg:inline-flex"
            aria-label="Previous property type"
            onClick={() => go(index - 1)}
          >
            <ChevronLeft className="h-4 w-4" aria-hidden />
          </button>

          <ul
            ref={scrollerRef}
            className="flex w-full min-w-0 snap-x snap-mandatory gap-4 overflow-x-auto pb-1 lg:grid lg:grid-cols-3 lg:overflow-visible lg:pb-0"
          >
            {TYPES.map((item) => (
              <li key={item.id} className="min-w-[85%] snap-center sm:min-w-[70%] lg:min-w-0">
                <article className="relative h-[190px] overflow-hidden rounded-[14px] border border-border shadow-sm">
                  <ArchitecturalSurface slot={item.id} />
                  <div
                    className="absolute inset-0 bg-gradient-to-t from-navy-deep/85 via-navy-deep/25 to-transparent"
                    aria-hidden
                  />
                  <div className="relative flex h-full flex-col justify-end p-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-heading text-base font-semibold text-white sm:text-lg">{item.name}</h3>
                      <span
                        className="flex h-8 w-8 items-center justify-center rounded-md bg-white/15 text-white"
                        style={{ boxShadow: `inset 0 0 0 1px ${item.accent}66` }}
                      >
                        <item.icon className="h-4 w-4" aria-hidden />
                      </span>
                    </div>
                    <p className="mt-1 text-[13px] leading-snug text-white/78">{item.tagline}</p>
                  </div>
                </article>
              </li>
            ))}
          </ul>

          <button
            type="button"
            className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border bg-card text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring lg:inline-flex"
            aria-label="Next property type"
            onClick={() => go(index + 1)}
          >
            <ChevronRight className="h-4 w-4" aria-hidden />
          </button>
        </div>

        <div className="mt-4 flex justify-center gap-1.5" role="tablist" aria-label="Property types">
          {TYPES.map((item, i) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={i === index}
              aria-label={item.name}
              className={cn(
                "h-1.5 rounded-full transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                i === index ? "w-8 bg-primary" : "w-3 bg-border",
              )}
              onClick={() => go(i)}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
