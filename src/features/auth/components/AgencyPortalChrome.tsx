import type { CSSProperties, ComponentType, ReactNode } from "react";
import { Link } from "react-router-dom";
import {
  Building2,
  ChevronRight,
  FileText,
  Handshake,
  Landmark,
  Receipt,
  Users,
  Wallet,
} from "lucide-react";
import { BrandMark } from "@/shared/components/branding/BrandMark";
import { PUBLIC_ROUTES } from "@/features/marketing/publicConfig";
import { PROPERTY_IMAGES, PROPERTY_THUMBS } from "@/features/marketing/propertyImages";
import { PortalIdentityBackdrop } from "@/features/auth/components/PortalIdentityBackdrop";
import { usePortalIdentity } from "@/core/product/PortalIdentityProvider";
import { portalSurfaceProps } from "@/core/design";
import { PortalSwitcher } from "@/features/auth/components/PortalChrome";

/**
 * Agency portal entry chrome — business operating a client portfolio.
 * Teal accent; navy + white stay dominant. Owns background, header,
 * identity, portfolio preview, switcher and legal footer.
 */

const AGENCY_ACCENT = "#0F766E";

const CAPABILITIES: { icon: ComponentType<{ className?: string; style?: CSSProperties }>; label: string }[] = [
  { icon: Building2, label: "Client properties" },
  { icon: Users, label: "Landlords" },
  { icon: Receipt, label: "Collections" },
  { icon: Landmark, label: "Revenue share" },
];

const PERFORMANCE_STATS: { icon: ComponentType<{ className?: string }>; label: string; value: string }[] = [
  { icon: Wallet, label: "Collected", value: "KES 2.1M" },
  { icon: Landmark, label: "Your split", value: "8%" },
  { icon: Building2, label: "Properties", value: "6" },
  { icon: Users, label: "Landlords", value: "4" },
];

const PORTFOLIO_PROPERTIES: { name: string; landlords: number; thumb?: string }[] = [
  { name: "Kilimani Court", landlords: 2, thumb: PROPERTY_THUMBS.residential },
  { name: "Westlands House", landlords: 1 },
  { name: "Parklands Plaza", landlords: 1 },
];

/** Relative collection heights — illustrative, not measured data. */
const COLLECTION_TREND = [58, 64, 61, 74, 69, 83, 92] as const;
const COLLECTION_TICKS = ["P1", "P2", "P3", "P4", "P5", "P6", "P7"] as const;

function CollectionsTrend() {
  const latest = COLLECTION_TREND.length - 1;
  return (
    <div className="relative flex items-end gap-[6px] pt-6" role="img" aria-label="Illustrative collections trend">
      <div className="pointer-events-none absolute inset-x-0 top-6 bottom-4 flex flex-col justify-between" aria-hidden>
        <span className="border-t border-border/50" />
        <span className="border-t border-border/50" />
        <span className="border-t border-border/50" />
      </div>
      {COLLECTION_TREND.map((height, index) => (
        <div key={COLLECTION_TICKS[index]} className="relative z-[1] flex-1">
          {index === latest ? (
            <span
              className="absolute -top-6 left-1/2 -translate-x-1/2 rounded-full px-1.5 py-0.5 font-heading text-[10px] font-semibold leading-none"
              style={{ color: AGENCY_ACCENT, backgroundColor: "rgba(15,118,110,0.12)" }}
            >
              {height}%
            </span>
          ) : null}
          <div className="flex h-12 items-end">
            <div
              className={`w-full rounded-t-[3px] transition-colors duration-200 ${index === latest ? "" : "bg-navy-mid/25"}`}
              style={{
                height: `${height}%`,
                backgroundColor: index === latest ? AGENCY_ACCENT : undefined,
              }}
            />
          </div>
          <p className="mt-1 border-t border-border pt-1 text-center text-[8px] font-medium tracking-wide text-muted-foreground" aria-hidden>
            {COLLECTION_TICKS[index]}
          </p>
        </div>
      ))}
    </div>
  );
}

