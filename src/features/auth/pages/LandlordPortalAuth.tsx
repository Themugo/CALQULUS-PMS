import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/features/auth/AuthContext';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { useToast } from '@/shared/hooks/use-toast';
import { Home, Shield, Eye, EyeOff, ChevronRight, TrendingUp, FileText, Building2 } from 'lucide-react';
import ForgotPasswordDialog from '@/features/auth/components/ForgotPasswordDialog';
import { sanitizeAuthError } from '@/features/auth/lib/authFlow';
import calqulusLogo from '@/assets/calqulus-logo-new.png';

const features = [
  { icon: Building2,  text: 'Portfolio overview — all your properties in one place' },
  { icon: TrendingUp, text: 'Revenue tracking with landlord-to-manager revenue splits' },
  { icon: FileText,   text: 'Monthly statements, lease summaries & occupancy reports' },
  { icon: Shield,     text: 'Secure access to your investment performance data' },
];

const LandlordPortalAuth = () => {
  const navigate = useNavigate();
  const { user, signIn, loading, userRole } = useAuth();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (user && !loading && userRole) {
      if (userRole.role === 'landlord') navigate('/landlord/dashboard');
      else if (userRole.role === 'manager') navigate('/');
      else if (userRole.role === 'tenant') navigate('/portal');
      else if (userRole.role === 'webhost') navigate('/webhost');
    }
  }, [user, loading, userRole, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setIsSubmitting(true);
    const { error } = await signIn(email, password);
    if (error) {
      toast({ title: 'Login failed', description: sanitizeAuthError(error.message), variant: 'destructive' });
    }
    setIsSubmitting(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center hero-gradient">
        <div className="flex flex-col items-center gap-4">
          <img src={calqulusLogo} alt="CALQULUS PMS" className="h-14 w-auto animate-pulse-soft" />
          <div className="flex gap-1.5">
            {[0,1,2].map(i => (
              <div key={i} className="w-2 h-2 rounded-full bg-amber-400/60 animate-pulse-soft"
                style={{ animationDelay: `${i * 0.2}s` }} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex hero-gradient">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-[55%] flex-col relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.035]" style={{
          backgroundImage: `linear-gradient(hsl(42 51% 55% / 0.5) 1px, transparent 1px),
                            linear-gradient(90deg, hsl(42 51% 55% / 0.5) 1px, transparent 1px)`,
          backgroundSize: '48px 48px',
        }} />
        <div className="absolute inset-0" style={{
          background: `radial-gradient(circle at 20% 80%, hsl(218 62% 18% / 0.8) 0%, transparent 60%),
                       radial-gradient(circle at 80% 20%, hsl(42 51% 55% / 0.07) 0%, transparent 50%)`
        }} />

        <div className="relative z-10 flex flex-col h-full p-12">
          <div className="flex items-center gap-4 mb-16">
            <img src={calqulusLogo} alt="CALQULUS PMS" className="h-14 w-auto object-contain" />
            <div>
              <p className="font-heading font-bold text-xl text-gradient leading-none">CALQULUS</p>
              <p className="text-[11px] text-amber-400/60 font-semibold tracking-[0.25em] uppercase mt-1">Landlord Portal</p>
            </div>
          </div>

          <div className="flex-1 flex flex-col justify-center">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-amber-400/25 bg-amber-400/8 mb-6 self-start">
              <Home className="h-3.5 w-3.5 text-amber-400" />
              <span className="text-xs text-amber-300 font-medium">Property Owner Access</span>
            </div>

            <h1 className="font-heading text-5xl font-bold leading-tight mb-6">
              <span className="text-white">Your portfolio.</span>
              <br />
              <span className="text-gradient">Your returns.</span>
              <br />
              <span className="text-white/70">Full visibility.</span>
            </h1>
            <p className="text-white/50 text-lg leading-relaxed max-w-md mb-12">
              Track revenue, occupancy and statements for all your properties managed through CALQULUS PMS.
            </p>

            <div className="space-y-4">
              {features.map((f, i) => (
                <div key={i} className="flex items-center gap-4">
                  <div className="h-9 w-9 rounded-lg bg-amber-400/10 border border-amber-400/20 flex items-center justify-center flex-shrink-0">
                    <f.icon className="h-4 w-4 text-amber-400" />
                  </div>
                  <p className="text-white/70 text-sm font-medium">{f.text}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-6 pt-8 border-t border-white/10">
            <p className="text-white/30 text-xs">calqulus.site</p>
            <div className="flex gap-3">
              <Link to="/landlord" className="text-white/30 hover:text-amber-400/70 text-xs transition-colors">Manager login</Link>
              <Link to="/tenant/login" className="text-white/30 hover:text-amber-400/70 text-xs transition-colors">Tenant portal</Link>
            </div>
          </div>
        </div>
      </div>

      {/* Right panel */}
      <div className="w-full lg:w-[45%] flex items-center justify-center px-4 sm:px-8 py-12">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex justify-center mb-8">
            <img src={calqulusLogo} alt="CALQULUS PMS" className="h-14 w-auto object-contain" />
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.06] backdrop-blur-xl p-6 sm:p-8 shadow-2xl">
            <div className="mb-6">
              <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full border border-amber-400/25 bg-amber-400/8 mb-4">
                <Home className="h-3 w-3 text-amber-400" />
                <span className="text-[11px] text-amber-300 font-semibold tracking-wider uppercase">Landlord Portal</span>
              </div>
              <h2 className="font-heading text-2xl font-bold text-white mb-1">Welcome back</h2>
              <p className="text-white/50 text-sm">Sign in to view your property portfolio</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-white/80 text-sm font-medium">Email address</Label>
                <Input
                  id="email" type="email" placeholder="owner@example.com"
                  value={email} onChange={e => setEmail(e.target.value)} required
                  className="bg-white/8 border-white/15 text-white placeholder:text-white/30 focus:border-amber-400/60 focus:ring-amber-400/20 h-11"
                />
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-white/80 text-sm font-medium">Password</Label>
                  <ForgotPasswordDialog
                    trigger={
                      <button type="button" className="text-amber-400/80 hover:text-amber-400 text-xs font-medium">
                        Forgot password?
                      </button>
                    }
                  />
                </div>
                <div className="relative">
                  <Input
                    id="password" type={showPassword ? 'text' : 'password'} placeholder="••••••••"
                    value={password} onChange={e => setPassword(e.target.value)} required
                    className="bg-white/8 border-white/15 text-white placeholder:text-white/30 focus:border-amber-400/60 focus:ring-amber-400/20 h-11 pr-11"
                  />
                  <button type="button" onClick={() => setShowPassword(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 transition-colors">
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <Button type="submit" disabled={isSubmitting} className="w-full h-11 btn-brand text-sm font-bold mt-2">
                {isSubmitting ? (
                  <span className="flex items-center gap-2">
                    <span className="h-4 w-4 rounded-full border-2 border-slate-900/30 border-t-slate-900 animate-spin" />
                    Signing in…
                  </span>
                ) : (
                  <span className="flex items-center gap-2">Sign in to Landlord Portal <ChevronRight className="h-4 w-4" /></span>
                )}
              </Button>
            </form>

            {/* Info notice */}
            <div className="mt-5 p-3.5 rounded-xl border border-amber-400/15 bg-amber-400/5">
              <div className="flex items-start gap-2.5">
                <Shield className="h-4 w-4 text-amber-400/70 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-white/50 leading-relaxed">
                  This portal is for property owners. Your property manager will invite you by email.
                  If you haven't received an invitation, contact your property manager.
                </p>
              </div>
            </div>

            {/* Other portals */}
            <div className="mt-5 pt-5 border-t border-white/10">
              <p className="text-white/30 text-[11px] text-center mb-3">Other portals</p>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: 'Manager', href: '/landlord' },
                  { label: 'Tenant', href: '/tenant/login' },
                  { label: 'Admin', href: '/webhost/login' },
                ].map(p => (
                  <Link key={p.href} to={p.href}
                    className="flex items-center justify-center py-2 px-2 rounded-lg border border-white/10 bg-white/5 hover:bg-white/8 hover:border-amber-400/20 transition-all text-white/40 hover:text-white/70 text-xs font-medium">
                    {p.label}
                  </Link>
                ))}
              </div>
            </div>

            <div className="flex justify-center gap-4 mt-4">
              <Link to="/legal?tab=privacy" className="text-xs text-white/20 hover:text-white/50 transition-colors">Privacy</Link>
              <span className="text-white/20 text-xs">·</span>
              <Link to="/legal?tab=terms" className="text-xs text-white/20 hover:text-white/50 transition-colors">Terms</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LandlordPortalAuth;
