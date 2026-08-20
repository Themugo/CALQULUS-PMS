import { Link } from "react-router-dom";
import { ArrowRight, Building2, LayoutGrid, User, Users } from "lucide-react";
import { CALQULUS_COLOR, CALQULUS_PORTAL_ACCENT } from "@/shared/theme/tokens";
import { PUBLIC_ROUTES } from "@/features/marketing/publicConfig";

const PORTALS = [
  {
    id: "manager" as const,
    icon: LayoutGrid,
    title: "Manager portal",
    description: "Complete operational control of properties, tenants, finance and maintenance.",
    href: PUBLIC_ROUTES.managerSignUp,
    accent: CALQULUS_PORTAL_ACCENT.manager.hex,
  },
  {
    id: "landlord" as const,
    icon: Building2,
    title: "Landlord portal",
    description: "Real-time portfolio performance, income tracking and financial reporting.",
    href: PUBLIC_ROUTES.landlordLogin,
    accent: CALQULUS_PORTAL_ACCENT.landlord.hex,
  },
  {
    id: "agency" as const,
    icon: Users,
    title: "Agency portal",
    description: "Manage clients, portfolios and properties with full visibility and reporting.",
    href: PUBLIC_ROUTES.agencyLogin,
    accent: CALQULUS_PORTAL_ACCENT.agency.hex,
  },
  {
    id: "tenant" as const,
    icon: User,
    title: "Tenant portal",
    description: "Easy rent payments, maintenance requests and access to important documents.",
    href: PUBLIC_ROUTES.tenantLogin,
    accent: CALQULUS_PORTAL_ACCENT.tenant.hex,
  },
] as const;

export function PortalExperiences() {
  return (
    <section id="solutions" className="scroll-mt-20 bg-card py-12 sm:py-14">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="public-section-title">One system. Four powerful experiences.</h2>
          <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground sm:text-base">
            The right tools for every role in your property ecosystem.
          </p>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {PORTALS.map((portal) => (
            <article
              key={portal.title}
              data-portal={portal.id}
              className="flex flex-col rounded-[14px] border p-5 shadow-sm"
              style={{
                backgroundColor: `color-mix(in srgb, ${portal.accent} 8%, ${CALQULUS_COLOR.white})`,
                borderColor: `color-mix(in srgb, ${portal.accent} 28%, ${CALQULUS_COLOR.border})`,
              }}
            >
              <span
                className="flex h-9 w-9 items-center justify-center rounded-md"
                style={{ backgroundColor: `color-mix(in srgb, ${portal.accent} 14%, #FFFFFF)`, color: portal.accent }}
              >
                <portal.icon className="h-4 w-4" aria-hidden />
              </span>
              <h3 className="mt-3 font-heading text-base font-semibold text-foreground sm:text-[17px]">
                {portal.title}
              </h3>
              <p className="mt-1.5 flex-1 text-sm leading-relaxed text-muted-foreground">{portal.description}</p>
              <Link
                to={portal.href}
                aria-label={`View ${portal.title}`}
                className="mt-4 inline-flex min-h-11 items-center gap-1 text-sm font-medium hover:underline"
                style={{ color: portal.accent }}
              >
                View portal
                <ArrowRight className="h-3.5 w-3.5" aria-hidden />
              </Link>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
