import { KeyboardEvent, useCallback, useRef, useState } from "react";
import { ArrowUpRight, Briefcase, Building2, ChevronLeft, ChevronRight, Home } from "lucide-react";
import { ArchitecturalSurface, type PropertyVisualSlot } from "@/features/marketing/components/ArchitecturalSurface";
import { PROPERTY_IMAGES } from "@/features/marketing/propertyImages";
import { cn } from "@/shared/lib/utils";

const TYPES = [
  {
    id: "residential" as PropertyVisualSlot,
    name: "Residential",
    tagline: "Apartments, estates and rental communities.",
    icon: Home,
  },
  {
    id: "commercial" as PropertyVisualSlot,
    name: "Commercial",
    tagline: "Retail and mixed-use properties.",
    icon: Building2,
  },
  {
    id: "office" as PropertyVisualSlot,
    name: "Office",
    tagline: "Office buildings and managed workspaces.",
    icon: Briefcase,
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
          <h2 className="public-section-title">Built for the way property is managed.</h2>
          <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground sm:text-base">
            Residential, commercial and office — one workspace.
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
                <article className="group relative h-[220px] overflow-hidden rounded-[14px] border border-border shadow-sm transition-shadow duration-200 hover:shadow-md [&_img]:transition-transform [&_img]:duration-700 [&_img]:ease-out motion-safe:group-hover:[&_img]:scale-[1.045]">
                  <ArchitecturalSurface slot={item.id} imageSrc={PROPERTY_IMAGES[item.id]} />
                  <div
                    className="absolute inset-0 bg-gradient-to-t from-navy-deep/90 via-navy-deep/30 to-transparent"
                    aria-hidden
                  />
                  <div className="relative flex h-full flex-col justify-end p-5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="flex h-8 w-8 items-center justify-center rounded-md bg-white/15 text-white ring-1 ring-white/25 backdrop-blur-sm">
                          <item.icon className="h-4 w-4" aria-hidden />
                        </span>
                        <h3 className="font-heading text-base font-semibold text-white sm:text-lg">{item.name}</h3>
                      </div>
                      <ArrowUpRight
                        className="h-4 w-4 text-white/70 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                        aria-hidden
                      />
                    </div>
                    <p className="mt-1.5 max-w-[85%] text-[13px] leading-snug text-white/80">{item.tagline}</p>
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
