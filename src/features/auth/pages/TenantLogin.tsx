import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/features/auth/AuthContext';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { useToast } from '@/shared/hooks/use-toast';
import { UserPlus, Link2, Eye, EyeOff, ChevronRight, User, Building2, CreditCard, Wrench } from 'lucide-react';
import ForgotPasswordDialog from '@/features/auth/components/ForgotPasswordDialog';
import { BiometricLoginButton } from '@/features/auth/components/BiometricLoginButton';
import { useBiometricAuth } from '@/shared/hooks/useBiometricAuth';
import { ensureSignedInRole, sanitizeAuthError } from '@/features/auth/lib/authFlow';
import { AuthLoadingScreen, PortalAuthShell, type PortalAuthFeature, type PortalSwitchLink } from '@/features/auth/components/AuthHeroChrome';

const features: PortalAuthFeature[] = [
  { icon: CreditCard, text: 'Pay rent and water bills online with instant receipts' },
  { icon: Wrench,    text: 'Submit and track maintenance requests' },
  { icon: Building2, text: 'View your lease, documents and vacation notices' },
  { icon: User,      text: 'Self-service portal for your tenancy' },
];

const otherPortals: PortalSwitchLink[] = [
  { label: 'Manager', href: '/auth' },
  { label: 'Landlord', href: '/landlord/login' },
  { label: 'Agency', href: '/agency/login' },
];

