import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import {
  Building2,
  ChevronRight,
  FileText,
  Home,
  Shield,
  TrendingUp,
  Wallet,
} from "lucide-react";
import type { CSSProperties, ComponentType } from "react";
import { BrandMark } from "@/shared/components/branding/BrandMark";
import { PUBLIC_ROUTES } from "@/features/marketing/publicConfig";
import { PROPERTY_IMAGES, PROPERTY_THUMBS } from "@/features/marketing/propertyImages";
import { portalSurfaceProps } from "@/core/design";

/**
 * Landlord portal entry chrome — owner performance desk, not operator.
 * Emerald accent; navy + white stay dominant. Owns background, header,
 * identity, owner-preview, switcher and legal footer.
 */

const LANDLORD_ACCENT = "#0F8A6A";

const CAPABILITIES: { icon: ComponentType<{ className?: string; style?: CSSProperties }>; label: string }[] = [
  { icon: Building2, label: "Properties" },
  { icon: TrendingUp, label: "Occupancy" },
  { icon: Wallet, label: "Your share" },
  { icon: FileText, label: "Statements" },
  { icon: Shield, label: "Privacy protected" },
];

const OTHER_PORTALS: { label: string; href: string; accent: string }[] = [
  { label: "Manager", href: PUBLIC_ROUTES.managerSignIn, accent: "#2F6FED" },
  { label: "Agency", href: PUBLIC_ROUTES.agencyLogin, accent: "#0F766E" },
  { label: "Tenant", href: PUBLIC_ROUTES.tenantLogin, accent: "#0284C7" },
];

const PERFORMANCE_STATS: { icon: ComponentType<{ className?: string; style?: CSSProperties }>; label: string; value: string; strong: boolean }[] = [
  { icon: Wallet, label: "Collected", value: "KES 980K", strong: false },
  { icon: TrendingUp, label: "Occupancy", value: "84%", strong: false },
  { icon: Building2, label: "Properties", value: "2", strong: false },
  { icon: Wallet, label: "Net to you", value: "KES 784K", strong: true },
];

const PORTFOLIO_PROPERTIES: { name: string; occupancy: number; share: string; thumb?: string }[] = [
  { name: "Kilimani Court", occupancy: 92, share: "80%", thumb: PROPERTY_THUMBS.residential },
  { name: "Westlands House", occupancy: 75, share: "80%" },
];

/** Relative net/collected trend — illustrative percentages, not measured data. */
const NET_TREND: { label: string; collected: number; net: number }[] = [
  { label: "M1", collected: 62, net: 50 },
  { label: "M2", collected: 68, net: 55 },
  { label: "M3", collected: 65, net: 52 },
  { label: "M4", collected: 74, net: 59 },
  { label: "M5", collected: 71, net: 57 },
  { label: "M6", collected: 80, net: 64 },
];

function NetTrend() {
  const latest = NET_TREND[NET_TREND.length - 1];
  return (
    <div className="relative flex items-end gap-[8px]" role="img" aria-label="Illustrative collected vs net trend">
      {NET_TREND.map((point) => (
        <div key={point.label} className="flex flex-1 items-end justify-center gap-1">
          <div
            className="flex h-14 w-3 items-end"
            title={`Collected ${point.collected}% / Net ${point.net}%`}
          >
            <div className="w-full rounded-t-[2px] bg-navy-mid/25" style={{ height: `${point.collected}%` }} />
          </div>
          <div className="flex h-14 w-3 items-end">
            <div
              className="w-full rounded-t-[2px]"
              style={{ height: `${point.net}%`, backgroundColor: LANDLORD_ACCENT, opacity: point === latest ? 1 : 0.65 }}
            />
          </div>
          <p className="sr-only">
            {`${point.label}: collected ${point.collected}%, net ${point.net}%`}
          </p>
        </div>
      ))}
    </div>
  );
}

