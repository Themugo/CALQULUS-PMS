import { landingIcon } from "@/features/marketing/landing/landingIcon";
import type { LandingTrustStrip } from "@/features/marketing/landing/landingContent";

interface TrustStripProps {
  config: LandingTrustStrip;
}

/**
 * Compact credibility strip — builds on the hero trust points. Shows the
 * "Built for property professionals" label plus sector chips.
 */
export function TrustStrip({ config }: TrustStripProps) {
  return (
    <section className="border-y border-landing-border bg-landing-surface">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-3 px-4 py-5 sm:flex-row sm:justify-between sm:px-6 lg:px-8">
        <p className="landing-eyebrow">{config.eyebrow}</p>
        {config.items.length ? (
          <ul className="flex flex-wrap items-center justify-center gap-2">
            {config.items.map((item) => (
              <li
                key={item}
                className="rounded-full border border-landing-border bg-landing-background px-3.5 py-1.5 text-[13px] font-medium text-landing-textsecondary"
              >
                {item}
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </section>
  );
}