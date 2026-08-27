import { landingIcon } from "@/features/marketing/landing/landingIcon";
import { SectionHeading } from "@/features/marketing/landing/components/SectionHeading";
import type { LandingCapability } from "@/features/marketing/landing/landingContent";

interface CapabilityGridProps {
  id?: string;
  eyebrow: string;
  title: string;
  sub?: string;
  items: LandingCapability[];
}

/**
 * Core platform capabilities — six compact cards. Icon + accent colour +
 * description all come from config; icons resolve through the safe registry.
 */
export function CapabilityGrid({ id = "capabilities", eyebrow, title, sub, items }: CapabilityGridProps) {
  return (
    <section id={id} className="scroll-mt-24 bg-landing-background py-12 sm:py-16">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <SectionHeading eyebrow={eyebrow} title={title} sub={sub} />

        <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((cap) => {
            const Icon = landingIcon(cap.icon);
            return (
              <li
                key={cap.id}
                className="landing-card group flex flex-col p-5 transition-shadow duration-200 motion-safe:hover:-translate-y-0.5"
              >
                <div className="flex items-center gap-3">
                  <span
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px]"
                    style={{ backgroundColor: `color-mix(in srgb, ${cap.accent} 12%, #FFFFFF)`, color: cap.accent }}
                  >
                    <Icon className="h-5 w-5" aria-hidden />
                  </span>
                  <h3 className="font-heading text-[15px] font-semibold tracking-tight text-landing-textprimary">
                    {cap.title}
                  </h3>
                </div>
                <p className="mt-3 text-[13px] leading-relaxed text-landing-textsecondary">{cap.copy}</p>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}