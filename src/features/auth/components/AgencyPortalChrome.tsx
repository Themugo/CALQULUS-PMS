import type { ReactNode } from "react";
import { BarChart3, BadgeDollarSign, BriefcaseBusiness, Building2, ShieldCheck, UsersRound } from "lucide-react";
import { Link } from "react-router-dom";
import { BrandMark } from "@/shared/components/branding/BrandMark";
import { PROPERTY_IMAGES } from "@/features/marketing/propertyImages";
import { PUBLIC_ROUTES } from "@/features/marketing/publicConfig";
import { usePortalIdentity } from "@/core/product/PortalIdentityProvider";
import { PortalLoginCard } from "@/features/auth/components/PortalLoginScreen";

/**
 * Agency portal entry identity. This is the dedicated agency surface, not a
 * generic login wrapper: sharp CALQULUS navy, business/portfolio imagery,
 * role-specific benefits, and the shared secure authentication card.
 *
 * Keep the accent identical to the homepage Agency card so the transition
 * from the public site to the portal feels intentional.
 */
export const AGENCY_ACCENT = "#0B2742";

interface AgencyPortalShellProps {
  children: ReactNode;
}

const FEATURES = [
  { icon: UsersRound, label: "Clients", text: "Keep every landlord relationship organized and visible." },
  { icon: Building2, label: "Portfolios", text: "Manage buildings, units and property performance together." },
  { icon: BadgeDollarSign, label: "Collections", text: "Track collections, outstanding balances and revenue share." },
] as const;

