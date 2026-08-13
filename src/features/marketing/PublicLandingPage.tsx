import { Link } from "react-router-dom";
import {
  Building2, Users, CreditCard, Wrench, BarChart3, ShieldCheck,
  ArrowRight, Crown, Home, Briefcase, User,
} from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { cn } from "@/shared/lib/utils";
import calqulusLogo from "@/assets/calqulus-logo-new.jpg";

/* ── CALQULUS public landing page ───────────────────────────────────
   Compact, information-dense executive SaaS landing for the public root.
   No admin login is exposed. Portal buttons link to the EXISTING
   authenticated portal/login routes — no new auth systems. */

type PortalCard = {
  title: string;
  description: string;
  button: string;
  href: string;
  icon: React.ElementType;
  iconClass: string;
};

const PORTALS: PortalCard[] = [
  {
    title: "Property Manager",
    description: "Manage properties, tenants, billing, maintenance and operations.",
    button: "Manager Portal",
    href: "/auth",
    icon: Briefcase,
    iconClass: "text-primary",
  },
  {
    title: "Landlord",
    description: "Monitor your properties, income, leases and performance.",
    button: "Landlord Portal",
    href: "/landlord/login",
    icon: Home,
    iconClass: "text-gold",
  },
  {
    title: "Agency",
    description: "Manage your agency portfolio, clients and property operations.",
    button: "Agency Portal",
    href: "/agency/login",
    icon: Building2,
    iconClass: "text-primary",
  },
  {
    title: "Tenant",
    description: "Access your lease, payments, maintenance and property services.",
    button: "Tenant Portal",
    href: "/tenant/login",
    icon: User,
    iconClass: "text-success",
  },
];

type Capability = {
  title: string;
  description: string;
  icon: React.ElementType;
};

const CAPABILITIES: Capability[] = [
  { title: "Property Management", description: "Properties, units and occupancy in one place.", icon: Building2 },
  { title: "Tenant Management", description: "Invitations, leases and tenant lifecycle.", icon: Users },
  { title: "Billing & Payments", description: "Rent, water billing and M-Pesa collections.", icon: CreditCard },
  { title: "Maintenance", description: "Requests, routing and contractor tracking.", icon: Wrench },
  { title: "Reporting & Insights", description: "Financial, occupancy and performance reports.", icon: BarChart3 },
  { title: "Secure Operations", description: "Role-based access, audit trails and RLS isolation.", icon: ShieldCheck },
];

const NAV_LINKS = [
  { label: "Platform", href: "#platform" },
  { label: "Solutions", href: "#portals" },
  { label: "How It Works", href: "#how-it-works" },
  { label: "Contact", href: "#contact" },
];

