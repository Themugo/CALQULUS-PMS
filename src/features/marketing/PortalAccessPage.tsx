import { useMemo } from "react";
import { ArrowLeft, ArrowRight, Building2, Home, Settings2, TrendingUp, UsersRound } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { BrandMark } from "@/shared/components/branding/BrandMark";
import { PublicShell } from "@/features/marketing/components/PublicShell";
import { usePublicSiteConfig } from "@/features/marketing/hooks/usePublicSiteConfig";
import { DEFAULT_PUBLIC_SITE_CONFIG, type PublicSitePortal } from "@/features/marketing/publicSiteConfig";
import { PUBLIC_ROUTES } from "@/features/marketing/publicConfig";
import { PROPERTY_IMAGES } from "@/features/marketing/propertyImages";
import { cn } from "@/shared/lib/utils";
import { usePortalIdentity } from "@/core/product/PortalIdentityProvider";
import { Button } from "@/shared/components/ui/button";

const PORTAL_META = {
  agency: {
    icon: UsersRound,
    gradient: "from-[#123FB7] via-[#1658D6] to-transparent",
    accent: "#123FB7",
    features: ["Clients", "Portfolios", "Opportunities"],
    signin: PUBLIC_ROUTES.agencyLogin,
    signup: PUBLIC_ROUTES.agencyLogin,
    signinLabel: "Continue to Agency",
    signupLabel: "Continue to Agency",
  },
  manager: {
    icon: Settings2,
    gradient: "from-[#356FE5] via-[#4B78DD] to-transparent",
    accent: "#356FE5",
    features: ["Operations", "Maintenance", "Compliance"],
    signin: PUBLIC_ROUTES.managerSignIn,
    signup: PUBLIC_ROUTES.managerSignUp,
    signinLabel: "Continue to Manager",
    signupLabel: "Create manager account",
  },
  landlord: {
    icon: TrendingUp,
    gradient: "from-[#2F9B74] via-[#46B48F] to-transparent",
    accent: "#2F9B74",
    features: ["Earnings", "Properties", "Insights"],
    signin: PUBLIC_ROUTES.landlordLogin,
    signup: PUBLIC_ROUTES.landlordLogin,
    signinLabel: "Continue to Landlord",
    signupLabel: "Continue to Landlord",
  },
  tenant: {
    icon: Home,
    gradient: "from-[#7C5FD3] via-[#936EE9] to-transparent",
    accent: "#7C5FD3",
    features: ["Payments", "Requests", "Updates"],
    signin: PUBLIC_ROUTES.tenantLogin,
    signup: "/tenant/signup",
    signinLabel: "Continue to Tenant",
    signupLabel: "Create tenant account",
  },
} as const;

type PortalId = keyof typeof PORTAL_META;
type AccessMode = "signin" | "signup";

function PortalCard({ portal, mode, identities }: { portal: PublicSitePortal; mode: AccessMode; identities: Record<keyof typeof PORTAL_META, { primaryHex?: string }> }) {
  const meta = PORTAL_META[portal.id];
  const Icon = meta.icon;
  const href = mode === "signup" ? meta.signup : meta.signin;
  const actionLabel = mode === "signup" ? meta.signupLabel : meta.signinLabel;
  const accent = identities[portal.id]?.primaryHex || meta.accent;
  const image = portal.image || (
    portal.id === "agency"
      ? PROPERTY_IMAGES.commercial
      : portal.id === "manager"
        ? PROPERTY_IMAGES.office
        : PROPERTY_IMAGES.residential
  );

  return (
    <article className="group relative min-w-0 overflow-hidden rounded-[22px] border border-slate-200/90 bg-white shadow-[0_14px_34px_rgba(17,43,73,0.12)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_22px_46px_rgba(17,43,73,0.18)]">
      <div className="relative h-[185px] overflow-hidden sm:h-[205px]">
        <img src={image} alt="" className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-105" />
        <div className="absolute inset-y-0 left-0 z-10 w-1.5" style={{ backgroundColor: accent }} aria-hidden />
        <div className="absolute inset-y-0 left-0 w-[24%] opacity-75" style={{ background: `linear-gradient(90deg, ${accent} 0%, ${accent}B0 48%, transparent 100%)` }} />
        <div className="absolute inset-0 bg-gradient-to-r from-black/5 via-transparent to-black/20" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
        <div className="relative flex h-full flex-col justify-between p-4 sm:p-5">
          <div className="flex items-start justify-between gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-full border border-white/45 bg-white/12 text-white shadow-sm backdrop-blur-sm">
              <Icon className="h-5 w-5" aria-hidden />
            </span>
            <span className="rounded-full border border-white/25 bg-white/10 px-2.5 py-1 text-[10px] font-bold tracking-[0.18em] text-white/90 backdrop-blur-sm">
              {portal.eyebrow}
            </span>
          </div>
          <div className="min-w-0 text-white">
            <h2 className="font-heading text-[clamp(1.25rem,2vw,1.55rem)] font-semibold leading-tight tracking-[-0.025em]">{portal.title.replace(/ Portal$/i, "")}</h2>
            <p className="mt-2 max-w-[30rem] text-sm leading-5.5 text-white/92">{portal.description}</p>
          </div>
        </div>
      </div>
      <div className="border-t border-slate-200/70 bg-white p-4 sm:p-5">
        <div className="flex flex-wrap gap-1.5">
          {meta.features.map((feature) => (
            <span key={feature} className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-600">
              {feature}
            </span>
          ))}
        </div>
        <Button asChild className="mt-4 h-10 w-full rounded-xl text-sm font-semibold text-white" style={{ backgroundColor: accent }}>
          <Link to={href}>
            {actionLabel}
            <ArrowRight className="ml-1.5 h-4 w-4" aria-hidden />
          </Link>
        </Button>
      </div>
    </article>
  );
}

