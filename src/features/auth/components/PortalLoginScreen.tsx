import type { ComponentType, ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, CheckCircle2, Eye, EyeOff, Lock, Mail } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Checkbox } from "@/shared/components/ui/checkbox";
import { BrandMark } from "@/shared/components/branding/BrandMark";
import { PUBLIC_ROUTES } from "@/features/marketing/publicConfig";
import { portalSurfaceProps } from "@/core/design";
import ForgotPasswordDialog from "@/features/auth/components/ForgotPasswordDialog";

/** Multicolor Google "G" mark. */
export function GoogleGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden>
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.9 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 8 3l5.7-5.7C34.6 6.1 29.6 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.7-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 15.9 18.9 13 24 13c3.1 0 5.8 1.1 8 3l5.7-5.7C34.6 6.1 29.6 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.5 0 10.4-2.1 14.1-5.5l-6.5-5.5C29.6 34.7 26.9 36 24 36c-5.3 0-9.6-3.1-11.3-7.6l-6.6 5.1C9.6 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.2 4.2-4.1 5.6l6.5 5.5C39.9 37.4 44 31.6 44 24c0-1.3-.1-2.7-.4-3.5z" />
    </svg>
  );
}

type PortalId = "manager" | "landlord" | "tenant" | "agency";

export interface PortalFeature {
  label: string;
  icon: ComponentType<{ className?: string }>;
}

interface PortalLoginLayoutProps {
  portalId: PortalId;
  accentHex: string;
  backgroundImage: string;
  badgeIcon: ComponentType<{ className?: string }>;
  portalName: string;
  description: string;
  features?: PortalFeature[];
  eyebrow?: string;
  trustLabel?: string;
  children: ReactNode;
}

/**
 * Shared premium portal shell. Every portal owns its accent and photography,
 * but the structure remains deliberately consistent: full-bleed image, themed
 * overlay, premium identity zone, floating authentication card and compact footer.
 */