const TenantLogin = () => {
  const navigate = useNavigate();
  const { user, signIn, loading, userRole } = useAuth();
  const { toast } = useToast();
  const {
    isAvailable: biometricAvailable,
    biometryType,
    hasStoredCredentials,
    isLoading: biometricLoading,
    performBiometricLogin,
  } = useBiometricAuth();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isBiometricLoggingIn, setIsBiometricLoggingIn] = useState(false);

  useEffect(() => {
    if (user && !loading && userRole) {
      // Only redirect tenants to portal - other roles should use their own login pages
      if (userRole.role === 'tenant') {
        navigate('/portal');
      }
      // Don't redirect managers/webhosts from tenant login - they're on the wrong page
    }
  }, [user, loading, userRole, navigate]);

  const handleBiometricLogin = async () => {
    setIsBiometricLoggingIn(true);
    try {
      const credentials = await performBiometricLogin();
      if (credentials) {
        const { error } = await signIn(credentials.email, credentials.password);
        if (error) {
          toast({
            title: 'Biometric login failed',
            description: sanitizeAuthError(error.message),
            variant: 'destructive',
          });
        } else {
          const roleCheck = await ensureSignedInRole(['tenant']);
          if (!roleCheck.ok) {
            const roles = roleCheck.roles;
            if (roles.includes('manager') || roles.includes('submanager')) {
              navigate('/');
            } else if (roles.includes('webhost')) {
              navigate('/webhost');
            } else if (roles.includes('landlord')) {
              navigate('/landlord/dashboard');
            } else {
              toast({
                title: 'No active role',
                description: roleCheck.message,
                variant: 'destructive',
              });
            }
            return;
          }
          toast({
            title: 'Welcome back!',
            description: 'You have been logged in successfully.',
          });
        }
      } else {
        toast({
          title: 'Biometric login cancelled',
          description: 'Please try again or use email login.',
          variant: 'destructive',
        });
      }
    } catch {
      toast({
        title: 'Error',
        description: 'Biometric login failed. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsBiometricLoggingIn(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const { error } = await signIn(email, password);

    if (error) {
      toast({
        title: 'Login failed',
        description: sanitizeAuthError(error.message),
        variant: 'destructive',
      });
      setIsSubmitting(false);
      return;
    }

    const roleCheck = await ensureSignedInRole(['tenant']);
    if (!roleCheck.ok) {
      const roles = roleCheck.roles;
      if (roles.includes('manager') || roles.includes('submanager')) {
        navigate('/');
      } else if (roles.includes('webhost')) {
        navigate('/webhost');
      } else if (roles.includes('landlord')) {
        navigate('/landlord/dashboard');
      } else {
        toast({
          title: 'No active role',
          description: roleCheck.message,
          variant: 'destructive',
        });
      }
      setIsSubmitting(false);
      return;
    }

    toast({
      title: 'Welcome back!',
      description: 'You have been logged in successfully.',
    });
    setIsSubmitting(false);
  };

  if (loading) {
    return <AuthLoadingScreen />;
  }

  return (
    <PortalAuthShell
      portalName="Tenant Portal"
      badgeLabel="Tenant Access"
      icon={User}
      tagline="Manage your tenancy, payments and requests."
      heroLines={[
        { text: 'Your tenancy.', tone: 'default' },
        { text: 'Your payments.', tone: 'gradient' },
        { text: 'In your hands.', tone: 'muted' },
      ]}
      heroDescription="Access your lease, pay rent and water bills, submit maintenance requests and manage your tenancy with CALQULUS PMS."
      features={features}
      otherPortals={otherPortals}
      formSubtitle="Sign in to access your tenant portal"
      submitLabel="Sign in to Tenant Portal"
    >
      {/* Biometric Login */}
      {biometricAvailable && hasStoredCredentials && !biometricLoading && (
        <div className="mb-4">
          <BiometricLoginButton
            biometryType={biometryType}
            onPress={handleBiometricLogin}
            isLoading={isBiometricLoggingIn}
            className="border-primary/20 text-gold hover:bg-primary/10"
          />
          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground font-medium">Or continue with email</span>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleLogin} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="email" className="text-muted-foreground text-sm font-medium">Email address</Label>
          <Input
            id="email" type="email" placeholder="you@example.com"
            value={email} onChange={(e) => setEmail(e.target.value)} required
            className="bg-muted border-border text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-primary/20 h-11"
          />
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="password" className="text-muted-foreground text-sm font-medium">Password</Label>
            <ForgotPasswordDialog
              variant="tenant"
              trigger={
                <button type="button" className="text-gold hover:text-primary text-xs font-semibold">
                  Forgot password?
                </button>
              }
            />
          </div>
          <div className="relative">
            <Input
              id="password" type={showPassword ? 'text' : 'password'} placeholder="••••••••"
              value={password} onChange={(e) => setPassword(e.target.value)} required
              className="bg-muted border-border text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-primary/20 h-11 pr-11"
            />
            <button type="button" onClick={() => setShowPassword(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>
        <Button type="submit" disabled={isSubmitting} className="w-full h-11 btn-brand text-sm font-bold mt-2">
          {isSubmitting ? (
            <span className="flex items-center gap-2">
              <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
              Signing in…
            </span>
          ) : (
            <span className="flex items-center gap-2">Sign in to Tenant Portal <ChevronRight className="h-4 w-4" /></span>
          )}
        </Button>
      </form>

      {/* Account creation options */}
      <div className="mt-5 pt-5 border-t border-border space-y-3">
        <p className="text-muted-foreground text-sm text-center">Don't have an account?</p>
        <div className="flex flex-col sm:flex-row gap-2">
          <Link to="/tenant/signup" className="flex-1">
            <Button variant="outline" className="w-full border-primary/20 text-gold hover:bg-primary/10 font-medium">
              <UserPlus className="h-4 w-4 mr-2" />
              Register independently
            </Button>
          </Link>
          <Link to="/tenant/invitation" className="flex-1">
            <Button variant="outline" className="w-full border-primary/20 text-gold hover:bg-primary/10 font-medium">
              <Link2 className="h-4 w-4 mr-2" />
              Accept manager invite
            </Button>
          </Link>
        </div>
        <p className="text-xs text-muted-foreground text-center">
          Invited by your manager? Use "Accept manager invite". Otherwise register independently.
        </p>
      </div>
    </PortalAuthShell>
  );
};

export default TenantLogin;
