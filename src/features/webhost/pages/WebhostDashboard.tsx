import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/features/auth/AuthContext';
import { isDevAccessEnabled } from '@/features/auth/lib/devAccess';
import { Navigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';
import { PageHeader } from '@/shared/components/layout/PageHeader';
import { Footer } from '@/shared/components/layout/Footer';
import { statusBadgeClass } from '@/shared/lib/statusBadge';
import { cn } from '@/shared/lib/utils';
import {
  Globe, Users, Building, Home, LogOut, Shield,
  Receipt, Crown, FileSignature, ShieldAlert, Bug, Layers, ScrollText, Tag,
  type LucideIcon,
} from 'lucide-react';
import ManagerManagement from '@/features/webhost/components/ManagerManagement';
import PropertyAssignment from '@/features/webhost/components/PropertyAssignment';
import WebhostOverview from '@/features/webhost/components/WebhostOverview';
import ManagerBilling from '@/features/webhost/components/ManagerBilling';
import WebhostContracts from '@/features/webhost/components/WebhostContracts';
import { SecurityAuditLogs } from '@/features/webhost/components/SecurityAuditLogs';
import ErrorLogsTab from '@/features/webhost/components/ErrorLogsTab';
import TierManagement from '@/features/webhost/components/TierManagement';
import PlatformBillingRules from '@/features/webhost/components/PlatformBillingRules';
import CustomerBillingBlocks from '@/features/webhost/components/CustomerBillingBlocks';
import WebhookDeadLetterPanel from '@/features/webhost/components/WebhookDeadLetterPanel';
import WebhostAccountSecurity from '@/features/webhost/components/WebhostAccountSecurity';
import SystemLandlordManagement from '@/features/webhost/components/SystemLandlordManagement';
import { EnterpriseAdminPlatform } from '@/shared/components/admin';
import { supabase } from '@/integrations/supabase/client';
import { BrandMark } from '@/shared/components/branding/BrandMark';
import { HEALTH_COPY, usePlatformHealth } from '@/features/webhost/hooks/usePlatformHealth';

// NOTE: TenantManagement is intentionally NOT imported.
// Webhosts have zero access to tenant data by platform policy.

type TabGroup = 'primary' | 'secondary';

interface AdminTab {
  value: string;
  label: string;
  icon: LucideIcon;
  enabled: boolean;
  group: TabGroup;
  count?: number;
  countTone?: 'warning' | 'danger';
}

const WebhostDashboard = () => {
  const {
    user, userRole, signOut, loading, isSuperAdmin,
    hasWebhostPermission, webhostPermissions,
  } = useAuth();

  const [activeTab, setActiveTab] = React.useState('overview');
  const { data: health = 'unknown', isLoading: healthLoading } = usePlatformHealth();
  const healthCopy = HEALTH_COPY[health];

  const { data: pendingCounts } = useQuery({
    queryKey: ['webhost-dashboard-pending-counts'],
    queryFn: async () => {
      const [pendingManagers, overdueInvoices] = await Promise.all([
        supabase.from('manager_profiles').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('manager_invoices').select('id', { count: 'exact', head: true }).eq('status', 'overdue'),
      ]);
      return {
        pendingManagers: pendingManagers.count ?? 0,
        overdueInvoices: overdueInvoices.count ?? 0,
      };
    },
    staleTime: 30000,
  });

  React.useEffect(() => {
    if (!loading && user && userRole?.role === 'webhost' && !webhostPermissions) {
      supabase.from('admin_permissions').select('id').eq('user_id', user.id).maybeSingle()
        .then(({ data }) => {
          if (!data) {
            supabase.from('admin_permissions').insert({
              user_id: user.id, admin_level: 'super_admin',
              can_create_webhosts: true, can_manage_managers: true,
              can_manage_billing: true, can_manage_properties: true,
              can_manage_system_landlords: true, can_view_activity_logs: true,
            } as any).then(() => window.location.reload());
          }
        });
    }
  }, [loading, user, userRole, webhostPermissions]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <BrandMark size="hero" className="animate-pulse-soft" />
          <div className="flex gap-1.5" role="status" aria-live="polite" aria-label="Loading platform administration">
            {[0,1,2].map(i => (
              <div key={i} className="w-2 h-2 rounded-full bg-primary/70 animate-pulse-soft"
                style={{ animationDelay: `${i * 0.2}s` }} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!isDevAccessEnabled() && (!user || userRole?.role !== 'webhost')) {
    return <Navigate to="/webhost/login" replace />;
  }

  const canViewBilling    = hasWebhostPermission('can_manage_billing');
  const canViewManagers   = hasWebhostPermission('can_manage_managers');
  const canViewProperties = hasWebhostPermission('can_manage_properties');
  const canViewLandlords  = hasWebhostPermission('can_manage_system_landlords');
  const canViewSecurity   = isSuperAdmin || hasWebhostPermission('can_view_activity_logs');
  const myPermissions     = webhostPermissions;

  const getLevelBadge = () => {
    if (!myPermissions) return null;
    switch (myPermissions.admin_level) {
      case 'super_admin':
        return (
          <Badge className={cn(statusBadgeClass('info'), 'ml-2 gap-1')}>
            <Crown className="h-3 w-3" />Super Admin
          </Badge>
        );
      case 'admin':
        return (
          <Badge className={cn(statusBadgeClass('neutral'), 'ml-2 gap-1')}>
            <Shield className="h-3 w-3" />Admin
          </Badge>
        );
      case 'limited_admin':
        return <Badge variant="outline" className="ml-2 text-secondary-foreground border-border">Limited</Badge>;
      default:
        return null;
    }
  };

  const tabs: AdminTab[] = [
    { value: 'overview', label: 'Overview', icon: Globe, enabled: true, group: 'primary' },
    {
      value: 'managers',
      label: 'Accounts',
      icon: Users,
      enabled: canViewManagers,
      group: 'primary',
      count: pendingCounts?.pendingManagers ?? 0,
      countTone: 'warning',
    },
    {
      value: 'billing',
      label: 'Subscriptions',
      icon: Receipt,
      enabled: canViewBilling,
      group: 'primary',
      count: pendingCounts?.overdueInvoices ?? 0,
      countTone: 'danger',
    },
    { value: 'security', label: 'Security', icon: ShieldAlert, enabled: canViewSecurity, group: 'primary' },
    { value: 'error-logs', label: 'Issues', icon: Bug, enabled: true, group: 'primary' },
    { value: 'admin-suite', label: 'Admin Platform', icon: Crown, enabled: true, group: 'secondary' },
    { value: 'properties', label: 'Properties', icon: Building, enabled: canViewProperties, group: 'secondary' },
    { value: 'unlinked-landlords', label: 'Landlords', icon: Home, enabled: canViewLandlords, group: 'secondary' },
    { value: 'tiers', label: 'Tiers', icon: Layers, enabled: isSuperAdmin || canViewBilling, group: 'secondary' },
    { value: 'billing-rules', label: 'Billing Rules', icon: ScrollText, enabled: isSuperAdmin || canViewBilling, group: 'secondary' },
    { value: 'custom-pricing', label: 'Custom Pricing', icon: Tag, enabled: isSuperAdmin || canViewBilling, group: 'secondary' },
    { value: 'contracts', label: 'Contracts', icon: FileSignature, enabled: true, group: 'secondary' },
  ];

  const primaryTabs = tabs.filter((t) => t.enabled && t.group === 'primary');
  const secondaryTabs = tabs.filter((t) => t.enabled && t.group === 'secondary');

  const tabCls = "data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:font-semibold data-[state=active]:shadow-sm text-secondary-foreground hover:text-primary hover:bg-soft-blue transition-all text-xs sm:text-sm px-3.5 py-2 min-h-10 rounded-lg font-medium";

  const renderTab = (tab: AdminTab) => {
    const Icon = tab.icon;
    const showCount = (tab.count ?? 0) > 0;
    return (
      <TabsTrigger key={tab.value} value={tab.value} className={tabCls}>
        <Icon className="h-3.5 w-3.5 mr-1.5" />
        {tab.label}
        {showCount && (
          <span
            className={cn(
              'ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] font-extrabold text-white',
              tab.countTone === 'danger' ? 'bg-destructive' : 'bg-warning',
            )}
          >
            {tab.count}
          </span>
        )}
      </TabsTrigger>
    );
  };

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary selection:text-white flex flex-col">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:z-[100] focus:top-2 focus:left-2 focus:rounded-md focus:bg-primary focus:px-4 focus:py-2.5 focus:text-sm focus:font-semibold focus:text-primary-foreground"
      >
        Skip to content
      </a>
      <header className="sticky top-0 z-50 border-b border-border bg-card/95 backdrop-blur-md">
        <div className="max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between gap-4">
          <BrandMark size="md" showWordmark subtitle="Admin" className="min-w-0" />

          <div className="flex items-center gap-3 flex-shrink-0">
            <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted border border-border">
              <div
                className={cn('h-2 w-2 rounded-full', healthLoading ? 'bg-muted-foreground' : healthCopy.dot, health === 'healthy' && !healthLoading ? 'animate-pulse' : '')}
                aria-hidden
              />
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                {healthLoading ? 'Checking status' : healthCopy.label}
              </span>
            </div>
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted border border-border">
              <div className="h-2 w-2 rounded-full bg-primary" />
              <span className="text-xs font-medium text-foreground truncate max-w-[180px]">{user?.email}</span>
              {getLevelBadge()}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={signOut}
              className="text-muted-foreground hover:text-destructive min-h-10"
            >
              <LogOut className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Sign Out</span>
            </Button>
          </div>
        </div>
      </header>

      <main id="main-content" tabIndex={-1} className="flex-1 max-w-[1800px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 outline-none">
        {!myPermissions ? (
          <div className="enterprise-card p-10 text-center">
            <div className="h-16 w-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-4">
              <Shield className="h-8 w-8 text-primary" />
            </div>
            <h3 className="section-title text-center mb-2">Permissions pending</h3>
            <p className="supporting-text text-center max-w-md mx-auto">
              Your webhost account is active but permissions haven't been assigned yet.
              A super admin needs to configure your access level.
            </p>
          </div>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <PageHeader
              title="Platform administration"
              description="System health, accounts, subscriptions, security, and operational issues — without tenant or landlord operational detail."
              className="border-0 px-0 py-0"
              status={
                <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground lg:hidden">
                  <span className={cn('h-1.5 w-1.5 rounded-full', healthCopy.dot)} aria-hidden />
                  {healthLoading ? 'Checking' : healthCopy.label}
                </span>
              }
            />

            <div className="overflow-x-auto scrollbar-hide -mx-1 px-1">
              <TabsList className="bg-card border border-border h-auto p-1.5 gap-1.5 flex-nowrap inline-flex min-w-max rounded-xl shadow-sm">
                {primaryTabs.map(renderTab)}
                {secondaryTabs.length > 0 && (
                  <span className="hidden md:inline-block h-6 w-px bg-border mx-1 self-center" aria-hidden />
                )}
                {secondaryTabs.map(renderTab)}
              </TabsList>
            </div>

            <TabsContent value="overview">
              <WebhostOverview onNavigateTab={setActiveTab} />
            </TabsContent>
            <TabsContent value="admin-suite"><EnterpriseAdminPlatform /></TabsContent>
            {canViewManagers && <TabsContent value="managers"><ManagerManagement /></TabsContent>}
            {canViewProperties && <TabsContent value="properties"><PropertyAssignment /></TabsContent>}
            {canViewLandlords && <TabsContent value="unlinked-landlords"><SystemLandlordManagement /></TabsContent>}
            {canViewBilling && <TabsContent value="billing"><ManagerBilling /></TabsContent>}
            {(isSuperAdmin || canViewBilling) && <TabsContent value="tiers"><TierManagement /></TabsContent>}
            {(isSuperAdmin || canViewBilling) && <TabsContent value="billing-rules"><PlatformBillingRules /></TabsContent>}
            {(isSuperAdmin || canViewBilling) && <TabsContent value="custom-pricing"><CustomerBillingBlocks /></TabsContent>}
            <TabsContent value="contracts"><WebhostContracts /></TabsContent>
            {canViewSecurity && (
              <TabsContent value="security">
                <div className="space-y-4">
                  <WebhostAccountSecurity />
                  <SecurityAuditLogs />
                  <WebhookDeadLetterPanel />
                </div>
              </TabsContent>
            )}
            <TabsContent value="error-logs"><ErrorLogsTab /></TabsContent>
          </Tabs>
        )}
      </main>

      <Footer variant="compact" />
    </div>
  );
};

export default WebhostDashboard;
