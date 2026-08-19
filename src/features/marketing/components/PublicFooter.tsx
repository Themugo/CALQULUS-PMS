import { Link, useLocation } from "react-router-dom";
import { BrandMark } from "@/shared/components/branding/BrandMark";
import { CONTACT_EMAIL, PUBLIC_ROUTES, homeSectionHref } from "@/features/marketing/publicConfig";

const WORKSPACE = [
  { label: "Properties & units", hash: "platform" },
  { label: "Rent & payments", hash: "platform" },
  { label: "Maintenance", hash: "platform" },
  { label: "Landlord reports", hash: "platform" },
] as const;

const PORTALS = [
  { label: "Property managers", href: PUBLIC_ROUTES.managerSignUp },
  { label: "Landlords", href: PUBLIC_ROUTES.landlordLogin },
  { label: "Agencies", href: PUBLIC_ROUTES.agencyLogin },
  { label: "Tenants", href: PUBLIC_ROUTES.tenantLogin },
] as const;

export function PublicFooter() {
  const { pathname } = useLocation();
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-border bg-card text-foreground">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-2 lg:grid-cols-5">
        <div className="lg:col-span-2">
          <BrandMark size="sm" showWordmark subtitle="PMS" fetchPriority="low" />
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted-foreground">
            Property operations for Kenya and East Africa — properties, tenants, rent, and repairs on one record.
          </p>
        </div>

        <nav aria-label="Workspace">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Workspace</p>
          <ul className="mt-3 space-y-2 text-sm">
            {WORKSPACE.map((item) => (
              <li key={item.label}>
                <a
                  href={homeSectionHref(item.hash, pathname)}
                  className="text-foreground/80 transition-colors hover:text-primary"
                >
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <nav aria-label="Portals">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Portals</p>
          <ul className="mt-3 space-y-2 text-sm">
            {PORTALS.map((item) => (
              <li key={item.label}>
                <Link to={item.href} className="text-foreground/80 transition-colors hover:text-primary">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="grid grid-cols-2 gap-8 sm:grid-cols-1">
          <nav aria-label="Company">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Company</p>
            <ul className="mt-3 space-y-2 text-sm">
              <li>
                <Link to={PUBLIC_ROUTES.pricing} className="text-foreground/80 hover:text-primary">
                  Pricing
                </Link>
              </li>
              <li>
                <a href={homeSectionHref("contact", pathname)} className="text-foreground/80 hover:text-primary">
                  Contact
                </a>
              </li>
              <li>
                <a href={`mailto:${CONTACT_EMAIL}`} className="text-foreground/80 hover:text-primary">
                  Email
                </a>
              </li>
            </ul>
          </nav>
          <nav aria-label="Legal">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Legal</p>
            <ul className="mt-3 space-y-2 text-sm">
              <li>
                <Link to={PUBLIC_ROUTES.legalPrivacy} className="text-foreground/80 hover:text-primary">
                  Privacy
                </Link>
              </li>
              <li>
                <Link to={PUBLIC_ROUTES.legalTerms} className="text-foreground/80 hover:text-primary">
                  Terms
                </Link>
              </li>
            </ul>
          </nav>
        </div>
      </div>

      <div className="border-t border-border bg-secondary-background">
        <div className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p className="text-xs text-muted-foreground">© {year} CALQULUS. All rights reserved.</p>
          <p className="text-xs text-muted-foreground">Nairobi · {CONTACT_EMAIL}</p>
        </div>
      </div>
    </footer>
  );
}
