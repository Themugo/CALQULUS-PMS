import { ArrowRight } from "lucide-react";
import { landingIcon } from "@/features/marketing/landing/landingIcon";
import { LandingCtaLink } from "@/features/marketing/landing/components/LandingCtaLink";
import { SectionHeading } from "@/features/marketing/landing/components/SectionHeading";
import type { LandingRole } from "@/features/marketing/landing/landingContent";

interface RoleSolutionsProps {
  id?: string;
  eyebrow: string;
  title: string;
  sub?: string;
  items: LandingRole[];
}

/**
 * Role-based solutions — six role cards, each with a distinct accent colour,
 * config-driven icon/title/copy/CTA. Accents are top-bar + icon markers only,
 * never page fills.
 */
export function RoleSolutions({ id = "roles", eyebrow, title, sub, items }: RoleSolutionsProps) {
  return (
    <section id={id} className="scroll-mt-24 bg-landing-background py-12 sm:py-16">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <SectionHeading eyebrow={eyebrow} title={title} sub={sub} />

        <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((role) => {
            const Icon = landingIcon(role.icon);
            return (
              <li
                key={role.id}
                className="landing-card relative flex flex-col overflow-hidden p-5 pt-6 transition-shadow duration-200 motion-safe:hover:-translate-y-0.5"
                aria-label={`${role.title} portal`}
              >
                <span className="absolute inset-x-0 top-0 h-[3px]" style={{ backgroundColor: role.accent }} aria-hidden />
                <div className="flex items-center gap-3">
                  <span
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px]"
                    style={{ backgroundColor: `color-mix(in srgb, ${role.accent} 13%, #FFFFFF)`, color: role.accent }}
                  >
                    <Icon className="h-5 w-5" aria-hidden />
                  </span>
                  <div className="min-w-0">
                    <h3 className="font-heading text-[15px] font-semibold leading-tight tracking-tight text-landing-textprimary">
                      {role.title}
                    </h3>
                    <p className="truncate text-[13px] text-landing-textsecondary">{role.visual}</p>
                  </div>
                </div>
                <p className="mt-3 flex-1 text-[13px] leading-relaxed text-landing-textsecondary">{role.copy}</p>
                <LandingCtaLink cta={role.cta}>
                  <span
                    className="mt-4 inline-flex min-h-11 items-center gap-1 text-sm font-semibold hover:underline"
                    style={{ color: role.accent }}
                  >
                    {role.cta.label}
                    <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                  </span>
                </LandingCtaLink>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}