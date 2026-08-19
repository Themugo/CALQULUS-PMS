import { useEffect, type FormEvent, type ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  BarChart3,
  Briefcase,
  Building2,
  ChevronDown,
  CreditCard,
  FileText,
  Home,
  LayoutDashboard,
  Receipt,
  ShieldCheck,
  Users,
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

const SECTION = "scroll-mt-24 py-14 sm:py-16";
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
      <h2 className="section-title mt-2 text-[1.5rem] sm:text-[1.75rem]">{title}</h2>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base">{description}</p>
    </div>
  );
}

const PILLARS = [
  {
    title: "Property",
    icon: Building2,
    items: ["Properties", "Units", "Occupancy", "Tenants"],
  },
  {
    title: "Finance",
    icon: Receipt,
    items: ["Rent", "Billing", "Payments", "Receipts", "Statements"],
  },
  {
    title: "Operations",
    icon: Wrench,
    items: ["Maintenance", "Requests", "Contractors", "Reporting"],
  },
] as const;

const WORKFLOW = [
  { label: "Property", icon: Building2 },
  { label: "Tenant", icon: Users },
  { label: "Lease", icon: FileText },
  { label: "Billing", icon: Receipt },
  { label: "Payment", icon: CreditCard },
  { label: "Reporting", icon: BarChart3 },
] as const;

const ROLES = [
  {
    title: "Property manager",
    description: "Run daily property operations.",
    href: PUBLIC_ROUTES.managerSignUp,
    cta: "Manager portal",
    icon: LayoutDashboard,
  },
  {
    title: "Landlord",
    description: "Monitor portfolio performance and income.",
    href: PUBLIC_ROUTES.landlordLogin,
    cta: "Landlord portal",
    icon: Home,
  },
  {
    title: "Agency",
    description: "Manage clients, portfolios and property operations.",
    href: PUBLIC_ROUTES.agencyLogin,
    cta: "Agency portal",
    icon: Briefcase,
  },
  {
    title: "Tenant",
    description: "Manage leases, payments and property services.",
    href: PUBLIC_ROUTES.tenantLogin,
    cta: "Tenant portal",
    icon: Users,
  },
] as const;

const CAPABILITY_GROUPS = [
  {
    title: "Property",
    icon: Building2,
    items: ["Properties", "Units", "Occupancy", "Tenants"],
  },
  {
    title: "Finance",
    icon: CreditCard,
    items: ["Rent", "Billing", "M-Pesa", "Payments", "Receipts", "Statements"],
  },
  {
    title: "Operations",
    icon: Wrench,
    items: ["Maintenance", "Requests", "Contractors", "Water billing"],
  },
  {
    title: "Insight",
    icon: BarChart3,
    items: ["Reports", "Collections", "Activity"],
  },
  {
    title: "Security",
    icon: ShieldCheck,
    items: ["Roles", "Permissions", "Data isolation", "Activity records"],
  },
] as const;

