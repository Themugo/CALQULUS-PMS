import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { CompactCta } from "@/features/marketing/components/CompactCta";
import { ExecutiveHero } from "@/features/marketing/components/ExecutiveHero";
import { OperationalWorkflow } from "@/features/marketing/components/OperationalWorkflow";
import { PlatformOverview } from "@/features/marketing/components/PlatformOverview";
import { PortalExperiences } from "@/features/marketing/components/PortalExperiences";
import { ProductShowcase } from "@/features/marketing/components/ProductShowcase";
import { PropertyCarousel } from "@/features/marketing/components/PropertyCarousel";
import { PropertyTypeSlider } from "@/features/marketing/components/PropertyTypeSlider";
import { PublicPricing } from "@/features/marketing/components/PublicPricing";
import { PublicShell } from "@/features/marketing/components/PublicShell";
import { TrustSection } from "@/features/marketing/components/TrustSection";
import { usePublicTiers } from "@/features/marketing/hooks/usePublicTiers";
import { PUBLIC_ROUTES } from "@/features/marketing/publicConfig";

const CONTAINER = "mx-auto max-w-6xl px-4 sm:px-6 lg:px-8";
const BAND = "scroll-mt-20 py-10 sm:py-12";
const EYEBROW = "text-[11px] font-semibold uppercase tracking-[0.16em] text-primary";

function HomeView() {
  return (
    <>
      <ExecutiveHero />
      <PropertyCarousel />
      <PlatformOverview />
      <PropertyTypeSlider />
      <OperationalWorkflow />
      <ProductShowcase />
      <PortalExperiences />
      <TrustSection />
      <CompactCta />
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
      ? "Pricing | CALQULUS"
      : "CALQULUS | Property Operations, Connected";
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