export function PortalLoginLayout({
  portalId,
  accentHex,
  backgroundImage,
  badgeIcon: BadgeIcon,
  portalName,
  description,
  features = [],
  eyebrow,
  trustLabel = "Secure access · Encrypted · Protected",
  children,
}: PortalLoginLayoutProps) {
  return (
    <div
      className="relative min-h-screen w-full overflow-hidden bg-slate-950 text-white"
      {...portalSurfaceProps(portalId)}
    >
      <div className="absolute inset-0" aria-hidden>
        <img
          src={backgroundImage}
          alt=""
          loading="eager"
          decoding="async"
          className="h-full w-full object-cover object-center"
        />
        <div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(90deg, ${accentHex}F5 0%, ${accentHex}D9 29%, ${accentHex}A8 52%, ${accentHex}78 72%, rgba(4,13,24,0.54) 100%)`,
          }}
        />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_76%_18%,rgba(255,255,255,0.18),transparent_22%),radial-gradient(circle_at_18%_82%,rgba(255,255,255,0.08),transparent_28%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(0deg,rgba(3,12,22,0.42),transparent_28%,rgba(3,12,22,0.18))]" />
      </div>

      <div className="relative z-10 flex min-h-screen flex-col">
        <header className="flex items-center justify-between gap-4 px-4 py-4 sm:px-7 sm:py-5 lg:px-10 xl:px-14">
          <Link to={PUBLIC_ROUTES.home} aria-label="CALQULUS home" className="shrink-0">
            <BrandMark size="nav" showWordmark subtitle="PMS" inverse forcePlatform />
          </Link>
          <Link
            to={PUBLIC_ROUTES.home}
            className="rounded-full border border-white/20 bg-white/10 px-3.5 py-2 text-[10px] font-semibold tracking-wide text-white/90 shadow-lg backdrop-blur-md transition hover:border-white/35 hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 sm:px-4"
          >
            Back to CALQULUS
          </Link>
        </header>

        <main className="flex flex-1 items-center px-4 pb-5 sm:px-7 sm:pb-7 lg:px-10 lg:pb-10 xl:px-14">
          <div className="mx-auto grid w-full max-w-[1500px] items-center gap-7 lg:grid-cols-[minmax(0,1fr)_minmax(390px,470px)] xl:gap-14">
            <section className="flex min-h-[500px] items-center px-1 py-8 sm:px-4 lg:min-h-[calc(100vh-124px)] lg:py-10">
              <div className="min-w-0 max-w-3xl">
                <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3.5 py-2 text-[9px] font-bold tracking-[0.24em] text-white/92 shadow-lg backdrop-blur-md sm:text-[10px]">
                  <BadgeIcon className="h-4 w-4" style={{ color: "#FFFFFF" } as never} aria-hidden />
                  {eyebrow ?? `${portalName.toUpperCase()} PORTAL`}
                </div>

                <h1 className="mt-6 max-w-3xl font-heading text-[clamp(2.8rem,6vw,6rem)] font-semibold leading-[0.92] tracking-[-0.055em] text-white drop-shadow-[0_3px_22px_rgba(0,0,0,0.26)]">
                  <span className="block">{portalName}</span>
                  <span className="mt-1 block" style={{ color: "rgba(255,255,255,0.86)" }}>Portal</span>
                </h1>
                <div className="mt-6 h-[2px] w-10 rounded-full" style={{ backgroundColor: "rgba(255,255,255,0.8)" }} />

                <p className="mt-6 max-w-2xl text-base leading-7 text-white/84 sm:text-lg sm:leading-8">
                  {description}
                </p>

                {features.length ? (
                  <div className="mt-7 grid max-w-3xl gap-2.5 sm:grid-cols-3">
                    {features.map(({ icon: Icon, label }) => (
                      <div
                        key={label}
                        className="min-w-0 rounded-2xl border border-white/14 bg-white/10 p-3.5 shadow-lg backdrop-blur-md"
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/18 bg-white/10">
                            <Icon className="h-4.5 w-4.5 text-white" aria-hidden />
                          </span>
                          <span className="text-xs font-bold text-white">{label}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : null}

                <div className="mt-7 inline-flex max-w-full items-center gap-2 rounded-xl border border-white/15 bg-white/9 px-3.5 py-2.5 text-[10px] font-semibold text-white/82 shadow-lg backdrop-blur-md">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-white" aria-hidden />
                  <span className="truncate">{trustLabel}</span>
                </div>
              </div>
            </section>

            <aside className="relative flex items-center justify-center lg:py-7" aria-label={`${portalName} sign in`}>
              <div className="absolute inset-x-7 inset-y-10 rounded-[40px] bg-white/12 blur-3xl" aria-hidden />
              <div className="relative w-full max-w-[470px] rounded-[28px] border border-white/20 bg-white/95 p-1 shadow-[0_30px_100px_rgba(2,12,22,0.45)] backdrop-blur-xl">
                <div className="rounded-[24px] border border-slate-200/80 bg-white p-2 sm:p-3">
                  {children}
                </div>
                <div className="px-5 pb-4 pt-3 text-center text-[10px] leading-4 text-slate-500">
                  <span className="font-semibold" style={{ color: accentHex }}>CALQULUS {portalName} workspace</span>
                  {" · "}Your secure portal for the people, properties and work that matter.
                </div>
              </div>
            </aside>
          </div>
        </main>

        <footer className="flex items-center justify-between gap-4 border-t border-white/10 px-4 py-3 text-[9px] text-white/55 sm:px-7 lg:px-10 xl:px-14">
          <span>© 2026 CALQULUS Limited</span>
          <span className="hidden sm:inline">Real Estate. Simplified.</span>
          <span className="tracking-[0.14em]">PEOPLE · PROPERTIES · PROGRESS</span>
        </footer>
      </div>
    </div>
  );
}

interface PortalLoginCardProps {
  accentHex: string;
  accentTextHex?: string;
  portalLabel: string;
  email: string;
  onEmailChange: (value: string) => void;
  emailPlaceholder?: string;
  password: string;
  onPasswordChange: (value: string) => void;
  showPassword: boolean;
  onToggleShowPassword: () => void;
  rememberMe: boolean;
  onRememberMeChange: (value: boolean) => void;
  onSubmit: (e: React.FormEvent) => void;
  isSubmitting: boolean;
  submitLabel?: string;
  submittingLabel?: string;
  onGoogleSignIn: () => void;
  isGoogleSubmitting?: boolean;
  forgotPasswordVariant?: "tenant";
  footNote?: ReactNode;
}

export function PortalLoginCard({
  accentHex,
  accentTextHex,
  portalLabel,
  email,
  onEmailChange,
  emailPlaceholder = "you@example.com",
  password,
  onPasswordChange,
  showPassword,
  onToggleShowPassword,
  rememberMe,
  onRememberMeChange,
  onSubmit,
  isSubmitting,
  submitLabel = "Login",
  submittingLabel = "Signing in…",
  onGoogleSignIn,
  isGoogleSubmitting = false,
  forgotPasswordVariant,
  footNote,
}: PortalLoginCardProps) {
  const linkColor = accentTextHex || accentHex;
  return (
    <section className="rounded-[22px] border border-slate-200 bg-white p-5 text-slate-900 shadow-[0_12px_45px_rgba(10,34,56,0.08)] sm:p-6" aria-label={`${portalLabel} sign in`}>
      <h2 className="font-heading text-2xl font-bold tracking-tight text-slate-950">Welcome Back!</h2>
      <p className="mt-1 text-sm text-slate-500">Sign in to your {portalLabel} portal</p>

      <form onSubmit={onSubmit} className="mt-5 space-y-3.5">
        <div className="space-y-1.5">
          <Label htmlFor="portal-login-email" className="text-xs font-semibold text-slate-700">Email address</Label>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden />
            <Input id="portal-login-email" type="email" placeholder={emailPlaceholder} value={email} onChange={(e) => onEmailChange(e.target.value)} required className="h-11 border-slate-200 bg-white pl-10 text-sm text-slate-900 placeholder:text-slate-400 focus-visible:ring-2" />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="portal-login-password" className="text-xs font-semibold text-slate-700">Password</Label>
          <div className="relative">
            <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden />
            <Input id="portal-login-password" type={showPassword ? "text" : "password"} placeholder="••••••••" value={password} onChange={(e) => onPasswordChange(e.target.value)} required className="h-11 border-slate-200 bg-white pl-10 pr-11 text-sm text-slate-900 placeholder:text-slate-400" />
            <button type="button" onClick={onToggleShowPassword} className="absolute right-1.5 top-1/2 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2" aria-label={showPassword ? "Hide password" : "Show password"} aria-pressed={showPassword}>
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3">
          <label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-slate-700">
            <Checkbox checked={rememberMe} onCheckedChange={(checked) => onRememberMeChange(checked === true)} aria-label="Remember me" />
            Remember me
          </label>
          <ForgotPasswordDialog variant={forgotPasswordVariant} trigger={<button type="button" className="text-xs font-semibold hover:underline" style={{ color: linkColor }}>Forgot password?</button>} />
        </div>

        <Button type="submit" disabled={isSubmitting} className="h-11 w-full rounded-xl text-sm font-semibold text-white shadow-sm transition hover:brightness-105" style={{ backgroundColor: accentHex }}>
          {isSubmitting ? <span className="flex items-center gap-2"><span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />{submittingLabel}</span> : submitLabel}
        </Button>
      </form>

      <div className="relative my-4">
        <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-slate-200" /></div>
        <div className="relative flex justify-center text-[10px] uppercase tracking-wide"><span className="bg-white px-2 text-slate-400">or continue with</span></div>
      </div>

      <Button type="button" variant="outline" onClick={onGoogleSignIn} disabled={isGoogleSubmitting} className="h-11 w-full gap-2 rounded-xl border-slate-200 bg-white text-sm font-semibold text-slate-700 hover:bg-slate-50">
        {isGoogleSubmitting ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-slate-700" /> : <GoogleGlyph className="h-4 w-4" />}
        Sign in with Google
      </Button>

      <p className="mt-4 text-center text-[10px] font-medium text-slate-400">🔒 Secure · Encrypted · Protected</p>
      {footNote ? <div className="mt-4 border-t border-slate-200 pt-4">{footNote}</div> : null}
    </section>
  );
}

export const ReferenceLoginIcons = { Mail, Lock };
