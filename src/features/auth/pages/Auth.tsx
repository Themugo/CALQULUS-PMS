import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/features/auth/AuthContext';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';
import { Checkbox } from '@/shared/components/ui/checkbox';
import { useToast } from '@/shared/hooks/use-toast';
import { CheckCircle, XCircle, Eye, EyeOff, ChevronRight, Building2, Users, CreditCard, Wrench } from 'lucide-react';
import { signupSchema, formatValidationErrors } from '@/shared/lib/validations';
import ForgotPasswordDialog from '@/features/auth/components/ForgotPasswordDialog';
import { BiometricLoginButton } from '@/features/auth/components/BiometricLoginButton';
import { useBiometricAuth } from '@/shared/hooks/useBiometricAuth';
import { supabase } from '@/integrations/supabase/client';
import { ensureSignedInRole, sanitizeAuthError } from '@/features/auth/lib/authFlow';
import { trackCommercialEvent } from '@/features/dashboard/lib/commercialMetrics';
import { AuthLoadingScreen, PortalAuthShell, type PortalAuthFeature, type PortalSwitchLink } from '@/features/auth/components/AuthHeroChrome';

const features: PortalAuthFeature[] = [
  { icon: Building2, text: 'Manage properties, units and occupancy in one place' },
  { icon: Users,      text: 'Tenant invitations, leases and lifecycle' },
  { icon: CreditCard, text: 'Rent, water billing and M-Pesa collections' },
  { icon: Wrench,     text: 'Maintenance requests and contractor tracking' },
];

const otherPortals: PortalSwitchLink[] = [
  { label: 'Landlord', href: '/landlord/login' },
  { label: 'Agency', href: '/agency/login' },
  { label: 'Tenant', href: '/tenant/login' },
];

