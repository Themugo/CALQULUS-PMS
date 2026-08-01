import React from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/shared/components/ui/card';
import { Badge } from '@/shared/components/ui/badge';
import { Skeleton } from '@/shared/components/ui/skeleton';
import { Button } from '@/shared/components/ui/button';
import {
  Users, Building, Receipt, TrendingUp, Shield,
  CheckCircle, Clock, DollarSign, Home,
  AlertCircle, BarChart3, Crown, ArrowRight, Zap, RefreshCw,
  ShieldCheck, Activity, Layers, ScrollText, Tag, Bug
} from 'lucide-react';

type ManagerInvoiceRow = { amount: number | null };
type PropertyRow = { id: string; name: string; address: string | null; manager_id: string | null; created_at: string };
type ProfileRow = { id: string; email: string | null; full_name: string | null };

const fmt = (n: number) =>
  new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', minimumFractionDigits: 0 }).format(n);

interface WebhostStatCardProps {
  label: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  sub?: string;
  color?: string;
  loading?: boolean;
  badge?: { label: string; variant: 'default' | 'destructive' | 'secondary' | 'outline' };
  accent?: string;
}

function WebhostStatCard({ label, value, icon: Icon, sub, color = 'text-foreground', loading, badge, accent }: WebhostStatCardProps) {
  return (
    <Card className={`border-border/60 hover:border-amber-400/30 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${accent ? accent : ''}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/80 leading-tight">{label}</p>
          <div className="h-7 w-7 rounded-lg bg-amber-400/10 border border-amber-400/20 flex items-center justify-center flex-shrink-0">
            <Icon className="h-3.5 w-3.5 text-amber-500" />
          </div>
        </div>
        {loading ? (
          <Skeleton className="h-7 w-20" />
        ) : (
          <div className="flex items-end gap-2">
            <p className={`font-heading text-xl font-bold leading-none ${color}`}>{value}</p>
            {badge && (
              <Badge variant={badge.variant} className="text-[10px] h-4 px-1.5 mb-0.5 shrink-0">{badge.label}</Badge>
            )}
          </div>
        )}
        {sub && !loading && <p className="text-xs text-muted-foreground mt-1.5 leading-tight">{sub}</p>}
      </CardContent>
    </Card>
  );
}

const PlatformRevenueTrend: React.FC = () => {
  const { data: trend = [], isLoading } = useQuery({
    queryKey: ['platform-revenue-6mo'],
    queryFn: async () => {
      const months = Array.from({ length: 6 }, (_, i) => {
        const d = new Date(); d.setMonth(d.getMonth() - (5 - i));
        return d.toISOString().slice(0, 7);
      });
      return Promise.all(months.map(async (m) => {
        const start = `${m}-01`;
        const end = new Date(start); end.setMonth(end.getMonth() + 1);
        const { data } = await supabase.from('manager_invoices').select('amount')
          .eq('status', 'paid').gte('paid_date', start).lt('paid_date', end.toISOString().slice(0, 10));
        const rows = (data as ManagerInvoiceRow[] | null) || [];
        const revenue = rows.reduce((s, i) => s + Number(i.amount), 0);
        return { month: m.slice(5), revenue };
      }));
    },
  });

  const max = Math.max(...trend.map(t => t.revenue), 1);

  return (
    <Card className="border-border/60">
      <CardHeader className="pb-2 pt-4 px-4 sm:px-5 border-b border-border/40">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-amber-500" />
              Platform Revenue Trend — Last 6 Months
            </CardTitle>
            <CardDescription className="text-xs">Subscription billing collected across registered property managers</CardDescription>
          </div>
          <Badge variant="outline" className="text-[10px] border-amber-400/30 text-amber-400">
            Subscription Engine
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="px-4 sm:px-5 pt-5 pb-4">
        {isLoading ? (
          <Skeleton className="h-36 w-full" />
        ) : (
          <div className="flex items-end gap-2 h-36 pt-4">
            {trend.map((t, i) => {
              const pct = (t.revenue / max) * 100;
              const isLatest = i === trend.length - 1;
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1.5 group">
                  <span className="text-[10px] font-semibold text-amber-400 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                    {t.revenue > 0 ? fmt(t.revenue) : 'KES 0'}
                  </span>
                  <div className="w-full rounded-t-lg bg-muted/60 relative overflow-hidden" style={{ height: '96px' }}>
                    <div
                      className={`absolute bottom-0 w-full rounded-t-lg transition-all duration-500 ${isLatest ? 'bg-amber-400' : 'bg-amber-400/50 hover:bg-amber-400/80'}`}
                      style={{ height: `${Math.max(4, pct)}%` }}
                    />
                  </div>
                  <span className="text-[10px] font-medium text-muted-foreground">{t.month}</span>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

const WebhostOverview = () => {
  const queryClient = useQueryClient();
  const { data: stats, isLoading } = useQuery({
    queryKey: ['webhost-overview-stats-v2'],
    queryFn: async () => {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
      const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0).toISOString();
      const [
        totalManagers, pendingManagers, approvedManagers, rejectedManagers,
        totalProperties, totalWebhosts,
        platformRevenueMTD, platformRevenueLM,
        pendingManagerInvoices, overdueManagerInvoices,
        systemLandlords, pendingPayouts,
      ] = await Promise.all([
        supabase.from('manager_profiles').select('id', { count: 'exact', head: true }),
        supabase.from('manager_profiles').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('manager_profiles').select('id', { count: 'exact', head: true }).eq('status', 'approved'),
        supabase.from('manager_profiles').select('id', { count: 'exact', head: true }).eq('status', 'rejected'),
        supabase.from('properties').select('id', { count: 'exact', head: true }),
        supabase.from('user_roles').select('id', { count: 'exact', head: true }).eq('role', 'webhost'),
        supabase.from('manager_invoices').select('amount').eq('status', 'paid').gte('paid_date', startOfMonth),
        supabase.from('manager_invoices').select('amount').eq('status', 'paid')
          .gte('paid_date', startOfLastMonth).lte('paid_date', endOfLastMonth),
        supabase.from('manager_invoices').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('manager_invoices').select('id', { count: 'exact', head: true }).eq('status', 'overdue'),
        supabase.from('property_landlords').select('id', { count: 'exact', head: true }).is('manager_id', null),
        supabase.from('payout_requests').select('id', { count: 'exact', head: true }).eq('status', 'pending').eq('recipient_type', 'webhost'),
      ]);
      const revenueMTD = ((platformRevenueMTD.data as ManagerInvoiceRow[] | null) ?? []).reduce((s,i) => s + Number(i.amount), 0);
      const revenueLM = ((platformRevenueLM.data as ManagerInvoiceRow[] | null) ?? []).reduce((s,i) => s + Number(i.amount), 0);
      const revenueChange = revenueLM > 0 ? Math.round(((revenueMTD - revenueLM) / revenueLM) * 100) : 0;
      return {
        totalManagers: totalManagers.count ?? 0,
        pendingManagers: pendingManagers.count ?? 0,
        approvedManagers: approvedManagers.count ?? 0,
        rejectedManagers: rejectedManagers.count ?? 0,
        totalProperties: totalProperties.count ?? 0,
        totalWebhosts: totalWebhosts.count ?? 0,
        revenueMTD, revenueLM, revenueChange,
        pendingManagerInvoices: pendingManagerInvoices.count ?? 0,
        overdueManagerInvoices: overdueManagerInvoices.count ?? 0,
        systemLandlords: systemLandlords.count ?? 0,
        pendingPayouts: pendingPayouts.count ?? 0,
      };
    },
  });

  const { data: latestProperties = [], isLoading: isLoadingProperties } = useQuery({
    queryKey: ['webhost-latest-properties-audit'],
    queryFn: async () => {
      const { data: props, error } = await supabase.from('properties')
        .select('id, name, address, manager_id, created_at').order('created_at', { ascending: false }).limit(8);
      if (error) throw error;
      const typedProps = (props || []) as PropertyRow[];
      const managerIds = [...new Set(typedProps.map(p => p.manager_id).filter(Boolean))];
      const { data: profiles } = managerIds.length > 0
        ? await supabase.from('profiles').select('id, email, full_name').in('id', managerIds)
        : { data: [] as ProfileRow[] };
      const profileById = new Map((profiles as ProfileRow[] || []).map(p => [p.id, p]));
      return typedProps.map(p => ({ ...p, manager_profile: p.manager_id ? profileById.get(p.manager_id) ?? null : null }));
    },
  });

  return (
    <div className="space-y-6">
      {/* ── EXECUTIVE ANSWERS BAR ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* What requires attention? */}
        <Card className="border-l-4 border-l-amber-500 border-border/70 bg-card hover:shadow-md transition-all">
          <CardContent className="p-3.5">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-500 flex items-center gap-1.5">
                <AlertCircle className="h-3.5 w-3.5" />
                Attention Required
              </span>
              <Badge variant="outline" className="text-[10px] h-4 border-amber-400/30 text-amber-400">
                {(stats?.pendingManagers ?? 0) + (stats?.overdueManagerInvoices ?? 0)} Items
              </Badge>
            </div>
            <div className="space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Pending Managers:</span>
                <span className="font-semibold text-amber-400">{stats?.pendingManagers ?? 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Overdue Invoices:</span>
                <span className="font-semibold text-red-400">{stats?.overdueManagerInvoices ?? 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Pending Payouts:</span>
                <span className="font-semibold text-foreground">{stats?.pendingPayouts ?? 0}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* What generates revenue? */}
        <Card className="border-l-4 border-l-emerald-500 border-border/70 bg-card hover:shadow-md transition-all">
          <CardContent className="p-3.5">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-500 flex items-center gap-1.5">
                <DollarSign className="h-3.5 w-3.5" />
                Platform Billing
              </span>
              <Badge variant="outline" className="text-[10px] h-4 border-emerald-400/30 text-emerald-400">
                +{stats?.revenueChange ?? 0}% MoM
              </Badge>
            </div>
            <div className="space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Revenue MTD:</span>
                <span className="font-bold text-emerald-400">{fmt(stats?.revenueMTD ?? 0)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Last Month:</span>
                <span className="font-medium text-foreground">{fmt(stats?.revenueLM ?? 0)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Pending Invoices:</span>
                <span className="font-medium text-amber-400">{stats?.pendingManagerInvoices ?? 0}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Platform Scope */}
        <Card className="border-l-4 border-l-sky-500 border-border/70 bg-card hover:shadow-md transition-all">
          <CardContent className="p-3.5">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-sky-500 flex items-center gap-1.5">
                <Building className="h-3.5 w-3.5" />
                Platform Roster
              </span>
              <Badge variant="outline" className="text-[10px] h-4 border-sky-400/30 text-sky-400">
                Active Scope
              </Badge>
            </div>
            <div className="space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Managers:</span>
                <span className="font-semibold text-foreground">{stats?.totalManagers ?? 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Properties:</span>
                <span className="font-semibold text-foreground">{stats?.totalProperties ?? 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">System Landlords:</span>
                <span className="font-semibold text-foreground">{stats?.systemLandlords ?? 0}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Security & Firewall */}
        <Card className="border-l-4 border-l-purple-500 border-border/70 bg-card hover:shadow-md transition-all">
          <CardContent className="p-3.5">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-purple-400 flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5" />
                Tenant Data Privacy
              </span>
              <Badge variant="outline" className="text-[10px] h-4 border-purple-400/30 text-purple-400">
                Enforced
              </Badge>
            </div>
            <div className="space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Webhost Admins:</span>
                <span className="font-semibold text-foreground">{stats?.totalWebhosts ?? 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tenant Access:</span>
                <span className="font-semibold text-emerald-400">Blocked (Firewall)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">System Status:</span>
                <span className="font-semibold text-emerald-400">Operational</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── KPI GRID ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <WebhostStatCard label="Revenue MTD" value={isLoading ? '—' : fmt(stats?.revenueMTD ?? 0)}
          icon={TrendingUp} color="text-emerald-400" loading={isLoading}
          sub={stats ? `LM: ${fmt(stats.revenueLM)}` : undefined} />
        <WebhostStatCard label="Total Managers" value={stats?.totalManagers ?? 0}
          icon={Users} loading={isLoading} color="text-amber-400" />
        <WebhostStatCard label="Pending Approval" value={stats?.pendingManagers ?? 0}
          icon={Clock} loading={isLoading} color={stats?.pendingManagers ? 'text-amber-400' : undefined}
          badge={stats?.pendingManagers ? { label: 'Action Needed', variant: 'secondary' } : undefined} />
        <WebhostStatCard label="Overdue Invoices" value={stats?.overdueManagerInvoices ?? 0}
          icon={AlertCircle} loading={isLoading} color={stats?.overdueManagerInvoices ? 'text-red-400' : undefined}
          badge={stats?.overdueManagerInvoices ? { label: 'Overdue', variant: 'destructive' } : undefined} />
        <WebhostStatCard label="Total Properties" value={stats?.totalProperties ?? 0}
          icon={Building} loading={isLoading} />
        <WebhostStatCard label="System Landlords" value={stats?.systemLandlords ?? 0}
          icon={Home} loading={isLoading} sub="Unlinked" />
      </div>

      {/* ── MAIN WORKSPACE MATRIX ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Column (8 cols): Charts & Properties Audit */}
        <div className="lg:col-span-8 space-y-5">
          <PlatformRevenueTrend />

          <Card className="border-border/60">
            <CardHeader className="pb-2 pt-4 px-4 sm:px-5 border-b border-border/40">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Activity className="h-4 w-4 text-amber-500" />
                    Recent Properties Audit Trail
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Latest properties registered across manager accounts
                  </CardDescription>
                </div>
                <Button variant="ghost" size="sm" onClick={() => queryClient.invalidateQueries()} className="h-7 w-7 p-0">
                  <RefreshCw className="h-3.5 w-3.5" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-4">
              {isLoadingProperties ? (
                <div className="space-y-2">
                  {Array.from({length:4}).map((_,i) => <Skeleton key={i} className="h-12 w-full rounded-lg" />)}
                </div>
              ) : latestProperties.length === 0 ? (
                <div className="py-8 text-center">
                  <Building className="h-8 w-8 mx-auto text-muted-foreground/30 mb-2" />
                  <p className="text-sm text-muted-foreground">No properties on record yet</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {(latestProperties as (PropertyRow & { manager_profile: ProfileRow | null })[]).map(prop => (
                    <div key={prop.id} className="flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-muted/20 p-3 hover:bg-muted/40 transition-colors">
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-foreground truncate">{prop.name}</p>
                        <p className="text-[11px] text-muted-foreground truncate">{prop.address || 'No address specified'}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-[11px] font-medium text-amber-400 truncate max-w-[140px]">
                          {prop.manager_profile?.full_name || 'Manager'}
                        </p>
                        <p className="text-[10px] text-muted-foreground truncate max-w-[140px]">
                          {prop.manager_profile?.email || '—'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column (4 cols): Quick Admin Desk & Security Policy */}
        <div className="lg:col-span-4 space-y-5">
          <Card className="border-border/60">
            <CardHeader className="pb-2 pt-4 px-4 sm:px-5 border-b border-border/40">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Zap className="h-4 w-4 text-amber-500" />
                Platform Command Desk
              </CardTitle>
              <CardDescription className="text-xs">Quick shortcuts to admin modules</CardDescription>
            </CardHeader>
            <CardContent className="p-3">
              <div className="space-y-1.5">
                <div className="p-2.5 rounded-lg border border-border/50 bg-muted/20 flex items-center justify-between text-xs">
                  <span className="font-medium text-foreground flex items-center gap-2">
                    <Users className="h-3.5 w-3.5 text-amber-500" />
                    Manager Accounts
                  </span>
                  <Badge variant="outline" className="text-[10px]">{stats?.approvedManagers ?? 0} Approved</Badge>
                </div>
                <div className="p-2.5 rounded-lg border border-border/50 bg-muted/20 flex items-center justify-between text-xs">
                  <span className="font-medium text-foreground flex items-center gap-2">
                    <Layers className="h-3.5 w-3.5 text-sky-400" />
                    Subscription Tiers
                  </span>
                  <Badge variant="outline" className="text-[10px]">Configured</Badge>
                </div>
                <div className="p-2.5 rounded-lg border border-border/50 bg-muted/20 flex items-center justify-between text-xs">
                  <span className="font-medium text-foreground flex items-center gap-2">
                    <ScrollText className="h-3.5 w-3.5 text-emerald-400" />
                    Platform Billing Rules
                  </span>
                  <Badge variant="outline" className="text-[10px]">Active</Badge>
                </div>
                <div className="p-2.5 rounded-lg border border-border/50 bg-muted/20 flex items-center justify-between text-xs">
                  <span className="font-medium text-foreground flex items-center gap-2">
                    <Home className="h-3.5 w-3.5 text-purple-400" />
                    System Landlords
                  </span>
                  <Badge variant="outline" className="text-[10px]">{stats?.systemLandlords ?? 0} Unlinked</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Privacy Firewall Policy */}
          <Card className="border-amber-400/20 bg-amber-400/5">
            <CardContent className="p-4 flex items-start gap-3">
              <ShieldCheck className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-amber-400 uppercase tracking-wider">Tenant Data Isolation Policy</p>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  Webhost administrators operate at the platform level only. By architecture and security policy, tenant identities, rent payment records, and lease details are completely isolated from Webhost views.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default WebhostOverview;
