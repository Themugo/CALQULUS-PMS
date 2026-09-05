import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/features/auth/AuthContext';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Checkbox } from '@/shared/components/ui/checkbox';
import { Label } from '@/shared/components/ui/label';
import { useToast } from '@/shared/hooks/use-toast';
import { UserPlus, Link2, Eye, EyeOff, Mail, LockKeyhole } from 'lucide-react';
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
  const [rememberMe, setRememberMe] = useState(true);
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
    const remembered = localStorage.getItem('calqulus:remembered-email:tenant');
    if (remembered) setEmail(remembered);
  }, []);

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
    if (rememberMe) localStorage.setItem('calqulus:remembered-email:tenant', email);
    else localStorage.removeItem('calqulus:remembered-email:tenant');
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
          <Label htmlFor="email" className="sr-only">
            Email address
          </Label>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#61708a]" aria-hidden />
            <Input
              id="email"
              type="email"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="h-11 border-border bg-card pl-10 text-foreground placeholder:text-muted-foreground focus:border-[#0284C7] focus-visible:ring-[#0284C7]/20"
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="password" className="sr-only">
            Password
          </Label>
          <div className="relative">
            <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#61708a]" aria-hidden />
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="h-11 border-border bg-card pl-10 pr-11 text-foreground placeholder:text-muted-foreground focus:border-[#0284C7] focus-visible:ring-[#0284C7]/20"
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
        <div className="flex items-center justify-between py-1">
          <div className="flex items-center gap-2">
            <Checkbox id="remember-me" checked={rememberMe} onCheckedChange={(checked) => setRememberMe(checked === true)} />
            <label htmlFor="remember-me" className="text-xs font-medium text-[#1d2d4d] cursor-pointer">Remember me</label>
          </div>
          <ForgotPasswordDialog
            trigger={
              <button type="button" className="text-xs font-semibold text-primary hover:text-primary-hover">
                Forgot password?
              </button>
            }
          />
        </div>

        <Button type="submit" disabled={isSubmitting} className="btn-tenant mt-2 h-11 w-full text-sm font-semibold">
          {isSubmitting ? (
            <span className="flex items-center gap-2">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              Signing in…
            </span>
          ) : (
            'Login'
          )}
        </Button>
      </form>

    </TenantPortalShell>
  );
};

export default TenantLogin;
