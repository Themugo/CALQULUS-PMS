import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/features/auth/AuthContext';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { useToast } from '@/shared/hooks/use-toast';
import { UserPlus, Link2, Eye, EyeOff } from 'lucide-react';
import ForgotPasswordDialog from '@/features/auth/components/ForgotPasswordDialog';
import { BiometricLoginButton } from '@/features/auth/components/BiometricLoginButton';
import { useBiometricAuth } from '@/shared/hooks/useBiometricAuth';
import { ensureSignedInRole, sanitizeAuthError } from '@/features/auth/lib/authFlow';
import { AuthLoadingScreen } from '@/features/auth/components/AuthHeroChrome';
import { TenantPortalShell } from '@/features/auth/components/TenantPortalChrome';

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
    <TenantPortalShell>
      {/* Biometric Login */}
      {biometricAvailable && hasStoredCredentials && !biometricLoading && (
        <div className="mb-4">
          <BiometricLoginButton
            biometryType={biometryType}
            onPress={handleBiometricLogin}
            isLoading={isBiometricLoggingIn}
            className="border-[#0284C7]/25 text-[#0284C7] hover:bg-[#0284C7]/10"
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
            className="h-11 border-border bg-card text-foreground placeholder:text-muted-foreground focus:border-[#0284C7] focus-visible:ring-[#0284C7]/20"
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
                <button type="button" className="text-xs font-semibold text-[#0369A1] hover:text-[#024E76]">
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
              className="h-11 border-border bg-card pr-11 text-foreground placeholder:text-muted-foreground focus:border-[#0284C7] focus-visible:ring-[#0284C7]/20"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-1.5 top-1/2 inline-flex min-h-11 min-w-11 h-11 w-11 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0284C7]/30"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              aria-pressed={showPassword}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>
        <Button type="submit" disabled={isSubmitting} className="btn-tenant mt-2 h-11 w-full text-sm font-semibold">
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
              Accept invitation
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
    </TenantPortalShell>
  );
};

export default TenantLogin;
