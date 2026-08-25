import { Link, useLocation } from "react-router-dom";
import { BrandMark } from "@/shared/components/branding/BrandMark";
import {
  COMPANY_LINKS,
  LEGAL_LINKS,
  PLATFORM_LINKS,
  PORTAL_LINKS,
  homeSectionHref,
} from "@/features/marketing/publicConfig";

const footerLinkClass =
  "text-sm text-white/72 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60";

export function PublicFooter() {
  const { pathname } = useLocation();
  const year = new Date().getFullYear();

  return (
    <footer className="bg-navy-deep text-white">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:grid-cols-2 sm:px-6 lg:grid-cols-[minmax(0,1.2fr)_repeat(4,minmax(0,1fr))] lg:px-8">
        <div className="max-w-sm sm:col-span-2 lg:col-span-1">
          <BrandMark size="sm" showWordmark subtitle="" inverse fetchPriority="low" forcePlatform />
          <p className="mt-3 text-sm leading-6 text-white/75">
            Run every property from one place.
          </p>
        </div>

        <nav aria-label="Platform">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white">Platform</p>
          <ul className="mt-3 space-y-2">
            {PLATFORM_LINKS.map((link) => (
              <li key={link.label}>
                {"href" in link ? (
                  <Link to={link.href} className={footerLinkClass}>
                    {link.label}
                  </Link>
                ) : (
                  <a href={homeSectionHref(link.hash, pathname)} className={footerLinkClass}>
                    {link.label}
                  </a>
                )}
              </li>
            ))}
          </ul>
        </nav>

        <nav aria-label="Solutions">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white">Solutions</p>
          <ul className="mt-3 space-y-2">
            {PORTAL_LINKS.map((link) => (
              <li key={link.label}>
                <Link to={link.href} className={footerLinkClass}>
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <nav aria-label="Company">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white">Company</p>
          <ul className="mt-3 space-y-2">
            {COMPANY_LINKS.map((link) => (
              <li key={link.label}>
                <a href={homeSectionHref(link.hash, pathname)} className={footerLinkClass}>
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <nav aria-label="Legal">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white">Legal</p>
          <ul className="mt-3 space-y-2">
            {LEGAL_LINKS.map((link) => (
              <li key={link.label}>
                <Link to={link.href} className={footerLinkClass}>
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>

      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-4 text-xs text-white/75 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <p>© {year} CALQULUS Limited. All rights reserved.</p>
          <p aria-label="Language">English (KE)</p>
        </div>
      </div>
    </footer>
  );
}
