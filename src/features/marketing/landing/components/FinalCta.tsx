import { ArrowRight } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { LandingCtaLink } from "@/features/marketing/landing/components/LandingCtaLink";
import type { LandingFinalCta } from "@/features/marketing/landing/landingContent";

interface FinalCtaProps {
  id?: string;
  config: LandingFinalCta;
}

/**
 * Compact final conversion panel — brilliant navy anchor band, photo-textured
 * edge, two config-driven actions. Not a full-page background.
 */
export function FinalCta({ id = "company", config }: FinalCtaProps) {
  return (
    <section id={id} className="scroll-mt-24 py-12 sm:py-14">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-[16px] bg-landing-primary px-6 py-10 text-center sm:px-12 sm:py-12">
          <span aria-hidden className="pointer-events-none absolute -right-16 -top-24 h-64 w-64 rounded-full bg-landing-accent/30 blur-3xl" />
          <span aria-hidden className="pointer-events-none absolute -bottom-28 -left-16 h-64 w-64 rounded-full bg-landing-cyan/20 blur-3xl" />

          <div className="relative">
            {config.eyebrow ? (
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/75">
                {config.eyebrow}
              </p>
            ) : null}
            <h2 className="mx-auto mt-3 max-w-2xl font-heading text-2xl font-bold leading-tight tracking-tight text-white sm:text-3xl">
              {config.title}
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-[15px] leading-relaxed text-white/80">{config.copy}</p>

            <div className="mt-7 flex flex-col items-center justify-center gap-2.5 sm:flex-row">
              <Button asChild size="lg" className="h-12 min-h-11 bg-white px-6 font-semibold text-landing-primary hover:bg-landing-primarylight">
                <LandingCtaLink cta={config.primary}>
                  <span>{config.primary.label}</span>
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </LandingCtaLink>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="h-12 min-h-11 border-white/30 bg-transparent px-6 text-white hover:bg-white/10 hover:text-white"
              >
                <LandingCtaLink cta={config.secondary}>
                  <span>{config.secondary.label}</span>
                </LandingCtaLink>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}