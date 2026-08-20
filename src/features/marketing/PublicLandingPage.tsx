import { useEffect, type FormEvent, type ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  ArrowRight,
  Briefcase,
  Building2,
  ChevronRight,
  Home,
  LayoutDashboard,
  Mail,
  MapPin,
  Users,
  Wallet,
  Wrench,
} from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Textarea } from "@/shared/components/ui/textarea";
import { ProductPreview } from "@/features/marketing/components/ProductPreview";
import { PublicPricing } from "@/features/marketing/components/PublicPricing";
import { PublicShell } from "@/features/marketing/components/PublicShell";
import { usePublicTiers } from "@/features/marketing/hooks/usePublicTiers";
import { CONTACT_EMAIL, PUBLIC_ROUTES } from "@/features/marketing/publicConfig";
import { redirectBrowser } from "@/shared/lib/redirectBrowser";

const CONTAINER = "mx-auto max-w-6xl px-4 sm:px-6 lg:px-8";
const BAND = "scroll-mt-20 py-7 sm:py-8";
const EYEBROW = "text-[11px] font-semibold uppercase tracking-[0.16em] text-primary";

function SectionIntro({
  id,
  eyebrow,
  title,
  description,
}: {
  id?: string;
  eyebrow?: string;
  title: string;
  description: string;
}) {
  return (
    <div id={id} className="mb-5 max-w-2xl">
      {eyebrow ? <p className={EYEBROW}>{eyebrow}</p> : null}
      <h2 className={`section-title text-[1.3rem] sm:text-[1.5rem] ${eyebrow ? "mt-1.5" : ""}`}>{title}</h2>
      <p className="mt-2 text-sm leading-relaxed text-white/68">{description}</p>
    </div>
  );
}

function IconWell({ children }: { children: ReactNode }) {
  return (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary shadow-[0_0_16px_-6px_rgb(26_212_228_/_0.8)]">
      {children}
    </span>
  );
}

const PILLARS = [
  {
    title: "Property",
    description: "The building record holds the units people occupy.",
    icon: Building2,
    items: ["Properties", "Units", "Occupancy", "Tenants"],
  },
  {
    title: "Finance",
    description: "Rent due, invoices issued, and money received stay on one ledger.",
    icon: Wallet,
    items: ["Rent", "Billing", "Payments", "Receipts", "Statements"],
  },
  {
    title: "Operations",
    description: "Repair tickets, contractors, and reports sit next to the same units.",
    icon: Wrench,
    items: ["Maintenance", "Requests", "Contractors", "Reporting"],
  },
] as const;

const FLOW = ["Property", "Tenant", "Lease", "Billing", "Payment", "Reporting"] as const;

const ROLES = [
  {
    title: "Property Manager",
    description: "Run properties, tenants, leases, rent, payments, and maintenance from one desk.",
    href: PUBLIC_ROUTES.managerSignUp,
    cta: "Manager portal",
    icon: LayoutDashboard,
  },
  {
    title: "Landlord",
    description: "Monitor occupancy, income, and property performance — without tenant contact data.",
    href: PUBLIC_ROUTES.landlordLogin,
    cta: "Landlord portal",
    icon: Home,
  },
  {
    title: "Agency",
    description: "Manage a client portfolio and the operating model for the buildings you run.",
    href: PUBLIC_ROUTES.agencyLogin,
    cta: "Agency portal",
    icon: Briefcase,
  },
  {
    title: "Tenant",
    description: "Pay rent, submit a repair, and read the lease for the unit you occupy.",
    href: PUBLIC_ROUTES.tenantLogin,
    cta: "Tenant portal",
    icon: Users,
  },
] as const;

function CitySparks() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <span className="absolute bottom-[16%] right-[18%] h-1 w-1 rounded-full bg-spark opacity-80" />
      <span className="absolute bottom-[28%] right-[8%] h-0.5 w-0.5 rounded-full bg-spark opacity-70" />
      <span className="absolute top-[42%] right-[28%] h-0.5 w-0.5 rounded-full bg-spark/80" />
    </div>
  );
}

