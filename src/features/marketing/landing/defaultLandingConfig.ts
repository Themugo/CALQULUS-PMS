/**
 * Default landing-page content — the shipped marketing copy.
 *
 * This is the single place content lives. The landing page renders from this
 * object (and, in future, from persisted content served by `contentService`).
 *
 * Property images are referenced by stable asset keys resolved through
 * `propertyImages.ts`; they are deliberately NOT inlined here so a webhost
 * can swap them later.
 */
import { PUBLIC_ROUTES } from "@/features/marketing/publicConfig";
import { LANDING_THEME } from "@/features/marketing/theme/landingTheme";
import type { LandingPageConfig } from "@/features/marketing/landing/landingContent";

export const defaultLandingConfig: LandingPageConfig = {
  theme: LANDING_THEME,

  brand: {
    name: "CALQULUS",
    product: "CALQULUS PMS",
    wordmark: "CALQULUS",
    tagline: "Run every property from one place.",
  },

  header: {
    nav: [
      { label: "Product", hash: "capabilities" },
      { label: "Solutions", hash: "roles" },
      { label: "Pricing", hash: "pricing" },
      { label: "Resources", hash: "resources" },
      { label: "About", hash: "company" },
    ],
    signIn: { label: "Sign in", href: PUBLIC_ROUTES.managerSignIn },
    primaryCta: { label: "Get started", href: PUBLIC_ROUTES.managerSignUp },
  },

  hero: {
    eyebrow: "Property operations, connected",
    lineA: "Manage properties.",
    lineB: "Delight landlords. Empower tenants.",
    supporting:
      "CALQULUS PMS unifies property, lease, billing, payments, maintenance and reporting in one intelligent platform built for modern real estate.",
    primaryCta: { label: "Book a demo", href: PUBLIC_ROUTES.managerSignUp },
    secondaryCta: { label: "Explore the platform", href: "#capabilities" },
    trustPoints: [
      { icon: "ShieldCheck", label: "Secure & reliable" },
      { icon: "Network", label: "Kenya-ready" },
      { icon: "LayoutGrid", label: "Cloud platform" },
    ],
  },

  dashboard: {
    title: "CALQULUS / Manager dashboard",
    caption: "Illustrative manager dashboard",
    snapshot: [
      { label: "Properties", value: "12", sub: "across Nairobi" },
      { label: "Units", value: "284", sub: "rentable spaces" },
      { label: "Occupancy", value: "92%", sub: "262 of 284 let" },
      { label: "Collected", value: "KES 1.24M", sub: "this month" },
    ],
    chartTitle: "Collections, last 7 weeks",
    chartSeriesLabel: "Weekly collection rate",
    trend: [58, 64, 61, 74, 69, 83, 93],
    weekTicks: ["W1", "W2", "W3", "W4", "W5", "W6", "W7"],
    portfolioTitle: "Portfolio performance",
    portfolioLeft: { label: "Outstanding", value: "KES 86K" },
    portfolioRight: { label: "Net to landlord", value: "KES 1.15M" },
    attentionTitle: "Needs attention",
    attention: [
      { label: "2 leases expiring", tone: "attention" },
      { label: "1 open repair", tone: "attention" },
      { label: "3 rent renewals", tone: "ok" },
    ],
    disclaimer:
      "Illustrative manager dashboard. Sample figures only — not live customer data.",
  },

  trust: {
    eyebrow: "Built for property professionals",
    items: ["Residential", "Commercial", "Office", "Mixed-use"],
  },

  capabilities: [
    {
      id: "property",
      icon: "Building2",
      title: "Property & Units",
      copy: "Buildings, floors, units and occupancy — one portfolio view.",
      accent: "#123F8C",
    },
    {
      id: "leases",
      icon: "FileText",
      title: "Leases & Tenants",
      copy: "Invite tenants, hold lease terms, keep documents current.",
      accent: "#2F6FED",
    },
    {
      id: "billing",
      icon: "Receipt",
      title: "Billing & Payments",
      copy: "Raise rent and water, collect via M-Pesa & bank, reconcile.",
      accent: "#16B8C4",
    },
    {
      id: "maintenance",
      icon: "Wrench",
      title: "Maintenance",
      copy: "Log requests, assign repairs, track resolution.",
      accent: "#0B2F6B",
    },
    {
      id: "reports",
      icon: "BarChart3",
      title: "Reports & Insights",
      copy: "Occupancy, collection and arrears trends that guide decisions.",
      accent: "#2F6FED",
    },
    {
      id: "secure",
      icon: "ShieldCheck",
      title: "Secure & Controlled",
      copy: "Role-based access scopes every record to its workspace.",
      accent: "#159A72",
    },
  ],

  roles: [
    {
      id: "manager",
      icon: "LayoutDashboard",
      title: "Property Managers",
      visual: "Run full operations",
      copy: "Own properties, tenants, billing and maintenance in one workspace.",
      cta: { label: "Start managing", href: PUBLIC_ROUTES.managerSignUp },
      ctaLabel: "View portal",
      accent: "#123F8C",
    },
    {
      id: "landlord",
      icon: "TrendingUp",
      title: "Landlords",
      visual: "Portfolio & income",
      copy: "Track revenue, occupancy and payouts. No tenant data clutter.",
      cta: { label: "Open landlord portal", href: PUBLIC_ROUTES.landlordLogin },
      ctaLabel: "View portal",
      accent: "#087F8C",
    },
    {
      id: "agency",
      icon: "Users",
      title: "Agencies",
      visual: "Client portfolios",
      copy: "Manage clients and properties, share revenue cleanly.",
      cta: { label: "Open agency portal", href: PUBLIC_ROUTES.agencyLogin },
      ctaLabel: "View portal",
      accent: "#536D9B",
    },
    {
      id: "tenant",
      icon: "Home",
      title: "Tenants",
      visual: "Home, rent & requests",
      copy: "Pay rent, see invoices, raise maintenance — on any device.",
      cta: { label: "Open tenant portal", href: PUBLIC_ROUTES.tenantLogin },
      ctaLabel: "View portal",
      accent: "#178A67",
    },
    {
      id: "admin",
      icon: "Settings",
      title: "System Administrators",
      visual: "Platform control",
      copy: "Manage organisations and users with scoped permissions.",
      cta: { label: "Admin access", href: PUBLIC_ROUTES.webhostLogin },
      ctaLabel: "View portal",
      accent: "#4657A8",
    },
    {
      id: "webhost",
      icon: "Lock",
      title: "Webhosts",
      visual: "Own the platform",
      copy: "Sell subscriptions, monitor health, keep every workspace in line.",
      cta: { label: "Webhost access", href: PUBLIC_ROUTES.webhostLogin },
      ctaLabel: "View portal",
      accent: "#129DB0",
    },
  ],

  propertyTypes: [
    { id: "residential", icon: "Home", name: "Residential", tagline: "Apartments, estates and rental communities." },
    { id: "commercial", icon: "Building2", name: "Commercial", tagline: "Retail and mixed-use properties." },
    { id: "office", icon: "Landmark", name: "Office", tagline: "Offices and managed workspaces." },
  ],

  metrics: [
    { icon: "LayoutGrid", value: "100%", illustrative: true, label: "Portfolio visibility" },
    { icon: "Network", value: "8+", illustrative: true, label: "Connected workflows" },
    { icon: "Building2", value: "3", illustrative: false, label: "Property types" },
    { icon: "Users", value: "6", illustrative: false, label: "Role-based portals" },
  ],

  finalCta: {
    eyebrow: "Get started",
    title: "Ready to run your portfolio with more control?",
    copy: "Bring properties, tenants, billing, payments and maintenance into one connected workspace.",
    primary: { label: "Book a demo", href: PUBLIC_ROUTES.managerSignUp },
    secondary: { label: "Sign in", href: PUBLIC_ROUTES.managerSignIn },
  },

  footer: {
    tagline: "Run every property from one place.",
    columns: [
      {
        id: "product",
        title: "Product",
        links: [
          { label: "Features", href: "#capabilities" },
          { label: "Pricing", href: PUBLIC_ROUTES.pricing },
          { label: "Manager portal", href: PUBLIC_ROUTES.managerSignUp },
          { label: "Tenant portal", href: PUBLIC_ROUTES.tenantLogin },
        ],
      },
      {
        id: "solutions",
        title: "Solutions",
        links: [
          { label: "Landlords", href: PUBLIC_ROUTES.landlordLogin },
          { label: "Agencies", href: PUBLIC_ROUTES.agencyLogin },
          { label: "Webhosts", href: PUBLIC_ROUTES.webhostLogin },
          { label: "Property types", href: "#property-types" },
        ],
      },
      {
        id: "resources",
        title: "Resources",
        links: [
          { label: "How it works", href: "#capabilities" },
          { label: "Security", href: PUBLIC_ROUTES.legalPrivacy },
          { label: "Design preview", href: PUBLIC_ROUTES.designPreview },
          { label: "Health", href: "/health" },
        ],
      },
      {
        id: "company",
        title: "Company",
        links: [
          { label: "About", href: "#company" },
          { label: "Pricing", href: PUBLIC_ROUTES.pricing },
          { label: "Contact", href: "mailto:enterprise@calqulusrms.com", external: true },
        ],
      },
      {
        id: "legal",
        title: "Legal",
        links: [
          { label: "Privacy policy", href: PUBLIC_ROUTES.legalPrivacy },
          { label: "Terms of service", href: PUBLIC_ROUTES.legalTerms },
          { label: "Cookie policy", href: PUBLIC_ROUTES.legalCookies },
        ],
      },
    ],
    copyright: "© {year} CALQULUS Limited. All rights reserved.",
    legal: ["English (KE)"],
    socials: [],
  },

  sections: [
    "hero",
    "trust",
    "capabilities",
    "roles",
    "propertyTypes",
    "metrics",
    "finalCta",
  ],
};