import { useEffect, type FormEvent } from "react";
import { Link, useLocation } from "react-router-dom";
import { ArrowRight, ChevronRight, Mail, MapPin } from "lucide-react";
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
const BAND = "scroll-mt-20 py-10 sm:py-12";
const EYEBROW = "text-[11px] font-semibold uppercase tracking-[0.16em] text-primary";

const FLOW = ["Property", "Tenant", "Lease", "Billing", "Payment", "Reporting"] as const;

const ROLES = [
  {
    title: "Property Manager",
    description: "Run properties, tenants, leases, rent, payments, and maintenance from one desk.",
    href: PUBLIC_ROUTES.managerSignUp,
    cta: "Manager portal",
  },
  {
    title: "Landlord",
    description: "Monitor occupancy, income, and property performance — without tenant contact data.",
    href: PUBLIC_ROUTES.landlordLogin,
    cta: "Landlord portal",
  },
  {
    title: "Agency",
    description: "Manage a client portfolio and the operating model for the buildings you run.",
    href: PUBLIC_ROUTES.agencyLogin,
    cta: "Agency portal",
  },
  {
    title: "Tenant",
    description: "Pay rent, submit a repair, and read the lease for the unit you occupy.",
    href: PUBLIC_ROUTES.tenantLogin,
    cta: "Tenant portal",
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
      <section className="border-b border-border bg-card">
        <div
          className={`${CONTAINER} grid items-center gap-8 py-10 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] xl:gap-12 xl:py-14`}
        >
          <div>
            <p className={EYEBROW}>Property operations, connected</p>
            <h1 className="page-title mt-2 max-w-xl text-[1.85rem] leading-[1.12] text-foreground sm:text-[2.25rem] lg:text-[2.45rem]">
              Run your properties with clarity and control.
            </h1>
            <p className="mt-3 max-w-lg text-sm leading-relaxed text-muted-foreground sm:text-[0.95rem]">
              Opening CALQULUS should feel like opening an operating system — properties, units,
              tenants, leases, rent, payments, and maintenance on one desk.
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
        <div className="max-w-2xl">
          <h2 className="section-title text-[1.3rem] text-foreground sm:text-[1.5rem]">
            The work, in order.
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            A unit is leased, billed, paid, and reported from the same operational chain — not a
            stack of disconnected property pages.
          </p>
        </div>

        <div id="how-it-works" className="scroll-mt-20 mt-6">
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
          <h2 className="section-title text-[1.3rem] text-foreground sm:text-[1.5rem]">
            Four desks. One product.
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Managers buy and run CALQULUS. Landlords, agencies, and tenants use the desks connected
            to that work.
          </p>
        </div>
        <ul className="mt-6 divide-y divide-border overflow-hidden rounded-lg border border-border bg-card">
          {ROLES.map((role) => (
            <li
              key={role.title}
              className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <h3 className="text-sm font-semibold text-foreground">{role.title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{role.description}</p>
              </div>
              <Button asChild variant="outline" className="min-h-10 shrink-0 sm:w-auto">
                <Link to={role.href}>
                  {role.cta}
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </Link>
              </Button>
            </li>
          ))}
        </ul>
      </section>

      <section id="contact" className={`${CONTAINER} ${BAND} border-t border-border pt-10 sm:pt-12`}>
        <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <form onSubmit={handleContactSubmit} className="space-y-3 rounded-lg border border-border bg-card p-5">
            <div>
              <p className={EYEBROW}>Contact</p>
              <h2 className="mt-1.5 font-heading text-xl font-bold tracking-tight text-foreground">
                Talk to CALQULUS
              </h2>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                Operators can write about a portfolio and what they need to run.
              </p>
              <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-sm">
                <li className="flex items-center gap-2 text-foreground">
                  <Mail className="h-4 w-4 text-primary" aria-hidden />
                  <a href={`mailto:${CONTACT_EMAIL}`} className="hover:underline">
                    {CONTACT_EMAIL}
                  </a>
                </li>
                <li className="flex items-center gap-2 text-muted-foreground">
                  <MapPin className="h-4 w-4 text-muted-foreground" aria-hidden />
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

          <div id="pricing" className="scroll-mt-20 rounded-lg border border-border bg-card p-5">
            <p className={EYEBROW}>Pricing</p>
            <h2 className="section-title mt-1.5 text-[1.2rem] text-foreground">
              Per property, per month, in Kenyan shillings.
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Published rates multiply by the buildings you manage. Custom blocks exist for larger
              portfolios — core operations are not locked behind plan walls.
            </p>
            <div id="about" className="mt-4 flex flex-col gap-2 sm:flex-row">
              <Button asChild variant="outline" className="min-h-10">
                <Link to={PUBLIC_ROUTES.pricing}>
                  View plans
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </Link>
              </Button>
              <Button asChild className="btn-brand min-h-10">
                <Link to={PUBLIC_ROUTES.managerSignUp}>Get started</Link>
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
        <h1 className="page-title mt-2 text-[1.85rem] text-foreground sm:text-[2.1rem]">
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
