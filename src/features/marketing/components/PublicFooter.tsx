import { Link, useLocation } from "react-router-dom";
import { Globe } from "lucide-react";
import { BrandMark } from "@/shared/components/branding/BrandMark";
import {
  COMPANY_LINKS,
  LEGAL_LINKS,
  PLATFORM_LINKS,
  PORTAL_LINKS,
  homeSectionHref,
} from "@/features/marketing/publicConfig";

const footerLinkClass =
  "text-sm text-white/72 transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60";

export function PublicFooter() {
  const { pathname } = useLocation();
  const year = new Date().getFullYear();

  return (
    <footer className="bg-navy-deep text-white">
      <div className="bg-primary text-primary-foreground">
        <div className="mx-auto flex max-w-6xl items-center gap-2 px-4 py-2 text-xs font-semibold tracking-wide sm:px-6 lg:px-8">
          <Globe className="h-3.5 w-3.5" aria-hidden />
          <span>www.calqulus.site</span>
        </div>
      </div>

      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-8 sm:grid-cols-2 sm:px-6 lg:grid-cols-[minmax(0,1.2fr)_repeat(4,minmax(0,1fr))] lg:px-8">
        <div className="max-w-sm sm:col-span-2 lg:col-span-1">
          <BrandMark size="sm" showWordmark subtitle="" inverse fetchPriority="low" />
          <p className="mt-3 text-sm leading-6 text-white/68">
            Property operations for modern rental teams.
          </p>
        </div>

        <nav aria-label="Platform">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">Platform</p>
          <ul className="mt-3 space-y-2">
            {PLATFORM_LINKS.map((link) => (
              <li key={link.label}>
                <a href={homeSectionHref(link.hash, pathname)} className={footerLinkClass}>
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <nav aria-label="Solutions">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">Solutions</p>
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
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">Company</p>
          <ul className="mt-3 space-y-2">
            {COMPANY_LINKS.map((link) => (
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

        <nav aria-label="Legal">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">Legal</p>
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
        <div className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-3.5 text-xs text-white/48 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <p>© {year} CALQULUS. All rights reserved.</p>
          <p>Property management for Kenya and East Africa.</p>
        </div>
      </div>
    </footer>
  );
}
