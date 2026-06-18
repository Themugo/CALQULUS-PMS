import React from 'react';
import { useAuth } from '@/features/auth/AuthContext';
import { Navigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';
import {
  Globe, Users, Building, Home, LogOut, Shield,
  Receipt, Crown, FileSignature, ShieldAlert, Bug, Layers,
} from 'lucide-react';
import ManagerManagement from '@/features/webhost/components/ManagerManagement';
import PropertyAssignment from '@/features/webhost/components/PropertyAssignment';
import WebhostOverview from '@/features/webhost/components/WebhostOverview';
import ManagerBilling from '@/features/webhost/components/ManagerBilling';
import WebhostContracts from '@/features/webhost/components/WebhostContracts';
import { SecurityAuditLogs } from '@/features/webhost/components/SecurityAuditLogs';
import ErrorLogsTab from '@/features/webhost/components/ErrorLogsTab';
import TierManagement from '@/features/webhost/components/TierManagement';
import WebhostAccountSecurity from '@/features/webhost/components/WebhostAccountSecurity';
import SystemLandlordManagement from '@/features/webhost/components/SystemLandlordManagement';
import { supabase } from '@/integrations/supabase/client';
import calqulusLogo from '@/assets/calqulus-logo-new.png';

// NOTE: TenantManagement is intentionally NOT imported.
// Webhosts have zero access to tenant data by platform policy.

const WebhostDashboard = () => {
  const {
    user, userRole, signOut, loading, isSuperAdmin,
    hasWebhostPermission, webhostPermissions,
  } = useAuth();

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
      <div className="min-h-screen flex items-center justify-center hero-gradient">
        <div className="flex flex-col items-center gap-4">
          <img src={calqulusLogo} alt="CALQULUS PMS" className="h-14 w-auto animate-pulse-soft" />
          <div className="flex gap-1.5">
            {[0,1,2].map(i => (
              <div key={i} className="w-2 h-2 rounded-full bg-amber-400/60 animate-pulse-soft"
                style={{ animationDelay: `${i * 0.2}s` }} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!user || userRole?.role !== 'webhost') {
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
          <Badge className="bg-amber-400/15 text-amber-400 border border-amber-400/30 ml-2 gap-1">
            <Crown className="h-3 w-3" />Super Admin
          </Badge>
        );
      case 'admin':
        return (
          <Badge className="bg-blue-500/15 text-blue-400 border border-blue-500/30 ml-2 gap-1">
            <Shield className="h-3 w-3" />Admin
          </Badge>
        );
      case 'limited_admin':
        return <Badge variant="outline" className="ml-2 text-white/50 border-white/20">Limited</Badge>;
      default:
        return null;
    }
  };

  const tabCls = "data-[state=active]:bg-amber-400 data-[state=active]:text-slate-900 data-[state=active]:font-semibold text-white/50 hover:text-white/80 transition-colors text-xs sm:text-sm";

  return (
    <div className="min-h-screen hero-gradient">
      {/* Top gold accent */}
      <div className="h-0.5 w-full bg-gradient-to-r from-transparent via-amber-400/50 to-transparent" />

      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-amber-400/10 bg-card/90 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <img src={calqulusLogo} alt="CALQULUS PMS" className="h-9 w-auto object-contain flex-shrink-0" />
            <div className="hidden sm:block min-w-0">
              <p className="font-heading text-sm font-bold text-gradient leading-none">CALQULUS PMS</p>
              <p className="text-[10px] text-amber-400/50 tracking-widest font-medium">PLATFORM ADMINISTRATION</p>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-shrink-0">
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10">
              <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse-soft" />
              <span className="text-xs text-white/60 truncate max-w-[180px]">{user.email}</span>
              {getLevelBadge()}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={signOut}
              className="border border-white/10 text-white/50 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/20 transition-all"
            >
              <LogOut className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Sign Out</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!myPermissions ? (
          <div className="rounded-2xl border border-amber-400/20 bg-white/5 backdrop-blur-sm p-10 text-center">
            <div className="h-16 w-16 rounded-2xl bg-amber-400/10 border border-amber-400/20 flex items-center justify-center mx-auto mb-4">
              <Shield className="h-8 w-8 text-amber-400" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Permissions Pending</h3>
            <p className="text-white/40 text-sm max-w-md mx-auto">
              Your webhost account is active but permissions haven't been assigned yet.
              A super admin needs to configure your access level.
              If you're the first webhost, refresh this page to be automatically promoted.
            </p>
          </div>
        ) : (
          <Tabs defaultValue="overview" className="space-y-6">
            <div className="overflow-x-auto scrollbar-hide -mx-1 px-1">
              <TabsList className="bg-white/5 border border-white/10 h-auto p-1 gap-1 flex-nowrap inline-flex min-w-max">
                <TabsTrigger value="overview" className={tabCls}>
                  <Home className="h-3.5 w-3.5 mr-1.5" />Overview
                </TabsTrigger>
                {canViewManagers && (
                  <TabsTrigger value="managers" className={tabCls}>
                    <Users className="h-3.5 w-3.5 mr-1.5" />Managers
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
                    <Receipt className="h-3.5 w-3.5 mr-1.5" />Billing
                  </TabsTrigger>
                )}
                {(isSuperAdmin || canViewBilling) && (
                  <TabsTrigger value="tiers" className={tabCls}>
                    <Layers className="h-3.5 w-3.5 mr-1.5" />Tiers
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
                  className="data-[state=active]:bg-red-500 data-[state=active]:text-white data-[state=active]:font-semibold text-white/50 hover:text-red-400 text-xs sm:text-sm transition-colors">
                  <Bug className="h-3.5 w-3.5 mr-1.5" />Error Logs
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="overview"><WebhostOverview /></TabsContent>
            {canViewManagers && <TabsContent value="managers"><ManagerManagement /></TabsContent>}
            {canViewProperties && <TabsContent value="properties"><PropertyAssignment /></TabsContent>}
            {canViewLandlords && <TabsContent value="unlinked-landlords"><SystemLandlordManagement /></TabsContent>}
            {canViewBilling && <TabsContent value="billing"><ManagerBilling /></TabsContent>}
            {(isSuperAdmin || canViewBilling) && <TabsContent value="tiers"><TierManagement /></TabsContent>}
            <TabsContent value="contracts"><WebhostContracts /></TabsContent>
            {canViewSecurity && (
              <TabsContent value="security">
                <div className="space-y-4">
                  <WebhostAccountSecurity />
                  <SecurityAuditLogs />
                </div>
              </TabsContent>
            )}
            <TabsContent value="error-logs"><ErrorLogsTab /></TabsContent>
          </Tabs>
        )}
      </main>

      {/* Bottom gold accent */}
      <div className="h-0.5 w-full bg-gradient-to-r from-transparent via-amber-400/30 to-transparent" />
    </div>
  );
};

export default WebhostDashboard;
