import type { ComponentType, ReactNode } from "react";
import { BrandMark } from "@/shared/components/branding/BrandMark";
import { Link } from "react-router-dom";
import { cn } from "@/shared/lib/utils";
import { PUBLIC_ROUTES } from "@/features/marketing/publicConfig";

/**
 * Shared chrome for role-specific auth screens.
 * Light operational desk — no navy, black, or marketing-hero slogans required.
 */

export interface PortalAuthFeature {
  icon: ComponentType<{ className?: string }>;
  text: string;
  detail?: string;
  tint?: string;
}

export interface PortalSwitchLink {
  label: string;
  href: string;
}

export interface PortalAuthShellProps {
  portalName: string;
  badgeLabel: string;
  icon: ComponentType<{ className?: string }>;
  tagline: string;
  heroLines?: { text: string; tone: "default" | "gradient" | "muted" }[];
  /** Preferred over stacked slogan lines when the portal should read as a desk. */
  heroTitle?: string;
  heroDescription: string;
  features: PortalAuthFeature[];
  otherPortals: PortalSwitchLink[];
  formSubtitle: string;
  formTitle?: string;
  submitLabel: string;
  notice?: string;
  aside?: ReactNode;
  variant?: "hero" | "light";
  children: ReactNode;
}

export function PortalAuthShell({
  portalName,
  badgeLabel,
  icon: Icon,
  tagline,
  heroLines = [],
  heroTitle,
  heroDescription,
  features,
  otherPortals,
  formSubtitle,
  formTitle = "Welcome back",
  submitLabel: _submitLabel,
  notice,
  aside,
  variant = "light",
  children,
}: PortalAuthShellProps) {
  const isLight = variant === "light";
  return (
    <div className={cn("desk-canvas min-h-screen text-foreground", !isLight && "hero-gradient")}>
      <div className="mx-auto flex min-h-screen max-w-6xl">
        <div className="relative hidden overflow-hidden lg:flex lg:w-[54%] lg:flex-col">
          <div className="public-hero-grid pointer-events-none absolute inset-0" aria-hidden />
          <AuthGridOverlay />

          <div className="relative z-10 flex h-full flex-col p-10 xl:p-12">
            <div className="mb-10 flex items-center justify-between gap-4">
              <Link to={PUBLIC_ROUTES.home} aria-label="CALQULUS home">
                <BrandMark size="nav" showWordmark subtitle={portalName} fetchPriority="high" />
              </Link>
              <Link
                to={PUBLIC_ROUTES.home}
                className="text-xs font-medium text-muted-foreground transition-colors hover:text-primary"
              >
                Back to home
              </Link>
            </div>

            <div className="flex flex-1 flex-col justify-center">
              <div className="mb-5 inline-flex items-center gap-2 self-start rounded-full border border-primary/20 bg-soft-blue px-3 py-1.5">
                <Icon className="h-3.5 w-3.5 text-primary" />
                <span className="text-xs font-semibold text-primary">{badgeLabel}</span>
              </div>

              <h1 className="page-title max-w-lg text-[2rem] leading-tight xl:text-[2.35rem]">
                {heroTitle ? (
                  heroTitle
                ) : (
                  heroLines.map((line, i) => (
                    <span
                      key={i}
                      className={`block ${line.tone === "gradient" ? "text-gradient" : line.tone === "muted" ? "text-muted-foreground" : "text-foreground"}`}
                    >
                      {line.text}
                    </span>
                  ))
                )}
              </h1>
              <p className="mt-4 max-w-md text-sm leading-relaxed text-muted-foreground sm:text-base">
                {heroDescription}
              </p>

              <div className={cn(
                "mt-8",
                features.some((f) => f.detail) ? "grid grid-cols-2 gap-3" : "space-y-3",
              )}>
                {features.map((f) => (
                  f.detail ? (
                    <article key={f.text} className="enterprise-card p-4">
                      <span
                        className={cn(
                          "flex h-9 w-9 items-center justify-center rounded-lg",
                          f.tint ?? "bg-soft-blue text-primary",
                        )}
                      >
                        <f.icon className="h-4 w-4" aria-hidden />
                      </span>
                      <p className="mt-3 text-sm font-semibold text-foreground">{f.text}</p>
                      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{f.detail}</p>
                    </article>
                  ) : (
                    <div key={f.text} className="flex items-center gap-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-soft-blue text-primary">
                        <f.icon className="h-4 w-4" aria-hidden />
                      </span>
                      <p className="text-sm font-medium text-muted-foreground">{f.text}</p>
                    </div>
                  )
                ))}
              </div>

              {aside ? <div className="mt-5">{aside}</div> : null}
            </div>
          </div>
        </div>

        <div className="flex w-full items-center justify-center px-4 py-10 sm:px-8 lg:w-[46%]">
          <div className="w-full max-w-md">
            <div className="mb-6 flex items-center justify-between lg:hidden">
              <Link to={PUBLIC_ROUTES.home} aria-label="CALQULUS home">
                <BrandMark size="nav" showWordmark subtitle={portalName} />
              </Link>
              <Link to={PUBLIC_ROUTES.home} className="text-xs font-medium text-muted-foreground hover:text-primary">
                Home
              </Link>
            </div>

            <div className="enterprise-card p-6 sm:p-8">
              <div className="mb-6">
                <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-soft-blue px-2.5 py-1">
                  <Icon className="h-3 w-3 text-primary" />
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-primary">{portalName}</span>
                </div>
                <h2 className="font-heading text-2xl font-bold text-foreground">{formTitle}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{formSubtitle}</p>
                <p className="mt-1.5 text-xs text-muted-foreground">{tagline}</p>
              </div>

              {children}

              {notice && (
                <div className="mt-5 rounded-lg border border-primary/20 bg-soft-blue p-3.5">
                  <p className="text-xs leading-relaxed text-muted-foreground">{notice}</p>
                </div>
              )}

              <OtherPortalsGrid portals={otherPortals} />
              <AuthLegalFooterLinks />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function AuthLoadingScreen({ variant = "light" }: { variant?: "hero" | "light" }) {
  return (
    <div
      className={cn(
        "flex min-h-screen items-center justify-center text-foreground",
        variant === "light" ? "desk-canvas" : "hero-gradient",
      )}
    >
      <div className="flex flex-col items-center gap-4">
        <BrandMark size="hero" className="animate-pulse-soft" />
        <div className="flex gap-1.5">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-2 w-2 rounded-full bg-primary/20 animate-pulse-soft"
              style={{ animationDelay: `${i * 0.2}s` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export function AuthGridOverlay() {
  return (
    <div
      className="pointer-events-none absolute inset-0"
      style={{
        background:
          "radial-gradient(circle at 18% 88%, color-mix(in srgb, var(--primary) 14%, transparent) 0%, transparent 55%), radial-gradient(circle at 88% 12%, color-mix(in srgb, var(--glow) 10%, transparent) 0%, transparent 50%)",
      }}
    />
  );
}

export function AuthLegalFooterLinks() {
  return (
    <div className="mt-4 flex justify-center gap-4">
      <Link
        to={PUBLIC_ROUTES.legalPrivacy}
        className="text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        Privacy
      </Link>
      <span className="text-xs text-muted-foreground">·</span>
      <Link
        to={PUBLIC_ROUTES.legalTerms}
        className="text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        Terms
      </Link>
    </div>
  );
}

export function OtherPortalsGrid({ portals }: { portals: { label: string; href: string }[] }) {
  return (
    <div className="mt-5 border-t border-border pt-5">
      <p className="mb-3 text-center text-[11px] font-medium text-muted-foreground">Other portals</p>
      <div className="grid grid-cols-3 gap-2">
        {portals.map((p) => (
          <Link
            key={p.href}
            to={p.href}
            className="flex items-center justify-center rounded-lg border border-border bg-secondary-background px-2 py-2 text-xs font-semibold text-muted-foreground transition-all hover:border-primary/30 hover:bg-soft-blue hover:text-primary"
          >
            {p.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
