import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/features/auth/AuthContext';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { useToast } from '@/shared/hooks/use-toast';
import { CheckCircle, XCircle, Eye, EyeOff } from 'lucide-react';
import { signupSchema, formatValidationErrors, PASSWORD_RULES, getPasswordChecks, TERMS_VERSION } from '@/shared/lib/validations';
import { supabase, setRememberMe } from '@/integrations/supabase/client';
import { ensureSignedInRole, sanitizeAuthError, isEmailNotConfirmedError } from '@/features/auth/lib/authFlow';
import { ResendVerificationButton } from '@/features/auth/components/ResendVerificationButton';
import { TermsConsent } from '@/features/auth/components/TermsConsent';
import { termsMetadata } from '@/features/auth/lib/termsMetadata';
import { trackCommercialEvent } from '@/features/dashboard/lib/commercialMetrics';
import { AuthLoadingScreen } from '@/features/auth/components/AuthHeroChrome';
import { ManagerPortalShell, MANAGER_ACCENT } from '@/features/auth/components/ManagerPortalChrome';
import { PortalLoginCard } from '@/features/auth/components/PortalLoginScreen';

const Auth = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const isSignup = searchParams.get('tab') === 'signup';
  const { user, userRole, signIn, signUp, signInWithGoogle, loading } = useAuth();
  const { toast } = useToast();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [rememberMe, setRememberMeState] = useState(true);
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupFullName, setSignupFullName] = useState('');
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [signupEmailError, setSignupEmailError] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [pendingVerificationEmail, setPendingVerificationEmail] = useState<string | null>(null);
  const [unverifiedLoginEmail, setUnverifiedLoginEmail] = useState<string | null>(null);

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

  const redirectForRole = React.useCallback(() => {
    if (!userRole) return;
    if (userRole.role === 'manager' || userRole.role === 'submanager') { navigate('/'); return; }
    if (userRole.role === 'tenant') { navigate('/portal'); return; }
    if (userRole.role === 'webhost') { navigate('/webhost'); return; }
    if (userRole.role === 'landlord') { navigate('/landlord/dashboard'); return; }
    if (userRole.role === 'agency') { navigate('/agency'); return; }
  }, [userRole, navigate]);

  // Covers both an already-signed-in visit and the return leg of Google
  // OAuth (a full-page redirect remounts this component with a session
  // already resolving), so both paths land on the right portal home.
  useEffect(() => {
    if (user && !loading && userRole) {
      redirectForRole();
    }
  }, [user, loading, userRole, redirectForRole]);

  useEffect(() => {
    document.title = isSignup
      ? 'Create manager account | CALQULUS PMS'
      : 'Manager sign-in | CALQULUS PMS';
  }, [isSignup]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setRememberMe(rememberMe);
    setUnverifiedLoginEmail(null);
    const { error } = await signIn(loginEmail, loginPassword);
    if (error) {
      if (isEmailNotConfirmedError(error.message)) setUnverifiedLoginEmail(loginEmail.trim());
      toast({ title: 'Login failed', description: sanitizeAuthError(error.message), variant: 'destructive' });
      setIsSubmitting(false);
      return;
    }

    const roleCheck = await ensureSignedInRole(['manager', 'submanager']);
    if (!roleCheck.ok) {
      const roles = roleCheck.roles;
      if (roles.includes('tenant')) { navigate('/portal'); return; }
      if (roles.includes('webhost')) { navigate('/webhost'); return; }
      if (roles.includes('landlord')) { navigate('/landlord/dashboard'); return; }
      if (roles.includes('agency')) { navigate('/agency'); return; }
      toast({ title: 'No active role', description: roleCheck.message, variant: 'destructive' });
      setIsSubmitting(false);
      return;
    }

    toast({ title: 'Welcome back!', description: 'Signed in successfully.' });
    navigate('/');
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
    // On success the browser navigates away to Google; this component
    // remounts on return and the redirect effect above takes it from there.
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    if (!acceptedTerms) {
      toast({ title: 'Terms required', description: 'Please accept the Terms of Service and Privacy Policy to continue.', variant: 'destructive' });
      setIsSubmitting(false);
      return;
    }
    const validationResult = signupSchema.safeParse({ email: signupEmail, password: signupPassword, fullName: signupFullName });
    if (!validationResult.success) {
      toast({ title: 'Validation Error', description: formatValidationErrors(validationResult.error), variant: 'destructive' });
      setIsSubmitting(false);
      return;
    }
    const { error, needsEmailConfirmation } = await signUp(signupEmail, signupPassword, signupFullName, 'manager', undefined, termsMetadata(TERMS_VERSION));
    if (error) {
      toast({ title: 'Signup failed', description: sanitizeAuthError(error.message), variant: 'destructive' });
    } else {
      supabase.functions.invoke('send-welcome-email', { body: { email: signupEmail, fullName: signupFullName, userType: 'manager' } })
        .catch(() => {});
      const { data: sessionData } = await supabase.auth.getUser();
      trackCommercialEvent('signup', { managerId: sessionData.user?.id });
      trackCommercialEvent('trial_started', { managerId: sessionData.user?.id });
      if (needsEmailConfirmation) {
        // No session yet: the user must verify their email first.
        setPendingVerificationEmail(signupEmail.trim());
      } else {
        toast({ title: 'Account created!', description: 'Welcome to CALQULUS PMS.' });
        navigate('/');
      }
    }
    setIsSubmitting(false);
  };

  const passwordStrength = getPasswordChecks(signupPassword);

  if (loading) {
    return <AuthLoadingScreen variant="light" />;
  }

  const inviteNote = (
    <p className="text-center text-sm text-muted-foreground">
      Invited tenant?{' '}
      <Link to="/tenant/signup" className="font-medium hover:underline" style={{ color: MANAGER_ACCENT }}>
        Accept invitation
      </Link>
    </p>
  );

  if (isSignup && pendingVerificationEmail) {
    return (
      <ManagerPortalShell>
        <section className="rounded-2xl border border-border bg-card p-6 text-center shadow-2xl shadow-black/10 sm:p-8" aria-label="Check your email">
          <h2 className="font-heading text-2xl font-bold tracking-tight text-foreground">Check your email</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            We sent a verification link to <strong className="text-foreground">{pendingVerificationEmail}</strong>. Open it to confirm your address, then sign in.
          </p>
          <div className="mt-5 flex flex-col items-center gap-3">
            <ResendVerificationButton email={pendingVerificationEmail} redirectTo={`${window.location.origin}/auth`} />
            <button
              type="button"
              className="text-sm font-medium hover:underline"
              style={{ color: MANAGER_ACCENT }}
              onClick={() => { setPendingVerificationEmail(null); setSearchParams({}, { replace: true }); }}
            >
              Back to sign in
            </button>
          </div>
        </section>
      </ManagerPortalShell>
    );
  }

  if (isSignup) {
    return (
      <ManagerPortalShell>
        <section className="rounded-2xl border border-border bg-card p-6 shadow-2xl shadow-black/10 sm:p-8" aria-label="Create manager account">
          <h2 className="font-heading text-2xl font-bold tracking-tight text-foreground">Create your manager account</h2>
          <p className="mt-1 text-sm text-muted-foreground">Start managing your properties in minutes.</p>
          <form onSubmit={handleSignup} className="mt-6 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="signup-name" className="text-sm font-medium text-foreground">Full Name</Label>
              <Input id="signup-name" type="text" placeholder="John Doe" value={signupFullName} onChange={(e) => setSignupFullName(e.target.value)} required className="h-11 border-border bg-card text-foreground placeholder:text-muted-foreground" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="signup-email" className="text-sm font-medium text-foreground">Email</Label>
              <Input id="signup-email" type="email" placeholder="you@example.com" value={signupEmail} onChange={(e) => handleSignupEmailChange(e.target.value)} required aria-invalid={!!signupEmailError} aria-describedby={signupEmailError ? "signup-email-error" : undefined} className={`h-11 border-border bg-card text-foreground placeholder:text-muted-foreground ${signupEmailError ? 'border-destructive' : ''}`} />
              {signupEmailError && (
                <p id="signup-email-error" role="alert" className="flex items-center gap-1 text-xs text-destructive"><XCircle className="h-3 w-3" aria-hidden="true" />{signupEmailError}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="signup-password" className="text-sm font-medium text-foreground">Password</Label>
              <div className="relative">
                <Input id="signup-password" type={showSignupPassword ? "text" : "password"} placeholder="••••••••" value={signupPassword} onChange={(e) => setSignupPassword(e.target.value)} required minLength={8} maxLength={72} className="h-11 border-border bg-card pr-11 text-foreground placeholder:text-muted-foreground" />
                <button type="button" onClick={() => setShowSignupPassword(!showSignupPassword)} className="absolute right-1.5 top-1/2 inline-flex h-11 min-h-11 w-11 min-w-11 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground" aria-label={showSignupPassword ? "Hide password" : "Show password"} aria-pressed={showSignupPassword}>
                  {showSignupPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {signupPassword && (
                <div aria-live="polite" className="grid grid-cols-2 gap-1 rounded-lg border border-border bg-secondary/60 p-3 text-xs">
                  {PASSWORD_RULES.map(({ key, label }) => (
                    <div key={key} className={`flex items-center gap-1.5 ${passwordStrength[key] ? 'text-success' : 'text-muted-foreground'}`}>
                      {passwordStrength[key] ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                      {label}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <TermsConsent id="signup-terms" checked={acceptedTerms} onChange={setAcceptedTerms} />
            <Button type="submit" disabled={isSubmitting} className="h-11 w-full text-sm font-semibold text-white hover:brightness-110" style={{ backgroundColor: MANAGER_ACCENT }}>
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  Creating account…
                </span>
              ) : (
                'Create manager account'
              )}
            </Button>
            <p className="text-center text-xs text-muted-foreground">Approval is required before platform billing starts.</p>
          </form>
          <p className="mt-5 text-center text-sm text-muted-foreground">
            Already have an account?{' '}
            <button
              type="button"
              className="font-medium hover:underline"
              style={{ color: MANAGER_ACCENT }}
              onClick={() => setSearchParams({}, { replace: true })}
            >
              Sign in
            </button>
          </p>
          <div className="mt-5 border-t border-border pt-5">{inviteNote}</div>
        </section>
      </ManagerPortalShell>
    );
  }

  return (
    <ManagerPortalShell>
      <PortalLoginCard
        accentHex={MANAGER_ACCENT}
        portalLabel="manager"
        email={loginEmail}
        onEmailChange={setLoginEmail}
        password={loginPassword}
        onPasswordChange={setLoginPassword}
        showPassword={showLoginPassword}
        onToggleShowPassword={() => setShowLoginPassword((v) => !v)}
        rememberMe={rememberMe}
        onRememberMeChange={setRememberMeState}
        onSubmit={handleLogin}
        isSubmitting={isSubmitting}
        onGoogleSignIn={handleGoogleSignIn}
        isGoogleSubmitting={isGoogleSubmitting}
        unverifiedEmail={unverifiedLoginEmail}
        footNote={
          <div className="space-y-3">
            {inviteNote}
            <p className="text-center text-sm text-muted-foreground">
              New to CALQULUS?{' '}
              <button
                type="button"
                className="font-medium hover:underline"
                style={{ color: MANAGER_ACCENT }}
                onClick={() => setSearchParams({ tab: 'signup' }, { replace: true })}
              >
                Create a manager account
              </button>
            </p>
          </div>
        }
      />
    </ManagerPortalShell>
  );
};

export default Auth;
