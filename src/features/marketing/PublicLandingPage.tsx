import { useEffect, type FormEvent, type ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  BarChart3,
  Briefcase,
  Building2,
  CreditCard,
  Droplets,
  FileText,
  Home,
  LayoutDashboard,
  Mail,
  MapPin,
  Receipt,
  ShieldCheck,
  Users,
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

const SECTION = "scroll-mt-24 py-12 sm:py-14";
const CONTAINER = "mx-auto max-w-6xl px-4 sm:px-6";
const EYEBROW = "text-[11px] font-semibold uppercase tracking-[0.14em] text-primary";

function SectionIntro({
  id,
  eyebrow,
  title,
  description,
}: {
  id?: string;
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div id={id} className="mb-8 max-w-2xl">
      <p className={EYEBROW}>{eyebrow}</p>
      <h2 className="section-title mt-2 text-[1.4rem] sm:text-[1.6rem]">{title}</h2>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base">{description}</p>
    </div>
  );
}

function IconWell({
  children,
  className = "bg-soft-blue text-primary",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${className}`}>
      {children}
    </span>
  );
}

const MODULES = [
  {
    title: "Properties & units",
    detail: "Buildings, unit mix, and occupancy on the same record.",
    icon: Building2,
    tint: "bg-soft-blue text-primary",
  },
  {
    title: "Tenants & leases",
    detail: "Who lives where, rent terms, deposits, and move-in dates.",
    icon: Users,
    tint: "bg-indigo-bg text-indigo",
  },
  {
    title: "Rent & invoices",
    detail: "Issue rent, track balance due, and keep a clear ledger.",
    icon: Receipt,
    tint: "bg-gold-bg text-primary",
  },
  {
    title: "Payments",
    detail: "M-Pesa collections or a recorded receipt against the invoice.",
    icon: CreditCard,
    tint: "bg-teal-bg text-teal",
  },
  {
    title: "Water & maintenance",
    detail: "Meter readings and repair tickets against the same units.",
    icon: Droplets,
    tint: "bg-teal-bg text-teal",
  },
  {
    title: "Landlord reporting",
    detail: "Occupancy and revenue share — never tenant PII.",
    icon: BarChart3,
    tint: "bg-indigo-bg text-indigo",
  },
] as const;

const WORKFLOW = [
  { step: "01", title: "Sign up", detail: "Create a manager account. Approval is required before billing starts." },
  { step: "02", title: "Onboard", detail: "Add a property, units, and a tenant. Issue the first invoice." },
  { step: "03", title: "Pay", detail: "Platform billing is monthly, in KES, and visible on the account." },
  { step: "04", title: "Operate", detail: "Collect rent, track repairs, and report to landlords from the same records." },
] as const;

const ROLES = [
  {
    title: "Property manager",
    description: "Run properties, tenants, leases, rent, payments, maintenance, and landlord reporting.",
    href: PUBLIC_ROUTES.managerSignUp,
    cta: "Manager portal",
    icon: LayoutDashboard,
    tint: "bg-soft-blue text-primary",
  },
  {
    title: "Landlord",
    description: "Monitor occupancy, income, and property performance — without tenant contact data.",
    href: PUBLIC_ROUTES.landlordLogin,
    cta: "Landlord portal",
    icon: Home,
    tint: "bg-gold-bg text-primary",
  },
  {
    title: "Agency",
    description: "Manage a client portfolio, operating model, and property operations.",
    href: PUBLIC_ROUTES.agencyLogin,
    cta: "Agency portal",
    icon: Briefcase,
    tint: "bg-indigo-bg text-indigo",
  },
  {
    title: "Tenant",
    description: "Pay rent, submit maintenance, and read the lease for the unit you occupy.",
    href: PUBLIC_ROUTES.tenantLogin,
    cta: "Tenant portal",
    icon: Users,
    tint: "bg-teal-bg text-teal",
  },
] as const;

const ACCOUNT = [
  {
    title: "Data isolation",
    detail: "Each manager’s records stay scoped to that account. Access is role-based.",
    icon: ShieldCheck,
  },
  {
    title: "Collections",
    detail: "Tenant payments use M-Pesa or a recorded receipt. Platform fees are invoiced in-app.",
    icon: CreditCard,
  },
  {
    title: "Privacy",
    detail: "We collect what is needed to run rentals. We do not sell tenant or landlord data.",
    icon: FileText,
  },
] as const;

function HomeView() {
  const { data: tiers = [] } = usePublicTiers();

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
        <div className={`${CONTAINER} relative grid items-center gap-10 py-12 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] lg:gap-12 lg:py-16`}>
          <div>
            <p className={EYEBROW}>Kenya &amp; East Africa · property operations</p>
            <h1 className="page-title mt-3 max-w-xl text-[2rem] leading-[1.15] sm:text-[2.45rem] lg:text-[2.7rem]">
              One workspace for properties, tenants, rent, and repairs.
            </h1>
            <p className="mt-4 max-w-lg text-sm leading-relaxed text-muted-foreground sm:text-base">
              The building record drives the tenant, the lease, the invoice, the M-Pesa receipt,
              the repair ticket, and the landlord report. That is the product.
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Button asChild size="lg" className="btn-brand min-h-11">
                <Link to={PUBLIC_ROUTES.managerSignUp}>
                  Start managing
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="min-h-11 bg-card/80">
                <Link to={PUBLIC_ROUTES.pricing}>View plans</Link>
              </Button>
            </div>
            <div className="mt-6 flex flex-wrap gap-2">
              {ROLES.map((role) => (
                <Link
                  key={role.title}
                  to={role.href}
                  className="rounded-full border border-border bg-card/90 px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:border-primary/40 hover:text-primary"
                >
                  {role.title}
                </Link>
              ))}
            </div>
          </div>
          <ProductPreview />
        </div>
      </section>

      <section id="platform" className={`${CONTAINER} ${SECTION}`}>
        <SectionIntro
          eyebrow="Workspace"
          title="The same cards you work from after you sign in."
          description="Modules match the live manager desk: properties, people, money, and repairs — not a brochure of slogans."
        />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {MODULES.map((mod) => (
            <article key={mod.title} className="enterprise-card p-5 transition-shadow hover:shadow-md">
              <IconWell className={mod.tint}>
                <mod.icon className="h-5 w-5" aria-hidden />
              </IconWell>
              <h3 className="card-title-exec mt-4">{mod.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{mod.detail}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="how-it-works" className={`border-y border-border/80 bg-card/60 ${SECTION}`}>
        <div className={CONTAINER}>
          <SectionIntro
            eyebrow="Workflow"
            title="Sign up, set up a property, then collect rent."
            description="Four operating steps. Nothing here is a sales funnel — it is how a new manager account actually starts."
          />
          <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {WORKFLOW.map((item) => (
              <li key={item.step} className="enterprise-card relative p-5">
                <p className="font-heading text-sm font-bold text-primary">{item.step}</p>
                <h3 className="card-title-exec mt-2">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.detail}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section id="solutions" className={`${CONTAINER} ${SECTION}`}>
        <SectionIntro
          eyebrow="Portals"
          title="Open the desk that matches your role."
          description="Managers buy and run CALQULUS. Landlords, agencies, and tenants use the portals connected to that work."
        />
        <div className="grid gap-4 sm:grid-cols-2">
          {ROLES.map((role) => (
            <article key={role.title} className="enterprise-card flex flex-col p-6">
              <IconWell className={role.tint}>
                <role.icon className="h-5 w-5" aria-hidden />
              </IconWell>
              <h3 className="card-title-exec mt-4">{role.title}</h3>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">{role.description}</p>
              <Button asChild variant="outline" className="mt-5 min-h-11 w-full bg-card sm:w-auto">
                <Link to={role.href}>
                  {role.cta}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </article>
          ))}
        </div>
      </section>

      <section id="pricing" className={`border-y border-border/80 bg-card/60 ${SECTION}`}>
        <div className={CONTAINER}>
          <SectionIntro
            eyebrow="Pricing"
            title="Per property, per month, in Kenyan shillings."
            description="Multiply the published rate by the buildings you manage. Custom blocks exist for larger portfolios — core operations are not locked behind plan walls."
          />
          <PublicPricing tiers={tiers} />
        </div>
      </section>

      <section className={`${CONTAINER} ${SECTION}`}>
        <SectionIntro
          eyebrow="Account"
          title="How the account is handled."
          description="Isolation, collections, and the legal pages that apply to the live product."
        />
        <div className="grid gap-4 md:grid-cols-3">
          {ACCOUNT.map((item) => (
            <article key={item.title} className="enterprise-card p-5">
              <IconWell>
                <item.icon className="h-5 w-5" aria-hidden />
              </IconWell>
              <h3 className="card-title-exec mt-4">{item.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.detail}</p>
            </article>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap gap-3 text-sm">
          <Link to={PUBLIC_ROUTES.legalPrivacy} className="font-medium text-primary hover:underline">
            Privacy policy
          </Link>
          <Link to={PUBLIC_ROUTES.legalTerms} className="font-medium text-primary hover:underline">
            Terms of service
          </Link>
        </div>
      </section>

      <section id="contact" className={`border-t border-border bg-card/70 ${SECTION}`}>
        <div className={`${CONTAINER} grid gap-8 lg:grid-cols-[1fr_24rem]`}>
          <div>
            <p className={EYEBROW}>Contact</p>
            <h2 className="section-title mt-2">Talk to CALQULUS</h2>
            <p className="mt-3 max-w-lg text-sm leading-relaxed text-muted-foreground">
              Property management teams, landlords, and agencies can write about a portfolio and what they need to run.
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
  const navigate = useNavigate();
  const isPricing = pathname === PUBLIC_ROUTES.pricing;

  useEffect(() => {
    const title = isPricing
      ? "Pricing | CALQULUS PMS"
      : "CALQULUS PMS | Property Management & Operations Platform";
    document.title = title;
  }, [isPricing]);

  useEffect(() => {
    if (pathname === PUBLIC_ROUTES.home && hash === "#pricing") {
      const pricing = document.getElementById("pricing");
      if (pricing) {
        pricing.scrollIntoView({ behavior: "smooth", block: "start" });
        return;
      }
      navigate(PUBLIC_ROUTES.pricing, { replace: true });
    }
  }, [hash, navigate, pathname]);

  return (
    <PublicShell>
      {isPricing ? <PricingView /> : <HomeView />}
    </PublicShell>
  );
}

export default PublicLandingPage;
