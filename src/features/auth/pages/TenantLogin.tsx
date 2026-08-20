import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/features/auth/AuthContext';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { useToast } from '@/shared/hooks/use-toast';
import { UserPlus, Link2, Eye, EyeOff, User, Building2, CreditCard, Wrench, FileText } from 'lucide-react';
import ForgotPasswordDialog from '@/features/auth/components/ForgotPasswordDialog';
import { BiometricLoginButton } from '@/features/auth/components/BiometricLoginButton';
import { useBiometricAuth } from '@/shared/hooks/useBiometricAuth';
import { ensureSignedInRole, sanitizeAuthError } from '@/features/auth/lib/authFlow';
import {
  AuthLoadingScreen,
  PortalAuthShell,
  type PortalAuthFeature,
  type PortalSwitchLink,
} from '@/features/auth/components/AuthHeroChrome';
import { TenantDeskPreview } from '@/features/auth/components/TenantDeskPreview';
import { PUBLIC_ROUTES } from '@/features/marketing/publicConfig';

const features: PortalAuthFeature[] = [
  { icon: CreditCard, text: 'Rent & water', detail: 'Pay your invoices. Receipts stay on this tenancy.', tint: 'bg-primary/10 text-primary' },
  { icon: Wrench, text: 'Repairs', detail: 'Submit and track requests for your unit.', tint: 'bg-navy-mid/10 text-navy-mid' },
  { icon: FileText, text: 'Lease & documents', detail: 'Your agreement and files — not other tenants.', tint: 'bg-navy-mid/10 text-navy-mid' },
  { icon: Building2, text: 'Vacation notice', detail: 'Give notice against the same lease record.', tint: 'bg-soft-blue text-primary' },
];

const otherPortals: PortalSwitchLink[] = [
  { label: 'Manager', href: PUBLIC_ROUTES.managerSignIn },
  { label: 'Landlord', href: PUBLIC_ROUTES.landlordLogin },
  { label: 'Agency', href: PUBLIC_ROUTES.agencyLogin },
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

  useEffect(() => {
    document.title = 'Tenant sign-in | CALQULUS PMS';
  }, []);

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
    return <AuthLoadingScreen variant="light" />;
  }

  return (
    <PortalAuthShell
      portal="tenant"
      portalName="Tenant"
      badgeLabel="Your unit"
      icon={User}
      tagline="This login is only for your lease, invoices, and repairs."
      heroTitle="Pay rent, report a repair, read your lease."
      heroDescription="Balance, M-Pesa, maintenance, and documents for the unit you occupy. You cannot see other tenants. Landlord contact details are not shown here."
      features={features}
      otherPortals={otherPortals}
      formTitle="Sign in"
      formSubtitle="Use the email on your invitation or lease."
      submitLabel="Sign in"
      aside={<TenantDeskPreview />}
      variant="light"
    >
      {/* Biometric Login */}
      {biometricAvailable && hasStoredCredentials && !biometricLoading && (
        <div className="mb-4">
          <BiometricLoginButton
            biometryType={biometryType}
            onPress={handleBiometricLogin}
            isLoading={isBiometricLoggingIn}
            className="border-primary/20 text-primary hover:bg-primary/10"
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
          <Label htmlFor="email" className="text-sm font-medium text-foreground">
            Email address
          </Label>
          <Input
            id="email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="h-11 border-border bg-card text-foreground placeholder:text-muted-foreground focus:border-primary focus-visible:ring-primary/20"
          />
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="password" className="text-sm font-medium text-foreground">
              Password
            </Label>
            <ForgotPasswordDialog
              variant="tenant"
              trigger={
                <button type="button" className="text-xs font-semibold text-primary hover:text-primary-hover">
                  Forgot password?
                </button>
              }
            />
          </div>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="h-11 border-border bg-card pr-11 text-foreground placeholder:text-muted-foreground focus:border-primary focus-visible:ring-primary/20"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-1.5 top-1/2 inline-flex min-h-11 min-w-11 h-11 w-11 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              aria-pressed={showPassword}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>
        <Button type="submit" disabled={isSubmitting} className="btn-brand mt-2 h-11 w-full text-sm font-semibold">
          {isSubmitting ? (
            <span className="flex items-center gap-2">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              Signing in…
            </span>
          ) : (
            'Sign in'
          )}
        </Button>
      </form>

      <div className="mt-5 space-y-3 border-t border-border pt-5">
        <p className="text-center text-sm text-muted-foreground">New here?</p>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Link to="/tenant/invitation" className="flex-1">
            <Button variant="outline" className="min-h-11 w-full font-medium">
              <Link2 className="mr-2 h-4 w-4" />
              Open invitation
            </Button>
          </Link>
          <Link to="/tenant/signup" className="flex-1">
            <Button variant="outline" className="min-h-11 w-full font-medium">
              <UserPlus className="mr-2 h-4 w-4" />
              Enter invite code
            </Button>
          </Link>
        </div>
        <p className="text-center text-xs text-muted-foreground">
          Both paths need a manager invitation. This page does not create a tenancy on its own.
        </p>
      </div>
    </PortalAuthShell>
  );
};

export default TenantLogin;
