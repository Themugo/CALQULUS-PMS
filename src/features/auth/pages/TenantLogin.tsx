import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/features/auth/AuthContext';
import { Button } from '@/shared/components/ui/button';
import { useToast } from '@/shared/hooks/use-toast';
import { UserPlus, Link2 } from 'lucide-react';
import { setRememberMe } from '@/integrations/supabase/client';
import { ensureSignedInRole, sanitizeAuthError } from '@/features/auth/lib/authFlow';
import { AuthLoadingScreen } from '@/features/auth/components/AuthHeroChrome';
import { TenantPortalShell, TENANT_ACCENT } from '@/features/auth/components/TenantPortalChrome';
import { PortalLoginCard } from '@/features/auth/components/PortalLoginScreen';

const TenantLogin = () => {
  const navigate = useNavigate();
  const { user, signIn, signInWithGoogle, loading, userRole } = useAuth();
  const { toast } = useToast();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMeState] = useState(true);

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

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setRememberMe(rememberMe);

    const { error } = await signIn(email, password);

    if (error) {
      toast({ title: 'Login failed', description: sanitizeAuthError(error.message), variant: 'destructive' });
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
      } else if (roles.includes('agency')) {
        navigate('/agency');
      } else {
        toast({ title: 'No active role', description: roleCheck.message, variant: 'destructive' });
      }
      setIsSubmitting(false);
      return;
    }

    toast({ title: 'Welcome back!', description: 'You have been logged in successfully.' });
    setIsSubmitting(false);
  };

  const handleGoogleSignIn = async () => {
    setIsGoogleSubmitting(true);
    setRememberMe(rememberMe);
    const { error } = await signInWithGoogle();
    if (error) {
      toast({ title: 'Google sign-in failed', description: sanitizeAuthError(error.message), variant: 'destructive' });
      setIsGoogleSubmitting(false);
    }
  };

  if (loading) {
    return <AuthLoadingScreen variant="light" />;
  }

  return (
    <TenantPortalShell>
      <PortalLoginCard
        accentHex={TENANT_ACCENT}
        portalLabel="tenant"
        email={email}
        onEmailChange={setEmail}
        password={password}
        onPasswordChange={setPassword}
        showPassword={showPassword}
        onToggleShowPassword={() => setShowPassword((v) => !v)}
        rememberMe={rememberMe}
        onRememberMeChange={setRememberMeState}
        onSubmit={handleLogin}
        isSubmitting={isSubmitting}
        onGoogleSignIn={handleGoogleSignIn}
        isGoogleSubmitting={isGoogleSubmitting}
        forgotPasswordVariant="tenant"
        footNote={
          <div className="space-y-3">
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
        }
      />
    </TenantPortalShell>
  );
};

export default TenantLogin;
