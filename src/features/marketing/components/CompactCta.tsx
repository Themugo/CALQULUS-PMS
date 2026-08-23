import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { ArchitecturalSurface } from "@/features/marketing/components/ArchitecturalSurface";
import { FINAL_CTA, PUBLIC_ROUTES } from "@/features/marketing/publicConfig";

/** Premium tinted final CTA — subtle property visual behind a light card. */
export function CompactCta() {
  return (
    <section id="contact" className="scroll-mt-20 bg-background py-10 sm:py-14">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-[16px] border border-primary/15 bg-[#EAF0F8] px-6 py-10 sm:px-10 sm:py-12">
          <div className="pointer-events-none absolute inset-0 opacity-20" aria-hidden>
            <ArchitecturalSurface slot="office" />
            <div className="absolute inset-0 bg-gradient-to-r from-[#EAF0F8] via-[#EAF0F8]/70 to-transparent" />
          </div>
          <div className="relative flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
            <div className="max-w-xl">
              <h2 className="font-heading text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                {FINAL_CTA.title}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground sm:text-[15px]">
                {FINAL_CTA.copy}
              </p>
            </div>
            <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
              <Button asChild size="lg" className="btn-brand min-h-11">
                <Link to={PUBLIC_ROUTES.managerSignUp}>
                  {FINAL_CTA.primary}
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="min-h-11 border-border bg-card/70 backdrop-blur-sm hover:bg-card"
              >
                <a href="#platform">{FINAL_CTA.secondary}</a>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
