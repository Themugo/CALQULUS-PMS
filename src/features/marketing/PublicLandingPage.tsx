import { useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  ArrowRight,
  Building2,
  ChevronRight,
  Landmark,
  Mail,
  MapPin,
  Users,
  User,
  Wallet,
  Wrench,
} from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { ProductPreview } from "@/features/marketing/components/ProductPreview";
import { PublicPricing } from "@/features/marketing/components/PublicPricing";
import { PublicShell } from "@/features/marketing/components/PublicShell";
import { usePublicTiers } from "@/features/marketing/hooks/usePublicTiers";
import { CONTACT_EMAIL, PUBLIC_ROUTES } from "@/features/marketing/publicConfig";
import { CALQULUS_PORTAL_ACCENT } from "@/shared/theme/tokens";

const CONTAINER = "mx-auto max-w-6xl px-4 sm:px-6 lg:px-8";
const BAND = "scroll-mt-20 py-10 sm:py-12";
const EYEBROW = "text-[11px] font-semibold uppercase tracking-[0.16em] text-primary";

const FLOW = ["Property", "Unit", "Tenant", "Lease", "Billing", "Payment", "Reporting"] as const;

const PILLARS = [
  {
    icon: Building2,
    title: "Property",
    description: "Properties, units and occupancy.",
  },
  {
    icon: Wallet,
    title: "Finance",
    description: "Rent, billing and collections.",
  },
  {
    icon: Wrench,
    title: "Operations",
    description: "Maintenance and reporting.",
  },
] as const;

const PORTALS = [
  {
    icon: Building2,
    title: "Manager",
    accent: CALQULUS_PORTAL_ACCENT.manager.hex,
    description: "Run properties, tenants, leases, rent, payments, and maintenance from one desk.",
    href: PUBLIC_ROUTES.managerSignUp,
    cta: "Manager portal",
  },
  {
    icon: Landmark,
    title: "Landlord",
    accent: CALQULUS_PORTAL_ACCENT.landlord.hex,
    description: "Monitor occupancy, income, and property performance at a glance.",
    href: PUBLIC_ROUTES.landlordLogin,
    cta: "Landlord portal",
  },
  {
    icon: Users,
    title: "Agency",
    accent: CALQULUS_PORTAL_ACCENT.agency.hex,
    description: "Manage a client portfolio and the operating model behind it.",
    href: PUBLIC_ROUTES.agencyLogin,
    cta: "Agency portal",
  },
  {
    icon: User,
    title: "Tenant",
    accent: CALQULUS_PORTAL_ACCENT.tenant.hex,
    description: "Pay rent, submit a repair, and read the lease for your unit.",
    href: PUBLIC_ROUTES.tenantLogin,
    cta: "Tenant portal",
  },
] as const;

