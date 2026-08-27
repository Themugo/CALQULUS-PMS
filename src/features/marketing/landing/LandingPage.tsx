import type { ReactNode } from "react";
import { useDefaultLandingConfig } from "@/features/marketing/landing/useLandingConfig";
import { LandingShell } from "@/features/marketing/landing/components/LandingShell";
import { PremiumHero } from "@/features/marketing/landing/components/PremiumHero";
import { TrustStrip } from "@/features/marketing/landing/components/TrustStrip";
import { CapabilityGrid } from "@/features/marketing/landing/components/CapabilityGrid";
import { RoleSolutions } from "@/features/marketing/landing/components/RoleSolutions";
import { PropertyTypeStrip } from "@/features/marketing/landing/components/PropertyTypeStrip";
import { PlatformMetrics } from "@/features/marketing/landing/components/PlatformMetrics";
import { FinalCta } from "@/features/marketing/landing/components/FinalCta";
import type { LandingPageConfig } from "@/features/marketing/landing/landingContent";
import { landingThemeToCssVars } from "@/features/marketing/theme/landingTheme";

/** Render the config-ordered homepage sections inside the branded shell. */
export function LandingPageInner({ config }: { config: LandingPageConfig }) {
  const vars = landingThemeToCssVars(config.theme);

  return (
    <div style={vars}>
      <LandingShell header={config.header} footer={config.footer}>
        <LandingSections config={config} />
      </LandingShell>
    </div>
  );
}

/** Homepage sections only (used inside a shell). */
export function LandingSections({ config }: { config: LandingPageConfig }) {
  const sections: Record<string, ReactNode> = {
    hero: <PremiumHero key="hero" id="hero" config={config.hero} dashboard={config.dashboard} />,
    trust: <TrustStrip key="trust" config={config.trust} />,
    capabilities: (
      <CapabilityGrid
        id="capabilities"
        key="capabilities"
        eyebrow="Platform"
        title="Everything you need. One platform."
        sub="Properties, units, tenants, leases, billing, payments, maintenance and reporting — connected."
        items={config.capabilities}
      />
    ),
    roles: (
      <RoleSolutions
        id="roles"
        key="roles"
        eyebrow="Solutions"
        title="One platform. Every connection."
        sub="Each role gets a focused workspace on the same data — with access scoped by role."
        items={config.roles}
      />
    ),
    propertyTypes: (
      <PropertyTypeStrip
        id="property-types"
        key="property-types"
        eyebrow="Property types"
        title="Built for the way property is managed."
        sub="Residential, commercial and office — one workspace."
        items={config.propertyTypes}
      />
    ),
    metrics: (
      <PlatformMetrics
        id="resources"
        key="metrics"
        eyebrow="Platform data"
        title="Built to be relied on."
        sub="One connected workspace with visibility into the whole portfolio."
        items={config.metrics}
      />
    ),
    finalCta: <FinalCta id="company" key="company" config={config.finalCta} />,
  };

  const ordered = config.sections.map((id) => sections[id]).filter(Boolean);
  return <>{ordered}</>;
}

/** Full homepage: config + shell. */
export function LandingPage() {
  const config = useDefaultLandingConfig();
  return <LandingPageInner config={config} />;
}

/** Default export variant used by the router. */
export default LandingPage;