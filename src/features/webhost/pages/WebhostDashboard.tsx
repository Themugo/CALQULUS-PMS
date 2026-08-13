import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/features/auth/AuthContext';
import { isDevAccessEnabled } from '@/features/auth/lib/devAccess';
import { Navigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';
import {
  Globe, Users, Building, Home, LogOut, Shield,
  Receipt, Crown, FileSignature, ShieldAlert, Bug, Layers, ScrollText, Tag,
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
import calqulusLogo from '@/assets/calqulus-logo-new.jpg';

// NOTE: TenantManagement is intentionally NOT imported.
// Webhosts have zero access to tenant data by platform policy.

const WebhostDashboard = () => {
  const {
    user, userRole, signOut, loading, isSuperAdmin,
    hasWebhostPermission, webhostPermissions,
  } = useAuth();

  const [activeTab, setActiveTab] = React.useState('overview');

  // Query pending action items for tab notification badges
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
          <img src={calqulusLogo} alt="CALQULUS PMS" className="h-14 w-auto animate-pulse-soft" />
          <div className="flex gap-1.5">
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
          <Badge className="bg-primary/15 text-primary border border-primary/30 ml-2 gap-1">
            <Crown className="h-3 w-3" />Super Admin
          </Badge>
        );
      case 'admin':
        return (
          <Badge className="bg-primary/15 text-primary border border-primary/30 ml-2 gap-1">
            <Shield className="h-3 w-3" />Admin
          </Badge>
        );
      case 'limited_admin':
        return <Badge variant="outline" className="ml-2 text-secondary-foreground border-border">Limited</Badge>;
      default:
        return null;
    }
  };

  // Executive nav pill style: clean light-blue surface, single CALQULUS blue
  // accent for the active state. Error Logs keeps its semantic red. All logic
  // (badges, counts, conditional tabs) is preserved below.
  const tabCls = "data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:font-semibold data-[state=active]:shadow-sm text-secondary-foreground hover:text-primary hover:bg-soft-blue transition-all text-xs sm:text-sm px-3.5 py-1.5 rounded-lg font-medium";

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary selection:text-white">
      {/* Premium executive header — light surface, restrained primary accent */}
      <header className="sticky top-0 z-50 bg-card/95 backdrop-blur-md border-b border-border shadow-xs">
        <div className="max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-9 w-9 rounded-lg bg-primary/10 border border-primary/15 flex items-center justify-center overflow-hidden shrink-0">
              <img src={calqulusLogo} alt="CALQULUS PMS" className="h-7 w-auto object-contain" />
            </div>
            <div className="hidden sm:block min-w-0">
              <p className="font-heading text-base font-bold text-foreground leading-none">CALQULUS PMS</p>
              <p className="text-[10px] text-muted-foreground tracking-widest font-semibold uppercase mt-0.5">PLATFORM ADMINISTRATION</p>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-shrink-0">
            <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted/60 border border-border">
              <div className="h-2 w-2 rounded-full bg-success animate-pulse" />
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">SYSTEM OPERATIONAL</span>
            </div>
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted/60 border border-border">
              <div className="h-2 w-2 rounded-full bg-primary" />
              <span className="text-xs font-medium text-foreground truncate max-w-[180px]">{user?.email || 'mugo.james27@gmail.com'}</span>
              {getLevelBadge()}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={signOut}
              className="border border-border text-muted-foreground hover:bg-muted hover:text-foreground hover:border-primary/30 transition-all"
            >
              <LogOut className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Sign Out</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!myPermissions ? (
          <div className="enterprise-card p-10 text-center">
            <div className="h-16 w-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-4">
              <Shield className="h-8 w-8 text-primary" />
            </div>
            <h3 className="section-title text-center mb-2">Permissions Pending</h3>
            <p className="supporting-text text-center max-w-md mx-auto">
              Your webhost account is active but permissions haven't been assigned yet.
              A super admin needs to configure your access level.
            </p>
          </div>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <div className="overflow-x-auto scrollbar-hide -mx-1 px-1">
              <TabsList className="bg-card border border-border h-auto p-1.5 gap-1.5 flex-nowrap inline-flex min-w-max rounded-xl shadow-sm">
                <TabsTrigger value="overview" className={tabCls}>
                  <Globe className="h-3.5 w-3.5 mr-1.5" />Overview
                </TabsTrigger>
                <TabsTrigger value="admin-suite" className={tabCls}>
                  <Crown className="h-3.5 w-3.5 mr-1.5" />Admin Platform
                </TabsTrigger>
                {canViewManagers && (
                  <TabsTrigger value="managers" className={tabCls}>
                    <Users className="h-3.5 w-3.5 mr-1.5" />
                    Managers
                    {(pendingCounts?.pendingManagers ?? 0) > 0 && (
                      <span className="ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] bg-warning text-white font-extrabold shadow-sm">
                        {pendingCounts?.pendingManagers}
                      </span>
                    )}
                  </TabsTrigger>
                )}
                {canViewProperties && (
                  <TabsTrigger value="properties" className={tabCls}>
                    <Building className="h-3.5 w-3.5 mr-1.5" />Properties
                  </TabsTrigger>
                )}
                {canViewLandlords && (
                  <TabsTrigger value="unlinked-landlords" className={tabCls}>
                    <Home className="h-3.5 w-3.5 mr-1.5" />Landlords
                  </TabsTrigger>
                )}
                {canViewBilling && (
                  <TabsTrigger value="billing" className={tabCls}>
                    <Receipt className="h-3.5 w-3.5 mr-1.5" />
                    Billing
                    {(pendingCounts?.overdueInvoices ?? 0) > 0 && (
                      <span className="ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] bg-destructive text-white font-extrabold shadow-sm">
                        {pendingCounts?.overdueInvoices}
                      </span>
                    )}
                  </TabsTrigger>
                )}
                {(isSuperAdmin || canViewBilling) && (
                  <TabsTrigger value="tiers" className={tabCls}>
                    <Layers className="h-3.5 w-3.5 mr-1.5" />Tiers
                  </TabsTrigger>
                )}
                {(isSuperAdmin || canViewBilling) && (
                  <TabsTrigger value="billing-rules" className={tabCls}>
                    <ScrollText className="h-3.5 w-3.5 mr-1.5" />Billing Rules
                  </TabsTrigger>
                )}
                {(isSuperAdmin || canViewBilling) && (
                  <TabsTrigger value="custom-pricing" className={tabCls}>
                    <Tag className="h-3.5 w-3.5 mr-1.5" />Custom Pricing
                  </TabsTrigger>
                )}
                <TabsTrigger value="contracts" className={tabCls}>
                  <FileSignature className="h-3.5 w-3.5 mr-1.5" />Contracts
                </TabsTrigger>
                {canViewSecurity && (
                  <TabsTrigger value="security" className={tabCls}>
                    <ShieldAlert className="h-3.5 w-3.5 mr-1.5" />Security
                  </TabsTrigger>
                )}
                <TabsTrigger value="error-logs"
                  className="data-[state=active]:bg-destructive data-[state=active]:text-white data-[state=active]:font-semibold text-secondary-foreground hover:text-destructive hover:bg-destructive/10 text-xs sm:text-sm px-3.5 py-1.5 rounded-lg transition-all font-medium">
                  <Bug className="h-3.5 w-3.5 mr-1.5" />Error Logs
                </TabsTrigger>
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

      {/* Bottom accent hairline — restrained blue */}
      <div className="h-0.5 w-full bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
    </div>
  );
};

export default WebhostDashboard;
