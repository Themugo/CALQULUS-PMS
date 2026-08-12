import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/features/auth/AuthContext';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Checkbox } from '@/shared/components/ui/checkbox';
import { useToast } from '@/shared/hooks/use-toast';
import {
  Eye, EyeOff, User,
  Shield, Building2, Users, CreditCard, BarChart3, Lock,
  ChevronRight,
} from 'lucide-react';
import ForgotPasswordDialog from '@/features/auth/components/ForgotPasswordDialog';
import { BiometricLoginButton } from '@/features/auth/components/BiometricLoginButton';
import { useBiometricAuth } from '@/shared/hooks/useBiometricAuth';
import calqulusLogo from '@/assets/calqulus-logo-new.jpg';
import { ensureSignedInRole } from '@/features/auth/lib/authFlow';

// SECURITY: Demo authentication has been removed for production security.
// Demo accounts can still be used for testing but must be explicitly enabled
// via environment variables and require proper authentication. Production
// deployments should NEVER expose demo login functionality.
//
// NOTE: The landlord self-registration flow has been removed for now.
// Landlords are invited by their property manager (see /landlord/login).

const features = [
  { icon: Building2, title: 'Manage Properties', desc: 'Track every unit, lease, and tenant in one place' },
  { icon: Users, title: 'Happy Tenants', desc: 'Self-service portal with instant payment receipts' },
  { icon: CreditCard, title: 'Collect Payments', desc: 'M-Pesa, Stripe, and automated invoicing' },
  { icon: BarChart3, title: 'Insights That Matter', desc: 'Occupancy, revenue, and arrears at a glance' },
  { icon: Lock, title: 'Built for Trust', desc: 'Bank-grade security with full audit trails' },
];

