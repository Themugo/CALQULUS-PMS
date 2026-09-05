import type { ComponentType, ReactNode } from "react";
import { Link } from "react-router-dom";
import { Eye, EyeOff, Lock, Mail } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Checkbox } from "@/shared/components/ui/checkbox";
import { BrandMark } from "@/shared/components/branding/BrandMark";
import { PUBLIC_ROUTES } from "@/features/marketing/publicConfig";
import { portalSurfaceProps } from "@/core/design";
import ForgotPasswordDialog from "@/features/auth/components/ForgotPasswordDialog";

/**
 * Shared login-screen chrome for all four portals (manager, landlord,
 * tenant, agency). Each portal keeps its own identity — accent color,
 * background photo, icon and copy — but the layout, the auth card and its
 * fields are one shared implementation so all four screens stay visually
 * and functionally consistent. Matches the approved reference design: a
 * full-height identity panel beside a "Welcome Back!" sign-in card with
 * email/password, remember-me, a colored login button, and a Google
 * sign-in option.
 */

/** Multicolor Google "G" mark — the standard four-color glyph. */
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

interface PortalLoginLayoutProps {
  portalId: "manager" | "landlord" | "tenant" | "agency";
  accentHex: string;
  backgroundImage: string;
  badgeIcon: ComponentType<{ className?: string }>;
  /** e.g. "Manager" — first, white line of the headline. */
  portalName: string;
  description: string;
  children: ReactNode;
}

export function PortalLoginLayout({
  portalId,
  accentHex,
  backgroundImage,
  badgeIcon: BadgeIcon,
  portalName,
  description,
  children,
}: PortalLoginLayoutProps) {
  return (
    <div className="min-h-screen w-full bg-background lg:grid lg:grid-cols-2" {...portalSurfaceProps(portalId)}>
      {/* Identity panel — hidden on small screens, full-height on desktop */}
      <div className="relative hidden overflow-hidden lg:flex lg:flex-col lg:justify-between lg:p-10">
        <div className="absolute inset-0" aria-hidden>
          <img
            src={backgroundImage}
            alt=""
            loading="eager"
            decoding="async"
            className="h-full w-full object-cover"
          />
          <div
            className="absolute inset-0"
            style={{
              background: `linear-gradient(180deg, ${accentHex}E6 0%, ${accentHex}CC 45%, ${accentHex}F2 100%)`,
            }}
          />
        </div>

        <Link to={PUBLIC_ROUTES.home} aria-label="CALQULUS home" className="relative z-[1]">
          <BrandMark size="nav" showWordmark subtitle="PMS" inverse forcePlatform />
        </Link>

        <div className="relative z-[1] max-w-sm">
          <h1 className="font-heading text-[2.4rem] font-bold leading-[1.05] tracking-tight text-white">
            <span className="block">{portalName}</span>
            <span className="block" style={{ color: "#FFFFFF" }}>
              <span className="opacity-90">Portal</span>
            </span>
          </h1>
          <div
            className="mt-6 flex h-14 w-14 items-center justify-center rounded-full border border-white/25 bg-white/10 backdrop-blur-sm"
            aria-hidden
          >
            <BadgeIcon className="h-6 w-6 text-white" />
          </div>
          <p className="mt-5 text-[15px] leading-relaxed text-white/85">{description}</p>
        </div>

        <div className="relative z-[1] text-[11px] text-white/50">© 2026 CALQULUS Limited</div>
      </div>

      {/* Mobile-only compact identity bar */}
      <div className="flex items-center justify-between px-4 py-4 lg:hidden">
        <Link to={PUBLIC_ROUTES.home} aria-label="CALQULUS home">
          <BrandMark size="nav" showWordmark subtitle={`${portalName} Portal`} />
        </Link>
      </div>

      {/* Auth card panel */}
      <div className="flex flex-1 items-center justify-center px-4 pb-10 sm:px-8 lg:p-10">
        <div className="w-full max-w-sm">{children}</div>
      </div>
    </div>
  );
}

interface PortalLoginCardProps {
  accentHex: string;
  /** Darker/deeper shade for small text on light surfaces, if the base accent is too light. */
  accentTextHex?: string;
  /** e.g. "manager" — used in "Sign in to your manager portal". */
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
  /** Extra content rendered below the form and the secure-access footer — e.g. signup links, invite notes. */
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
    <section
      className="rounded-2xl border border-border bg-card p-6 shadow-2xl shadow-black/10 sm:p-8"
      aria-label={`${portalLabel} sign in`}
    >
      <h2 className="font-heading text-2xl font-bold tracking-tight text-foreground">Welcome Back!</h2>
      <p className="mt-1 text-sm text-muted-foreground">Sign in to your {portalLabel} portal</p>

      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="portal-login-email" className="text-sm font-medium text-foreground">
            Email address
          </Label>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <Input
              id="portal-login-email"
              type="email"
              placeholder={emailPlaceholder}
              value={email}
              onChange={(e) => onEmailChange(e.target.value)}
              required
              className="h-11 border-border bg-card pl-10 text-foreground placeholder:text-muted-foreground"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="portal-login-password" className="text-sm font-medium text-foreground">
            Password
          </Label>
          <div className="relative">
            <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <Input
              id="portal-login-password"
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              value={password}
              onChange={(e) => onPasswordChange(e.target.value)}
              required
              className="h-11 border-border bg-card pl-10 pr-11 text-foreground placeholder:text-muted-foreground"
            />
            <button
              type="button"
              onClick={onToggleShowPassword}
              className="absolute right-1.5 top-1/2 inline-flex h-11 min-h-11 w-11 min-w-11 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2"
              aria-label={showPassword ? "Hide password" : "Show password"}
              aria-pressed={showPassword}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <label className="flex cursor-pointer items-center gap-2 text-sm text-foreground">
            <Checkbox
              checked={rememberMe}
              onCheckedChange={(checked) => onRememberMeChange(checked as boolean)}
              aria-label="Remember me"
            />
            Remember me
          </label>
          <ForgotPasswordDialog
            variant={forgotPasswordVariant}
            trigger={
              <button type="button" className="text-sm font-semibold hover:underline" style={{ color: linkColor }}>
                Forgot password?
              </button>
            }
          />
        </div>

        <Button
          type="submit"
          disabled={isSubmitting}
          className="h-11 w-full text-sm font-semibold text-white hover:brightness-110"
          style={{ backgroundColor: accentHex }}
        >
          {isSubmitting ? (
            <span className="flex items-center gap-2">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              {submittingLabel}
            </span>
          ) : (
            submitLabel
          )}
        </Button>
      </form>

      <div className="relative my-5">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-card px-2 text-muted-foreground">or continue with</span>
        </div>
      </div>

      <Button
        type="button"
        variant="outline"
        onClick={onGoogleSignIn}
        disabled={isGoogleSubmitting}
        className="h-11 w-full gap-2 border-border bg-card text-sm font-medium text-foreground hover:bg-secondary"
      >
        {isGoogleSubmitting ? (
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-foreground" />
        ) : (
          <GoogleGlyph className="h-4 w-4" />
        )}
        Sign in with Google
      </Button>

      <p className="mt-5 text-center text-xs text-muted-foreground">🔒 Secure • Encrypted • Protected</p>

      {footNote ? <div className="mt-5 border-t border-border pt-5">{footNote}</div> : null}
    </section>
  );
}
