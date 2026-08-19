import { Link, useLocation } from "react-router-dom";
import { BrandMark } from "@/shared/components/branding/BrandMark";
import { CONTACT_EMAIL, PUBLIC_ROUTES, homeSectionHref } from "@/features/marketing/publicConfig";

const PLATFORM = [
  { label: "Property management", hash: "platform" },
  { label: "Rent & payments", hash: "capabilities" },
  { label: "Maintenance", hash: "capabilities" },
  { label: "Reporting", hash: "capabilities" },
] as const;

const SOLUTIONS = [
  { label: "Property managers", href: PUBLIC_ROUTES.managerSignUp },
  { label: "Landlords", href: PUBLIC_ROUTES.landlordLogin },
  { label: "Agencies", href: PUBLIC_ROUTES.agencyLogin },
  { label: "Tenants", href: PUBLIC_ROUTES.tenantLogin },
] as const;

export function PublicFooter() {
  const { pathname } = useLocation();
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-border bg-navy-primary text-white">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-2 lg:grid-cols-5">
        <div className="lg:col-span-2">
          <BrandMark size="sm" showWordmark subtitle="PMS" fetchPriority="low" inverse imgClassName="ring-white/20" />
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-white/85">
            Property operations for modern rental teams.
          </p>
        </div>

        <nav aria-label="Platform">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/70">Platform</p>
          <ul className="mt-3 space-y-2 text-sm">
            {PLATFORM.map((item) => (
              <li key={item.label}>
                <a
                  href={homeSectionHref(item.hash, pathname)}
                  className="text-white/80 transition-colors hover:text-white"
                >
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <nav aria-label="Solutions">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/70">Solutions</p>
          <ul className="mt-3 space-y-2 text-sm">
            {SOLUTIONS.map((item) => (
              <li key={item.label}>
                <Link to={item.href} className="text-white/80 transition-colors hover:text-white">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="grid grid-cols-2 gap-8 sm:grid-cols-1">
          <nav aria-label="Company">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/70">Company</p>
            <ul className="mt-3 space-y-2 text-sm">
              <li>
                <a href={homeSectionHref("about", pathname)} className="text-white/80 hover:text-white">
                  About
                </a>
              </li>
              <li>
                <Link to={PUBLIC_ROUTES.pricing} className="text-white/80 hover:text-white">
                  Pricing
                </Link>
              </li>
              <li>
                <a href={homeSectionHref("contact", pathname)} className="text-white/80 hover:text-white">
                  Contact
                </a>
              </li>
            </ul>
          </nav>
          <nav aria-label="Legal">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/70">Legal</p>
            <ul className="mt-3 space-y-2 text-sm">
              <li>
                <Link to={PUBLIC_ROUTES.legalPrivacy} className="text-white/80 hover:text-white">
                  Privacy
                </Link>
              </li>
              <li>
                <Link to={PUBLIC_ROUTES.legalTerms} className="text-white/80 hover:text-white">
                  Terms
                </Link>
              </li>
            </ul>
          </nav>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p className="text-xs text-white/75">© {year} CALQULUS. All rights reserved.</p>
          <p className="text-xs text-white/75">Property management for Kenya and East Africa.</p>
        </div>
        <p className="sr-only">Support email {CONTACT_EMAIL}</p>
      </div>
    </footer>
  );
}
