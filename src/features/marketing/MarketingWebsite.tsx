import { useState } from 'react';
import {
  Building2,
  ShieldCheck,
  TrendingUp,
  Users,
  CreditCard,
  Droplets,
  Wrench,
  FileText,
  CheckCircle2,
  ArrowRight,
  ChevronRight,
  Sparkles,
  Lock,
  Globe2,
  BarChart3,
  MessageSquare,
  HelpCircle,
  Mail,
  Phone,
  MapPin,
  Check,
  Zap,
  Award,
  Clock,
  ExternalLink,
  ChevronDown,
  Layers
} from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Textarea } from '@/shared/components/ui/textarea';
import { Badge } from '@/shared/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/shared/components/ui/card';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/shared/components/ui/accordion';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu';

export function MarketingWebsite() {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('annual');
  const [unitCount, setUnitCount] = useState<number>(50);
  const [activeTab, setActiveTab] = useState<'manager' | 'agency' | 'landlord' | 'tenant'>('manager');
  const [contactSubmitted, setContactSubmitted] = useState(false);
  const [contactForm, setContactForm] = useState({ name: '', email: '', company: '', message: '' });

  const calculateEstimate = (basePrice: number) => {
    const mult = billingCycle === 'annual' ? 0.8 : 1.0;
    return Math.round(basePrice * unitCount * mult);
  };

  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactForm.email || !contactForm.name) return;
    setContactSubmitted(true);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-emerald-500 selection:text-white">
      {/* ── STICKY TOP NAVIGATION ── */}
      <header className="sticky top-0 z-50 bg-slate-950/80 backdrop-blur-md border-b border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <Building2 className="h-6 w-6 text-slate-950" />
            </div>
            <div>
              <span className="text-xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
                CALQULUS <span className="text-emerald-400">RMS</span>
              </span>
              <span className="hidden sm:inline-block ml-2 text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Enterprise v2.4
              </span>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-300">
            <a href="#features" className="hover:text-emerald-400 transition-colors">Features</a>
            <a href="#solutions" className="hover:text-emerald-400 transition-colors">Solutions</a>
            <a href="#analytics" className="hover:text-emerald-400 transition-colors">Analytics</a>
            <a href="#security" className="hover:text-emerald-400 transition-colors">Security</a>
            <a href="#pricing" className="hover:text-emerald-400 transition-colors">Pricing</a>
            <a href="#faq" className="hover:text-emerald-400 transition-colors">FAQ</a>
            <a href="#contact" className="hover:text-emerald-400 transition-colors">Contact</a>
          </nav>

          <div className="flex items-center gap-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800 hover:text-white text-xs sm:text-sm">
                  Portal Login <ChevronDown className="ml-1.5 h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 bg-slate-900 border-slate-800 text-slate-200">
                <DropdownMenuItem asChild className="hover:bg-slate-800 cursor-pointer">
                  <a href="/auth" className="flex items-center justify-between">
                    <span>Manager Portal</span>
                    <ArrowRight className="h-3.5 w-3.5 text-emerald-400" />
                  </a>
                </DropdownMenuItem>
                <DropdownMenuItem asChild className="hover:bg-slate-800 cursor-pointer">
                  <a href="/agency/login" className="flex items-center justify-between">
                    <span>Agency Portal</span>
                    <ArrowRight className="h-3.5 w-3.5 text-emerald-400" />
                  </a>
                </DropdownMenuItem>
                <DropdownMenuItem asChild className="hover:bg-slate-800 cursor-pointer">
                  <a href="/landlord/login" className="flex items-center justify-between">
                    <span>Landlord Portal</span>
                    <ArrowRight className="h-3.5 w-3.5 text-emerald-400" />
                  </a>
                </DropdownMenuItem>
                <DropdownMenuItem asChild className="hover:bg-slate-800 cursor-pointer">
                  <a href="/tenant/login" className="flex items-center justify-between">
                    <span>Tenant Portal</span>
                    <ArrowRight className="h-3.5 w-3.5 text-emerald-400" />
                  </a>
                </DropdownMenuItem>
                <DropdownMenuItem asChild className="hover:bg-slate-800 cursor-pointer text-slate-400">
                  <a href="/webhost/login" className="flex items-center justify-between">
                    <span>Platform Webhost</span>
                    <Lock className="h-3.5 w-3.5" />
                  </a>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button asChild className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-semibold shadow-lg shadow-emerald-500/25 text-xs sm:text-sm">
              <a href="#pricing">Get Started Free</a>
            </Button>
          </div>
        </div>
      </header>

      {/* ── HERO SECTION ── */}
      <section className="relative pt-20 pb-28 overflow-hidden">
        {/* Glowing Ambient Backgrounds */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-1/3 right-10 w-[400px] h-[400px] bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 px-4 py-1.5 text-sm rounded-full mb-8 inline-flex items-center gap-2">
            <Sparkles className="h-4 w-4" /> The Next-Generation Real Estate Operating System
          </Badge>

          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight max-w-5xl mx-auto leading-tight">
            Automate Property Operations & <br className="hidden sm:inline" />
            <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 bg-clip-text text-transparent">
              Maximize Portfolio Yield
            </span>
          </h1>

          <p className="mt-6 text-lg sm:text-xl text-slate-400 max-w-3xl mx-auto leading-relaxed">
            CALQULUS RMS bridges Property Managers, Agencies, Landlords, and Tenants into one intelligent, zero-friction cloud ecosystem with automated water billing, instant M-Pesa STK push, and strict security firewalls.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button asChild size="lg" className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold px-8 text-base shadow-xl shadow-emerald-500/20 w-full sm:w-auto">
              <a href="/tenant/signup">
                Start 14-Day Free Trial <ArrowRight className="ml-2 h-5 w-5" />
              </a>
            </Button>
            <Button asChild size="lg" variant="outline" className="border-slate-800 bg-slate-900/80 hover:bg-slate-800 text-slate-200 px-8 text-base w-full sm:w-auto">
              <a href="#contact">
                Schedule Enterprise Demo
              </a>
            </Button>
          </div>

          {/* Key Metrics Strip */}
          <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto p-6 bg-slate-900/60 rounded-2xl border border-slate-800/80 backdrop-blur-sm">
            <div>
              <div className="text-3xl font-extrabold text-emerald-400">99.4%</div>
              <div className="text-xs text-slate-400 mt-1 uppercase tracking-wider font-medium">On-Time Rent Rate</div>
            </div>
            <div>
              <div className="text-3xl font-extrabold text-teal-400">100k+</div>
              <div className="text-xs text-slate-400 mt-1 uppercase tracking-wider font-medium">Units Managed</div>
            </div>
            <div>
              <div className="text-3xl font-extrabold text-cyan-400">&lt; 3 mins</div>
              <div className="text-xs text-slate-400 mt-1 uppercase tracking-wider font-medium">Water Billing Run</div>
            </div>
            <div>
              <div className="text-3xl font-extrabold text-emerald-400">$0</div>
              <div className="text-xs text-slate-400 mt-1 uppercase tracking-wider font-medium">Data Leakage Risks</div>
            </div>
          </div>
        </div>
      </section>

      {/* ── VALUE PROPOSITION & OPERATING MODELS ── */}
      <section id="solutions" className="py-24 bg-slate-900/40 border-y border-slate-800/60 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-xs font-bold text-emerald-400 uppercase tracking-widest mb-3">Operating Architectures</h2>
            <h3 className="text-3xl sm:text-4xl font-extrabold text-slate-100">
              Built for Every Real Estate Ownership Model
            </h3>
            <p className="mt-4 text-slate-400 text-base">
              Choose the exact operational framework matching your business model. CALQULUS RMS enforces strict role isolation with purpose-built portals.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card className="bg-slate-900 border-slate-800 hover:border-emerald-500/40 transition-all duration-300">
              <CardHeader>
                <div className="h-12 w-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mb-4">
                  <Building2 className="h-6 w-6" />
                </div>
                <CardTitle className="text-xl text-slate-100">Property Managers</CardTitle>
                <CardDescription className="text-slate-400">Full Operational Autonomy</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-slate-300">
                <p>Direct tenant management, automated lease agreements, maintenance ticket tracking, and split rent payouts.</p>
                <ul className="space-y-2 pt-2">
                  <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" /> Water meter billing engine</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" /> Multi-channel tenant invites</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" /> Financial statement exports</li>
                </ul>
              </CardContent>
            </Card>

            <Card className="bg-slate-900 border-slate-800 hover:border-teal-500/40 transition-all duration-300">
              <CardHeader>
                <div className="h-12 w-12 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-400 flex items-center justify-center mb-4">
                  <Layers className="h-6 w-6" />
                </div>
                <CardTitle className="text-xl text-slate-100">Property Agencies</CardTitle>
                <CardDescription className="text-slate-400">Commission & Portfolio Hub</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-slate-300">
                <p>Manage multiple properties on behalf of third-party landlords with automated commission calculations.</p>
                <ul className="space-y-2 pt-2">
                  <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-teal-400 shrink-0" /> Configurable revenue sharing %</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-teal-400 shrink-0" /> Submanager staff permissions</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-teal-400 shrink-0" /> Unified agency portfolio dashboard</li>
                </ul>
              </CardContent>
            </Card>

            <Card className="bg-slate-900 border-slate-800 hover:border-cyan-500/40 transition-all duration-300">
              <CardHeader>
                <div className="h-12 w-12 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center mb-4">
                  <ShieldCheck className="h-6 w-6" />
                </div>
                <CardTitle className="text-xl text-slate-100">Landlords & Owners</CardTitle>
                <CardDescription className="text-slate-400">Revenue-Only Guarded View</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-slate-300">
                <p>Real-time occupancy metrics, payout requests, and financial performance without tenant PII clutter.</p>
                <ul className="space-y-2 pt-2">
                  <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-cyan-400 shrink-0" /> Strict zero-PII privacy guarantee</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-cyan-400 shrink-0" /> Net yield & occupancy analytics</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-cyan-400 shrink-0" /> Direct landlord payout requests</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* ── CORE FEATURES SHOWCASE ── */}
      <section id="features" className="py-24 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-xs font-bold text-emerald-400 uppercase tracking-widest mb-3">Engineered Excellence</h2>
            <h3 className="text-3xl sm:text-4xl font-extrabold text-slate-100">
              Comprehensive Real Estate Feature Suite
            </h3>
            <p className="mt-4 text-slate-400 text-base">
              From lease execution to utility billing and financial statements, everything is built for scale.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition-colors">
              <Droplets className="h-8 w-8 text-emerald-400 mb-4" />
              <h4 className="text-lg font-bold text-slate-100 mb-2">Automated Water Billing</h4>
              <p className="text-sm text-slate-400 leading-relaxed">
                Record unit meter readings, auto-calculate consumption charges against custom tariff rates, and publish utility statements in seconds.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition-colors">
              <CreditCard className="h-8 w-8 text-teal-400 mb-4" />
              <h4 className="text-lg font-bold text-slate-100 mb-2">Instant Rent Reconciliation</h4>
              <p className="text-sm text-slate-400 leading-relaxed">
                Support M-Pesa STK push, feature phone Paybill, and direct bank transfers with instant SMS and email receipt generation.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition-colors">
              <Users className="h-8 w-8 text-cyan-400 mb-4" />
              <h4 className="text-lg font-bold text-slate-100 mb-2">Tenant Invitation Flow</h4>
              <p className="text-sm text-slate-400 leading-relaxed">
                Managers enter unit data upfront. Tenants receive SMS/Email invites and complete account setup with 1-click password creation.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition-colors">
              <Wrench className="h-8 w-8 text-emerald-400 mb-4" />
              <h4 className="text-lg font-bold text-slate-100 mb-2">Maintenance & Operations</h4>
              <p className="text-sm text-slate-400 leading-relaxed">
                Track tenant service tickets from submission to resolution with priority tagging, contractor dispatch, and vendor cost logs.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition-colors">
              <FileText className="h-8 w-8 text-teal-400 mb-4" />
              <h4 className="text-lg font-bold text-slate-100 mb-2">Lease & Document Engine</h4>
              <p className="text-sm text-slate-400 leading-relaxed">
                Generate digital contracts, track signature statuses, store lease agreements securely, and issue formal vacation notices.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition-colors">
              <Lock className="h-8 w-8 text-cyan-400 mb-4" />
              <h4 className="text-lg font-bold text-slate-100 mb-2">Granular Role Firewall</h4>
              <p className="text-sm text-slate-400 leading-relaxed">
                Webhosts cannot access tenant PII, landlords see revenue only, and submanager team members operate strictly within assigned properties.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── INTERACTIVE PRODUCT PREVIEW MOCKUP ── */}
      <section className="py-20 bg-slate-900/50 border-y border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <h2 className="text-xs font-bold text-emerald-400 uppercase tracking-widest mb-3">Live Experience</h2>
            <h3 className="text-3xl font-extrabold text-slate-100">Explore the Enterprise Interface</h3>
          </div>

          <div className="flex justify-center gap-2 sm:gap-4 mb-8">
            <Button
              variant={activeTab === 'manager' ? 'default' : 'outline'}
              onClick={() => setActiveTab('manager')}
              className={activeTab === 'manager' ? 'bg-emerald-500 text-slate-950 font-bold' : 'border-slate-800 bg-slate-900 text-slate-300'}
            >
              Manager View
            </Button>
            <Button
              variant={activeTab === 'agency' ? 'default' : 'outline'}
              onClick={() => setActiveTab('agency')}
              className={activeTab === 'agency' ? 'bg-emerald-500 text-slate-950 font-bold' : 'border-slate-800 bg-slate-900 text-slate-300'}
            >
              Agency Portal
            </Button>
            <Button
              variant={activeTab === 'landlord' ? 'default' : 'outline'}
              onClick={() => setActiveTab('landlord')}
              className={activeTab === 'landlord' ? 'bg-emerald-500 text-slate-950 font-bold' : 'border-slate-800 bg-slate-900 text-slate-300'}
            >
              Landlord Analytics
            </Button>
            <Button
              variant={activeTab === 'tenant' ? 'default' : 'outline'}
              onClick={() => setActiveTab('tenant')}
              className={activeTab === 'tenant' ? 'bg-emerald-500 text-slate-950 font-bold' : 'border-slate-800 bg-slate-900 text-slate-300'}
            >
              Tenant Mobile App
            </Button>
          </div>

          <div className="bg-slate-900 rounded-2xl border border-slate-800 p-4 sm:p-8 shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between pb-6 border-b border-slate-800 mb-6">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-red-500/80" />
                <div className="h-3 w-3 rounded-full bg-amber-500/80" />
                <div className="h-3 w-3 rounded-full bg-emerald-500/80" />
                <span className="text-xs font-mono text-slate-500 ml-2">app.calqulusrms.com/{activeTab}</span>
              </div>
              <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20">Live System Sync</Badge>
            </div>

            {activeTab === 'manager' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                    <div className="text-xs text-slate-400">Total Monthly Collections</div>
                    <div className="text-2xl font-bold text-emerald-400 mt-1">$48,250.00</div>
                    <div className="text-xs text-emerald-500 mt-1">+14% vs last month</div>
                  </div>
                  <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                    <div className="text-xs text-slate-400">Portfolio Occupancy</div>
                    <div className="text-2xl font-bold text-teal-400 mt-1">96.8%</div>
                    <div className="text-xs text-slate-500 mt-1">142 / 146 units occupied</div>
                  </div>
                  <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                    <div className="text-xs text-slate-400">Water Billing Readings</div>
                    <div className="text-2xl font-bold text-cyan-400 mt-1">Completed</div>
                    <div className="text-xs text-cyan-500 mt-1">142 meters verified</div>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                  <div className="text-sm font-semibold text-slate-200 mb-3">Recent Rent Transactions (STK Push & Paybill)</div>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between items-center p-2 rounded bg-slate-900">
                      <div>
                        <span className="font-medium text-slate-200">Unit 4B - Grand Plaza</span>
                        <span className="text-slate-500 ml-2">M-Pesa Ref: QKS8921A</span>
                      </div>
                      <Badge className="bg-emerald-500/20 text-emerald-400">Paid $850.00</Badge>
                    </div>
                    <div className="flex justify-between items-center p-2 rounded bg-slate-900">
                      <div>
                        <span className="font-medium text-slate-200">Unit 12A - Riverside Suites</span>
                        <span className="text-slate-500 ml-2">M-Pesa Ref: QKS7810B</span>
                      </div>
                      <Badge className="bg-emerald-500/20 text-emerald-400">Paid $1,200.00</Badge>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'agency' && (
              <div className="space-y-6">
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                  <div className="text-sm font-semibold text-slate-200 mb-2">Agency Portfolio Revenue Share Matrix</div>
                  <p className="text-xs text-slate-400 mb-4">Commission splits automatically calculated prior to landlord payout dispatches.</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div className="p-3 bg-slate-900 rounded-lg border border-slate-800">
                      <div className="font-semibold text-emerald-400">Summit Heights (10 Landlords)</div>
                      <div className="mt-1 text-slate-300">Commission Rate: 8.5%</div>
                      <div className="text-slate-400 mt-0.5">Net Agency Yield: $3,420 / mo</div>
                    </div>
                    <div className="p-3 bg-slate-900 rounded-lg border border-slate-800">
                      <div className="font-semibold text-teal-400">Apex Commercial Center</div>
                      <div className="mt-1 text-slate-300">Commission Rate: 10.0%</div>
                      <div className="text-slate-400 mt-0.5">Net Agency Yield: $5,100 / mo</div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'landlord' && (
              <div className="space-y-6">
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs">
                  <div className="flex items-center justify-between mb-4">
                    <span className="font-semibold text-slate-200 text-sm">Landlord Revenue & Occupancy Guard</span>
                    <Badge className="bg-cyan-500/20 text-cyan-400">Zero Tenant PII Mode</Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="p-3 bg-slate-900 rounded-lg">
                      <div className="text-slate-400">Property Share Revenue</div>
                      <div className="text-xl font-bold text-emerald-400 mt-1">$22,400.00</div>
                    </div>
                    <div className="p-3 bg-slate-900 rounded-lg">
                      <div className="text-slate-400">Pending Payout Dispatch</div>
                      <div className="text-xl font-bold text-amber-400 mt-1">$4,800.00</div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'tenant' && (
              <div className="max-w-md mx-auto p-4 rounded-2xl bg-slate-950 border border-slate-800 text-xs space-y-4">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-slate-100 text-sm">Tenant Mobile Hub</span>
                  <Badge className="bg-emerald-500/20 text-emerald-400">Unit 304</Badge>
                </div>
                <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-center">
                  <div className="text-slate-300">Current Balance Due</div>
                  <div className="text-3xl font-extrabold text-emerald-400 mt-1">$0.00</div>
                  <div className="text-emerald-400 mt-1 font-medium">Lease Status: Active</div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-center">
                  <Button size="sm" className="bg-emerald-500 text-slate-950 font-bold">Pay Rent</Button>
                  <Button size="sm" variant="outline" className="border-slate-800 text-slate-300">Submit Repair</Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── SECURITY & COMPLIANCE ── */}
      <section id="security" className="py-24 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 mb-4">
                Bank-Grade Security
              </Badge>
              <h3 className="text-3xl sm:text-4xl font-extrabold text-slate-100 leading-tight">
                Built With Zero-Trust Architecture & Row-Level Security
              </h3>
              <p className="mt-4 text-slate-400 text-base leading-relaxed">
                Your portfolio data is guarded by military-grade encryption, Supabase Row-Level Security (RLS) policies, and strict organizational boundaries.
              </p>

              <div className="mt-8 space-y-4">
                <div className="flex gap-4">
                  <div className="h-10 w-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                    <Lock className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-200 text-base">256-Bit AES & TLS 1.3 Encryption</h4>
                    <p className="text-xs text-slate-400 mt-1">All data in transit and at rest is fully encrypted using standard cryptographic primitives.</p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="h-10 w-10 rounded-lg bg-teal-500/10 border border-teal-500/20 text-teal-400 flex items-center justify-center shrink-0">
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-200 text-base">Supabase Row-Level Security</h4>
                    <p className="text-xs text-slate-400 mt-1">Database rows are isolated by manager ID. Cross-account data leakage is programmatically impossible.</p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="h-10 w-10 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center shrink-0">
                    <Award className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-200 text-base">Landlord PII Firewall</h4>
                    <p className="text-xs text-slate-400 mt-1">Landlords enjoy revenue analytics without exposure to individual tenant personal information.</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
              <div className="text-xs font-mono text-emerald-400 uppercase tracking-widest">Compliance Matrix</div>
              <div className="divide-y divide-slate-800 text-sm">
                <div className="py-3 flex justify-between items-center">
                  <span className="text-slate-300 font-medium">SOC 2 Type II Certified</span>
                  <Badge className="bg-emerald-500/20 text-emerald-400">Verified</Badge>
                </div>
                <div className="py-3 flex justify-between items-center">
                  <span className="text-slate-300 font-medium">Data Protection Act Compliance</span>
                  <Badge className="bg-emerald-500/20 text-emerald-400">Compliant</Badge>
                </div>
                <div className="py-3 flex justify-between items-center">
                  <span className="text-slate-300 font-medium">Audit Trail Logging</span>
                  <Badge className="bg-emerald-500/20 text-emerald-400">Active</Badge>
                </div>
                <div className="py-3 flex justify-between items-center">
                  <span className="text-slate-300 font-medium">System Uptime SLA</span>
                  <Badge className="bg-teal-500/20 text-teal-400">99.99%</Badge>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── PRICING CALCULATOR & TIERS ── */}
      <section id="pricing" className="py-24 bg-slate-900/40 border-y border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-xs font-bold text-emerald-400 uppercase tracking-widest mb-3">Transparent Investment</h2>
            <h3 className="text-3xl sm:text-4xl font-extrabold text-slate-100">
              Simple Unit-Based Pricing
            </h3>
            <p className="mt-4 text-slate-400 text-base">
              Pay only for the active units you manage. Scale up or down anytime with zero setup fees.
            </p>

            {/* Billing Toggle */}
            <div className="mt-8 inline-flex items-center gap-3 p-1.5 bg-slate-900 border border-slate-800 rounded-full">
              <button
                onClick={() => setBillingCycle('monthly')}
                className={`px-5 py-2 rounded-full text-xs font-semibold transition-all ${
                  billingCycle === 'monthly' ? 'bg-slate-800 text-slate-100' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Monthly Billing
              </button>
              <button
                onClick={() => setBillingCycle('annual')}
                className={`px-5 py-2 rounded-full text-xs font-semibold transition-all ${
                  billingCycle === 'annual' ? 'bg-emerald-500 text-slate-950' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Annual (Save 20%)
              </button>
            </div>

            {/* Dynamic Slider */}
            <div className="mt-8 max-w-md mx-auto bg-slate-900 p-6 rounded-2xl border border-slate-800">
              <div className="flex justify-between items-center text-xs mb-2">
                <span className="text-slate-400">Select Your Unit Count:</span>
                <span className="font-bold text-emerald-400 text-base">{unitCount} Units</span>
              </div>
              <input
                type="range"
                min="10"
                max="500"
                step="10"
                value={unitCount}
                onChange={(e) => setUnitCount(Number(e.target.value))}
                className="w-full accent-emerald-500 cursor-pointer"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Lite */}
            <Card className="bg-slate-900 border-slate-800 relative">
              <CardHeader>
                <CardTitle className="text-xl text-slate-100">Starter Lite</CardTitle>
                <CardDescription className="text-slate-400">For boutique property owners</CardDescription>
                <div className="mt-4">
                  <span className="text-4xl font-extrabold text-slate-100">${calculateEstimate(1.50)}</span>
                  <span className="text-slate-400 text-xs ml-2">/ month</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-2.5 text-xs text-slate-300">
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-emerald-400" /> Up to 50 active units</li>
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-emerald-400" /> Basic rent tracking</li>
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-emerald-400" /> Tenant SMS invitations</li>
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-emerald-400" /> Standard financial reports</li>
                </ul>
                <Button asChild className="w-full bg-slate-800 hover:bg-slate-700 text-slate-100 mt-4">
                  <a href="/tenant/signup">Choose Lite Plan</a>
                </Button>
              </CardContent>
            </Card>

            {/* Pro */}
            <Card className="bg-slate-900 border-emerald-500/50 relative shadow-xl shadow-emerald-500/10">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <Badge className="bg-emerald-500 text-slate-950 font-bold text-xs px-3">MOST POPULAR</Badge>
              </div>
              <CardHeader>
                <CardTitle className="text-xl text-slate-100">Professional</CardTitle>
                <CardDescription className="text-slate-400">For growing property managers</CardDescription>
                <div className="mt-4">
                  <span className="text-4xl font-extrabold text-emerald-400">${calculateEstimate(2.20)}</span>
                  <span className="text-slate-400 text-xs ml-2">/ month</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-2.5 text-xs text-slate-300">
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-emerald-400" /> Unlimited properties & units</li>
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-emerald-400" /> Automated water billing engine</li>
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-emerald-400" /> Landlord portal & PII guard</li>
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-emerald-400" /> Maintenance workflow engine</li>
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-emerald-400" /> Priority 24/7 phone support</li>
                </ul>
                <Button asChild className="w-full bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold mt-4">
                  <a href="/tenant/signup">Start 14-Day Free Trial</a>
                </Button>
              </CardContent>
            </Card>

            {/* Enterprise */}
            <Card className="bg-slate-900 border-slate-800 relative">
              <CardHeader>
                <CardTitle className="text-xl text-slate-100">Agency & Enterprise</CardTitle>
                <CardDescription className="text-slate-400">For major management firms</CardDescription>
                <div className="mt-4">
                  <span className="text-4xl font-extrabold text-slate-100">Custom</span>
                  <span className="text-slate-400 text-xs ml-2">volume rates</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-2.5 text-xs text-slate-300">
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-emerald-400" /> Multi-branch submanager RBAC</li>
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-emerald-400" /> Dedicated account manager</li>
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-emerald-400" /> Custom API & ERP integrations</li>
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-emerald-400" /> Tailored SLA guarantees</li>
                </ul>
                <Button asChild variant="outline" className="w-full border-slate-800 bg-slate-900 text-slate-200 hover:bg-slate-800 mt-4">
                  <a href="#contact">Contact Sales Team</a>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* ── FREQUENTLY ASKED QUESTIONS (FAQ) ── */}
      <section id="faq" className="py-24 relative">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-xs font-bold text-emerald-400 uppercase tracking-widest mb-3">Answers & Clarity</h2>
            <h3 className="text-3xl sm:text-4xl font-extrabold text-slate-100">
              Frequently Asked Questions
            </h3>
          </div>

          <Accordion type="single" collapsible className="space-y-4">
            <AccordionItem value="item-1" className="border border-slate-800 bg-slate-900/60 rounded-xl px-4">
              <AccordionTrigger className="text-slate-200 hover:text-emerald-400 text-sm font-semibold">
                How does CALQULUS RMS isolate landlord data from tenant PII?
              </AccordionTrigger>
              <AccordionContent className="text-xs text-slate-400 leading-relaxed">
                Landlords access a dedicated portal view focused purely on aggregate property metrics, monthly collection totals, and occupancy percentages. Individual tenant names, phone numbers, and identifying credentials are programmatically scrubbed at the database security policy level.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-2" className="border border-slate-800 bg-slate-900/60 rounded-xl px-4">
              <AccordionTrigger className="text-slate-200 hover:text-emerald-400 text-sm font-semibold">
                How does automated water billing work?
              </AccordionTrigger>
              <AccordionContent className="text-xs text-slate-400 leading-relaxed">
                In the Water Billing module, property managers enter current unit meter readings. The system automatically computes previous vs. current consumption, applies tariff multipliers, generates line-item invoices, and posts them to tenant balance statements automatically.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-3" className="border border-slate-800 bg-slate-900/60 rounded-xl px-4">
              <AccordionTrigger className="text-slate-200 hover:text-emerald-400 text-sm font-semibold">
                Can I assign submanager staff members with limited permissions?
              </AccordionTrigger>
              <AccordionContent className="text-xs text-slate-400 leading-relaxed">
                Yes! Property managers can invite team members under the Submanager role via Settings → Team. You can selectively assign permissions for specific properties, maintenance execution, or view-only financial monitoring.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-4" className="border border-slate-800 bg-slate-900/60 rounded-xl px-4">
              <AccordionTrigger className="text-slate-200 hover:text-emerald-400 text-sm font-semibold">
                Is M-Pesa STK push and payment reconciliation supported?
              </AccordionTrigger>
              <AccordionContent className="text-xs text-slate-400 leading-relaxed">
                Yes. CALQULUS RMS supports direct M-Pesa STK push prompts, feature phone Paybill payments, and bank transfer receipts with automated instant SMS and email confirmation delivery.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </section>

      {/* ── CONTACT & INQUIRY FORM ── */}
      <section id="contact" className="py-24 bg-slate-900/50 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            <div>
              <h2 className="text-xs font-bold text-emerald-400 uppercase tracking-widest mb-3">Get In Touch</h2>
              <h3 className="text-3xl sm:text-4xl font-extrabold text-slate-100">
                Ready to Modernize Your Property Operations?
              </h3>
              <p className="mt-4 text-slate-400 text-base leading-relaxed">
                Our team of real estate technology specialists is ready to walk you through a tailored demo or assist with portfolio data migration.
              </p>

              <div className="mt-8 space-y-4 text-sm text-slate-300">
                <div className="flex items-center gap-3">
                  <Mail className="h-5 w-5 text-emerald-400" />
                  <span>enterprise@calqulusrms.com</span>
                </div>
                <div className="flex items-center gap-3">
                  <Phone className="h-5 w-5 text-emerald-400" />
                  <span>+254 (0) 700 000 000</span>
                </div>
                <div className="flex items-center gap-3">
                  <MapPin className="h-5 w-5 text-emerald-400" />
                  <span>Nairobi Financial Center, Upper Hill</span>
                </div>
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-6 sm:p-8 rounded-2xl">
              {contactSubmitted ? (
                <div className="text-center py-12 space-y-4">
                  <div className="h-12 w-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
                    <CheckCircle2 className="h-6 w-6" />
                  </div>
                  <h4 className="text-xl font-bold text-slate-100">Inquiry Received</h4>
                  <p className="text-xs text-slate-400">Thank you for reaching out. An enterprise specialist will contact you within 2 business hours.</p>
                  <Button variant="outline" onClick={() => setContactSubmitted(false)} className="border-slate-800 text-slate-300">
                    Send Another Message
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleContactSubmit} className="space-y-4">
                  <div>
                    <label className="text-xs font-medium text-slate-300">Full Name</label>
                    <Input
                      required
                      placeholder="Jane Doe"
                      value={contactForm.name}
                      onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                      className="bg-slate-950 border-slate-800 text-slate-100 mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-300">Work Email</label>
                    <Input
                      required
                      type="email"
                      placeholder="jane@propertygroup.com"
                      value={contactForm.email}
                      onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                      className="bg-slate-950 border-slate-800 text-slate-100 mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-300">Company / Organization</label>
                    <Input
                      placeholder="Apex Real Estate Ltd"
                      value={contactForm.company}
                      onChange={(e) => setContactForm({ ...contactForm, company: e.target.value })}
                      className="bg-slate-950 border-slate-800 text-slate-100 mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-300">Message / Request Details</label>
                    <Textarea
                      rows={4}
                      placeholder="Tell us about your property portfolio size and key requirements..."
                      value={contactForm.message}
                      onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
                      className="bg-slate-950 border-slate-800 text-slate-100 mt-1"
                    />
                  </div>
                  <Button type="submit" className="w-full bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold">
                    Submit Enterprise Inquiry
                  </Button>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="bg-slate-950 border-t border-slate-800/80 py-16 text-xs text-slate-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-12">
            <div className="col-span-2">
              <div className="flex items-center gap-2 mb-4">
                <div className="h-8 w-8 rounded-lg bg-emerald-500 flex items-center justify-center text-slate-950 font-bold">
                  <Building2 className="h-5 w-5" />
                </div>
                <span className="text-base font-bold text-slate-100">CALQULUS RMS</span>
              </div>
              <p className="text-xs text-slate-400 max-w-sm leading-relaxed mb-4">
                The leading enterprise real estate management system powering property managers, agencies, landlords, and tenants across East Africa and beyond.
              </p>
              <div className="flex items-center gap-2 text-emerald-400 font-mono text-[11px]">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" /> All Systems Operational
              </div>
            </div>

            <div>
              <h5 className="font-bold text-slate-200 mb-3 uppercase tracking-wider text-[11px]">Platform</h5>
              <ul className="space-y-2">
                <li><a href="/auth" className="hover:text-emerald-400 transition-colors">Manager Dashboard</a></li>
                <li><a href="/agency/login" className="hover:text-emerald-400 transition-colors">Agency Portal</a></li>
                <li><a href="/landlord/login" className="hover:text-emerald-400 transition-colors">Landlord Portal</a></li>
                <li><a href="/tenant/login" className="hover:text-emerald-400 transition-colors">Tenant App</a></li>
              </ul>
            </div>

            <div>
              <h5 className="font-bold text-slate-200 mb-3 uppercase tracking-wider text-[11px]">Solutions</h5>
              <ul className="space-y-2">
                <li><a href="#features" className="hover:text-emerald-400 transition-colors">Water Billing</a></li>
                <li><a href="#features" className="hover:text-emerald-400 transition-colors">M-Pesa Reconciliation</a></li>
                <li><a href="#features" className="hover:text-emerald-400 transition-colors">Maintenance Desk</a></li>
                <li><a href="#security" className="hover:text-emerald-400 transition-colors">Landlord Firewall</a></li>
              </ul>
            </div>

            <div>
              <h5 className="font-bold text-slate-200 mb-3 uppercase tracking-wider text-[11px]">Legal & Governance</h5>
              <ul className="space-y-2">
                <li><a href="/legal" className="hover:text-emerald-400 transition-colors">Privacy Policy</a></li>
                <li><a href="/legal" className="hover:text-emerald-400 transition-colors">Terms of Service</a></li>
                <li><a href="#security" className="hover:text-emerald-400 transition-colors">Security Whitepaper</a></li>
                <li><a href="/legal" className="hover:text-emerald-400 transition-colors">Data Protection</a></li>
              </ul>
            </div>
          </div>

          <div className="pt-8 border-t border-slate-800/60 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p>© {new Date().getFullYear()} CALQULUS RMS. All rights reserved. Registered Enterprise Software.</p>
            <div className="flex gap-6">
              <a href="/legal" className="hover:text-slate-200">Legal Notice</a>
              <a href="#security" className="hover:text-slate-200">Security</a>
              <a href="#contact" className="hover:text-slate-200">Support</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default MarketingWebsite;
