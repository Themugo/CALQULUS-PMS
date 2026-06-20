import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/features/auth/AuthContext';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';
import { Checkbox } from '@/shared/components/ui/checkbox';
import { useToast } from '@/shared/hooks/use-toast';
import {
  CheckCircle, XCircle, Mail, Eye, EyeOff, User, Building, Home,
  Shield, Briefcase, Building2, Users, CreditCard, BarChart3, Lock,
  ChevronRight,
} from 'lucide-react';
import { signupSchema, formatValidationErrors } from '@/shared/lib/validations';
import ForgotPasswordDialog from '@/features/auth/components/ForgotPasswordDialog';
import { BiometricLoginButton } from '@/features/auth/components/BiometricLoginButton';
import { useBiometricAuth } from '@/shared/hooks/useBiometricAuth';
import { supabase } from '@/integrations/supabase/client';
import calqulusLogo from '@/assets/calqulus-logo-new.png';
import { ensureSignedInRole, sanitizeAuthError } from '@/features/auth/lib/authFlow';

interface DemoAccount {
  role: string;
  label: string;
  email: string;
  password: string;
  portal: string;
  badge: string;
  icon: React.ReactNode;
  description: string;
}

const features = [
  { icon: Building2, title: 'Manage Properties', desc: 'Track every unit, lease, and tenant in one place' },
  { icon: Users, title: 'Happy Tenants', desc: 'Self-service portal with instant payment receipts' },
  { icon: CreditCard, title: 'Collect Payments', desc: 'M-Pesa, Stripe, and automated invoicing' },
  { icon: BarChart3, title: 'Insights That Matter', desc: 'Occupancy, revenue, and arrears at a glance' },
  { icon: Lock, title: 'Built for Trust', desc: 'Bank-grade security with full audit trails' },
];

