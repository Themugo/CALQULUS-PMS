import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/features/auth/AuthContext';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { useToast } from '@/shared/hooks/use-toast';
import { Handshake, Eye, EyeOff, ChevronRight, Building2, Users, CreditCard } from 'lucide-react';
import ForgotPasswordDialog from '@/features/auth/components/ForgotPasswordDialog';
import { sanitizeAuthError } from '@/features/auth/lib/authFlow';
import { AuthLoadingScreen, PortalAuthShell, type PortalAuthFeature, type PortalSwitchLink } from '@/features/auth/components/AuthHeroChrome';

const features: PortalAuthFeature[] = [
  { icon: Building2,  text: 'Manage properties on behalf of landlords' },
  { icon: Users,      text: 'Full tenant operations & rent collection' },
  { icon: Handshake,  text: 'Revenue sharing with configurable splits' },
  { icon: CreditCard, text: 'Agency billing, statements & payouts' },
];

const otherPortals: PortalSwitchLink[] = [
  { label: 'Manager', href: '/auth' },
  { label: 'Landlord', href: '/landlord/login' },
  { label: 'Tenant', href: '/tenant/login' },
];

const AgencyAuth = () => {
  const navigate = useNavigate();
  const { user, signIn, loading, userRole } = useAuth();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (user && !loading && userRole) {
      if (userRole.role === 'agency') navigate('/agency');
      else if (userRole.role === 'manager') navigate('/');
      else if (userRole.role === 'landlord') navigate('/landlord/dashboard');
      else if (userRole.role === 'tenant') navigate('/portal');
      else if (userRole.role === 'webhost') navigate('/webhost');
    }
  }, [user, loading, userRole, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setIsSubmitting(true);
    const { error } = await signIn(email, password);
    if (error) {
      toast({ title: 'Login failed', description: sanitizeAuthError(error.message), variant: 'destructive' });
    }
    setIsSubmitting(false);
  };

  if (loading) {
    return <AuthLoadingScreen />;
  }

  return (
    <PortalAuthShell
      portalName="Agency Portal"
      badgeLabel="Property Agency Access"
      icon={Handshake}
      tagline="Manage your agency portfolio and clients."
      heroLines={[
        { text: 'Manage portfolios.', tone: 'default' },
        { text: 'Serve landlords.', tone: 'gradient' },
        { text: 'Grow your agency.', tone: 'muted' },
      ]}
      heroDescription="The complete platform for property agencies managing estates on behalf of landlords across East Africa."
      features={features}
      otherPortals={otherPortals}
      formSubtitle="Sign in to your agency account"
      submitLabel="Sign in to Agency Portal"
      notice="This portal is for property agencies. Manage properties on behalf of landlords, collect rent, and track commissions."
    >
      <form onSubmit={handleLogin} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="email" className="text-muted-foreground text-sm font-medium">Email address</Label>
          <Input
            id="email" type="email" placeholder="agent@agency.com"
            value={email} onChange={e => setEmail(e.target.value)} required
            className="bg-muted border-border text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-primary/20 h-11"
          />
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="password" className="text-muted-foreground text-sm font-medium">Password</Label>
            <ForgotPasswordDialog
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
              value={password} onChange={e => setPassword(e.target.value)} required
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
            <span className="flex items-center gap-2">Sign in to Agency Portal <ChevronRight className="h-4 w-4" /></span>
          )}
        </Button>
      </form>
    </PortalAuthShell>
  );
};

export default AgencyAuth;
