import calqulusLogo from "@/assets/calqulus-logo-new.jpg";
import { Link } from "react-router-dom";

/**
 * Shared decorative chrome for the role-specific auth screens
 * (AgencyAuth, WebhostAuth, LandlordPortalAuth). These pages previously
 * each carried their own copy of this markup verbatim.
 */

/** Full-screen branded loading state shown while auth state is resolving. */
export function AuthLoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background text-foreground hero-gradient">
      <div className="flex flex-col items-center gap-4">
        <img src={calqulusLogo} alt="CALQULUS PMS" className="h-14 w-auto animate-pulse-soft" />
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
