import { ArrowRight, Building2, CreditCard, Wrench } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/shared/components/ui/button";
import { ProductPreview } from "@/features/marketing/components/ProductPreview";
import { PublicPricing } from "@/features/marketing/components/PublicPricing";
import { PublicShell } from "@/features/marketing/components/PublicShell";
import { usePublicTiers } from "@/features/marketing/hooks/usePublicTiers";
import { PUBLIC_ROUTES } from "@/features/marketing/publicConfig";

const CONTAINER = "mx-auto max-w-6xl px-4 sm:px-6 lg:px-8";

const CAPABILITIES = [
  { icon: Building2, title: "Properties", copy: "Keep buildings, units and occupancy in one view." },
  { icon: CreditCard, title: "Money", copy: "Bill, collect and reconcile without losing the trail." },
  { icon: Wrench, title: "Operations", copy: "Move maintenance and daily tasks from open to done." },
] as const;

function HomeView() {
  return (
    <>
      <section className="relative overflow-hidden border-b border-border bg-background">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_75%_18%,rgba(47,111,237,0.10),transparent_32%),linear-gradient(to_bottom,#fff,rgba(247,249,252,0.8))]" />
        <div className={`${CONTAINER} relative grid items-center gap-10 pb-14 pt-12 sm:pb-16 sm:pt-16 lg:grid-cols-[0.86fr_1.14fr] lg:gap-14 lg:pb-20 lg:pt-20`}>
          <div className="max-w-xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">Property operations, connected</p>
            <h1 className="mt-4 font-heading text-[clamp(2.55rem,6vw,4.7rem)] font-semibold leading-[0.98] tracking-[-0.045em] text-foreground">
              Property management, without the clutter.
            </h1>
            <p className="mt-5 max-w-lg text-base leading-7 text-muted-foreground sm:text-lg">
              CALQULUS brings properties, tenants, leases, billing, payments and maintenance into one focused workspace.
            </p>
            <div className="mt-7 flex flex-col gap-2.5 sm:flex-row">
              <Button asChild size="lg" className="btn-brand h-12 px-6">
                <Link to={PUBLIC_ROUTES.managerSignUp}>Start managing <ArrowRight className="h-4 w-4" aria-hidden /></Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="h-12 px-6">
                <a href="#platform">See what is inside</a>
              </Button>
            </div>
            <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs font-medium text-muted-foreground">
              <span className="inline-flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-primary" /> Managers</span>
              <span className="inline-flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-primary" /> Landlords</span>
              <span className="inline-flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-primary" /> Agencies</span>
              <span className="inline-flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-primary" /> Tenants</span>
            </div>
          </div>

          <div className="lg:pt-4">
            <ProductPreview elevated />
          </div>
        </div>
      </section>

      <section id="platform" className="scroll-mt-20 border-b border-border bg-card">
        <div className={`${CONTAINER} py-11 sm:py-14`}>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="max-w-xl">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">The workspace</p>
              <h2 className="mt-2 font-heading text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">The work that matters, in one place.</h2>
            </div>
            <p className="max-w-sm text-sm leading-6 text-muted-foreground sm:text-right">Less switching between tools. More visibility across the portfolio.</p>
          </div>
          <div className="mt-8 grid border-y border-border sm:grid-cols-3 sm:divide-x sm:divide-border">
            {CAPABILITIES.map(({ icon: Icon, title, copy }) => (
              <div key={title} className="flex gap-4 border-b border-border py-5 last:border-b-0 sm:border-b-0 sm:px-6 sm:first:pl-0 sm:last:pr-0">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"><Icon className="h-4 w-4" aria-hidden /></span>
                <div><h3 className="font-heading text-sm font-semibold text-foreground">{title}</h3><p className="mt-1 text-sm leading-5 text-muted-foreground">{copy}</p></div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="solutions" className="scroll-mt-20 bg-background">
        <div className={`${CONTAINER} py-10 sm:py-12`}>
          <div className="rounded-2xl bg-navy-deep px-6 py-8 sm:px-10 sm:py-9">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
              <div className="max-w-xl"><p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/60">Ready when you are</p><h2 className="mt-2 font-heading text-2xl font-semibold tracking-tight text-white sm:text-3xl">Bring your portfolio into focus.</h2><p className="mt-2 text-sm leading-6 text-white/70">Start with the essentials. Add more as your operation grows.</p></div>
              <div className="flex shrink-0 flex-col gap-2 sm:flex-row"><Button asChild size="lg" className="btn-brand min-h-11"><Link to={PUBLIC_ROUTES.managerSignUp}>Get started <ArrowRight className="h-4 w-4" /></Link></Button><Button asChild size="lg" variant="outline" className="min-h-11 border-white/20 bg-transparent text-white hover:bg-white/10 hover:text-white"><Link to={PUBLIC_ROUTES.managerSignIn}>Sign in</Link></Button></div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

function PricingView() {
  const { data: tiers = [] } = usePublicTiers();
  return <section className={`${CONTAINER} py-10 sm:py-14`}><div className="mb-7 max-w-2xl"><p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">Pricing</p><h1 className="mt-2 font-heading text-3xl font-semibold tracking-tight text-foreground">Simple pricing for property operations.</h1><p className="mt-2 text-sm leading-6 text-muted-foreground sm:text-base">Published rates in Kenyan shillings, with custom options for larger portfolios.</p></div><PublicPricing tiers={tiers} /></section>;
}

export function PublicLandingPage() {
  const { pathname } = useLocation();
  const isPricing = pathname === PUBLIC_ROUTES.pricing;
  return <PublicShell>{isPricing ? <PricingView /> : <HomeView />}</PublicShell>;
}

export default PublicLandingPage;