const LandlordAuth = () => {
  const navigate = useNavigate();
  const { user, signIn, loading, userRole } = useAuth();
  const { toast } = useToast();
  const {
    isAvailable: biometricAvailable,
    biometryType,
    hasStoredCredentials,
    isLoading: biometricLoading,
    performBiometricLogin,
    saveCredentials,
  } = useBiometricAuth();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [enableBiometric, setEnableBiometric] = useState(false);
  const [isBiometricLoggingIn, setIsBiometricLoggingIn] = useState(false);
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  useEffect(() => {
    if (user && !loading && userRole) {
      if (userRole.role === 'landlord') navigate('/landlord/dashboard');
      else if (userRole.role === 'tenant') navigate('/portal');
      else if (userRole.role === 'webhost') navigate('/webhost');
      else if (userRole.role === 'submanager') navigate('/');
      else navigate('/properties');
    }
  }, [user, loading, userRole, navigate]);

  const handleBiometricLogin = async () => {
    setIsBiometricLoggingIn(true);
    try {
      const credentials = await performBiometricLogin();
      if (credentials) {
        const { error } = await signIn(credentials.email, credentials.password);
        if (error) {
          toast({ title: 'Login failed', description: 'Biometric auth succeeded but login failed.', variant: 'destructive' });
        } else {
          const roleCheck = await ensureSignedInRole(['manager', 'submanager', 'landlord']);
          if (!roleCheck.ok) toast({ title: 'Wrong portal', description: roleCheck.message, variant: 'destructive' });
        }
      }
    } finally {
      setIsBiometricLoggingIn(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    const { error } = await signIn(loginEmail, loginPassword);
    if (error) {
      toast({
        title: 'Login failed',
        description: error.message === 'Invalid login credentials' ? 'Invalid email or password.' : error.message,
        variant: 'destructive',
      });
      setIsSubmitting(false);
      return;
    }
    const roleCheck = await ensureSignedInRole(['manager', 'submanager', 'landlord']);
    if (!roleCheck.ok) {
      const roles = roleCheck.roles;
      if (roles.includes('tenant')) navigate('/portal');
      else if (roles.includes('webhost')) navigate('/webhost');
      else toast({ title: 'No active role', description: roleCheck.message, variant: 'destructive' });
      setIsSubmitting(false);
      return;
    }
    if (enableBiometric && biometricAvailable) {
      await saveCredentials(loginEmail, loginPassword);
      toast({ title: 'Biometric login enabled!', description: 'You can now use biometrics to log in.' });
    } else {
      toast({ title: 'Welcome back!', description: 'Signed in successfully.' });
    }
    setIsSubmitting(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground hero-gradient">
        <div className="flex flex-col items-center gap-4">
          <img src={calqulusLogo} alt="CALQULUS PMS" className="h-16 w-auto animate-pulse-soft" />
          <div className="flex gap-1.5">
            {[0,1,2].map(i => (
              <div key={i} className="w-2 h-2 rounded-full bg-primary/10 animate-pulse-soft" style={{ animationDelay: `${i * 0.2}s` }} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-background text-foreground hero-gradient">
      {/* Left panel — hero/brand */}
      <div className="hidden lg:flex lg:w-[55%] flex-col relative overflow-hidden">
        {/* Background pattern */}
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(circle at 20% 80%, hsl(218 62% 18% / 0.8) 0%, transparent 60%),
                            radial-gradient(circle at 80% 20%, hsl(42 51% 55% / 0.08) 0%, transparent 50%),
                            radial-gradient(circle at 60% 60%, hsl(214 73% 48% / 0.06) 0%, transparent 40%)`
        }} />

        {/* Grid pattern overlay */}
        <div className="absolute inset-0 opacity-5" style={{
          backgroundImage: `linear-gradient(hsl(42 51% 55% / 0.4) 1px, transparent 1px),
                            linear-gradient(90deg, hsl(42 51% 55% / 0.4) 1px, transparent 1px)`,
          backgroundSize: '48px 48px',
        }} />

        <div className="relative z-10 flex flex-col h-full p-12">
          {/* Navbar strip */}
          <div className="flex items-center gap-4 pb-8 mb-12 border-b border-border">
            <img src={calqulusLogo} alt="CALQULUS PMS" className="h-14 w-auto object-contain" />
            <div>
              <p className="font-heading font-bold text-xl text-gradient leading-none tracking-tight">CALQULUS</p>
              <p className="text-[11px] text-primary font-semibold tracking-[0.25em] uppercase mt-1.5">Property Management System</p>
            </div>
          </div>

          {/* Main headline */}
          <div className="flex-1 flex flex-col justify-center">
            <p className="text-primary text-sm font-semibold tracking-[0.2em] uppercase mb-5">Elevating Property Management</p>
            <h1 className="font-heading text-[3.4rem] font-bold leading-[1.08] tracking-tight mb-6">
              <span className="text-foreground">Manage smarter.</span>
              <br />
              <span className="text-gradient">Collect faster.</span>
              <br />
              <span className="text-muted-foreground">Grow bigger.</span>
            </h1>
            <p className="text-muted-foreground text-lg leading-relaxed max-w-md mb-12">
              The complete property management platform for East Africa — from single units to full portfolios.
            </p>

            {/* Feature list */}
            <div className="space-y-4">
              {features.map((f, i) => (
                <div key={i} className="flex items-center gap-4 group">
                  <div className="h-9 w-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0 group-hover:bg-primary/10 transition-colors">
                    <f.icon className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-muted-foreground text-sm font-semibold">{f.title}</p>
                    <p className="text-muted-foreground text-xs">{f.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Footer strip */}
          <div className="flex items-center justify-between gap-6 pt-8 mt-4 border-t border-border">
            <p className="text-muted-foreground text-xs">© {new Date().getFullYear()} CALQULUS · calqulus.site</p>
            <div className="flex gap-5">
              <a href="/tenant/login" className="text-muted-foreground hover:text-primary text-xs transition-colors">Tenant portal</a>
              <a href="/webhost/login" className="text-muted-foreground hover:text-primary text-xs transition-colors">Admin login</a>
              <a href="/legal" className="text-muted-foreground hover:text-primary text-xs transition-colors">Legal</a>
            </div>
          </div>
        </div>
      </div>

      {/* Right panel — auth form */}
      <div className="w-full lg:w-[45%] flex items-center justify-center px-4 sm:px-8 py-12 relative">
        <div className="absolute inset-0 bg-muted lg:bg-muted backdrop-blur-none" />

        <div className="relative w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden flex justify-center mb-8">
            <img src={calqulusLogo} alt="CALQULUS PMS" className="h-14 w-auto object-contain" />
          </div>

          {/* Form card */}
          <div className="rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-sm">
            <div className="mb-6">
              <h2 className="font-heading text-[1.75rem] font-bold text-foreground tracking-tight mb-1.5">Welcome back</h2>
              <p className="text-muted-foreground text-sm">Sign in to your CALQULUS PMS account</p>
            </div>

            {/* Biometric */}
            {biometricAvailable && hasStoredCredentials && !biometricLoading && (
              <div className="mb-5">
                <BiometricLoginButton
                  biometryType={biometryType}
                  onPress={handleBiometricLogin}
                  isLoading={isBiometricLoggingIn}
                  className="border-primary/20 text-primary hover:bg-primary/10 font-semibold"
                />
                <div className="relative my-5">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-border" />
                  </div>
                  <div className="relative flex justify-center text-xs">
                    <span className="bg-card px-2 text-muted-foreground font-medium">or continue with email</span>
                  </div>
                </div>
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="login-email" className="text-muted-foreground text-sm font-medium">Email address</Label>
                <Input
                  id="login-email"
                  type="email"
                  placeholder="you@example.com"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  required
                  className="bg-muted border-border text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-primary/20 h-11"
                />
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="login-password" className="text-muted-foreground text-sm font-medium">Password</Label>
                  <ForgotPasswordDialog
                    variant="landlord"
                    trigger={
                      <button type="button" className="text-primary hover:text-amber-200 text-xs font-semibold">
                        Forgot password?
                      </button>
                    }
                  />
                </div>
                <div className="relative">
                  <Input
                    id="login-password"
                    type={showLoginPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    required
                    className="bg-muted border-border text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-primary/20 h-11 pr-11"
                  />
                  <button
                    type="button"
                    onClick={() => setShowLoginPassword(!showLoginPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showLoginPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {biometricAvailable && !hasStoredCredentials && (
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="enable-biometric"
                    checked={enableBiometric}
                    onCheckedChange={(c) => setEnableBiometric(c as boolean)}
                    className="border-border data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                  />
                  <label htmlFor="enable-biometric" className="text-sm text-muted-foreground cursor-pointer">
                    Enable {biometryType === 'faceId' ? 'Face ID' : 'fingerprint'} login
                  </label>
                </div>
              )}

              <Button
                type="submit"
                className="w-full h-11 btn-brand text-sm font-bold"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <span className="flex items-center gap-2">
                    <span className="h-4 w-4 rounded-full border-2 border-slate-900/30 border-t-slate-900 animate-spin" />
                    Signing in…
                  </span>
                ) : (
                  <span className="flex items-center gap-2">Sign In <ChevronRight className="h-4 w-4" /></span>
                )}
              </Button>
            </form>

            {/* Other portals */}
            <div className="mt-6 pt-5 border-t border-border space-y-2">
              <p className="text-muted-foreground text-xs text-center mb-3">Other portals</p>
              <div className="grid grid-cols-2 gap-2">
                <a href="/tenant/login" className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg border border-border bg-muted hover:bg-muted hover:border-primary/20 transition-all text-muted-foreground hover:text-foreground text-xs font-semibold">
                  <User className="h-3 w-3" /> Tenant Login
                </a>
                <a href="/webhost/login" className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg border border-border bg-muted hover:bg-muted hover:border-primary/20 transition-all text-muted-foreground hover:text-foreground text-xs font-semibold">
                  <Shield className="h-3 w-3" /> Admin Login
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LandlordAuth;
