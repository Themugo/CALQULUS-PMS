import { Link, useLocation } from "react-router-dom";
import { BrandMark } from "@/shared/components/branding/BrandMark";
import type { LandingFooter } from "@/features/marketing/landing/landingContent";

interface PremiumFooterProps {
  config: LandingFooter;
}

const footerLinkClass =
  "text-sm text-white/75 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50";

/** Resolve config footer href into a router path (hashes root to the homepage). */
function footerHref(href: string, pathname: string): string {
  if (href.startsWith("#")) {
    return pathname === "/" ? href : `/${href}`;
  }
  return href;
}

function FooterLink({ link, pathname }: { link: { label: string; href: string; external?: boolean }; pathname: string }) {
  if (link.external) {
    return (
      <a href={link.href} className={footerLinkClass}>
        {link.label}
      </a>
    );
  }
  return (
    <Link to={footerHref(link.href, pathname)} className={footerLinkClass}>
      {link.label}
    </Link>
  );
}

/**
 * Compact premium footer — brilliant-navy anchor above a white legal bar.
 * Columns, links and legal lines are fully data-driven.
 */
export function PremiumFooter({ config }: PremiumFooterProps) {
  const { pathname } = useLocation();
  const year = new Date().getFullYear();
  const copyright = config.copyright.replace("{year}", String(year));

  return (
    <footer className="bg-landing-primary text-white">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[minmax(0,1.3fr)_repeat(5,minmax(0,1fr))] lg:px-8">
        <div className="sm:col-span-2 lg:col-span-1">
          <BrandMark size="sm" showWordmark subtitle="" inverse fetchPriority="low" forcePlatform />
          <p className="mt-3 text-sm leading-6 text-white/75">{config.tagline}</p>
        </div>

        {config.columns.map((col) => (
          <nav key={col.id} aria-label={col.title}>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/80">{col.title}</p>
            <ul className="mt-3 space-y-2">
              {col.links.map((link) => (
                <li key={link.href + link.label}>
                  <FooterLink link={link} pathname={pathname} />
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>

      <div className="border-t border-white/15">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-4 text-xs text-white/75 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <p>{copyright}</p>
          <div className="flex items-center gap-4">
            {config.legal.map((item) => (
              <span key={item}>{item}</span>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}