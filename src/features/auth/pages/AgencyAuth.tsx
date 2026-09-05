import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/features/auth/AuthContext';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Checkbox } from '@/shared/components/ui/checkbox';
import { Label } from '@/shared/components/ui/label';
import { useToast } from '@/shared/hooks/use-toast';
import { Eye, EyeOff, Mail, LockKeyhole } from 'lucide-react';
import ForgotPasswordDialog from '@/features/auth/components/ForgotPasswordDialog';
import { sanitizeAuthError } from '@/features/auth/lib/authFlow';
import { AuthLoadingScreen } from '@/features/auth/components/AuthHeroChrome';
import { AgencyPortalShell } from '@/features/auth/components/AgencyPortalChrome';

const AgencyAuth = () => {
  const navigate = useNavigate();
  const { user, signIn, loading, userRole } = useAuth();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  useEffect(() => {
    if (user && !loading && userRole) {
      if (userRole.role === 'agency') navigate('/agency');
      else if (userRole.role === 'manager') navigate('/');
      else if (userRole.role === 'landlord') navigate('/landlord/dashboard');
      else if (userRole.role === 'tenant') navigate('/portal');
      else if (userRole.role === 'webhost') navigate('/webhost');
    }
  }, [user, loading, userRole, navigate]);

  useEffect(() => {
    const remembered = localStorage.getItem('calqulus:remembered-email:agency');
    if (remembered) setEmail(remembered);
  }, []);

  useEffect(() => {
    document.title = 'Agency sign-in | CALQULUS PMS';
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setIsSubmitting(true);
    const { error } = await signIn(email, password);
    if (error) {
      toast({ title: 'Login failed', description: sanitizeAuthError(error.message), variant: 'destructive' });
    }
    if (rememberMe) localStorage.setItem('calqulus:remembered-email:agency', email);
    else localStorage.removeItem('calqulus:remembered-email:agency');
    setIsSubmitting(false);
  };

  if (loading) {
    return <AuthLoadingScreen variant="light" />;
  }

  return (
    <AgencyPortalShell>
      <form onSubmit={handleLogin} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="email" className="sr-only">Email address</Label>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#61708a]" aria-hidden />
            <Input
              id="email" type="email" placeholder="Email address"
              value={email} onChange={e => setEmail(e.target.value)} required
              className="h-11 border-border bg-card pl-10 text-foreground placeholder:text-muted-foreground focus:border-primary focus-visible:ring-primary/20"
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="password" className="sr-only">Password</Label>
          <div className="relative">
            <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#61708a]" aria-hidden />
            <Input
              id="password" type={showPassword ? 'text' : 'password'} placeholder="Password"
              value={password} onChange={e => setPassword(e.target.value)} required
              className="h-11 border-border bg-card pl-10 pr-11 text-foreground placeholder:text-muted-foreground focus:border-primary focus-visible:ring-primary/20"
            />
            <button type="button" onClick={() => setShowPassword(v => !v)}
              className="absolute right-1.5 top-1/2 inline-flex min-h-11 min-w-11 h-11 w-11 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
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

        <Button type="submit" disabled={isSubmitting} className="btn-brand mt-2 h-11 w-full text-sm font-semibold">
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

    </AgencyPortalShell>
  );
};

export default AgencyAuth;