export function AgencyPortalShell({ children }: AgencyPortalShellProps) {
  const { identities } = usePortalIdentity();
  const identity = identities.agency;
  const backgroundImage = identity.backgroundImageUrl || PROPERTY_IMAGES.commercial;

  return (
    <div className="min-h-screen w-full bg-background text-foreground lg:grid lg:grid-cols-[1.14fr_0.86fr]">
      {/* Agency identity / value panel */}
      <section className="relative hidden min-h-screen overflow-hidden lg:flex lg:flex-col">
        <img
          src={backgroundImage}
          alt=""
          loading="eager"
          decoding="async"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-[linear-gradient(135deg,#0B2742F4_0%,#123C5FD8_48%,#0B2742EC_100%)]" aria-hidden />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_82%_12%,rgba(95,221,211,0.18),transparent_28%),radial-gradient(circle_at_18%_88%,rgba(255,255,255,0.08),transparent_24%)]" aria-hidden />

        <div className="relative z-10 flex min-h-screen flex-col p-8 xl:p-12">
          <header className="flex items-center justify-between gap-4">
            <Link to={PUBLIC_ROUTES.home} aria-label="CALQULUS home">
              <BrandMark size="nav" showWordmark subtitle="PMS" inverse forcePlatform />
            </Link>
            <Link
              to={PUBLIC_ROUTES.home}
              className="rounded-full border border-white/15 bg-white/10 px-4 py-2 text-[10px] font-semibold text-white/90 backdrop-blur-sm transition hover:border-white/25 hover:bg-white/15"
            >
              Back to CALQULUS
            </Link>
          </header>

          <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center py-10">
            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3.5 py-2 text-[10px] font-bold tracking-[0.22em] text-white/90 backdrop-blur-md">
              <BriefcaseBusiness className="h-4 w-4 text-[#63D2C5]" aria-hidden />
              AGENCY PORTAL
            </div>

            <h1 className="mt-7 max-w-2xl font-heading text-[clamp(2.9rem,5.2vw,5rem)] font-semibold leading-[0.94] tracking-[-0.055em] text-white">
              Run your client portfolio with confidence.
            </h1>
            <p className="mt-6 max-w-xl text-base leading-7 text-white/78 sm:text-[17px]">
              {identity.tagline || "Manage clients, portfolios, collections and agency operations from one connected workspace."}
            </p>

            <div className="mt-8 inline-flex w-fit items-center gap-2.5 rounded-xl border border-white/12 bg-white/10 px-4 py-3 text-xs font-semibold text-white/85 backdrop-blur-md">
              <ShieldCheck className="h-4 w-4 text-[#63D2C5]" aria-hidden />
              Secure access to your agency workspace
            </div>

            <div className="mt-9 grid gap-3 sm:grid-cols-3">
              {FEATURES.map(({ icon: Icon, label, text }) => (
                <div key={label} className="min-w-0 rounded-2xl border border-white/12 bg-white/10 p-4 backdrop-blur-md">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/15 bg-white/10">
                    <Icon className="h-4.5 w-4.5 text-[#63D2C5]" aria-hidden />
                  </div>
                  <p className="mt-3 text-xs font-bold text-white">{label}</p>
                  <p className="mt-1 text-[10px] leading-4.5 text-white/62">{text}</p>
                </div>
              ))}
            </div>
          </div>

          <footer className="flex items-center justify-between gap-4 border-t border-white/10 pt-4 text-[10px] text-white/50">
            <span>© 2026 CALQULUS Limited</span>
            <span className="inline-flex items-center gap-2"><BarChart3 className="h-3.5 w-3.5 text-[#63D2C5]" aria-hidden /> Portfolio operations</span>
          </footer>
        </div>
      </section>

      {/* Mobile identity strip */}
      <section className="relative overflow-hidden lg:hidden">
        <div className="relative h-[230px] overflow-hidden">
          <img src={backgroundImage} alt="" loading="eager" className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-[linear-gradient(135deg,#0B2742EF_0%,#123C5FD8_65%,#0B2742EE_100%)]" aria-hidden />
          <div className="relative flex h-full flex-col justify-between p-4 sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <Link to={PUBLIC_ROUTES.home} aria-label="CALQULUS home">
                <BrandMark size="nav" showWordmark subtitle="PMS" inverse forcePlatform />
              </Link>
              <Link to={PUBLIC_ROUTES.home} className="rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[9px] font-semibold text-white/90 backdrop-blur-sm">
                Back to CALQULUS
              </Link>
            </div>
            <div>
              <div className="inline-flex items-center gap-2 text-[9px] font-bold tracking-[0.22em] text-white/85"><BriefcaseBusiness className="h-3.5 w-3.5 text-[#63D2C5]" aria-hidden /> AGENCY PORTAL</div>
              <h1 className="mt-2 max-w-xl font-heading text-3xl font-semibold leading-tight tracking-[-0.04em] text-white">Run your client portfolio with confidence.</h1>
            </div>
          </div>
        </div>
        <div className="bg-[#F3F7FB] px-4 py-3 sm:px-6">
          <p className="text-xs leading-5 text-slate-600">{identity.tagline || "Manage clients, portfolios, collections and agency operations from one connected workspace."}</p>
          <div className="mt-2 inline-flex items-center gap-2 text-[10px] font-semibold text-[#0B2742]"><ShieldCheck className="h-3.5 w-3.5 text-[#2F9E91]" aria-hidden /> Secure agency access</div>
        </div>
      </section>

      {/* Authentication panel */}
      <section className="flex min-h-[calc(100vh-286px)] items-center justify-center bg-[linear-gradient(180deg,#F8FBFD_0%,#FFFFFF_100%)] px-4 py-7 sm:px-7 sm:py-9 lg:min-h-screen lg:px-10 lg:py-12 xl:px-14">
        <div className="w-full max-w-md">
          <div className="mb-4 lg:hidden">
            <p className="text-[10px] font-bold tracking-[0.2em] text-[#0B2742]">AGENCY WORKSPACE</p>
            <h2 className="mt-1 font-heading text-2xl font-semibold tracking-[-0.03em] text-slate-900">Welcome back</h2>
            <p className="mt-1 text-xs leading-5 text-slate-500">Sign in to continue managing your clients and portfolio.</p>
          </div>
          {children}
          <div className="mt-4 rounded-xl border border-[#0B2742]/10 bg-[#0B2742]/[0.035] px-4 py-3 text-center text-[10px] leading-4 text-slate-500">
            <span className="font-semibold text-[#0B2742]">Agency workspace</span> · portfolio operations, client service and collections in one place.
          </div>
        </div>
      </section>
    </div>
  );
}
