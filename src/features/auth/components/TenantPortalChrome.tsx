import type { CSSProperties, ComponentType, ReactNode } from "react";
import { Link } from "react-router-dom";
import {
  ChevronRight,
  CreditCard,
  FileText,
  Home,
  LockKeyhole,
  Wallet,
  Wrench,
} from "lucide-react";
import { BrandMark } from "@/shared/components/branding/BrandMark";
import { PUBLIC_ROUTES } from "@/features/marketing/publicConfig";
import { PROPERTY_IMAGES, PROPERTY_THUMBS } from "@/features/marketing/propertyImages";
import { PortalIdentityBackdrop } from "@/features/auth/components/PortalIdentityBackdrop";
import { usePortalIdentity } from "@/core/product/PortalIdentityProvider";
import { portalSurfaceProps } from "@/core/design";

/**
 * Tenant portal entry chrome — residential home service, not an operations
 * desk. Cyan accent; navy + white stay dominant. Owns background, header,
 * identity, home preview, switcher and legal footer.
 */

const TENANT_ACCENT = "#0284C7";
/** Small text on light surfaces — #0284C7 only reaches 4.1:1; this reaches ~6:1. */
const TENANT_ACCENT_DEEP = "#0369A1";

const CAPABILITIES: { icon: ComponentType<{ className?: string; style?: CSSProperties }>; label: string }[] = [
  { icon: Wallet, label: "Rent" },
  { icon: CreditCard, label: "Payments" },
  { icon: Wrench, label: "Maintenance" },
  { icon: FileText, label: "Lease" },
  { icon: Home, label: "Property services" },
];

const PORTALS: { label: string; href: string; accent: string; current?: boolean }[] = [
  { label: "Manager", href: PUBLIC_ROUTES.managerSignIn, accent: "#2F6FED" },
  { label: "Landlord", href: PUBLIC_ROUTES.landlordLogin, accent: "#0F8A6A" },
  { label: "Agency", href: PUBLIC_ROUTES.agencyLogin, accent: "#0F766E" },
  { label: "Tenant", href: PUBLIC_ROUTES.tenantLogin, accent: TENANT_ACCENT, current: true },
];

/** One home, one rent obligation, one repair, one lease — illustrative, not live records. */
export function TenantHomePreview() {
  return (
    <figure className="rounded-[14px] border border-white/10 bg-card shadow-xl shadow-navy-deep/20">
      <div className="flex items-center justify-between gap-2 border-b border-border px-3.5 py-2.5">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">My home</p>
        <span
          className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
          style={{ color: TENANT_ACCENT_DEEP, backgroundColor: "rgba(2,132,199,0.1)", border: "1px solid rgba(2,132,199,0.3)" }}
        >
          Illustrative tenant view
        </span>
      </div>
      <div className="p-3.5">
        {/* Home identity — recognition first */}
        <div className="overflow-hidden rounded-lg border border-border bg-card">
          <img
            src={PROPERTY_THUMBS.residential}
            alt="Kilimani Court building"
            loading="lazy"
            decoding="async"
            className="h-20 w-full object-cover"
          />
          <div className="flex items-center justify-between gap-2 p-2.5">
            <div className="min-w-0">
              <p className="truncate text-xs font-semibold text-foreground">Kilimani Court</p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">Apartment 3B · Tenant since 2025</p>
            </div>
            <span className="shrink-0 rounded-full bg-success/15 px-2 py-0.5 text-[10px] font-semibold text-success">
              Lease active
            </span>
          </div>
        </div>

        {/* Next rent — the number a tenant looks for first */}
        <div
          className="mt-3 flex items-center justify-between gap-2 rounded-lg p-2.5"
          style={{ backgroundColor: "rgba(2,132,199,0.08)" }}
        >
          <div>
            <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Next rent</p>
            <p className="mt-0.5 font-heading text-lg font-bold leading-none tracking-tight text-foreground">
              KES 35,000
            </p>
            <p className="mt-1 text-[11px] text-muted-foreground">Due 01 Sep</p>
          </div>
          <span
            className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
            style={{ color: TENANT_ACCENT_DEEP, backgroundColor: "rgba(2,132,199,0.12)" }}
          >
            Upcoming
          </span>
        </div>

        {/* Maintenance + lease — compact pair */}
        <div className="mt-3 grid grid-cols-2 gap-2">
          <div className="rounded-lg border border-border bg-secondary-background p-2.5">
            <p className="text-[9px] font-medium uppercase tracking-wide text-muted-foreground">Maintenance</p>
            <p className="mt-1 font-heading text-sm font-semibold leading-none text-foreground">1 open request</p>
            <p className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground">
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-warning" aria-hidden />
              Leaking tap · In progress
            </p>
          </div>
          <div className="rounded-lg border border-border bg-secondary-background p-2.5">
            <p className="text-[9px] font-medium uppercase tracking-wide text-muted-foreground">Lease</p>
            <p className="mt-1 font-heading text-sm font-semibold leading-none text-foreground">Active</p>
            <p className="mt-1 text-[11px] text-muted-foreground">Expires 31 Dec 2026</p>
          </div>
        </div>

        <div className="mt-3 flex items-center gap-2 rounded-lg border border-border bg-secondary-background px-2.5 py-2">
          <Wrench className="h-3.5 w-3.5 shrink-0" style={{ color: TENANT_ACCENT }} aria-hidden />
          <p className="text-[11px] leading-relaxed text-muted-foreground">
            Need something fixed? Submit and track maintenance requests through your tenant portal.
          </p>
        </div>

        <div className="mt-2 flex items-center gap-2 px-1 py-1.5">
          <LockKeyhole className="h-3.5 w-3.5 shrink-0 text-navy-mid" aria-hidden />
          <p className="text-[11px] leading-relaxed text-muted-foreground">
            Secure tenant access — your account only shows information associated with your tenancy.
          </p>
        </div>
      </div>
      <figcaption className="sr-only">
        Illustrative tenant view. Sample home, rent, repair and lease only — not live customer records.
      </figcaption>
    </figure>
  );
}

