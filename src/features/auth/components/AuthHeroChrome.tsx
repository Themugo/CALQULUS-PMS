import { BrandMark } from "@/shared/components/branding/BrandMark";
import { Link } from "react-router-dom";
import { cn } from "@/shared/lib/utils";

/**
 * Shared decorative chrome for the role-specific auth screens
 * (AgencyAuth, WebhostAuth, LandlordPortalAuth). These pages previously
 * each carried their own copy of this markup verbatim.
 */

export interface PortalAuthFeature {
  icon: React.ComponentType<{ className?: string }>;
  text: string;
}

export interface PortalSwitchLink {
  label: string;
  href: string;
}

export interface PortalAuthShellProps {
  /** Portal name, e.g. "Landlord Portal" */
  portalName: string;
  /** Short badge label, e.g. "Property Owner Access" */
  badgeLabel: string;
  /** Icon for the badge + hero */
  icon: React.ComponentType<{ className?: string }>;
  /** One-line portal identity, e.g. "Monitor your portfolio and property performance." */
  tagline: string;
  /** Hero headline lines (rendered top-to-bottom). */
  heroLines: { text: string; tone: "default" | "gradient" | "muted" }[];
  /** Hero supporting paragraph. */
  heroDescription: string;
  /** Feature list for the left hero panel. */
  features: PortalAuthFeature[];
  /** Other portal entry points to switch to (NO admin/webhost — keep dev/internal out of public UI). */
  otherPortals: PortalSwitchLink[];
  /** Right-panel form header subtitle, e.g. "Sign in to your agency account". */
  formSubtitle: string;
  /** Submit button label, e.g. "Sign in to Landlord Portal". */
  submitLabel: string;
  /** Optional notice shown below the form (portal guidance). */
  notice?: string;
  /**
   * Visual variant. Default is the light executive surface. "hero" is
   * retained for compatibility and now renders the same light chrome.
   */
  variant?: "hero" | "light";
  /** Form + any auxiliary controls rendered inside the right card. */
  children: React.ReactNode;
}

/**
 * Consistent two-panel portal login layout shared across the four public
 * portals (Manager, Landlord, Agency, Tenant). Provides the same visual
 * language — light surface, CALQULUS primary actions, restrained
 * accents, consistent spacing, fields, buttons and focus states — while
 * letting each portal identify itself via portalName/tagline/icon.
 */
