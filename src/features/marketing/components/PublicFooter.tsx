import { FormEvent } from "react";
import { Link, useLocation } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { BrandMark } from "@/shared/components/branding/BrandMark";
import { Button } from "@/shared/components/ui/button";
import {
  COMPANY_LINKS,
  CONTACT_EMAIL,
  LEGAL_LINKS,
  PLATFORM_LINKS,
  PORTAL_LINKS,
  RESOURCE_FOOTER_LINKS,
  homeSectionHref,
} from "@/features/marketing/publicConfig";

const footerLinkClass =
  "text-sm text-white/72 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60";

function SocialGlyph({
  name,
  className,
}: {
  name: "linkedin" | "facebook" | "instagram" | "x";
  className?: string;
}) {
  const paths = {
    linkedin:
      "M4.98 3.5C4.98 4.88 3.88 6 2.5 6S0 4.88 0 3.5 1.12 1 2.5 1s2.48 1.12 2.48 2.5zM.22 8.25h4.56V24H.22V8.25zM8.34 8.25h4.37v2.14h.06c.61-1.16 2.1-2.38 4.32-2.38 4.62 0 5.47 3.04 5.47 7v8.99h-4.57v-7.97c0-1.9-.03-4.34-2.64-4.34-2.65 0-3.05 2.07-3.05 4.2V24H8.34V8.25z",
    facebook:
      "M22.68 0H1.32C.59 0 0 .6 0 1.33v21.33C0 23.4.59 24 1.32 24h11.5v-9.29H9.69V11.1h3.13V8.41c0-3.1 1.89-4.79 4.66-4.79 1.33 0 2.47.1 2.8.14v3.24h-1.92c-1.5 0-1.8.72-1.8 1.76v2.31h3.59l-.47 3.61h-3.12V24h6.12c.73 0 1.32-.6 1.32-1.34V1.33C24 .6 23.41 0 22.68 0z",
    instagram:
      "M12 2.16c3.2 0 3.58.01 4.85.07 3.25.15 4.77 1.69 4.92 4.92.06 1.27.07 1.65.07 4.85s-.01 3.58-.07 4.85c-.15 3.23-1.66 4.77-4.92 4.92-1.27.06-1.64.07-4.85.07s-3.58-.01-4.85-.07c-3.26-.15-4.77-1.7-4.92-4.92C2.17 15.58 2.16 15.2 2.16 12s.01-3.58.07-4.85C2.38 3.92 3.9 2.38 7.15 2.23 8.42 2.17 8.8 2.16 12 2.16zM12 0C8.74 0 8.33.01 7.05.07 2.7.27.27 2.7.07 7.05.01 8.33 0 8.74 0 12s.01 3.67.07 4.95c.2 4.36 2.63 6.78 6.98 6.98C8.33 23.99 8.74 24 12 24s3.67-.01 4.95-.07c4.35-.2 6.78-2.62 6.98-6.98C23.99 15.67 24 15.26 24 12s-.01-3.67-.07-4.95C23.73 2.7 21.3.27 16.95.07 15.67.01 15.26 0 12 0zm0 5.84A6.16 6.16 0 1 0 18.16 12 6.16 6.16 0 0 0 12 5.84zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.41-11.85a1.44 1.44 0 1 0 1.44 1.44 1.44 1.44 0 0 0-1.44-1.44z",
    x: "M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.74l7.73-8.835L1.254 2.25H8.08l4.258 5.688L18.244 2.25zm-1.161 17.52h1.833L7.084 4.126H5.117z",
  } as const;

  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path fill="currentColor" d={paths[name]} />
    </svg>
  );
}

const SOCIAL = [
  { label: "LinkedIn", name: "linkedin" as const },
  { label: "Facebook", name: "facebook" as const },
  { label: "Instagram", name: "instagram" as const },
  { label: "X", name: "x" as const },
];

export function PublicFooter() {
  const { pathname } = useLocation();
  const year = new Date().getFullYear();

  const onNewsletter = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const email = new FormData(form).get("email");
    if (typeof email === "string" && email.trim()) {
      window.location.href = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent("Newsletter request")}&body=${encodeURIComponent(email.trim())}`;
    }
  };

  return (
    <footer className="bg-navy-deep text-white">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:grid-cols-2 sm:px-6 lg:grid-cols-[minmax(0,1.15fr)_repeat(4,minmax(0,1fr))_minmax(0,1.1fr)] lg:px-8">
        <div className="max-w-sm sm:col-span-2 lg:col-span-1">
          <BrandMark size="sm" showWordmark subtitle="" inverse fetchPriority="low" forcePlatform />
          <p className="mt-3 text-sm leading-6 text-white/68">
            The intelligent property operations platform for Kenya and East Africa.
          </p>
          <ul className="mt-4 flex items-center gap-2">
            {SOCIAL.map((item) => (
              <li key={item.label}>
                <a
                  href={homeSectionHref("contact", pathname)}
                  aria-label={item.label}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-md text-white/70 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
                >
                  <SocialGlyph name={item.name} className="h-4 w-4" />
                </a>
              </li>
            ))}
          </ul>
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

        <nav aria-label="Resources">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white">Resources</p>
          <ul className="mt-3 space-y-2">
            {RESOURCE_FOOTER_LINKS.map((link) => (
              <li key={link.label}>
                {"href" in link ? (
                  <a href={link.href} className={footerLinkClass}>
                    {link.label}
                  </a>
                ) : (
                  <a href={homeSectionHref(link.hash, pathname)} className={footerLinkClass}>
                    {link.label}
                  </a>
                )}
              </li>
            ))}
          </ul>
        </nav>

        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white">Stay updated</p>
          <p className="mt-3 text-sm leading-6 text-white/68">
            Subscribe to our newsletter for product updates and insights.
          </p>
          <form className="mt-4 flex gap-2" onSubmit={onNewsletter}>
            <label htmlFor="newsletter-email" className="sr-only">
              Email address
            </label>
            <input
              id="newsletter-email"
              name="email"
              type="email"
              required
              placeholder="Email"
              className="h-11 min-w-0 flex-1 rounded-md border border-white/15 bg-white/5 px-3 text-sm text-white placeholder:text-white/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            />
            <Button type="submit" size="icon" className="btn-brand h-11 w-11 shrink-0" aria-label="Subscribe">
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Button>
          </form>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-4 text-xs text-white/48 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <p>© {year} CALQULUS Limited. All rights reserved.</p>
          <nav aria-label="Legal" className="flex flex-wrap gap-x-4 gap-y-1">
            {LEGAL_LINKS.map((link) => (
              <Link key={link.label} to={link.href} className="hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60">
                {link.label}
              </Link>
            ))}
          </nav>
          <p aria-label="Language">English (KE)</p>
        </div>
      </div>
    </footer>
  );
}
