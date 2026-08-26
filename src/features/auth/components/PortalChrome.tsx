import type { ComponentType } from "react";
import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { BrandMark } from "@/shared/components/branding/BrandMark";
import { PUBLIC_ROUTES } from "@/features/marketing/publicConfig";
import { PORTALS } from "@/features/auth/lib/portals";

/**
 * Shared portal entry chrome — the shell every CALQULUS portal starts from.
 * Manager is the first consumer; Landlord/Agency/Tenant/Admin adopt the same
 * parts with only theme + content changes.
 */

interface PortalHeaderProps {
  /** Subtitle shown under the CALQULUS wordmark, e.g. "Manager". */
  subtitle: string;
}

/** Compact product-shell header: brand left, back-link right. */
export function PortalHeader({ subtitle }: PortalHeaderProps) {
  return (
    <header className="flex items-center justify-between py-4">
      <Link to={PUBLIC_ROUTES.home} aria-label="CALQULUS home">
        <BrandMark size="nav" showWordmark subtitle={subtitle} inverse forcePlatform />
      </Link>
      <Link to={PUBLIC_ROUTES.home} className="text-xs font-medium text-white/60 transition-colors hover:text-white">
        Back to CALQULUS
      </Link>
    </header>
  );
}

interface PortalBadgeProps {
  icon: ComponentType<{ className?: string }>;
  label: string;
}

/** Small portal-context chip: icon + uppercase label on a light blue surface. */
export function PortalBadge({ icon: Icon, label }: PortalBadgeProps) {
  return (
    <span className="inline-flex items-center gap-2 self-start rounded-full border border-primary/25 bg-primary/12 px-3 py-1.5">
      <Icon className="h-3.5 w-3.5 text-primary" aria-hidden />
      <span className="text-[11px] font-semibold uppercase tracking-wider text-white/90">{label}</span>
    </span>
  );
}

interface PortalSwitcherProps {
  /** Portal currently being rendered — marked, not linked. */
  currentId: string;
}

/** Cross-portal switcher; the active portal is marked with aria-current. */
export function PortalSwitcher({ currentId }: PortalSwitcherProps) {
  return (
    <nav aria-label="Other CALQULUS portals" className="mt-5">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-white/40">Other CALQULUS portals</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {PORTALS.map((portal) => {
          if (portal.id === currentId) {
            return (
              <span
                key={portal.id}
                aria-current="true"
                className="inline-flex items-center gap-2 rounded-lg border border-white/25 bg-white/10 px-3 py-2 text-xs font-semibold text-white"
              >
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: portal.accent }} aria-hidden />
                {portal.label}
              </span>
            );
          }
          return (
            <Link
              key={portal.id}
              to={portal.href}
              className="group inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-medium text-white/70 transition-colors hover:bg-white/10 hover:text-white"
            >
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: portal.accent }} aria-hidden />
              {portal.label}
              <ChevronRight className="h-3 w-3 text-white/30 transition-transform group-hover:translate-x-0.5" aria-hidden />
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

/** Legal-only footer strip shared across portals. */
export function PortalFooter() {
  return (
    <div className="mt-3 flex items-center gap-3 text-[11px] text-white/40">
      <Link to={PUBLIC_ROUTES.legalPrivacy} className="transition-colors hover:text-white/80">
        Privacy
      </Link>
      <span aria-hidden>·</span>
      <Link to={PUBLIC_ROUTES.legalTerms} className="transition-colors hover:text-white/80">
        Terms
      </Link>
      <span className="ml-auto">© 2026 CALQULUS Limited</span>
    </div>
  );
}