const Auth = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') === 'signup' ? 'signup' : 'login';
  const { user, signIn, signUp, loading } = useAuth();
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
  const [enableBiometric, setEnableBiometric] = useState(false);
  const [isBiometricLoggingIn, setIsBiometricLoggingIn] = useState(false);
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [signupEmailError, setSignupEmailError] = useState('');

  const validateEmail = (email: string): boolean => {
    if (!email) return true;
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const handleSignupEmailChange = (email: string) => {
    setSignupEmail(email);
    if (email && !validateEmail(email)) {
      setSignupEmailError('Please enter a valid email address');
    } else {
      setSignupEmailError('');
    }
  };

  useEffect(() => {
    if (user && !loading) {
      navigate('/');
    }
  }, [user, loading, navigate]);

  const handleBiometricLogin = async () => {
    setIsBiometricLoggingIn(true);
    try {
      const credentials = await performBiometricLogin();
      if (credentials) {
        const { error } = await signIn(credentials.email, credentials.password);
        if (error) {
          toast({ title: 'Login failed', description: 'Biometric auth succeeded but login failed. Please try again.', variant: 'destructive' });
        } else {
          const roleCheck = await ensureSignedInRole(['manager', 'submanager']);
          if (!roleCheck.ok) {
            toast({ title: 'Wrong portal', description: roleCheck.message, variant: 'destructive' });
            return;
          }
          toast({ title: 'Welcome back!', description: 'Logged in with biometrics.' });
          navigate('/');
        }
      } else {
        toast({ title: 'Biometric login failed', description: 'Please try again or use email and password.', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Biometric error', description: 'An error occurred during biometric authentication.', variant: 'destructive' });
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
        description: sanitizeAuthError(error.message),
        variant: 'destructive',
      });
      setIsSubmitting(false);
      return;
    }

    const roleCheck = await ensureSignedInRole(['manager', 'submanager']);
    if (!roleCheck.ok) {
      const roles = roleCheck.roles;
      if (roles.includes('tenant')) { navigate('/portal'); return; }
      if (roles.includes('webhost')) { navigate('/webhost'); return; }
      if (roles.includes('landlord')) { navigate('/landlord/dashboard'); return; }
      toast({
        title: 'No active role',
        description: roleCheck.message,
        variant: 'destructive',
      });
      setIsSubmitting(false);
      return;
    }

    if (enableBiometric && biometricAvailable) {
      await saveCredentials(loginEmail, loginPassword);
    }
    toast({ title: 'Welcome back!', description: 'Signed in successfully.' });
    navigate('/');
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
    const { error } = await signUp(signupEmail, signupPassword, signupFullName, 'manager');
    if (error) {
      toast({
        title: 'Signup failed',
        description: sanitizeAuthError(error.message),
        variant: 'destructive',
      });
    } else {
      supabase.functions.invoke('send-welcome-email', { body: { email: signupEmail, fullName: signupFullName, userType: 'manager' } })
        .catch(() => {});
      const { data: sessionData } = await supabase.auth.getUser();
      trackCommercialEvent('signup', { managerId: sessionData.user?.id });
      trackCommercialEvent('trial_started', { managerId: sessionData.user?.id });
      toast({ title: 'Account created!', description: 'Check your email for onboarding instructions.' });
      navigate('/');
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
    return <AuthLoadingScreen variant="light" />;
  }

  return (
    <PortalAuthShell
      portalName="Manager Portal"
      badgeLabel="Property Management Access"
      icon={Building2}
      tagline="Manage your properties and operations."
      heroLines={[
        { text: 'Manage properties.', tone: 'default' },
        { text: 'Empower tenants.', tone: 'gradient' },
        { text: 'Run operations.', tone: 'muted' },
      ]}
      heroDescription="The complete property management platform — properties, tenants, billing, maintenance and reporting in one place."
      features={features}
      otherPortals={otherPortals}
      formSubtitle="Sign in or create your manager account"
      submitLabel="Sign in to Manager Portal"
      variant="light"
    >
      {biometricAvailable && hasStoredCredentials && !biometricLoading && (
        <div className="mb-6">
          <BiometricLoginButton biometryType={biometryType} onPress={handleBiometricLogin} isLoading={isBiometricLoggingIn} />
          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border" /></div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">Or continue with</span>
            </div>
          </div>
        </div>
      )}

      <Tabs defaultValue={initialTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-4">
          <TabsTrigger value="login">Sign In</TabsTrigger>
          <TabsTrigger value="signup">Get Started</TabsTrigger>
        </TabsList>

        <TabsContent value="login" className="space-y-4 mt-2">
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="login-email" className="text-sm font-medium text-foreground">Email address</Label>
              <Input id="login-email" type="email" placeholder="you@example.com" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} required className="bg-card border-border text-foreground placeholder:text-muted-foreground focus:border-primary focus-visible:ring-primary/20 h-11" />
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="login-password" className="text-sm font-medium text-foreground">Password</Label>
                <ForgotPasswordDialog
                  trigger={
                    <button type="button" className="text-xs font-semibold text-primary hover:text-primary-hover transition-colors">
                      Forgot password?
                    </button>
                  }
                />
              </div>
              <div className="relative">
                <Input id="login-password" type={showLoginPassword ? "text" : "password"} placeholder="••••••••" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} required className="bg-card border-border text-foreground placeholder:text-muted-foreground focus:border-primary focus-visible:ring-primary/20 h-11 pr-11" />
                <button type="button" onClick={() => setShowLoginPassword(!showLoginPassword)} className="absolute right-2.5 top-1/2 -translate-y-1/2 inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 transition-colors" aria-label={showLoginPassword ? "Hide password" : "Show password"}>
                  {showLoginPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            {biometricAvailable && !hasStoredCredentials && (
              <div className="flex items-center space-x-2">
                <Checkbox id="enable-biometric" checked={enableBiometric} onCheckedChange={(c) => setEnableBiometric(c as boolean)} />
                <label htmlFor="enable-biometric" className="text-sm font-medium leading-none cursor-pointer">
                  Enable {biometryType === 'faceId' ? 'Face ID' : 'fingerprint'} login
                </label>
              </div>
            )}
            <Button type="submit" className="w-full btn-brand h-11 font-bold" disabled={isSubmitting}>
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  Signing in…
                </span>
              ) : (
                <span className="flex items-center gap-2">Sign in to Manager Portal <ChevronRight className="h-4 w-4" /></span>
              )}
            </Button>
          </form>
        </TabsContent>

        <TabsContent value="signup" className="space-y-4 mt-2">
          <form onSubmit={handleSignup} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="signup-name" className="text-sm font-medium text-foreground">Full Name</Label>
              <Input id="signup-name" type="text" placeholder="John Doe" value={signupFullName} onChange={(e) => setSignupFullName(e.target.value)} required className="bg-card border-border text-foreground placeholder:text-muted-foreground focus:border-primary focus-visible:ring-primary/20 h-11" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="signup-email" className="text-sm font-medium text-foreground">Email</Label>
              <Input id="signup-email" type="email" placeholder="you@example.com" value={signupEmail} onChange={(e) => handleSignupEmailChange(e.target.value)} required className={`bg-card border-border text-foreground placeholder:text-muted-foreground focus:border-primary focus-visible:ring-primary/20 h-11 ${signupEmailError ? 'border-destructive focus:border-destructive focus-visible:ring-destructive/20' : ''}`} />
              {signupEmailError && (
                <p className="text-xs text-destructive flex items-center gap-1"><XCircle className="h-3 w-3" />{signupEmailError}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="signup-password" className="text-sm font-medium text-foreground">Password</Label>
              <div className="relative">
                <Input id="signup-password" type={showSignupPassword ? "text" : "password"} placeholder="••••••••" value={signupPassword} onChange={(e) => setSignupPassword(e.target.value)} required minLength={8} className="bg-card border-border text-foreground placeholder:text-muted-foreground focus:border-primary focus-visible:ring-primary/20 h-11 pr-11" />
                <button type="button" onClick={() => setShowSignupPassword(!showSignupPassword)} className="absolute right-2.5 top-1/2 -translate-y-1/2 inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 transition-colors" aria-label={showSignupPassword ? "Hide password" : "Show password"}>
                  {showSignupPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {signupPassword && (
                <div className="grid grid-cols-2 gap-1 text-xs p-3 bg-secondary/60 rounded-lg border border-border">
                  {[
                    { key: 'length', label: '8+ characters' },
                    { key: 'uppercase', label: 'Uppercase' },
                    { key: 'lowercase', label: 'Lowercase' },
                    { key: 'number', label: 'Number' },
                    { key: 'special', label: 'Special char' },
                  ].map(({ key, label }) => (
                    <div key={key} className={`flex items-center gap-1.5 ${passwordStrength[key as keyof typeof passwordStrength] ? 'text-success' : 'text-muted-foreground'}`}>
                      {passwordStrength[key as keyof typeof passwordStrength]
                        ? <CheckCircle className="h-3 w-3" />
                        : <XCircle className="h-3 w-3" />}
                      {label}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <Button type="submit" className="w-full btn-brand h-11 font-bold" disabled={isSubmitting}>
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  Creating account…
                </span>
              ) : (
                <span className="flex items-center gap-2">Create Account <ChevronRight className="h-4 w-4" /></span>
              )}
            </Button>
          </form>
        </TabsContent>
      </Tabs>

      <div className="mt-6 space-y-2 text-center">
        <p className="text-sm text-muted-foreground">
          Are you a tenant?{' '}
          <Link to="/tenant/signup" className="text-primary hover:text-primary-hover font-medium transition-colors">Register here</Link>
        </p>
        <p className="text-sm text-muted-foreground">
          Are you a landlord?{' '}
          <Link to="/landlord/login" className="text-primary hover:text-primary-hover font-medium transition-colors">Sign in here</Link>
        </p>
      </div>
    </PortalAuthShell>
  );
};

export default Auth;
