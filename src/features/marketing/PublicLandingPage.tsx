import { useEffect, type FormEvent, type ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  ArrowRight,
  Briefcase,
  Building2,
  ChevronDown,
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

const SECTION = "scroll-mt-24 py-14 sm:py-16";
const CONTAINER = "mx-auto max-w-6xl px-4 sm:px-6 lg:px-8";
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
    <div id={id} className="mb-8 max-w-2xl">
      {eyebrow ? <p className={EYEBROW}>{eyebrow}</p> : null}
      <h2 className={`section-title text-[1.45rem] sm:text-[1.7rem] ${eyebrow ? "mt-2" : ""}`}>{title}</h2>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-[0.95rem]">{description}</p>
    </div>
  );
}

function IconWell({ children }: { children: ReactNode }) {
  return (
    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-soft-blue text-primary">
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
        <div
          className={`${CONTAINER} relative grid items-center gap-10 py-12 lg:grid-cols-[minmax(0,1.02fr)_minmax(0,1fr)] lg:gap-12 lg:py-16`}
        >
          <div>
            <p className={EYEBROW}>Property operations, connected</p>
            <h1 className="page-title mt-3 max-w-xl text-[2rem] leading-[1.15] sm:text-[2.45rem] lg:text-[2.7rem]">
              Run your properties with clarity and control.
            </h1>
            <p className="mt-4 max-w-lg text-sm leading-relaxed text-muted-foreground sm:text-base">
              CALQULUS brings properties, units, tenants, leases, rent, payments and maintenance into
              one focused operational system.
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Button asChild size="lg" className="btn-brand min-h-11">
                <Link to={PUBLIC_ROUTES.managerSignUp}>
                  Start managing
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="min-h-11 bg-card/80">
                <a href="#platform">Explore the platform</a>
              </Button>
            </div>
          </div>
          <ProductPreview />
        </div>
      </section>

      <section id="platform" className={`${CONTAINER} ${SECTION}`}>
        <SectionIntro
          title="Everything important, connected."
          description="Three operational pillars — the same records a manager works from after sign-in. Nothing here is a brochure of slogans."
        />
        <div className="grid gap-4 lg:grid-cols-3">
          {PILLARS.map((pillar) => (
            <article key={pillar.title} className="enterprise-card p-6">
              <IconWell>
                <pillar.icon className="h-5 w-5" aria-hidden />
              </IconWell>
              <h3 className={`${EYEBROW} mt-4`}>{pillar.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{pillar.description}</p>
              <ul className="mt-5 grid grid-cols-2 gap-x-3 gap-y-2">
                {pillar.items.map((item) => (
                  <li key={item} className="flex items-center gap-2 text-sm font-medium text-foreground">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary" aria-hidden />
                    {item}
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>

      <section id="how-it-works" className={`border-y border-border/80 bg-card/60 ${SECTION}`}>
        <div className={CONTAINER}>
          <SectionIntro
            title="From property to payment."
            description="A unit is leased, billed, paid, and reported from the same operational chain."
          />
          <ol className="flex flex-col gap-2 lg:flex-row lg:items-center lg:gap-0">
            {FLOW.map((step, index) => (
              <li key={step} className="flex flex-1 flex-col items-stretch lg:flex-row lg:items-center">
                <div className="enterprise-card flex min-h-12 flex-1 items-center justify-center px-3 py-3 text-center">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-foreground">
                    {step}
                  </span>
                </div>
                {index < FLOW.length - 1 ? (
                  <>
                    <ChevronDown className="mx-auto my-0.5 h-4 w-4 shrink-0 text-muted-foreground lg:hidden" aria-hidden />
                    <ChevronRight
                      className="mx-1 hidden h-4 w-4 shrink-0 text-muted-foreground lg:block"
                      aria-hidden
                    />
                  </>
                ) : null}
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section id="solutions" className={`${CONTAINER} ${SECTION}`}>
        <SectionIntro
          title="One system. Clear experiences."
          description="Managers buy and run CALQULUS. Landlords, agencies, and tenants use the portals connected to that work."
        />
        <div className="grid gap-4 sm:grid-cols-2">
          {ROLES.map((role) => (
            <article key={role.title} className="enterprise-card flex flex-col p-6">
              <IconWell>
                <role.icon className="h-5 w-5" aria-hidden />
              </IconWell>
              <h3 className="card-title-exec mt-4">{role.title}</h3>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">{role.description}</p>
              <Button asChild variant="outline" className="mt-5 min-h-11 w-full bg-card sm:w-auto">
                <Link to={role.href}>
                  {role.cta}
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </Link>
              </Button>
            </article>
          ))}
        </div>
      </section>

      <section id="pricing" className={`border-y border-border/80 bg-card/60 ${SECTION}`}>
        <div className={`${CONTAINER} flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between`}>
          <div className="max-w-xl">
            <p className={EYEBROW}>Pricing</p>
            <h2 className="section-title mt-2 text-[1.45rem] sm:text-[1.7rem]">
              Per property, per month, in Kenyan shillings.
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-[0.95rem]">
              Published rates multiply by the buildings you manage. Custom blocks exist for larger
              portfolios — core operations are not locked behind plan walls.
            </p>
          </div>
          <Button asChild size="lg" variant="outline" className="min-h-11 shrink-0 bg-card">
            <Link to={PUBLIC_ROUTES.pricing}>
              View plans
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </Button>
        </div>
      </section>

      <section id="contact" className={`${CONTAINER} ${SECTION}`}>
        <div className="grid gap-8 lg:grid-cols-[1fr_24rem]">
          <div>
            <p className={EYEBROW}>Contact</p>
            <h2 className="section-title mt-2">Talk to CALQULUS</h2>
            <p className="mt-3 max-w-lg text-sm leading-relaxed text-muted-foreground">
              Property management teams, landlords, and agencies can write about a portfolio and what
              they need to run.
            </p>
            <ul className="mt-6 space-y-3 text-sm">
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
          <form onSubmit={handleContactSubmit} className="enterprise-card space-y-4 p-5">
            <p className="text-sm font-medium text-foreground">Send an inquiry</p>
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
            <div>
              <label htmlFor="contact-message" className="type-label">
                Message
              </label>
              <Textarea id="contact-message" name="contact-message" rows={3} className="mt-1" />
            </div>
            <Button type="submit" className="btn-brand min-h-11 w-full">
              Open email
            </Button>
          </form>
        </div>
      </section>

      <section id="about" className="scroll-mt-24 bg-navy-primary text-white">
        <div className={`${CONTAINER} py-14 sm:py-16`}>
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="font-heading text-[1.55rem] font-bold leading-tight tracking-tight sm:text-[1.85rem]">
              Ready to bring your property operations together?
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-white/70 sm:text-base">
              Start managing your portfolio with a system built around the way property operations
              actually work.
            </p>
            <div className="mt-8 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
              <Button asChild size="lg" className="btn-brand min-h-11">
                <Link to={PUBLIC_ROUTES.managerSignUp}>Get started</Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="min-h-11 border-white/25 bg-transparent text-white hover:bg-white/10 hover:text-white"
              >
                <a href="#contact">Contact us</a>
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
    <section className={`${CONTAINER} ${SECTION}`}>
      <div className="mb-8 max-w-2xl">
        <p className={EYEBROW}>Pricing</p>
        <h1 className="page-title mt-2 text-[2rem] sm:text-[2.25rem]">
          Per property, per month, in Kenyan shillings.
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
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