export function PortalAuthShell({
  portalName,
  badgeLabel,
  icon: Icon,
  tagline,
  heroLines,
  heroDescription,
  features,
  otherPortals,
  formSubtitle,
  submitLabel: _submitLabel,
  notice,
  variant = "light",
  children,
}: PortalAuthShellProps) {
  const isLight = variant === "light";
  return (
    <div className={cn(
      "min-h-screen flex bg-background text-foreground",
      isLight ? "surface-subtle" : "hero-gradient"
    )}>
      {/* ── Left hero panel ── */}
      <div className={cn(
        "hidden lg:flex lg:w-[55%] flex-col relative overflow-hidden",
        isLight && "border-r border-border"
      )}>
        <AuthGridOverlay />

        <div className="relative z-10 flex flex-col h-full p-12">
          <div className="flex items-center gap-4 mb-16">
            <BrandMark size="hero" showWordmark subtitle={portalName} />
          </div>

          <div className="flex-1 flex flex-col justify-center">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-primary/20 bg-primary/10 mb-6 self-start">
              <Icon className="h-3.5 w-3.5 text-primary" />
              <span className="text-xs text-primary font-semibold">{badgeLabel}</span>
            </div>

            <h1 className="font-heading text-5xl font-bold leading-tight mb-6">
              {heroLines.map((line, i) => (
                <span key={i} className={`block ${line.tone === "gradient" ? "text-gradient" : line.tone === "muted" ? "text-muted-foreground" : "text-foreground"}`}>
                  {line.text}
                </span>
              ))}
            </h1>
            <p className="text-muted-foreground text-lg leading-relaxed max-w-md mb-12">{heroDescription}</p>

            <div className="space-y-4">
              {features.map((f, i) => (
                <div key={i} className="flex items-center gap-4">
                  <div className="h-9 w-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
                    <f.icon className="h-4 w-4 text-primary" />
                  </div>
                  <p className="text-muted-foreground text-sm font-medium">{f.text}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-6 pt-8 border-t border-border">
            <p className="text-muted-foreground text-xs">calqulus.site</p>
            <Link to="/" className="text-muted-foreground hover:text-primary text-xs transition-colors">Back to home</Link>
          </div>
        </div>
      </div>

      {/* ── Right form panel ── */}
      <div className="w-full lg:w-[45%] flex items-center justify-center px-4 sm:px-8 py-12">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex justify-center mb-8">
            <BrandMark size="hero" />
          </div>

          <div className="rounded-[var(--radius)] border border-border bg-card p-6 sm:p-8 card-shadow">
            <div className="mb-6">
              <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full border border-primary/20 bg-primary/10 mb-4">
                <Icon className="h-3 w-3 text-primary" />
                <span className="text-[11px] text-primary font-semibold tracking-wider uppercase">{portalName}</span>
              </div>
              <h2 className="font-heading text-2xl font-bold text-foreground mb-1">Welcome back</h2>
              <p className="text-muted-foreground text-sm">{formSubtitle}</p>
              <p className="text-muted-foreground/80 text-xs mt-1.5">{tagline}</p>
            </div>

            {children}

            {notice && (
              <div className="mt-5 p-3.5 rounded-xl border border-primary/20 bg-primary/10">
                <p className="text-xs text-muted-foreground leading-relaxed">{notice}</p>
              </div>
            )}

            <OtherPortalsGrid portals={otherPortals} />
            <AuthLegalFooterLinks />
          </div>
        </div>
      </div>
    </div>
  );
}

/** Full-screen branded loading state shown while auth state is resolving. */
export function AuthLoadingScreen({ variant = "light" }: { variant?: "hero" | "light" }) {
  return (
    <div className={cn(
      "min-h-screen flex items-center justify-center bg-background text-foreground",
      variant === "light" ? "surface-subtle" : "hero-gradient"
    )}>
      <div className="flex flex-col items-center gap-4">
        <BrandMark size="hero" className="animate-pulse-soft" />
        <div className="flex gap-1.5">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-2 h-2 rounded-full bg-primary/10 animate-pulse-soft"
              style={{ animationDelay: `${i * 0.2}s` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

/** Grid + radial-gradient decorative background for the left hero panel (light). */
export function AuthGridOverlay() {
  return (
    <>
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage: `linear-gradient(hsl(221 83% 53% / 0.5) 1px, transparent 1px),
                            linear-gradient(90deg, hsl(221 83% 53% / 0.5) 1px, transparent 1px)`,
          backgroundSize: "48px 48px",
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(circle at 20% 80%, hsl(221 83% 53% / 0.10) 0%, transparent 60%),
                       radial-gradient(circle at 80% 20%, hsl(210 40% 96% / 0.8) 0%, transparent 50%)`,
        }}
      />
    </>
  );
}

/** Bottom-of-form legal links, identical across the role auth screens. */
export function AuthLegalFooterLinks() {
  return (
    <div className="flex justify-center gap-4 mt-4">
      <Link to="/legal?tab=privacy" className="text-xs text-muted-foreground hover:text-foreground transition-colors font-medium">Privacy</Link>
      <span className="text-muted-foreground text-xs">·</span>
      <Link to="/legal?tab=terms" className="text-xs text-muted-foreground hover:text-foreground transition-colors font-medium">Terms</Link>
    </div>
  );
}

/** "Other portals" 3-up quick-switch grid, identical layout across role auth screens (data varies per page). */
export function OtherPortalsGrid({ portals }: { portals: { label: string; href: string }[] }) {
  return (
    <div className="mt-5 pt-5 border-t border-border">
      <p className="text-muted-foreground text-[11px] text-center font-medium mb-3">Other portals</p>
      <div className="grid grid-cols-3 gap-2">
        {portals.map((p) => (
          <Link
            key={p.href}
            to={p.href}
            className="flex items-center justify-center py-2 px-2 rounded-lg border border-border bg-muted hover:bg-primary/10 hover:border-primary/30 transition-all text-muted-foreground hover:text-primary text-xs font-semibold"
          >
            {p.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