function PortalSwitcher() {
  return (
    <nav aria-label="CALQULUS portals" className="mt-6">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-white/40">CALQULUS portals</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {PORTALS.map((portal) =>
          portal.current ? (
            <span
              key={portal.href}
              aria-current="page"
              className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold text-white"
              style={{ border: "1px solid rgba(2,132,199,0.55)", backgroundColor: "rgba(2,132,199,0.18)" }}
            >
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: portal.accent }} aria-hidden />
              {portal.label}
            </span>
          ) : (
            <Link
              key={portal.href}
              to={portal.href}
              className="group inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-medium text-white/70 transition-colors hover:bg-white/10 hover:text-white"
            >
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: portal.accent }} aria-hidden />
              {portal.label}
              <ChevronRight className="h-3 w-3 text-white/30 transition-transform group-hover:translate-x-0.5" aria-hidden />
            </Link>
          ),
        )}
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

interface TenantPortalShellProps {
  children: ReactNode;
}

export function TenantPortalShell({ children }: TenantPortalShellProps) {
  const { identity } = usePortalIdentity();
  return (
    <div className="relative min-h-screen bg-navy-deep" {...portalSurfaceProps("tenant")}>
      {/* Residential imagery behind a deep-navy veil — home context, not poster. */}
      <PortalIdentityBackdrop portal="tenant" fallbackImage={PROPERTY_IMAGES.residential} />

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
          {/* Identity — first on mobile and desktop col 1 */}
          <div className="flex flex-col justify-center lg:col-start-1 lg:row-start-1">
            <div className="inline-flex items-center gap-2 self-start rounded-full border border-white/15 bg-white/[0.04] px-3 py-1.5">
              <Home className="h-3.5 w-3.5" style={{ color: TENANT_ACCENT }} aria-hidden />
              <span className="text-[11px] font-semibold uppercase tracking-wider text-white/90">Tenant portal</span>
            </div>
            <h1 className="font-heading mt-5 max-w-md text-[1.9rem] font-bold leading-tight tracking-tight text-white sm:text-4xl">
              Your home, connected.
            </h1>
            <p className="mt-3 max-w-md text-sm leading-relaxed text-white/70 sm:text-[15px]">
              Rent, payments, maintenance and lease information — all in one secure place.
            </p>
            <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2">
              {CAPABILITIES.map(({ icon: Icon, label }) => (
                <span key={label} className="inline-flex items-center gap-1.5 text-[13px] font-medium text-white/80">
                  <Icon className="h-[15px] w-[15px]" style={{ color: TENANT_ACCENT }} aria-hidden />
                  {label}
                </span>
              ))}
            </div>
          </div>

          {/* Auth card — second on mobile, spans identity+preview rows on desktop */}
          <div className="lg:col-start-2 lg:row-span-3 lg:row-start-1 lg:flex lg:flex-col lg:justify-center">
            <section className="rounded-[16px] border border-white/10 bg-card p-6 shadow-2xl shadow-black/25 sm:p-7" aria-label="Tenant access">
              <div className="mb-5">
                <span
                  className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1"
                  style={{ borderColor: "rgba(2,132,199,0.3)", backgroundColor: "rgba(2,132,199,0.08)" }}
                >
                  <Home className="h-3 w-3" style={{ color: TENANT_ACCENT }} aria-hidden />
                  <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: TENANT_ACCENT_DEEP }}>
                    Tenant
                  </span>
                </span>
                <h2 className="font-heading mt-3 text-2xl font-bold tracking-tight text-foreground">Welcome home.</h2>
                <p className="mt-1 text-sm text-muted-foreground">Sign in to manage your home and property services.</p>
              </div>
              {children}
            </section>
          </div>

          {/* Preview — third on mobile, under identity on desktop */}
          <div className="lg:col-start-1 lg:row-start-2 lg:row-end-4">
            <TenantHomePreview />
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