function HomeView() {
  return (
    <>
      <section className="border-b border-border bg-card">
        <div
          className={`${CONTAINER} grid items-center gap-8 py-10 xl:min-h-[600px] xl:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] xl:gap-12 xl:py-14`}
        >
          <div>
            <p className={EYEBROW}>Property operations, connected</p>
            <h1 className="type-page-title mt-2 max-w-xl text-foreground">
              Run your properties with clarity and control.
            </h1>
            <p className="mt-3 max-w-lg text-sm leading-relaxed text-muted-foreground sm:text-[0.95rem]">
              CALQULUS brings properties, tenants, leases, billing, payments and maintenance into
              one focused operational system.
            </p>
            <div className="mt-6 flex flex-col gap-2.5 sm:flex-row sm:items-center">
              <Button asChild size="lg" className="btn-brand min-h-11">
                <Link to={PUBLIC_ROUTES.managerSignUp}>
                  Start managing
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="min-h-11">
                <a href="#platform">Explore the platform</a>
              </Button>
            </div>
          </div>
          <ProductPreview />
        </div>
      </section>

      <section id="platform" className={`${CONTAINER} ${BAND}`}>
        <div className="grid gap-4 sm:grid-cols-3">
          {PILLARS.map((pillar) => (
            <div key={pillar.title} className="rounded-lg border border-border bg-card p-4">
              <pillar.icon className="h-5 w-5 text-primary" aria-hidden />
              <h3 className="type-card-title mt-2.5 text-foreground">{pillar.title}</h3>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{pillar.description}</p>
            </div>
          ))}
        </div>

        <div id="how-it-works" className="scroll-mt-20 mt-8">
          <p className={EYEBROW}>How it works</p>
          <ol className="mt-3 flex flex-wrap items-center gap-1.5">
            {FLOW.map((step, index) => (
              <li key={step} className="flex items-center gap-1.5">
                <div className="rounded-md border border-border bg-card px-2.5 py-1.5">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-foreground">
                    {step}
                  </span>
                </div>
                {index < FLOW.length - 1 ? (
                  <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
                ) : null}
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section id="solutions" className={`${CONTAINER} ${BAND} border-t border-border pt-10 sm:pt-12`}>
        <div className="max-w-2xl">
          <h2 className="type-section-title text-foreground">One system. Four experiences.</h2>
        </div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {PORTALS.map((portal) => (
            <div key={portal.title} className="flex flex-col rounded-lg border border-border bg-card p-4">
              <span
                className="flex h-8 w-8 items-center justify-center rounded-md"
                style={{ backgroundColor: `${portal.accent}1a`, color: portal.accent }}
              >
                <portal.icon className="h-4 w-4" aria-hidden />
              </span>
              <h3 className="type-card-title mt-3 text-foreground">{portal.title}</h3>
              <p className="mt-1 flex-1 text-sm leading-relaxed text-muted-foreground">{portal.description}</p>
              <Link
                to={portal.href}
                className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
              >
                {portal.cta}
                <ArrowRight className="h-3.5 w-3.5" aria-hidden />
              </Link>
            </div>
          ))}
        </div>
      </section>

      <section
        id="contact"
        className={`${CONTAINER} ${BAND} border-t border-border pt-10 sm:pt-12`}
      >
        <div className="rounded-lg border border-border bg-navy-primary px-6 py-8 text-white sm:px-10 sm:py-10">
          <div className="flex flex-col items-start justify-between gap-5 sm:flex-row sm:items-center">
            <div>
              <h2 className="font-heading text-xl font-bold tracking-tight sm:text-2xl">
                Bring your property operations together.
              </h2>
              <p className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-white/72">
                <span className="flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5" aria-hidden />
                  {CONTACT_EMAIL}
                </span>
                <span className="flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5" aria-hidden />
                  Nairobi, Kenya
                </span>
              </p>
            </div>
            <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
              <Button asChild size="lg" className="btn-brand min-h-11">
                <Link to={PUBLIC_ROUTES.managerSignUp}>Get started</Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="min-h-11 border-white/30 bg-transparent text-white hover:bg-white/10 hover:text-white"
              >
                <a href={`mailto:${CONTACT_EMAIL}`}>Contact us</a>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

function PricingView() {
  const { data: tiers = [] } = usePublicTiers();

  return (
    <section className={`${CONTAINER} ${BAND}`}>
      <div className="mb-6 max-w-2xl">
        <p className={EYEBROW}>Pricing</p>
        <h1 className="type-page-title mt-2 text-foreground">
          Per property, per month, in Kenyan shillings.
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground sm:text-base">
          Multiply the published rate by the buildings you manage. Custom blocks exist for larger portfolios.
        </p>
      </div>
      <PublicPricing tiers={tiers} />
    </section>
  );
}

export function PublicLandingPage() {
  const { pathname, hash } = useLocation();
  const isPricing = pathname === PUBLIC_ROUTES.pricing;

  useEffect(() => {
    document.title = isPricing
      ? "Pricing | CALQULUS PMS"
      : "CALQULUS PMS | Property Operations, Connected";
  }, [isPricing]);

  useEffect(() => {
    if (!hash) return;
    const id = hash.replace("#", "");
    const target = document.getElementById(id);
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [hash, pathname]);

  return <PublicShell>{isPricing ? <PricingView /> : <HomeView />}</PublicShell>;
}

export default PublicLandingPage;
