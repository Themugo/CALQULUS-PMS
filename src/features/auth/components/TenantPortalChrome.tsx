import { ReferencePortalLoginShell } from "@/features/auth/components/ReferencePortalLoginShell";
import type { CSSProperties, ComponentType, ReactNode } from "react";
import { Link } from "react-router-dom";
import {
  ChevronRight,
  CreditCard,
  FileText,
  Home,
  LockKeyhole,
  Wallet,
  Wrench,
} from "lucide-react";
import { BrandMark } from "@/shared/components/branding/BrandMark";
import { PUBLIC_ROUTES } from "@/features/marketing/publicConfig";
import { PROPERTY_IMAGES, PROPERTY_THUMBS } from "@/features/marketing/propertyImages";
import { PortalIdentityBackdrop } from "@/features/auth/components/PortalIdentityBackdrop";
import { usePortalIdentity } from "@/core/product/PortalIdentityProvider";
import { portalSurfaceProps } from "@/core/design";
import { PortalSwitcher as SharedPortalSwitcher } from "@/features/auth/components/PortalChrome";

/**
 * Tenant portal entry chrome — residential home service, not an operations
 * desk. Cyan accent; navy + white stay dominant. Owns background, header,
 * identity, home preview, switcher and legal footer.
 */

const TENANT_ACCENT = "#0284C7";
/** Small text on light surfaces — #0284C7 only reaches 4.1:1; this reaches ~6:1. */
const TENANT_ACCENT_DEEP = "#0369A1";

const CAPABILITIES: { icon: ComponentType<{ className?: string; style?: CSSProperties }>; label: string }[] = [
  { icon: Wallet, label: "Rent" },
  { icon: CreditCard, label: "Payments" },
  { icon: Wrench, label: "Maintenance" },
  { icon: FileText, label: "Lease" },
  { icon: Home, label: "Property services" },
];

function TenantHomePreview() {
  return (
    <figure className="rounded-[14px] border border-white/10 bg-card shadow-xl shadow-navy-deep/20">
      <div className="flex items-center justify-between gap-2 border-b border-border px-3.5 py-2.5">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">My home</p>
        <span
          className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
          style={{ color: TENANT_ACCENT_DEEP, backgroundColor: "rgba(2,132,199,0.1)", border: "1px solid rgba(2,132,199,0.3)" }}
        >
          Illustrative tenant view
        </span>
      </div>
      <div className="p-3.5">
        {/* Home identity — recognition first */}
        <div className="overflow-hidden rounded-lg border border-border bg-card">
          <img
            src={PROPERTY_THUMBS.residential}
            alt="Kilimani Court building"
            loading="lazy"
            decoding="async"
            className="h-20 w-full object-cover"
          />
          <div className="flex items-center justify-between gap-2 p-2.5">
            <div className="min-w-0">
              <p className="truncate text-xs font-semibold text-foreground">Kilimani Court</p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">Apartment 3B · Tenant since 2025</p>
            </div>
            <span className="shrink-0 rounded-full bg-success/15 px-2 py-0.5 text-[10px] font-semibold text-success">
              Lease active
            </span>
          </div>
        </div>

        {/* Next rent — the number a tenant looks for first */}
        <div
          className="mt-3 flex items-center justify-between gap-2 rounded-lg p-2.5"
          style={{ backgroundColor: "rgba(2,132,199,0.08)" }}
        >
          <div>
            <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Next rent</p>
            <p className="mt-0.5 font-heading text-lg font-bold leading-none tracking-tight text-foreground">
              KES 35,000
            </p>
            <p className="mt-1 text-[11px] text-muted-foreground">Due 01 Sep</p>
          </div>
          <span
            className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
            style={{ color: TENANT_ACCENT_DEEP, backgroundColor: "rgba(2,132,199,0.12)" }}
          >
            Upcoming
          </span>
        </div>

        {/* Maintenance + lease — compact pair */}
        <div className="mt-3 grid grid-cols-2 gap-2">
          <div className="rounded-lg border border-border bg-secondary-background p-2.5">
            <p className="text-[9px] font-medium uppercase tracking-wide text-muted-foreground">Maintenance</p>
            <p className="mt-1 font-heading text-sm font-semibold leading-none text-foreground">1 open request</p>
            <p className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground">
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-warning" aria-hidden />
              Leaking tap · In progress
            </p>
          </div>
          <div className="rounded-lg border border-border bg-secondary-background p-2.5">
            <p className="text-[9px] font-medium uppercase tracking-wide text-muted-foreground">Lease</p>
            <p className="mt-1 font-heading text-sm font-semibold leading-none text-foreground">Active</p>
            <p className="mt-1 text-[11px] text-muted-foreground">Expires 31 Dec 2026</p>
          </div>
        </div>

        <div className="mt-3 flex items-center gap-2 rounded-lg border border-border bg-secondary-background px-2.5 py-2">
          <Wrench className="h-3.5 w-3.5 shrink-0" style={{ color: TENANT_ACCENT }} aria-hidden />
          <p className="text-[11px] leading-relaxed text-muted-foreground">
            Need something fixed? Submit and track maintenance requests through your tenant portal.
          </p>
        </div>

        <div className="mt-2 flex items-center gap-2 px-1 py-1.5">
          <LockKeyhole className="h-3.5 w-3.5 shrink-0 text-navy-mid" aria-hidden />
          <p className="text-[11px] leading-relaxed text-muted-foreground">
            Secure tenant access — your account only shows information associated with your tenancy.
          </p>
        </div>
      </div>
      <figcaption className="sr-only">
        Illustrative tenant view. Sample home, rent, repair and lease only — not live customer records.
      </figcaption>
    </figure>
  );
}

function CompactPortalFooter() {
  return (
    <div className="mt-4 flex items-center gap-3 text-[11px] text-white/40">
      <Link to={PUBLIC_ROUTES.legalPrivacy} className="transition-colors hover:text-white/80">Privacy</Link>
      <span aria-hidden>·</span>
      <Link to={PUBLIC_ROUTES.legalTerms} className="transition-colors hover:text-white/80">Terms</Link>
      <span className="ml-auto">© 2026 CALQULUS Limited</span>
    </div>
  );
}

interface TenantPortalShellProps {
  children: ReactNode;
}

export function TenantPortalShell({ children }: TenantPortalShellProps) {
  return (
    <ReferencePortalLoginShell
      portal="tenant"
      formTitle="Welcome Back!"
      formSubtitle="Sign in to your tenant portal"
    >
      {children}
    </ReferencePortalLoginShell>
  );
}
