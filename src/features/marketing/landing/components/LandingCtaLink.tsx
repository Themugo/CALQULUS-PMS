import type { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import type { CtaLink } from "@/features/marketing/landing/landingContent";

/**
 * Render a config-driven CTA as a proper link.
 *  - `external` (mailto / http) → plain `<a>`.
 *  - `#hash` → routed to the homepage anchor (works from / and /pricing).
 *  - anything else → SPA `<Link>`.
 */
export function LandingCtaLink({ cta, children }: { cta: CtaLink; children?: ReactNode }) {
  const { pathname } = useLocation();

  if (cta.external) {
    return (
      <a href={cta.href} className="min-h-11 inline-flex items-center">
        {children}
      </a>
    );
  }

  if (cta.href.startsWith("#")) {
    const target = pathname === "/" ? cta.href : `/${cta.href}`;
    return (
      <Link to={target} className="min-h-11 inline-flex items-center">
        {children}
      </Link>
    );
  }

  return (
    <Link to={cta.href} className="min-h-11 inline-flex items-center">
      {children}
    </Link>
  );
}