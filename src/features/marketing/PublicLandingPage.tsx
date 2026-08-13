import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Building2, Users, CreditCard, Wrench, BarChart3, ShieldCheck,
  ArrowRight, Crown, Home, Briefcase, User, Mail, MapPin,
  Menu, X, KeyRound, LineChart, Lock,
} from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Textarea } from "@/shared/components/ui/textarea";
import { cn } from "@/shared/lib/utils";
import calqulusLogo from "@/assets/calqulus-logo-new.jpg";

/* ── CALQULUS public landing page ───────────────────────────────────
   Compact, information-dense executive SaaS landing for the public root.
   No admin login is exposed. Portal buttons link to the EXISTING
   authenticated portal/login routes — no new auth systems. */

const CONTACT_EMAIL = "enterprise@calqulusrms.com";

type Accent = "blue" | "green" | "purple" | "amber" | "cyan" | "teal";

const accentMap: Record<Accent, { icon: string; chip: string; line: string; ring: string }> = {
  blue:   { icon: "text-[hsl(220_87%_51%)]",  chip: "bg-[hsl(220_87%_51%/0.08)] border-[hsl(220_87%_51%/0.2)] text-[hsl(220_87%_45%)]",  line: "bg-[hsl(220_87%_51%)]",  ring: "hover:border-[hsl(220_87%_51%/0.4)]" },
  green:  { icon: "text-emerald-600",          chip: "bg-emerald-500/8 border-emerald-500/20 text-emerald-700",                              line: "bg-emerald-600",         ring: "hover:border-emerald-500/40" },
  purple: { icon: "text-purple-600",           chip: "bg-purple-500/8 border-purple-500/20 text-purple-700",                                  line: "bg-purple-600",          ring: "hover:border-purple-500/40" },
  amber:  { icon: "text-[hsl(32_95%_44%)]",    chip: "bg-[hsl(32_95%_44%/0.08)] border-[hsl(32_95%_44%/0.2)] text-[hsl(28_90%_40%)]",        line: "bg-[hsl(32_95%_44%)]",   ring: "hover:border-[hsl(32_95%_44%/0.4)]" },
  cyan:   { icon: "text-[hsl(199_89%_40%)]",   chip: "bg-[hsl(199_89%_40%/0.08)] border-[hsl(199_89%_40%/0.2)] text-[hsl(199_89%_36%)]",     line: "bg-[hsl(199_89%_40%)]",  ring: "hover:border-[hsl(199_89%_40%/0.4)]" },
  teal:   { icon: "text-[hsl(172_80%_30%)]",   chip: "bg-[hsl(172_80%_30%/0.08)] border-[hsl(172_80%_30%/0.2)] text-[hsl(172_80%_26%)]",     line: "bg-[hsl(172_80%_30%)]",  ring: "hover:border-[hsl(172_80%_30%/0.4)]" },
};

type PortalCard = {
  title: string;
  description: string;
  button: string;
  href: string;
  icon: React.ElementType;
  accent: Accent;
};

const PORTALS: PortalCard[] = [
  { title: "Property Manager", description: "Manage properties, tenants, billing, maintenance and operations.", button: "Manager Portal", href: "/auth",           icon: Briefcase, accent: "blue" },
  { title: "Landlord",         description: "Monitor your properties, income, leases and performance.",        button: "Landlord Portal", href: "/landlord/login", icon: Home,      accent: "green" },
  { title: "Agency",           description: "Manage your agency portfolio, clients and property operations.",  button: "Agency Portal",   href: "/agency/login",   icon: Building2, accent: "purple" },
  { title: "Tenant",           description: "Access your lease, payments, maintenance and property services.", button: "Tenant Portal",   href: "/tenant/login",   icon: User,      accent: "amber" },
];

type Capability = {
  title: string;
  description: string;
  icon: React.ElementType;
  accent: Accent;
};

const CAPABILITIES: Capability[] = [
  { title: "Property Management",  description: "Properties, units and occupancy in one place.",       icon: Building2,   accent: "blue" },
  { title: "Tenant Management",    description: "Invitations, leases and tenant lifecycle.",           icon: Users,       accent: "cyan" },
  { title: "Billing & Payments",   description: "Rent, water billing and M-Pesa collections.",         icon: CreditCard,  accent: "green" },
  { title: "Maintenance",          description: "Requests, routing and contractor tracking.",          icon: Wrench,       accent: "amber" },
  { title: "Reporting & Insights", description: "Financial, occupancy and performance reports.",       icon: BarChart3,   accent: "purple" },
  { title: "Secure Operations",    description: "Role-based access, audit trails and RLS isolation.",   icon: ShieldCheck, accent: "teal" },
];