function IconWell({ children }: { children: ReactNode }) {
  return (
    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-soft-blue text-primary">
      {children}
    </span>
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
    window.location.href = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent("CALQULUS PMS inquiry")}&body=${body}`;
  };

  return (
    <>
      <section className={`${CONTAINER} grid items-center gap-10 py-12 lg:grid-cols-2 lg:gap-14 lg:py-16`}>
        <div>
          <p className={EYEBROW}>Property operations, connected</p>
          <h1 className="page-title mt-3 max-w-xl text-[2rem] leading-tight sm:text-[2.5rem] lg:text-[2.75rem]">
            Run your properties with clarity and control.
          </h1>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-muted-foreground sm:text-base">
            CALQULUS brings properties, units, tenants, leases, rent, payments and maintenance
            into one focused operational system.
          </p>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Button asChild size="lg" className="btn-brand min-h-11">
              <Link to={PUBLIC_ROUTES.managerSignUp}>
                Start managing
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="min-h-11">
              <a href="#platform">Explore the platform</a>
            </Button>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            Built for property managers, landlords, agencies and tenants.
          </p>
        </div>
        <ProductPreview />
      </section>

      <section className={`border-t border-border bg-card ${SECTION}`}>
        <div className={CONTAINER}>
          <SectionIntro
            id="platform"
            eyebrow="The system"
            title="Everything important, connected."
            description="CALQULUS brings the core work of property management into one connected operational system."
          />
          <div className="grid gap-4 md:grid-cols-3">
            {PILLARS.map((pillar) => (
              <article key={pillar.title} className="enterprise-card p-6">
                <IconWell>
                  <pillar.icon className="h-5 w-5" aria-hidden />
                </IconWell>
                <h3 className="card-title-exec mt-4">{pillar.title}</h3>
                <ul className="mt-3 space-y-1.5 text-sm text-muted-foreground">
                  {pillar.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="how-it-works" className={`${CONTAINER} ${SECTION}`}>
        <SectionIntro
          eyebrow="Workflow"
          title="From property to payment."
          description="CALQULUS connects the operational lifecycle — from the building record through to reporting."
        />
        <ol className="relative hidden md:flex">
          <span
            className="absolute left-[8%] right-[8%] top-5 h-px bg-border"
            aria-hidden
          />
          {WORKFLOW.map((step, index) => (
            <li key={step.label} className="relative z-[1] flex flex-1 flex-col items-center bg-secondary-background px-2 text-center">
              <IconWell>
                <step.icon className="h-5 w-5" aria-hidden />
              </IconWell>
              <p className="mt-3 text-sm font-semibold text-foreground">{step.label}</p>
              <p className="mt-1 type-meta">{String(index + 1).padStart(2, "0")}</p>
            </li>
          ))}
        </ol>
        <ol className="relative space-y-3 md:hidden">
          {WORKFLOW.map((step, index) => (
            <li key={step.label} className="flex items-start gap-3">
              <div className="flex flex-col items-center">
                <IconWell>
                  <step.icon className="h-5 w-5" aria-hidden />
                </IconWell>
                {index < WORKFLOW.length - 1 ? (
                  <ChevronDown className="mt-1 h-4 w-4 text-border" aria-hidden />
                ) : null}
              </div>
              <div className="enterprise-card flex-1 px-4 py-3">
                <p className="text-sm font-semibold text-foreground">{step.label}</p>
                <p className="type-meta mt-0.5">Step {String(index + 1).padStart(2, "0")}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section id="solutions" className={`border-t border-border bg-card ${SECTION}`}>
        <div className={CONTAINER}>
          <SectionIntro
            eyebrow="Roles"
            title="One system. Clear experiences."
            description="Each role gets the information and tools relevant to the work they need to perform."
          />
          <div className="grid gap-4 sm:grid-cols-2">
            {ROLES.map((role) => (
              <article key={role.title} className="enterprise-card flex flex-col p-6">
                <IconWell>
                  <role.icon className="h-5 w-5" aria-hidden />
                </IconWell>
                <h3 className="card-title-exec mt-4">{role.title}</h3>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">
                  {role.description}
                </p>
                <Button asChild variant="outline" className="mt-5 min-h-11 w-full sm:w-auto">
                  <Link to={role.href}>
                    {role.cta}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="capabilities" className={`${CONTAINER} ${SECTION}`}>
        <SectionIntro
          eyebrow="Capabilities"
          title="What the system covers."
          description="The working records of a rental operation — without a catalogue of competing feature cards."
        />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {CAPABILITY_GROUPS.map((group) => (
            <article key={group.title} className="enterprise-card p-5">
              <div className="flex items-center gap-3">
                <IconWell>
                  <group.icon className="h-5 w-5" aria-hidden />
                </IconWell>
                <h3 className="card-title-exec">{group.title}</h3>
              </div>
              <ul className="mt-4 flex flex-wrap gap-2">
                {group.items.map((item) => (
                  <li
                    key={item}
                    className="rounded-md border border-border bg-secondary-background px-2.5 py-1 text-xs font-medium text-foreground"
                  >
                    {item}
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>

      <section className={`border-t border-border bg-card ${SECTION}`}>
        <div className={CONTAINER}>
          <div className="enterprise-card flex flex-col items-start justify-between gap-6 p-6 sm:flex-row sm:items-center sm:p-8">
            <div className="max-w-xl">
              <p className={EYEBROW}>Commercial</p>
              <h2 className="section-title mt-2">Clear pricing. A clear operating system.</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Published plans are priced per property, per month, in Kenyan shillings.
              </p>
            </div>
            <Button asChild className="btn-brand min-h-11 shrink-0">
              <Link to={PUBLIC_ROUTES.pricing}>
                View plans
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <section id="about" className={`${CONTAINER} ${SECTION}`}>
        <div className="rounded-[0.625rem] bg-navy-primary px-6 py-12 text-center text-white sm:px-10">
          <h2 className="font-heading text-2xl font-semibold tracking-tight sm:text-[1.75rem]">
            Ready to bring your property operations together?
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-white/75">
            Start managing your portfolio with a system built around the way property operations
            actually work.
          </p>
          <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button asChild size="lg" className="min-h-11 bg-white text-navy-primary hover:bg-white/90">
              <Link to={PUBLIC_ROUTES.managerSignUp}>Get started</Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="min-h-11 border-white/30 bg-transparent text-white hover:bg-white/10 hover:text-white"
            >
              <a href="#contact">Contact us</a>
            </Button>
          </div>
        </div>
      </section>

      <section id="contact" className={`border-t border-border ${SECTION}`}>
        <div className={`${CONTAINER} grid gap-8 lg:grid-cols-[1fr_22rem]`}>
          <div>
            <p className={EYEBROW}>Contact</p>
            <h2 className="section-title mt-2">Talk to CALQULUS</h2>
            <p className="mt-3 max-w-lg text-sm leading-relaxed text-muted-foreground">
              Property management teams, landlords and agencies can speak with the CALQULUS team
              about their portfolio and operational needs.
            </p>
            <Button asChild className="btn-brand mt-6 min-h-11">
              <a href={`mailto:${CONTACT_EMAIL}`}>Contact us</a>
            </Button>
            <p className="mt-3 text-sm text-muted-foreground">{CONTACT_EMAIL}</p>
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
            <Button type="submit" variant="outline" className="min-h-11 w-full">
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
          Clear pricing. A clear operating system.
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
          Price is per property, per month, in Kenyan shillings. Custom blocks exist for larger
          portfolios.
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
