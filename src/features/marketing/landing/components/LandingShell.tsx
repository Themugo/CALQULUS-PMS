import type { ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { PremiumHeader } from "@/features/marketing/landing/components/PremiumHeader";
import { PremiumFooter } from "@/features/marketing/landing/components/PremiumFooter";
import type { LandingHeader, LandingFooter } from "@/features/marketing/landing/landingContent";

interface LandingShellProps {
  header: LandingHeader;
  footer: LandingFooter;
  children: ReactNode;
}

/**
 * Public landing shell — skip-to-content, premium header/footer, main slot.
 * Same contract as the current PublicShell but configured from the theme.
 */
export function LandingShell({ header, footer, children }: LandingShellProps) {
  // keep useLocation import alive (scroll reset is handled at page level)
  useLocation();
  return (
    <div className="min-h-screen bg-landing-background text-landing-textprimary">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-landing-surface focus:px-4 focus:py-2 focus:text-sm focus:shadow-md"
      >
        Skip to content
      </a>
      <PremiumHeader config={header} />
      <main id="main-content" tabIndex={-1} className="outline-none">{children}</main>
      <PremiumFooter config={footer} />
    </div>
  );
}