const NAV_LINKS = [
  { label: "Platform", href: "#platform" },
  { label: "Solutions", href: "#portals" },
  { label: "How It Works", href: "#how-it-works" },
  { label: "Contact", href: "#contact" },
];

export function PublicLandingPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

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

          <div className="flex items-center gap-2">
            <Button asChild size="sm" className="hidden sm:inline-flex shadow-sm">
              <Link to="/auth">
                Get Started
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <button
              type="button"
              aria-label="Toggle menu"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((v) => !v)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border text-muted-foreground hover:text-foreground md:hidden"
            >
              {menuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* Mobile nav */}
        {menuOpen && (
          <nav className="border-t border-border bg-card px-4 py-3 md:hidden">
            <div className="flex flex-col gap-1">
              {NAV_LINKS.map((l) => (
                <a
                  key={l.href}
                  href={l.href}
                  onClick={() => setMenuOpen(false)}
                  className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground"
                >
                  {l.label}
                </a>
              ))}
              <Button asChild size="sm" className="mt-2">
                <Link to="/auth" onClick={() => setMenuOpen(false)}>
                  Get Started
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </nav>
        )}
      </header>

      <main className="mx-auto max-w-6xl px-4 sm:px-6">
        {/* ── HERO ── */}
        <section className="grid grid-cols-1 items-center gap-8 py-10 md:grid-cols-2 md:py-14">
          <div>
            <span className="status-badge status-info mb-4">
              <Crown className="h-3 w-3" /> Property management, unified
            </span>
            <h1 className="page-title text-3xl sm:text-4xl lg:text-[2.75rem]">
              One Platform.
              <br />
              Every Property.
              <br />
              <span className="text-primary">Complete Control.</span>
            </h1>
            <p className="supporting-text mt-4 max-w-md text-sm sm:text-base">
              CALQULUS PMS brings property managers, landlords, agencies and tenants together
              in one intelligent property management platform.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Button asChild size="lg" className="btn-brand shadow-sm">
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
            <ul className="mt-4 space-y-2.5">
              {PORTALS.map((p) => (
                <li key={p.title} className="flex items-center gap-2.5 text-sm">
                  <span className={cn("flex h-6 w-6 items-center justify-center rounded-md", accentMap[p.accent].chip)}>
                    <p.icon className={cn("h-3.5 w-3.5", accentMap[p.accent].icon)} />
                  </span>
                  <span className="font-medium text-foreground">{p.title}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ── PORTAL SELECTION ── */}
        <section id="portals" className="scroll-mt-16 py-8">
          <div className="mb-5">
            <h2 className="section-title">Choose your CALQULUS experience</h2>
            <p className="supporting-text mt-1">
              Four dedicated portals, one connected platform.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {PORTALS.map((p) => {
              const a = accentMap[p.accent];
              return (
                <div
                  key={p.title}
                  className={cn(
                    "enterprise-card relative flex flex-col overflow-hidden p-5 transition-all hover:shadow-md",
                    a.ring
                  )}
                >
                  <div className={cn("absolute left-0 top-0 h-full w-1", a.line)} />
                  <div className="mb-3 flex items-center justify-between">
                    <span className={cn("flex h-10 w-10 items-center justify-center rounded-xl border", a.chip)}>
                      <p.icon className={cn("h-5 w-5", a.icon)} />
                    </span>
                    <span className={cn("status-badge border", a.chip)}>{p.title.split(" ")[0]}</span>
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
              );
            })}
          </div>
        </section>

        {/* ── PLATFORM VALUE ── */}
        <section id="platform" className="scroll-mt-16 py-8">
          <div className="mb-5">
            <h2 className="section-title">Platform value</h2>
            <p className="supporting-text mt-1">
              Core capabilities already present across the application.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {CAPABILITIES.map((c) => {
              const a = accentMap[c.accent];
              return (
                <div
                  key={c.title}
                  className={cn("enterprise-card flex items-start gap-3 p-4 transition-all hover:shadow-md", a.ring)}
                >
                  <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border", a.chip)}>
                    <c.icon className={cn("h-4 w-4", a.icon)} />
                  </span>
                  <div className="min-w-0">
                    <h3 className="card-title-exec">{c.title}</h3>
                    <p className="supporting-text mt-1">{c.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* ── HOW IT WORKS ── */}
        <section id="how-it-works" className="scroll-mt-16 py-8">
          <div className="mb-5">
            <h2 className="section-title">How it works</h2>
            <p className="supporting-text mt-1">Three steps to get running.</p>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {[
              { step: "01", title: "Choose your portal",  text: "Sign in through the manager, landlord, agency or tenant portal.", icon: KeyRound },
              { step: "02", title: "Set up your portfolio", text: "Add properties, units, tenants and lease terms.",                icon: Building2 },
              { step: "03", title: "Run operations",       text: "Collect payments, track maintenance and review reports.",          icon: LineChart },
            ].map((s) => (
              <div key={s.step} className="enterprise-card p-5">
                <div className="flex items-center justify-between">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[hsl(220_87%_51%/0.1)] border border-[hsl(220_87%_51%/0.2)]">
                    <s.icon className="h-4 w-4 text-[hsl(220_87%_51%)]" />
                  </span>
                  <span className="metric-value text-[hsl(220_87%_51%)]">{s.step}</span>
                </div>
                <h3 className="card-title-exec mt-3">{s.title}</h3>
                <p className="supporting-text mt-1">{s.text}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── CONTACT ── */}
        <section id="contact" className="scroll-mt-16 border-t border-border py-10">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
            <div>
              <h2 className="section-title">Talk to CALQULUS</h2>
              <p className="supporting-text mt-2 max-w-md">
                Property management teams, landlords, agencies and property owners can contact us
                to learn more about CALQULUS PMS.
              </p>

              <div className="mt-6 space-y-4">
                <a
                  href={`mailto:${CONTACT_EMAIL}`}
                  className="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3 transition-colors hover:border-primary/40"
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[hsl(220_87%_51%/0.1)] border border-[hsl(220_87%_51%/0.2)]">
                    <Mail className="h-4 w-4 text-[hsl(220_87%_51%)]" />
                  </span>
                  <div>
                    <p className="supporting-text">Email us</p>
                    <p className="text-sm font-semibold text-foreground">{CONTACT_EMAIL}</p>
                  </div>
                </a>

                <div className="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                    <MapPin className="h-4 w-4 text-emerald-600" />
                  </span>
                  <div>
                    <p className="supporting-text">Location</p>
                    <p className="text-sm font-semibold text-foreground">Nairobi, Kenya</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="enterprise-card p-6">
              {submitted ? (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <span className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10 border border-emerald-500/20">
                    <Lock className="h-6 w-6 text-emerald-600" />
                  </span>
                  <h3 className="card-title-exec mt-4">Inquiry received</h3>
                  <p className="supporting-text mt-1 max-w-xs">
                    Thank you for reaching out. Our team will contact you shortly.
                  </p>
                  <Button variant="outline" size="sm" className="mt-4" onClick={() => setSubmitted(false)}>
                    Send another message
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleContactSubmit} className="space-y-4">
                  <div>
                    <label htmlFor="contact-name" className="supporting-text font-medium">Full name</label>
                    <Input id="contact-name" required placeholder="Jane Doe" className="mt-1" />
                  </div>
                  <div>
                    <label htmlFor="contact-email" className="supporting-text font-medium">Work email</label>
                    <Input id="contact-email" required type="email" placeholder="jane@propertygroup.com" className="mt-1" />
                  </div>
                  <div>
                    <label htmlFor="contact-message" className="supporting-text font-medium">Message</label>
                    <Textarea id="contact-message" rows={4} placeholder="Tell us about your property portfolio and key requirements…" className="mt-1" />
                  </div>
                  <Button type="submit" className="btn-brand w-full">
                    Submit inquiry
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </form>
              )}
            </div>
          </div>
        </section>

        {/* ── FOOTER ── */}
        <footer className="border-t border-border py-8">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <div className="flex items-center gap-2">
              <img src={calqulusLogo} alt="" className="h-6 w-6 rounded object-cover" />
              <span className="font-semibold text-navy-primary">CALQULUS PMS</span>
            </div>
            <nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
              {NAV_LINKS.map((l) => (
                <a key={l.href} href={l.href} className="transition-colors hover:text-foreground">
                  {l.label}
                </a>
              ))}
              <Link to="/legal?tab=privacy" className="transition-colors hover:text-foreground">Privacy</Link>
              <Link to="/legal?tab=terms" className="transition-colors hover:text-foreground">Terms</Link>
            </nav>
          </div>
          <p className="supporting-text mt-4 text-center sm:text-left">
            Property management for Kenya and East Africa.
          </p>
        </footer>
      </main>
    </div>
  );
}

export default PublicLandingPage;