/** Compact agency portfolio preview — teal identity, navy labels. */
export function AgencyPortfolioPreview() {
  return (
    <figure className="rounded-[14px] border border-white/10 bg-card shadow-xl shadow-navy-deep/20">
      <div className="flex items-center justify-between gap-2 border-b border-border px-3.5 py-2.5">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Portfolio</p>
        <span
          className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
          style={{ color: AGENCY_ACCENT, backgroundColor: "rgba(15,118,110,0.12)", border: `1px solid rgba(15,118,110,0.3)` }}
        >
          Illustrative agency view
        </span>
      </div>
      <div className="p-3.5">
        <div className="mb-3 flex items-baseline justify-between gap-2 rounded-lg p-2.5" style={{ backgroundColor: "rgba(15,118,110,0.08)" }}>
          <p className="text-[11px] font-semibold text-foreground">Collected</p>
          <p className="font-heading text-lg font-bold tracking-tight" style={{ color: AGENCY_ACCENT }}>
            KES 2.1M
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
          <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Collection trend</p>
          <CollectionsTrend />
        </div>

        <div className="mt-3.5">
          <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Client portfolio</p>
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
                    {property.landlords === 1 ? "Managed for 1 landlord" : `Managed for ${property.landlords} landlords`}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>

      </div>
      <figcaption className="sr-only">
        Illustrative agency view. Sample figures only — not live customer data.
      </figcaption>
    </figure>
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

interface AgencyPortalShellProps {
  children: ReactNode;
}

export function AgencyPortalShell({ children }: AgencyPortalShellProps) {
  const { identity } = usePortalIdentity();
  return (
    <div className="relative min-h-screen bg-navy-deep" {...portalSurfaceProps("agency")}>
      <PortalIdentityBackdrop portal="agency" fallbackImage={PROPERTY_IMAGES.office} />

      <div className="relative mx-auto flex min-h-screen max-w-5xl flex-col px-4 sm:px-6 lg:px-8">
        <header className="flex items-center justify-between py-5">
          <Link to={PUBLIC_ROUTES.home} aria-label="CALQULUS home">
            <BrandMark size="nav" showWordmark subtitle={identity.shortName} inverse forcePlatform />
          </Link>
          <Link to={PUBLIC_ROUTES.home} className="text-xs font-medium text-white/60 transition-colors hover:text-white">
            Back to CALQULUS
          </Link>
        </header>

        <main className="grid flex-1 gap-8 pb-6 lg:grid-cols-[1.05fr_0.95fr] lg:gap-12">
          <div className="flex flex-col justify-center lg:col-start-1 lg:row-start-1">
            <div className="inline-flex items-center gap-2 self-start rounded-full border border-white/15 bg-white/[0.04] px-3 py-1.5">
              <Handshake className="h-3.5 w-3.5" style={{ color: AGENCY_ACCENT }} aria-hidden />
              <span className="text-[11px] font-semibold uppercase tracking-wider text-white/90">{identity.shortName} portal</span>
            </div>
            <h1 className="font-heading mt-5 max-w-md text-[1.9rem] font-bold leading-tight tracking-tight text-white sm:text-4xl">
              Run your client portfolio with control.
            </h1>
            <p className="mt-3 max-w-md text-sm leading-relaxed text-white/70 sm:text-[15px]">
              Manage properties, landlords, collections and revenue shares from one connected workspace.
            </p>
            <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2">
              {CAPABILITIES.map(({ icon: Icon, label }) => (
                <span key={label} className="inline-flex items-center gap-1.5 text-[13px] font-medium text-white/80">
                  <Icon className="h-[15px] w-[15px]" style={{ color: AGENCY_ACCENT }} aria-hidden />
                  {label}
                </span>
              ))}
            </div>
          </div>

          <div className="lg:col-start-2 lg:row-span-3 lg:row-start-1 lg:flex lg:flex-col lg:justify-center">
            <section className="rounded-[16px] border border-white/10 bg-card p-6 shadow-2xl shadow-black/25 sm:p-7" aria-label="Agency access">
              <div className="mb-5">
                <span className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1" style={{ borderColor: "rgba(15,118,110,0.3)", backgroundColor: "rgba(15,118,110,0.08)" }}>
                  <Handshake className="h-3 w-3" style={{ color: AGENCY_ACCENT }} aria-hidden />
                  <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: AGENCY_ACCENT }}>
                    Agency
                  </span>
                </span>
                <h2 className="font-heading mt-3 text-2xl font-bold tracking-tight text-foreground">Welcome back</h2>
                <p className="mt-1 text-sm text-muted-foreground">Sign in to manage your client portfolio.</p>
              </div>
              {children}
            </section>
          </div>

          <div className="lg:col-start-1 lg:row-start-2 lg:row-end-4">
            <AgencyPortfolioPreview />
            <PortalSwitcher currentId="agency" />
          </div>
        </main>

        <footer className="pb-5">
          <CompactPortalFooter />
        </footer>
      </div>
    </div>
  );
}
