import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { LandingSections } from "@/features/marketing/landing/LandingPage";
import { LandingShell } from "@/features/marketing/landing/components/LandingShell";
import { PublicPricing } from "@/features/marketing/components/PublicPricing";
import { usePublicTiers } from "@/features/marketing/hooks/usePublicTiers";
import { useDefaultLandingConfig } from "@/features/marketing/landing/useLandingConfig";
import { PUBLIC_ROUTES } from "@/features/marketing/publicConfig";
import { SectionHeading } from "@/features/marketing/landing/components/SectionHeading";
import { landingThemeToCssVars } from "@/features/marketing/theme/landingTheme";

const CONTAINER = "mx-auto max-w-6xl px-4 sm:px-6 lg:px-8";
const BAND = "scroll-mt-20 py-10 sm:py-12";

function PricingView() {
  const { data: tiers = [] } = usePublicTiers();

  return (
    <section className={`${CONTAINER} ${BAND}`}>
      <SectionHeading
        level={1}
        eyebrow="Pricing"
        title="Per property, per month, in Kenyan shillings."
        sub="Multiply the published rate by the buildings you manage. Custom blocks exist for larger portfolios."
      />
      <div className="mt-8">
        <PublicPricing tiers={tiers} />
      </div>
    </section>
  );
}

/**
 * Public landing page. Homepage renders the config-driven premium brilliant
 * navy landing; `/pricing` shares the same branded shell + tone.
 */
export function PublicLandingPage() {
  const { pathname, hash } = useLocation();
  const config = useDefaultLandingConfig();
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

  return (
    <div style={landingThemeToCssVars(config.theme)}>
      <LandingShell header={config.header} footer={config.footer}>
        {isPricing ? <PricingView /> : <LandingSections config={config} />}
      </LandingShell>
    </div>
  );
}

export default PublicLandingPage;
