import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/features/auth/AuthContext';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { useToast } from '@/shared/hooks/use-toast';
import { Handshake, Eye, EyeOff, Building2, Users, CreditCard, Percent } from 'lucide-react';
import ForgotPasswordDialog from '@/features/auth/components/ForgotPasswordDialog';
import { sanitizeAuthError } from '@/features/auth/lib/authFlow';
import { AuthLoadingScreen, PortalAuthShell, type PortalAuthFeature, type PortalSwitchLink } from '@/features/auth/components/AuthHeroChrome';
import { AgencyDeskPreview } from '@/features/auth/components/AgencyDeskPreview';
import { PUBLIC_ROUTES } from '@/features/marketing/publicConfig';

const features: PortalAuthFeature[] = [
  { icon: Building2, text: 'Client properties', detail: 'Buildings you run on behalf of landlords.', tint: 'bg-soft-blue text-primary' },
  { icon: Users, text: 'Tenants & leases', detail: 'Invites, occupancy, and rent on those units.', tint: 'bg-navy-mid/10 text-navy-mid' },
  { icon: Percent, text: 'Revenue share', detail: 'Configurable split per property.', tint: 'bg-primary/10 text-primary' },
  { icon: CreditCard, text: 'Collections', detail: 'M-Pesa, statements, and payouts.', tint: 'bg-navy-mid/10 text-navy-mid' },
];

const otherPortals: PortalSwitchLink[] = [
  { label: 'Manager', href: PUBLIC_ROUTES.managerSignIn },
  { label: 'Landlord', href: PUBLIC_ROUTES.landlordLogin },
  { label: 'Tenant', href: PUBLIC_ROUTES.tenantLogin },
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
    setIsSubmitting(false);
  };

  if (loading) {
    return <AuthLoadingScreen variant="light" />;
  }

  return (
    <PortalAuthShell
      portalName="Agency"
      badgeLabel="Agency desk"
      icon={Handshake}
      tagline="Properties managed for landlords, with a configurable split."
      heroTitle="Run the book on behalf of landlords."
      heroDescription="Client buildings, tenants, rent, and statements sit on the same records. Payment destination follows the operating model set on each property."
      features={features}
      otherPortals={otherPortals}
      formTitle="Sign in"
      formSubtitle="Use the agency email for this book."
      submitLabel="Sign in"
      notice="This portal is for agencies. Your webhost or platform team provisions the account. It is not a landlord login and not a tenant login."
      aside={<AgencyDeskPreview />}
      variant="light"
    >
      <form onSubmit={handleLogin} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="email" className="text-sm font-medium text-foreground">Email address</Label>
          <Input
            id="email" type="email" placeholder="agent@agency.com"
            value={email} onChange={e => setEmail(e.target.value)} required
            className="h-11 border-border bg-card text-foreground placeholder:text-muted-foreground focus:border-primary focus-visible:ring-primary/20"
          />
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="password" className="text-sm font-medium text-foreground">Password</Label>
            <ForgotPasswordDialog
              trigger={
                <button type="button" className="text-xs font-semibold text-primary hover:text-primary-hover">
                  Forgot password?
                </button>
              }
            />
          </div>
          <div className="relative">
            <Input
              id="password" type={showPassword ? 'text' : 'password'} placeholder="••••••••"
              value={password} onChange={e => setPassword(e.target.value)} required
              className="h-11 border-border bg-card pr-11 text-foreground placeholder:text-muted-foreground focus:border-primary focus-visible:ring-primary/20"
            />
            <button type="button" onClick={() => setShowPassword(v => !v)}
              className="absolute right-2.5 top-1/2 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
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
    </PortalAuthShell>
  );
};

export default AgencyAuth;
