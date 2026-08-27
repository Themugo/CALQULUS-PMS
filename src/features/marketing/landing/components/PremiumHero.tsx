import { ArrowRight } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { LandingCtaLink } from "@/features/marketing/landing/components/LandingCtaLink";
import { DashboardPreview } from "@/features/marketing/landing/components/DashboardPreview";
import { landingIcon } from "@/features/marketing/landing/landingIcon";
import type {
  LandingHero,
  DashboardPreviewContent,
} from "@/features/marketing/landing/landingContent";

interface PremiumHeroProps {
  id?: string;
  config: LandingHero;
  dashboard: DashboardPreviewContent;
}

/**
 * Premium two-column hero — left copy/CTAs, right the CALQULUS dashboard
 * preview. Stacks on mobile with the dashboard beneath the copy.
 */
export function PremiumHero({ id = "hero", config, dashboard }: PremiumHeroProps) {
  return (
    <section id={id} className="landing-hero-surface relative overflow-hidden">
      <div className="landing-grid pointer-events-none absolute inset-0" aria-hidden />

      <div className="relative mx-auto grid max-w-6xl items-center gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:gap-12 lg:px-8 lg:py-20">
        {/* copy */}
        <div className="text-center lg:text-left">
          <p className="landing-eyebrow">{config.eyebrow}</p>
          <h1 className="landing-hero-title mt-4">
            {config.lineA}
            <span className="mt-1 block">{config.lineB}</span>
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-landing-textsecondary sm:text-[17px] lg:mx-0">
            {config.supporting}
          </p>

          <div className="mt-7 flex flex-col items-center justify-center gap-2.5 sm:flex-row lg:justify-start">
            <Button asChild size="lg" className="h-12 min-h-11 bg-landing-primary px-6 hover:bg-landing-primarydark">
              <LandingCtaLink cta={config.primaryCta}>
                <span>{config.primaryCta.label}</span>
                <ArrowRight className="h-4 w-4" aria-hidden />
              </LandingCtaLink>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="h-12 min-h-11 border-landing-border bg-landing-surface px-6 hover:bg-landing-primarylight"
            >
              <LandingCtaLink cta={config.secondaryCta}>
                <span>{config.secondaryCta.label}</span>
              </LandingCtaLink>
            </Button>
          </div>

          <ul className="mt-7 flex flex-wrap items-center justify-center gap-x-6 gap-y-3 lg:justify-start">
            {config.trustPoints.map((point) => {
              const Icon = landingIcon(point.icon);
              return (
                <li key={point.label} className="flex items-center gap-1.5">
                  <span className="flex h-4 w-4 items-center justify-center rounded-sm text-landing-primary" aria-hidden>
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="text-[13px] font-medium text-landing-textsecondary">{point.label}</span>
                </li>
              );
            })}
          </ul>
        </div>

        {/* right: dashboard preview */}
        <div className="relative">
          <div className="relative transition-transform duration-300 ease-out motion-safe:hover:-translate-y-1">
            <DashboardPreview config={dashboard} />
          </div>
        </div>
      </div>
    </section>
  );
}