export function PublicLandingPage() {
  return (
    <div className="min-h-screen bg-secondary-background text-foreground font-sans">
      {/* ── HEADER ── */}
      <header className="sticky top-0 z-40 border-b border-border bg-card/90 backdrop-blur-sm">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link to="/" className="flex items-center gap-2.5" aria-label="CALQULUS PMS home">
            <img src={calqulusLogo} alt="" className="h-7 w-7 rounded-md object-cover" />
            <span className="text-base font-bold tracking-tight text-navy-primary">
              CALQULUS <span className="text-primary">PMS</span>
            </span>
          </Link>

          <nav className="hidden items-center gap-7 text-sm font-medium text-muted-foreground md:flex">
            {NAV_LINKS.map((l) => (
              <a key={l.href} href={l.href} className="transition-colors hover:text-foreground">
                {l.label}
              </a>
            ))}
          </nav>

          <Button asChild size="sm" className="shadow-sm">
            <Link to="/auth">
              Get Started
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 sm:px-6">
        {/* ── HERO ── */}
        <section className="grid grid-cols-1 items-center gap-8 py-12 md:grid-cols-2 md:py-16">
          <div>
            <h1 className="font-[Outfit,sans-serif] text-3xl font-bold leading-tight tracking-tight text-navy-primary sm:text-4xl">
              One Platform.
              <br />
              Every Property.
              <br />
              <span className="text-primary">Complete Control.</span>
            </h1>
            <p className="mt-4 max-w-md text-sm leading-relaxed text-muted-foreground sm:text-base">
              CALQULUS PMS brings property managers, landlords, agencies and tenants together
              in one intelligent property management platform.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Button asChild size="lg" className="shadow-sm">
                <Link to="/auth">
                  Get Started
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <a href="#platform">Explore the Platform</a>
              </Button>
            </div>
          </div>

          {/* Compact executive highlight panel */}
          <div className="enterprise-card hidden p-6 md:block">
            <div className="flex items-center gap-2">
              <Crown className="h-5 w-5 text-gold" />
              <span className="card-title-exec">One platform, four journeys</span>
            </div>
            <p className="supporting-text mt-2">
              A unified property management layer for managers, landlords, agencies and tenants —
              with role-based access and secure isolation built in.
            </p>
            <ul className="mt-4 space-y-2">
              {PORTALS.map((p) => (
                <li key={p.title} className="flex items-center gap-2 text-sm">
                  <p.icon className={cn("h-4 w-4 shrink-0", p.iconClass)} />
                  <span className="font-medium text-foreground">{p.title}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ── PORTAL SELECTION ── */}
        <section id="portals" className="py-10">
          <div className="mb-6">
            <h2 className="section-title">Choose your CALQULUS experience</h2>
            <p className="supporting-text mt-1">
              Four dedicated portals, one connected platform.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {PORTALS.map((p) => (
              <div
                key={p.title}
                className="enterprise-card flex flex-col p-5 transition-shadow hover:shadow-md"
              >
                <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-secondary">
                  <p.icon className={cn("h-5 w-5", p.iconClass)} />
                </div>
                <h3 className="card-title-exec">{p.title}</h3>
                <p className="supporting-text mt-1.5 flex-1">{p.description}</p>
                <Button asChild size="sm" variant="outline" className="mt-4 w-full justify-center">
                  <Link to={p.href}>
                    {p.button}
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </Button>
              </div>
            ))}
          </div>
        </section>

        {/* ── PLATFORM VALUE ── */}
        <section id="platform" className="py-10">
          <div className="mb-6">
            <h2 className="section-title">Platform value</h2>
            <p className="supporting-text mt-1">
              Core capabilities already present across the application.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {CAPABILITIES.map((c) => (
              <div
                key={c.title}
                className="enterprise-card flex items-start gap-3 p-4 transition-shadow hover:shadow-md"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-secondary">
                  <c.icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="card-title-exec">{c.title}</h3>
                  <p className="supporting-text mt-1">{c.description}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── HOW IT WORKS ── */}
        <section id="how-it-works" className="py-10">
          <div className="mb-6">
            <h2 className="section-title">How it works</h2>
            <p className="supporting-text mt-1">Three steps to get running.</p>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {[
              { step: "1", title: "Choose your portal", text: "Sign in through the manager, landlord, agency or tenant portal." },
              { step: "2", title: "Set up your portfolio", text: "Add properties, units, tenants and lease terms." },
              { step: "3", title: "Run operations", text: "Collect payments, track maintenance and review reports." },
            ].map((s) => (
              <div key={s.step} className="enterprise-card p-5">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                  {s.step}
                </span>
                <h3 className="card-title-exec mt-3">{s.title}</h3>
                <p className="supporting-text mt-1">{s.text}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── CONTACT / FOOTER ── */}
        <section id="contact" className="border-t border-border py-10">
          <div className="enterprise-card flex flex-col items-start justify-between gap-4 p-6 md:flex-row md:items-center">
            <div>
              <h2 className="section-title">Ready to get started?</h2>
              <p className="supporting-text mt-1">
                Choose a portal and sign in to begin managing your properties.
              </p>
            </div>
            <Button asChild size="lg" className="shadow-sm">
              <Link to="/auth">
                Get Started
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>

          <footer className="mt-8 flex flex-col items-center justify-between gap-3 border-t border-border pt-6 text-sm text-muted-foreground sm:flex-row">
            <div className="flex items-center gap-2">
              <img src={calqulusLogo} alt="" className="h-5 w-5 rounded object-cover" />
              <span className="font-semibold text-navy-primary">CALQULUS PMS</span>
            </div>
            <p className="supporting-text">
              Property management for Kenya and East Africa.
            </p>
          </footer>
        </section>
      </main>
    </div>
  );
}

export default PublicLandingPage;