function HomeView() {
  const handleContactSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const name = (form.elements.namedItem("contact-name") as HTMLInputElement)?.value ?? "";
    const email = (form.elements.namedItem("contact-email") as HTMLInputElement)?.value ?? "";
    const message = (form.elements.namedItem("contact-message") as HTMLTextAreaElement)?.value ?? "";
    const body = encodeURIComponent(`Name: ${name}\nEmail: ${email}\n\n${message}`);
    redirectBrowser(`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent("CALQULUS PMS inquiry")}&body=${body}`);
  };

  return (
    <>
      <section className="relative overflow-hidden">
        <div className="public-hero-grid pointer-events-none absolute inset-0" aria-hidden />
        <CitySparks />
        <div
          className={`${CONTAINER} relative grid items-center gap-7 py-8 xl:grid-cols-[minmax(0,1.02fr)_minmax(0,1fr)] xl:gap-10 xl:py-9`}
        >
          <div>
            <p className={EYEBROW}>Property operations, connected</p>
            <h1 className="page-title mt-2 max-w-xl text-[1.85rem] leading-[1.12] sm:text-[2.25rem] lg:text-[2.45rem]">
              Run your properties with clarity and control.
            </h1>
            <p className="mt-3 max-w-lg text-sm leading-relaxed text-white/70 sm:text-[0.95rem]">
              CALQULUS brings properties, units, tenants, leases, rent, payments and maintenance into
              one focused operational system.
            </p>
            <div className="mt-5 flex flex-col gap-2.5 sm:flex-row sm:items-center">
              <Button asChild size="lg" className="btn-brand min-h-11">
                <Link to={PUBLIC_ROUTES.managerSignUp}>
                  Start managing
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="min-h-11 border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white"
              >
                <a href="#platform">Explore the platform</a>
              </Button>
            </div>
          </div>
          <ProductPreview />
        </div>
      </section>

      <section id="platform" className={`${CONTAINER} ${BAND}`}>
        <SectionIntro
          title="Everything important, connected."
          description="Properties, money, and repairs sit on the same operational record — the one a manager works from after sign-in."
        />
        <div className="grid gap-3 lg:grid-cols-3">
          {PILLARS.map((pillar) => (
            <article key={pillar.title} className="night-card p-4">
              <div className="flex items-start gap-3">
                <IconWell>
                  <pillar.icon className="h-4 w-4" aria-hidden />
                </IconWell>
                <div className="min-w-0">
                  <h3 className={EYEBROW}>{pillar.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-white/68">{pillar.description}</p>
                </div>
              </div>
              <ul className="mt-3 flex flex-wrap gap-1.5">
                {pillar.items.map((item) => (
                  <li
                    key={item}
                    className="rounded-full border border-primary/25 bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-white/85"
                  >
                    {item}
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>

        <div id="how-it-works" className="scroll-mt-20 mt-6">
          <p className={EYEBROW}>How it works</p>
          <h2 className="section-title mt-1.5 text-[1.2rem] sm:text-[1.35rem]">From property to payment.</h2>
          <p className="mt-1.5 max-w-xl text-sm text-white/68">
            A unit is leased, billed, paid, and reported from the same operational chain.
          </p>
          <ol className="mt-4 flex flex-wrap items-center gap-1.5">
            {FLOW.map((step, index) => (
              <li key={step} className="flex items-center gap-1.5">
                <div className="rounded-md border border-primary/30 bg-navy-mid/80 px-2.5 py-1.5">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-white">
                    {step}
                  </span>
                </div>
                {index < FLOW.length - 1 ? (
                  <ChevronRight className="h-3.5 w-3.5 shrink-0 text-primary/70" aria-hidden />
                ) : null}
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section id="solutions" className={`${CONTAINER} ${BAND} pt-0 sm:pt-1`}>
        <SectionIntro
          title="One system. Clear experiences."
          description="Managers buy and run CALQULUS. Landlords, agencies, and tenants use the portals connected to that work."
        />
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {ROLES.map((role) => (
            <article key={role.title} className="night-card flex flex-col p-4">
              <IconWell>
                <role.icon className="h-4 w-4" aria-hidden />
              </IconWell>
              <h3 className="card-title-exec mt-3">{role.title}</h3>
              <p className="mt-1.5 flex-1 text-sm leading-relaxed text-white/68">{role.description}</p>
              <Button
                asChild
                variant="outline"
                className="mt-4 min-h-10 w-full border-primary/35 bg-transparent text-white hover:bg-primary/10 hover:text-primary"
              >
                <Link to={role.href}>
                  {role.cta}
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </Link>
              </Button>
            </article>
          ))}
        </div>
      </section>

      <section id="contact" className={`${CONTAINER} ${BAND} pt-0 sm:pt-1`}>
        <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <form onSubmit={handleContactSubmit} className="enterprise-card space-y-3 p-5 text-foreground">
            <div>
              <p className={EYEBROW}>Contact</p>
              <h2 className="mt-1.5 font-heading text-xl font-bold tracking-tight text-foreground">
                Talk to CALQULUS
              </h2>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                Property management teams, landlords, and agencies can write about a portfolio and what
                they need to run.
              </p>
              <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-sm">
                <li className="flex items-center gap-2 text-foreground">
                  <Mail className="h-4 w-4 text-primary" aria-hidden />
                  <a href={`mailto:${CONTACT_EMAIL}`} className="hover:underline">
                    {CONTACT_EMAIL}
                  </a>
                </li>
                <li className="flex items-center gap-2 text-muted-foreground">
                  <MapPin className="h-4 w-4 text-primary" aria-hidden />
                  Nairobi, Kenya
                </li>
              </ul>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor="contact-name" className="type-label">
                  Full name
                </label>
                <Input id="contact-name" name="contact-name" required autoComplete="name" className="mt-1" />
              </div>
              <div>
                <label htmlFor="contact-email" className="type-label">
                  Work email
                </label>
                <Input
                  id="contact-email"
                  name="contact-email"
                  type="email"
                  required
                  autoComplete="email"
                  className="mt-1"
                />
              </div>
            </div>
            <div>
              <label htmlFor="contact-message" className="type-label">
                Message
              </label>
              <Textarea id="contact-message" name="contact-message" rows={2} className="mt-1" />
            </div>
            <Button type="submit" className="btn-brand min-h-10 w-full sm:w-auto">
              Open email
            </Button>
          </form>

          <div className="space-y-3">
            <div id="pricing" className="night-card scroll-mt-20 p-5">
              <p className={EYEBROW}>Pricing</p>
              <h2 className="section-title mt-1.5 text-[1.2rem]">
                Per property, per month, in Kenyan shillings.
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-white/68">
                Published rates multiply by the buildings you manage. Custom blocks exist for larger
                portfolios — core operations are not locked behind plan walls.
              </p>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="mt-4 min-h-10 border-primary/40 bg-transparent text-white hover:bg-primary/10 hover:text-primary"
              >
                <Link to={PUBLIC_ROUTES.pricing}>
                  View plans
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </Link>
              </Button>
            </div>

            <div id="about" className="night-card scroll-mt-20 p-5">
              <h2 className="section-title text-[1.15rem]">Ready to bring operations together?</h2>
              <p className="mt-2 text-sm leading-relaxed text-white/68">
                Start managing your portfolio with a system built around the way property operations
                actually work.
              </p>
              <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                <Button asChild className="btn-brand min-h-10">
                  <Link to={PUBLIC_ROUTES.managerSignUp}>Get started</Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  className="min-h-10 border-white/20 bg-transparent text-white hover:bg-white/10 hover:text-white"
                >
                  <a href="#contact">Contact us</a>
                </Button>
              </div>
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
        <h1 className="page-title mt-2 text-[1.85rem] sm:text-[2.1rem]">
          Per property, per month, in Kenyan shillings.
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-white/68 sm:text-base">
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