const LandlordAuth = () => {
  const navigate = useNavigate();
  const { user, signIn, signUp, loading, userRole } = useAuth();
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
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupFullName, setSignupFullName] = useState('');
  const [showVerificationMessage, setShowVerificationMessage] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState('');
  const [enableBiometric, setEnableBiometric] = useState(false);
  const [isBiometricLoggingIn, setIsBiometricLoggingIn] = useState(false);
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [signupEmailError, setSignupEmailError] = useState('');
  const [demoLoggingIn, setDemoLoggingIn] = useState<string | null>(null);
  const [demoSeeding, setDemoSeeding] = useState(false);
  const demoEnabled = import.meta.env.VITE_ENABLE_PUBLIC_DEMO === 'true';
  const demoSeedEnabled = import.meta.env.VITE_ENABLE_DEMO_SEED === 'true';
  const demoSeedSecret = import.meta.env.VITE_DEMO_SEED_SECRET || '';

  const demoAccounts: DemoAccount[] = demoEnabled ? [
    { role: 'manager', label: 'James Kariuki', email: 'demo.manager@calqulusrms.com', password: 'Demo@2026', portal: '/', badge: 'MANAGER', icon: <Building className="h-4 w-4" />, description: '3 properties · 5 tenants · Pro tier' },
    { role: 'tenant-linked', label: 'Grace Wanjiku', email: 'demo.tenant1@calqulusrms.com', password: 'Demo@2026', portal: '/portal', badge: 'TENANT', icon: <User className="h-4 w-4" />, description: 'Flat A3 · KES 8,500/mo' },
    { role: 'landlord', label: 'Peter Mwangi', email: 'demo.landlord@calqulusrms.com', password: 'Demo@2026', portal: '/landlord/dashboard', badge: 'LANDLORD', icon: <Briefcase className="h-4 w-4" />, description: '2 properties · KES 108K net rent' },
    { role: 'agent', label: 'Fatuma Abubakar', email: 'demo.agent@calqulusrms.com', password: 'Demo@2026', portal: '/', badge: 'AGENT', icon: <Shield className="h-4 w-4" />, description: 'Submanager · tenants + maintenance' },
  ] : [];

  const loginAs = async (account: DemoAccount) => {
    setDemoLoggingIn(account.email);
    try {
      await supabase.auth.signOut();
      const { error } = await supabase.auth.signInWithPassword({ email: account.email, password: account.password });
      if (error) throw error;
      navigate(account.portal);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      toast({ title: 'Demo login failed', description: sanitizeAuthError(message), variant: 'destructive' });
    } finally {
      setDemoLoggingIn(null);
    }
  };

  const reseedDemoAccounts = async () => {
    if (!demoSeedEnabled || !demoSeedSecret) {
      toast({ title: 'Demo seed disabled', description: 'Enable VITE_ENABLE_DEMO_SEED to reseed.', variant: 'destructive' });
      return;
    }
    setDemoSeeding(true);
    try {
      const { data, error } = await supabase.functions.invoke('seed-demo-data', {
        body: { action: 'reset' },
        headers: { 'X-Demo-Secret': demoSeedSecret },
      });
      if (error) throw error;
      toast({ title: 'Demo accounts reset', description: 'Demo users and portfolio refreshed.' });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      toast({ title: 'Failed to reset demo', description: sanitizeAuthError(message), variant: 'destructive' });
    } finally {
      setDemoSeeding(false);
    }
  };

  const validateEmail = (email: string): boolean => {
    if (!email) return true;
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const handleSignupEmailChange = (email: string) => {
    setSignupEmail(email);
    setSignupEmailError(email && !validateEmail(email) ? 'Please enter a valid email address' : '');
  };

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

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    const validationResult = signupSchema.safeParse({ email: signupEmail, password: signupPassword, fullName: signupFullName });
    if (!validationResult.success) {
      toast({ title: 'Validation Error', description: formatValidationErrors(validationResult.error), variant: 'destructive' });
      setIsSubmitting(false);
      return;
    }
    const { error } = await signUp(signupEmail, signupPassword, signupFullName, 'landlord');
    if (error) {
      toast({
        title: 'Signup failed',
        description: error.message.includes('already registered') ? 'This email is already registered.' : sanitizeAuthError(error.message),
        variant: 'destructive',
      });
    } else {
      setRegisteredEmail(signupEmail);
      setShowVerificationMessage(true);
      toast({ title: 'Check your email!', description: 'We sent a verification link to complete your registration.' });
    }
    setIsSubmitting(false);
  };

  const getPasswordStrength = (password: string) => ({
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
    special: /[^A-Za-z0-9]/.test(password),
  });
  const passwordStrength = getPasswordStrength(signupPassword);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center hero-gradient">
        <div className="flex flex-col items-center gap-4">
          <img src={calqulusLogo} alt="CALQULUS PMS" className="h-16 w-auto animate-pulse-soft" />
          <div className="flex gap-1.5">
            {[0,1,2].map(i => (
              <div key={i} className="w-2 h-2 rounded-full bg-amber-400/60 animate-pulse-soft" style={{ animationDelay: `${i * 0.2}s` }} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (showVerificationMessage) {
    return (
      <div className="min-h-screen flex items-center justify-center hero-gradient px-4">
        <div className="w-full max-w-md rounded-2xl border border-amber-400/20 bg-white/5 backdrop-blur-xl p-8 shadow-2xl text-center">
          <div className="flex justify-center mb-6">
            <div className="h-16 w-16 rounded-full bg-amber-400/15 border border-amber-400/30 flex items-center justify-center">
              <Mail className="h-8 w-8 text-amber-400" />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-white font-heading mb-2">Check Your Email</h2>
          <p className="text-white/60 mb-6">We sent a verification link to</p>
          <p className="text-amber-300 font-semibold text-lg bg-white/5 rounded-xl py-3 px-4 border border-amber-400/20 mb-6">{registeredEmail}</p>
          <p className="text-white/50 text-sm mb-4">Click the link in the email to verify your account and complete registration.</p>
          <button onClick={() => setShowVerificationMessage(false)} className="text-amber-400 hover:text-amber-300 text-sm font-medium">
            ← Back to sign in
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex hero-gradient">
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
          {/* Logo */}
          <div className="flex items-center gap-4 mb-16">
            <img src={calqulusLogo} alt="CALQULUS PMS" className="h-14 w-auto object-contain" />
            <div>
              <p className="font-heading font-bold text-xl text-gradient leading-none">CALQULUS</p>
              <p className="text-[11px] text-amber-400/60 font-semibold tracking-[0.25em] uppercase mt-1">Property Management System</p>
            </div>
          </div>

          {/* Main headline */}
          <div className="flex-1 flex flex-col justify-center">
            <p className="text-amber-400/70 text-sm font-semibold tracking-widest uppercase mb-4">Elevating Property Management</p>
            <h1 className="font-heading text-5xl font-bold leading-tight mb-6">
              <span className="text-white">Manage smarter.</span>
              <br />
              <span className="text-gradient">Collect faster.</span>
              <br />
              <span className="text-white/70">Grow bigger.</span>
            </h1>
            <p className="text-white/50 text-lg leading-relaxed max-w-md mb-12">
              The complete property management platform for East Africa — from single units to full portfolios.
            </p>

            {/* Feature list */}
            <div className="space-y-4">
              {features.map((f, i) => (
                <div key={i} className="flex items-center gap-4 group">
                  <div className="h-9 w-9 rounded-lg bg-amber-400/10 border border-amber-400/20 flex items-center justify-center flex-shrink-0 group-hover:bg-amber-400/15 transition-colors">
                    <f.icon className="h-4 w-4 text-amber-400" />
                  </div>
                  <div>
                    <p className="text-white/90 text-sm font-semibold">{f.title}</p>
                    <p className="text-white/40 text-xs">{f.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom */}
          <div className="flex items-center gap-6 pt-8 border-t border-white/10">
            <p className="text-white/30 text-xs">calqulus.site</p>
            <div className="flex gap-3">
              <a href="/tenant/login" className="text-white/30 hover:text-amber-400/70 text-xs transition-colors">Tenant portal</a>
              <a href="/webhost/login" className="text-white/30 hover:text-amber-400/70 text-xs transition-colors">Admin login</a>
            </div>
          </div>
        </div>
      </div>

      {/* Right panel — auth form */}
      <div className="w-full lg:w-[45%] flex items-center justify-center px-4 sm:px-8 py-12 relative">
        <div className="absolute inset-0 bg-white/[0.03] lg:bg-white/[0.04] backdrop-blur-none" />

        <div className="relative w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden flex justify-center mb-8">
            <img src={calqulusLogo} alt="CALQULUS PMS" className="h-14 w-auto object-contain" />
          </div>

          {/* Form card */}
          <div className="rounded-2xl border border-white/10 bg-white/[0.06] backdrop-blur-xl p-6 sm:p-8 shadow-2xl">
            <div className="mb-6">
              <h2 className="font-heading text-2xl font-bold text-white mb-1">Welcome back</h2>
              <p className="text-white/50 text-sm">Sign in to your CALQULUS PMS account</p>
            </div>

            {/* Biometric */}
            {biometricAvailable && hasStoredCredentials && !biometricLoading && (
              <div className="mb-5">
                <BiometricLoginButton
                  biometryType={biometryType}
                  onPress={handleBiometricLogin}
                  isLoading={isBiometricLoggingIn}
                  className="border-amber-400/30 text-amber-400 hover:bg-amber-400/10"
                />
                <div className="relative my-5">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-white/10" />
                  </div>
                  <div className="relative flex justify-center text-xs">
                    <span className="bg-transparent px-2 text-white/40">or continue with email</span>
                  </div>
                </div>
              </div>
            )}

            <Tabs defaultValue="login" className="w-full">
              <TabsList className="grid w-full grid-cols-2 bg-white/5 border border-white/10 mb-5">
                <TabsTrigger
                  value="login"
                  className="data-[state=active]:bg-amber-400 data-[state=active]:text-slate-900 data-[state=active]:font-bold text-white/60"
                >
                  Sign In
                </TabsTrigger>
                <TabsTrigger
                  value="signup"
                  className="data-[state=active]:bg-amber-400 data-[state=active]:text-slate-900 data-[state=active]:font-bold text-white/60"
                >
                  Create Account
                </TabsTrigger>
              </TabsList>

              {/* Login tab */}
              <TabsContent value="login" className="space-y-4 mt-0">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="login-email" className="text-white/80 text-sm font-medium">Email address</Label>
                    <Input
                      id="login-email"
                      type="email"
                      placeholder="you@example.com"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      required
                      className="bg-white/8 border-white/15 text-white placeholder:text-white/30 focus:border-amber-400/60 focus:ring-amber-400/20 h-11"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="login-password" className="text-white/80 text-sm font-medium">Password</Label>
                      <ForgotPasswordDialog
                        variant="landlord"
                        trigger={
                          <button type="button" className="text-amber-400/80 hover:text-amber-400 text-xs font-medium">
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
                        className="bg-white/8 border-white/15 text-white placeholder:text-white/30 focus:border-amber-400/60 focus:ring-amber-400/20 h-11 pr-11"
                      />
                      <button
                        type="button"
                        onClick={() => setShowLoginPassword(!showLoginPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70"
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
                        className="border-white/30 data-[state=checked]:bg-amber-400 data-[state=checked]:border-amber-400"
                      />
                      <label htmlFor="enable-biometric" className="text-sm text-white/60 cursor-pointer">
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
              </TabsContent>

              {/* Signup tab */}
              <TabsContent value="signup" className="space-y-4 mt-0">
                <form onSubmit={handleSignup} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="signup-name" className="text-white/80 text-sm font-medium">Full name</Label>
                    <Input
                      id="signup-name"
                      type="text"
                      placeholder="John Doe"
                      value={signupFullName}
                      onChange={(e) => setSignupFullName(e.target.value)}
                      required
                      className="bg-white/8 border-white/15 text-white placeholder:text-white/30 focus:border-amber-400/60 h-11"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="signup-email" className="text-white/80 text-sm font-medium">Email address</Label>
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="you@example.com"
                      value={signupEmail}
                      onChange={(e) => handleSignupEmailChange(e.target.value)}
                      required
                      className={`bg-white/8 border-white/15 text-white placeholder:text-white/30 focus:border-amber-400/60 h-11 ${signupEmailError ? 'border-red-400/60' : ''}`}
                    />
                    {signupEmailError && (
                      <p className="text-xs text-red-400 flex items-center gap-1">
                        <XCircle className="h-3 w-3" />{signupEmailError}
                      </p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="signup-password" className="text-white/80 text-sm font-medium">Password</Label>
                    <div className="relative">
                      <Input
                        id="signup-password"
                        type={showSignupPassword ? "text" : "password"}
                        placeholder="••••••••"
                        value={signupPassword}
                        onChange={(e) => setSignupPassword(e.target.value)}
                        required
                        minLength={8}
                        className="bg-white/8 border-white/15 text-white placeholder:text-white/30 focus:border-amber-400/60 h-11 pr-11"
                      />
                      <button
                        type="button"
                        onClick={() => setShowSignupPassword(!showSignupPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70"
                      >
                        {showSignupPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {signupPassword && (
                      <div className="grid grid-cols-2 gap-1.5 mt-2 p-3 bg-white/5 rounded-xl border border-white/10">
                        {[
                          { pass: passwordStrength.length, label: '8+ chars' },
                          { pass: passwordStrength.uppercase, label: 'Uppercase' },
                          { pass: passwordStrength.lowercase, label: 'Lowercase' },
                          { pass: passwordStrength.number, label: 'Number' },
                          { pass: passwordStrength.special, label: 'Symbol' },
                        ].map((check, i) => (
                          <div key={i} className={`flex items-center gap-1.5 text-xs ${check.pass ? 'text-emerald-400' : 'text-white/30'}`}>
                            {check.pass ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                            {check.label}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <Button
                    type="submit"
                    className="w-full h-11 btn-brand text-sm font-bold"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <span className="flex items-center gap-2">
                        <span className="h-4 w-4 rounded-full border-2 border-slate-900/30 border-t-slate-900 animate-spin" />
                        Creating account…
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">Create Account <ChevronRight className="h-4 w-4" /></span>
                    )}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>

            {/* Other portals */}
            <div className="mt-6 pt-5 border-t border-white/10 space-y-2">
              <p className="text-white/40 text-xs text-center mb-3">Other portals</p>
              <div className="grid grid-cols-2 gap-2">
                <a href="/tenant/login" className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg border border-white/10 bg-white/5 hover:bg-white/8 hover:border-amber-400/20 transition-all text-white/50 hover:text-white/80 text-xs font-medium">
                  <User className="h-3 w-3" /> Tenant Login
                </a>
                <a href="/webhost/login" className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg border border-white/10 bg-white/5 hover:bg-white/8 hover:border-amber-400/20 transition-all text-white/50 hover:text-white/80 text-xs font-medium">
                  <Shield className="h-3 w-3" /> Admin Login
                </a>
              </div>
            </div>

            {/* Demo accounts */}
            {demoEnabled && (
              <div className="mt-5 pt-5 border-t border-white/10">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-[11px] tracking-widest uppercase text-white/30 font-semibold">Quick Demo Access</p>
                  <button
                    onClick={reseedDemoAccounts}
                    disabled={demoSeeding}
                    className="text-[10px] text-white/30 hover:text-amber-400/60 transition-colors"
                  >
                    {demoSeeding ? 'Resetting…' : 'Reset demo'}
                  </button>
                </div>
                <div className="space-y-1.5">
                  {demoAccounts.map(acc => (
                    <button
                      key={acc.email}
                      onClick={() => loginAs(acc)}
                      disabled={demoLoggingIn === acc.email}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border border-white/8 bg-white/4 hover:bg-amber-400/8 hover:border-amber-400/25 transition-all text-left disabled:opacity-50"
                    >
                      <div className="h-7 w-7 rounded-lg bg-amber-400/12 border border-amber-400/20 flex items-center justify-center text-amber-400 shrink-0 text-xs">
                        {acc.icon}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-white/80 text-xs font-semibold truncate">{acc.label}</span>
                          <span className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-400/15 text-amber-400/80 shrink-0">{acc.badge}</span>
                        </div>
                        <span className="text-white/35 text-[11px] truncate block">{acc.description}</span>
                      </div>
                      <ChevronRight className="h-3 w-3 text-white/25 shrink-0" />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LandlordAuth;
