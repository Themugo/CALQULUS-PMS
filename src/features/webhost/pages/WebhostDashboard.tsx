import React from 'react';
import { useAuth } from '@/features/auth/AuthContext';
import { Navigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';
import {
  Globe, Users, Building, Home, LogOut, Shield,
  Receipt, Activity, Crown, FileSignature, ShieldAlert, Bug,
  CreditCard, AlertTriangle, Layers, BarChart3
} from 'lucide-react';
import ManagerManagement from '@/features/webhost/components/ManagerManagement';
import PropertyAssignment from '@/features/webhost/components/PropertyAssignment';
import WebhostOverview from '@/features/webhost/components/WebhostOverview';
import WebhostManagement from '@/features/webhost/components/WebhostManagement';
import ManagerBilling from '@/features/webhost/components/ManagerBilling';
import ActivityLog from '@/features/webhost/components/ActivityLog';
import WebhostContracts from '@/features/webhost/components/WebhostContracts';
import { SecurityAuditLogs } from '@/features/webhost/components/SecurityAuditLogs';
import ErrorLogsTab from '@/features/webhost/components/ErrorLogsTab';
import WebhookDeadLetterPanel from '@/features/webhost/components/WebhookDeadLetterPanel';
import WebhostPaymentSettings from '@/features/webhost/components/WebhostPaymentSettings';
import SystemLandlordManagement from '@/features/webhost/components/SystemLandlordManagement';
import TierManagement from '@/features/webhost/components/TierManagement';
import PropertyTypeAnalytics from '@/features/webhost/components/PropertyTypeAnalytics';
import { supabase } from '@/integrations/supabase/client';

// NOTE: TenantManagement is intentionally NOT imported.
// Webhosts have zero access to tenant data by platform policy.

const WebhostDashboard = () => {
  const { user, userRole, signOut, loading, isSuperAdmin, hasWebhostPermission, webhostPermissions } = useAuth();

  // Bootstrap first webhost as super admin if no permissions exist yet
  React.useEffect(() => {
    if (!loading && user && userRole?.role === 'webhost' && !webhostPermissions) {
      // Trigger bootstrap via the existing hook if needed
      supabase.from('admin_permissions').select('id').eq('user_id', user.id).maybeSingle()
        .then(({ data }) => {
          if (!data) {
            supabase.from('admin_permissions').insert({
              user_id: user.id, admin_level: 'super_admin',
              can_create_webhosts: true, can_manage_managers: true,
              can_manage_billing: true, can_manage_properties: true,
              can_manage_system_landlords: true, can_view_activity_logs: true,
              can_manage_tenants: false,
            } as any).then(() => window.location.reload());
          }
        });
    }
  }, [loading, user, userRole, webhostPermissions]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!user || userRole?.role !== 'webhost') {
    return <Navigate to="/webhost/login" replace />;
  }

  // Permission gates — using AuthContext directly
  const canViewBilling          = hasWebhostPermission('can_manage_billing');
  const canViewWebhosts         = isSuperAdmin;
  const canViewManagers         = hasWebhostPermission('can_manage_managers');
  const canViewProperties       = hasWebhostPermission('can_manage_properties');
  const canViewSystemLandlords  = hasWebhostPermission('can_manage_system_landlords');
  const canViewActivityLog      = hasWebhostPermission('can_view_activity_logs');
  const canViewSecurity         = isSuperAdmin || hasWebhostPermission('can_view_activity_logs');
  const myPermissions           = webhostPermissions;

  const getLevelBadge = () => {
    if (!myPermissions) return null;
    switch (myPermissions.admin_level) {
      case 'super_admin':
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300 ml-2"><Crown className="h-3 w-3 mr-1" />Super Admin</Badge>;
      case 'admin':
        return <Badge className="bg-purple-100 text-purple-800 border-purple-300 ml-2"><Shield className="h-3 w-3 mr-1" />Admin</Badge>;
      case 'limited_admin':
        return <Badge variant="outline" className="ml-2">Limited</Badge>;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-950 via-slate-900 to-slate-950">
      {/* Header */}
      <header className="border-b border-purple-800/30 bg-slate-900/60 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center shadow-lg shadow-purple-500/20">
              <Globe className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-base font-bold text-white leading-tight">Webhost Portal</h1>
              <p className="text-xs text-purple-300">Platform Administration</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center">
              <span className="text-sm text-purple-300">{user.email}</span>
              {getLevelBadge()}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={signOut}
              className="border-purple-700 text-purple-300 hover:bg-purple-900/50 hover:text-white"
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
          <div className="bg-slate-800/50 border border-orange-500/30 rounded-xl p-10 text-center">
            <Shield className="h-12 w-12 mx-auto text-orange-400 mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">Permissions Pending</h3>
            <p className="text-purple-300 text-sm max-w-md mx-auto">
              Your webhost account is active but permissions haven't been assigned yet.
              A super admin needs to configure your access level.
              If you're the first webhost, refresh this page to be automatically promoted.
            </p>
          </div>
        ) : (
          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList className="bg-slate-800/50 border border-purple-800/30 flex-wrap h-auto gap-1 p-1">
              <TabsTrigger value="overview" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white text-purple-300">
                <Home className="h-4 w-4 mr-1.5" />Overview
              </TabsTrigger>
              {canViewManagers && (
                <TabsTrigger value="managers" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white text-purple-300">
                  <Users className="h-4 w-4 mr-1.5" />Managers
                </TabsTrigger>
              )}
              {canViewBilling && (
                <TabsTrigger value="billing" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white text-purple-300">
                  <Receipt className="h-4 w-4 mr-1.5" />Billing
                </TabsTrigger>
              )}
              {canViewSystemLandlords && (
                <TabsTrigger value="landlords" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white text-purple-300">
                  <Home className="h-4 w-4 mr-1.5" />Landlords
                </TabsTrigger>
              )}
              {canViewProperties && (
                <TabsTrigger value="properties" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white text-purple-300">
                  <Building className="h-4 w-4 mr-1.5" />Properties
                </TabsTrigger>
              )}
              {canViewWebhosts && (
                <TabsTrigger value="webhosts" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white text-purple-300">
                  <Shield className="h-4 w-4 mr-1.5" />Webhost Admins
                </TabsTrigger>
              )}
              {canViewActivityLog && (
                <TabsTrigger value="activity" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white text-purple-300">
                  <Activity className="h-4 w-4 mr-1.5" />Activity
                </TabsTrigger>
              )}
              <TabsTrigger value="contracts" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white text-purple-300">
                <FileSignature className="h-4 w-4 mr-1.5" />Contracts
              </TabsTrigger>
              {(isSuperAdmin || canViewBilling) && (
                <TabsTrigger value="tiers" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white text-purple-300">
                  <Layers className="h-4 w-4 mr-1.5" />Tiers
                </TabsTrigger>
              )}
              {(isSuperAdmin || canViewBilling) && (
                <TabsTrigger value="property-types" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white text-purple-300">
                  <BarChart3 className="h-4 w-4 mr-1.5" />Property Types
                </TabsTrigger>
              )}
              {(isSuperAdmin || canViewBilling) && (
                <TabsTrigger value="payment-settings" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white text-purple-300">
                  <CreditCard className="h-4 w-4 mr-1.5" />Payment Settings
                </TabsTrigger>
              )}
              {canViewSecurity && (
                <TabsTrigger value="security" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white text-purple-300">
                  <ShieldAlert className="h-4 w-4 mr-1.5" />Security
                </TabsTrigger>
              )}
              <TabsTrigger value="error-logs" className="data-[state=active]:bg-red-600 data-[state=active]:text-white text-purple-300">
                <Bug className="h-4 w-4 mr-1.5" />Error Logs
              </TabsTrigger>
              <TabsTrigger value="dead-letter" className="data-[state=active]:bg-red-600 data-[state=active]:text-white text-purple-300">
                <AlertTriangle className="h-4 w-4 mr-1.5" />Dead-Letter
              </TabsTrigger>
            </TabsList>

            {/* ── No tenant tab ever ── */}

            <TabsContent value="overview">
              <WebhostOverview />
            </TabsContent>

            {canViewManagers && (
              <TabsContent value="managers">
                <ManagerManagement />
              </TabsContent>
            )}

            {canViewBilling && (
              <TabsContent value="billing">
                <ManagerBilling />
              </TabsContent>
            )}

            {canViewSystemLandlords && (
              <TabsContent value="landlords">
                <SystemLandlordManagement />
              </TabsContent>
            )}

            {canViewProperties && (
              <TabsContent value="properties">
                <PropertyAssignment />
              </TabsContent>
            )}

            {canViewWebhosts && (
              <TabsContent value="webhosts">
                <WebhostManagement />
              </TabsContent>
            )}

            {canViewActivityLog && (
              <TabsContent value="activity">
                <ActivityLog />
              </TabsContent>
            )}

            <TabsContent value="contracts">
              <WebhostContracts />
            </TabsContent>

            {(isSuperAdmin || canViewBilling) && (
              <TabsContent value="tiers">
                <TierManagement />
              </TabsContent>
            )}

            {(isSuperAdmin || canViewBilling) && (
              <TabsContent value="property-types">
                <PropertyTypeAnalytics />
              </TabsContent>
            )}

            {(isSuperAdmin || canViewBilling) && (
              <TabsContent value="payment-settings">
                <WebhostPaymentSettings />
              </TabsContent>
            )}

            {canViewSecurity && (
              <>
                <TabsContent value="security">
                  <SecurityAuditLogs />
                </TabsContent>
                <TabsContent value="error-logs">
                  <ErrorLogsTab />
                </TabsContent>
                <TabsContent value="dead-letter">
                  <WebhookDeadLetterPanel />
                </TabsContent>
              </>
            )}
          </Tabs>
        )}
      </main>
    </div>
  );
};

export default WebhostDashboard;