export default function PortalAccessPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { data } = usePublicSiteConfig();
  const { identities } = usePortalIdentity();
  const config = data ?? DEFAULT_PUBLIC_SITE_CONFIG;
  const mode: AccessMode = new URLSearchParams(location.search).get("mode") === "signup" ? "signup" : "signin";

  const portals = useMemo(() => {
    const fallback = DEFAULT_PUBLIC_SITE_CONFIG.portals;
    const source = config.portals.filter((portal) => portal.enabled);
    const items = source.length ? source : fallback;
    const ordered = ["agency", "manager", "landlord", "tenant"] as PortalId[];
    return ordered.map((id) => items.find((portal) => portal.id === id)).filter(Boolean) as PublicSitePortal[];
  }, [config.portals]);

  const goBack = () => {
    if (window.history.length > 1) navigate(-1);
    else navigate(PUBLIC_ROUTES.home);
  };

  return (
    <PublicShell>
      <section className="relative overflow-hidden bg-[radial-gradient(circle_at_10%_0%,rgba(18,63,183,0.10),transparent_30%),linear-gradient(180deg,#F4F8FD_0%,#FFFFFF_45%,#F7FAFD_100%)] py-8 sm:py-12 lg:py-16">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_90%_18%,rgba(47,155,116,0.08),transparent_28%)]" aria-hidden />
        <div className="relative mx-auto w-full max-w-[1180px] px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={goBack}
              className="inline-flex min-h-10 items-center gap-2 rounded-full border border-slate-200 bg-white/85 px-3.5 py-2 text-sm font-semibold text-slate-700 shadow-sm backdrop-blur transition hover:border-primary/25 hover:text-primary"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden />
              Back to previous page
            </button>
            <Button asChild variant="outline" className="rounded-full border-slate-200 bg-white/85 text-slate-700 hover:text-primary">
              <Link to={PUBLIC_ROUTES.home}>Home</Link>
            </Button>
          </div>

          <div className="mx-auto mt-10 max-w-3xl text-center sm:mt-12">
            <BrandMark size="md" showWordmark className="mx-auto w-fit" />
            <p className="mt-6 text-xs font-bold tracking-[0.28em] text-primary">CALQULUS SECURE ACCESS</p>
            <h1 className="mt-3 font-heading text-[clamp(2.2rem,5vw,4rem)] font-semibold leading-[1.02] tracking-[-0.05em] text-navy-deep">
              {mode === "signup" ? "Choose how you want to get started." : "Choose your portal to sign in."}
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">
              {mode === "signup"
                ? "Select your role and we’ll take you to the right CALQULUS experience — without sending you through the wrong sign-in page."
                : "Select your role and continue to the secure workspace designed for the way you manage, own, represent or rent property."
              }
            </p>
          </div>

          <div className="mx-auto mt-10 grid max-w-6xl gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {portals.map((portal) => <PortalCard key={portal.id} portal={portal} mode={mode} identities={identities} />)}
          </div>

          <div className="mx-auto mt-8 flex max-w-3xl flex-col items-center justify-center gap-2 text-center text-xs text-slate-500 sm:flex-row">
            <span className="inline-flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-primary" />Secure role-based access</span>
            <span className="hidden sm:inline">·</span>
            <span>One connected property platform</span>
            <span className="hidden sm:inline">·</span>
            <span>Need help choosing? Return home.</span>
          </div>
        </div>
      </section>
    </PublicShell>
  );
}