/** Owner performance preview — emerald for net strength, navy for the rest. */
export function LandlordPerformancePreview() {
  return (
    <figure className="rounded-[14px] border border-white/10 bg-card shadow-xl shadow-navy-deep/20">
      <div className="flex items-center justify-between gap-2 border-b border-border px-3.5 py-2.5">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Portfolio</p>
        <span
          className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
          style={{ color: LANDLORD_ACCENT, backgroundColor: "rgba(15,138,106,0.12)", border: `1px solid rgba(15,138,106,0.3)` }}
        >
          Illustrative landlord view
        </span>
      </div>
      <div className="p-3.5">
        <div className="mb-3 flex items-baseline justify-between gap-2 rounded-lg p-2.5" style={{ backgroundColor: "rgba(15,138,106,0.08)" }}>
          <p className="text-[11px] font-semibold text-foreground">Net to you</p>
          <p className="font-heading text-lg font-bold tracking-tight" style={{ color: LANDLORD_ACCENT }}>
            KES 784K
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {PERFORMANCE_STATS.map((stat) => (
            <div key={stat.label} className="rounded-lg border border-border bg-secondary-background p-2.5">
              <p className="text-[9px] font-medium uppercase tracking-wide text-muted-foreground">{stat.label}</p>
              <p className="mt-1 truncate font-heading text-sm font-semibold leading-none tracking-tight text-foreground">
                {stat.value}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-3">
          <div className="flex items-baseline justify-between">
            <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Net trend</p>
            <p className="text-[10px] text-muted-foreground">Navy collected · emerald net</p>
          </div>
          <NetTrend />
        </div>

        <div className="mt-3.5">
          <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Properties</p>
          <ul className="mt-2 divide-y divide-border overflow-hidden rounded-lg border border-border bg-card">
            {PORTFOLIO_PROPERTIES.map((property) => (
              <li key={property.name} className="flex items-center gap-2.5 px-2.5 py-2">
                <div className="h-10 w-14 shrink-0 overflow-hidden rounded-md bg-navy-mid/10">
                  {property.thumb ? (
                    <img
                      src={property.thumb}
                      alt={`${property.name} building`}
                      loading="lazy"
                      decoding="async"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <Building2 className="m-1.5 h-7 w-7 text-navy-mid/40" aria-hidden />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold text-foreground">{property.name}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {property.occupancy}% occupied · {property.share} share
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-3 flex items-center gap-2 rounded-lg border border-border bg-secondary-background px-2.5 py-2">
          <Shield className="h-3.5 w-3.5 shrink-0 text-navy-mid" aria-hidden />
          <p className="text-[11px] leading-relaxed text-muted-foreground">
            Privacy protected — tenant names, phones and payment breakdowns stay with the manager.
          </p>
        </div>
      </div>
      <figcaption className="sr-only">
        Illustrative landlord view. Sample figures only — not live customer data.
      </figcaption>
    </figure>
  );
}

function PortalSwitcher() {
  return (
    <nav aria-label="Other CALQULUS portals" className="mt-6">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-white/40">Sign in as</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {OTHER_PORTALS.map((portal) => (
          <Link
            key={portal.href}
            to={portal.href}
            className="group inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-medium text-white/70 transition-colors hover:bg-white/10 hover:text-white"
          >
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: portal.accent }} aria-hidden />
            {portal.label}
            <ChevronRight className="h-3 w-3 text-white/30 transition-transform group-hover:translate-x-0.5" aria-hidden />
          </Link>
        ))}
      </div>
    </nav>
  );
}

function CompactPortalFooter() {
  return (
    <div className="mt-4 flex items-center gap-3 text-[11px] text-white/40">
      <Link to={PUBLIC_ROUTES.legalPrivacy} className="transition-colors hover:text-white/80">Privacy</Link>
      <span aria-hidden>·</span>
      <Link to={PUBLIC_ROUTES.legalTerms} className="transition-colors hover:text-white/80">Terms</Link>
      <span className="ml-auto">© 2026 CALQULUS Limited</span>
    </div>
  );
}

interface LandlordPortalShellProps {
  children: ReactNode;
}

export function LandlordPortalShell({ children }: LandlordPortalShellProps) {
  return (
    <div className="relative min-h-screen bg-navy-deep" {...portalSurfaceProps("landlord")}>
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <img
          src={PROPERTY_IMAGES.commercial}
          alt="Managed residential property background"
          loading="lazy"
          decoding="async"
          className="h-full w-full object-cover opacity-[0.2]"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-navy-deep/85 via-navy-deep/80 to-navy-deep/92" />
      </div>

      <div className="relative mx-auto flex min-h-screen max-w-5xl flex-col px-4 sm:px-6 lg:px-8">
        <header className="flex items-center justify-between py-5">
          <Link to={PUBLIC_ROUTES.home} aria-label="CALQULUS home" aria-description="Landlord portal">
            <BrandMark size="nav" showWordmark subtitle="Landlord" inverse forcePlatform />
          </Link>
          <Link to={PUBLIC_ROUTES.home} className="text-xs font-medium text-white/60 transition-colors hover:text-white">
            Back to CALQULUS
          </Link>
        </header>

        <main className="grid flex-1 gap-8 pb-6 lg:grid-cols-[1.05fr_0.95fr] lg:gap-12">
          <div className="flex flex-col justify-center lg:col-start-1 lg:row-start-1">
            <div className="inline-flex items-center gap-2 self-start rounded-full border border-white/15 bg-white/[0.04] px-3 py-1.5">
              <Wallet className="h-3.5 w-3.5" style={{ color: LANDLORD_ACCENT }} aria-hidden />
              <span className="text-[11px] font-semibold uppercase tracking-wider text-white/90">Landlord portal</span>
            </div>
            <h1 className="font-heading mt-5 max-w-md text-[1.9rem] font-bold leading-tight tracking-tight text-white sm:text-4xl">
              See how your properties are performing.
            </h1>
            <p className="mt-3 max-w-md text-sm leading-relaxed text-white/70 sm:text-[15px]">
              Track occupancy, collections and your share across the properties managed for you.
            </p>
            <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2">
              {CAPABILITIES.map(({ icon: Icon, label }) => (
                <span key={label} className="inline-flex items-center gap-1.5 text-[13px] font-medium text-white/80">
                  <Icon className="h-[15px] w-[15px]" style={{ color: LANDLORD_ACCENT }} aria-hidden />
                  {label}
                </span>
              ))}
            </div>
          </div>

          <div className="lg:col-start-2 lg:row-span-3 lg:row-start-1 lg:flex lg:flex-col lg:justify-center">
            <section className="rounded-[16px] border border-white/10 bg-card p-6 shadow-2xl shadow-black/25 sm:p-7" aria-label="Landlord access">
              <div className="mb-5">
                <span className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1" style={{ borderColor: "rgba(15,138,106,0.3)", backgroundColor: "rgba(15,138,106,0.08)" }}>
                  <Wallet className="h-3 w-3" style={{ color: LANDLORD_ACCENT }} aria-hidden />
                  <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: LANDLORD_ACCENT }}>
                    Landlord
                  </span>
                </span>
                <h2 className="font-heading mt-3 text-2xl font-bold tracking-tight text-foreground">Welcome back</h2>
                <p className="mt-1 text-sm text-muted-foreground">Sign in to view your property performance.</p>
              </div>
              {children}
            </section>
          </div>

          <div className="lg:col-start-1 lg:row-start-2 lg:row-end-4">
            <LandlordPerformancePreview />
            <PortalSwitcher />
          </div>
        </main>

        <footer className="pb-5">
          <CompactPortalFooter />
        </footer>
      </div>
    </div>
  );
}
