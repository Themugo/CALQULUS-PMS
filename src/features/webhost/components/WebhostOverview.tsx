import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/shared/components/ui/card';
import { Badge } from '@/shared/components/ui/badge';
import { Skeleton } from '@/shared/components/ui/skeleton';
import {
  Users, Building, Receipt, TrendingUp, Shield,
  CheckCircle, Clock, DollarSign, Home,
  AlertCircle, BarChart3, Crown,
} from 'lucide-react';

type ManagerInvoiceRow = { amount: number | null };
type PropertyRow = { id: string; name: string; address: string | null; manager_id: string | null; created_at: string };
type ProfileRow = { id: string; email: string | null; full_name: string | null };

const fmt = (n: number) =>
  new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', minimumFractionDigits: 0 }).format(n);

// ── Module-level StatCard (fixes react-hooks/static-components) ──────────────
interface WebhostStatCardProps {
  label: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  sub?: string;
  color?: string;
  loading?: boolean;
  badge?: { label: string; variant: 'default' | 'destructive' | 'secondary' | 'outline' | 'gold' };
  accent?: string;
}

function WebhostStatCard({ label, value, icon: Icon, sub, color = 'text-foreground', loading, badge, accent }: WebhostStatCardProps) {
  return (
    <Card className={`border-border/60 hover:border-amber-400/20 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md${accent ? ` ${accent}` : ''}`}>
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-2 mb-3">
          <p className="text-xs font-semibold text-muted-foreground/70 uppercase tracking-wider leading-tight">{label}</p>
          <div className="h-7 w-7 rounded-lg bg-amber-400/10 border border-amber-400/15 flex items-center justify-center flex-shrink-0">
            <Icon className="h-3.5 w-3.5 text-amber-500/80" />
          </div>
        </div>
        {loading ? (
          <Skeleton className="h-7 w-20" />
        ) : (
          <div className="flex items-end gap-2">
            <p className={`font-heading text-2xl font-bold leading-none ${color}`}>{value}</p>
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

// ── Platform Revenue Trend ───────────────────────────────────────────────────
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
    <Card>
      <CardHeader className="pb-2 pt-4 px-4 sm:px-5">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-amber-500" />
          Platform revenue — last 6 months
        </CardTitle>
        <CardDescription>Subscription billing collected from managers</CardDescription>
      </CardHeader>
      <CardContent className="px-4 sm:px-5 pb-4">
        {isLoading ? (
          <Skeleton className="h-32 w-full" />
        ) : (
          <div className="flex items-end gap-1.5 h-32">
            {trend.map((t, i) => {
              const pct = (t.revenue / max) * 100;
              const isLatest = i === trend.length - 1;
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1 group">
                  <span className="text-[10px] text-muted-foreground font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                    {t.revenue > 0 ? fmt(t.revenue) : '—'}
                  </span>
                  <div className="w-full rounded-t-md bg-muted/60 relative overflow-hidden" style={{ height: '88px' }}>
                    <div
                      className={`absolute bottom-0 w-full rounded-t-md transition-all duration-500 ${isLatest ? 'bg-amber-400' : 'bg-amber-400/40'}`}
                      style={{ height: `${Math.max(3, pct)}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-muted-foreground">{t.month}</span>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// ── Main Component ───────────────────────────────────────────────────────────
const WebhostOverview = () => {
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

  const hasUrgent = (stats?.pendingManagers ?? 0) > 0 || (stats?.overdueManagerInvoices ?? 0) > 0 || (stats?.pendingPayouts ?? 0) > 0;

  return (
    <div className="space-y-6">
      {/* Urgent actions banner */}
      {!isLoading && hasUrgent && (
        <div className="flex flex-wrap gap-2">
          {(stats?.pendingManagers ?? 0) > 0 && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-amber-400/30 bg-amber-400/8 text-amber-700 dark:text-amber-300 text-xs font-medium">
              <Clock className="h-3.5 w-3.5" />
              {stats!.pendingManagers} manager{stats!.pendingManagers !== 1 ? 's' : ''} awaiting approval
            </div>
          )}
          {(stats?.overdueManagerInvoices ?? 0) > 0 && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-red-200 bg-red-50 dark:border-red-900/40 dark:bg-red-950/20 text-red-700 dark:text-red-400 text-xs font-medium">
              <AlertCircle className="h-3.5 w-3.5" />
              {stats!.overdueManagerInvoices} overdue subscription invoice{stats!.overdueManagerInvoices !== 1 ? 's' : ''}
            </div>
          )}
          {(stats?.pendingPayouts ?? 0) > 0 && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-blue-200 bg-blue-50 dark:border-blue-900/40 dark:bg-blue-950/20 text-blue-700 dark:text-blue-400 text-xs font-medium">
              <Receipt className="h-3.5 w-3.5" />
              {stats!.pendingPayouts} payout request{stats!.pendingPayouts !== 1 ? 's' : ''} pending
            </div>
          )}
        </div>
      )}

      {/* Platform billing */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <DollarSign className="h-4 w-4 text-amber-500" />
          <h3 className="text-sm font-semibold text-foreground">Platform billing this month</h3>
          {stats && stats.revenueChange !== 0 && (
            <Badge variant={stats.revenueChange > 0 ? "success" : "destructive"} className="text-[10px] h-4 px-1.5">
              {stats.revenueChange > 0 ? '+' : ''}{stats.revenueChange}% vs last month
            </Badge>
          )}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <WebhostStatCard label="Revenue MTD" value={isLoading ? '—' : fmt(stats?.revenueMTD ?? 0)}
            icon={TrendingUp} color="text-emerald-600" loading={isLoading}
            sub={stats ? `Last month: ${fmt(stats.revenueLM)}` : undefined} />
          <WebhostStatCard label="Pending invoices" value={stats?.pendingManagerInvoices ?? 0}
            icon={Clock} loading={isLoading}
            color={stats?.pendingManagerInvoices ? 'text-amber-600' : undefined}
            badge={stats?.pendingManagerInvoices ? { label: 'Action needed', variant: 'secondary' } : undefined} />
          <WebhostStatCard label="Overdue invoices" value={stats?.overdueManagerInvoices ?? 0}
            icon={AlertCircle} loading={isLoading}
            color={stats?.overdueManagerInvoices ? 'text-red-600' : undefined}
            badge={stats?.overdueManagerInvoices ? { label: 'Overdue', variant: 'destructive' } : undefined} />
          <WebhostStatCard label="Pending payouts" value={stats?.pendingPayouts ?? 0}
            icon={Receipt} loading={isLoading}
            color={stats?.pendingPayouts ? 'text-blue-600' : undefined}
            badge={stats?.pendingPayouts ? { label: 'Review', variant: 'secondary' } : undefined} />
        </div>
      </div>

      {/* Manager stats */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Users className="h-4 w-4 text-amber-500" />
          <h3 className="text-sm font-semibold text-foreground">Manager accounts</h3>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <WebhostStatCard label="Total managers" value={stats?.totalManagers ?? 0} icon={Users} loading={isLoading} />
          <WebhostStatCard label="Pending approval" value={stats?.pendingManagers ?? 0} icon={Clock} loading={isLoading}
            color={stats?.pendingManagers ? 'text-amber-600' : undefined}
            badge={stats?.pendingManagers ? { label: 'Needs review', variant: 'secondary' } : undefined} />
          <WebhostStatCard label="Approved" value={stats?.approvedManagers ?? 0} icon={CheckCircle} loading={isLoading} color="text-emerald-600" />
          <WebhostStatCard label="Total properties" value={stats?.totalProperties ?? 0} icon={Building} loading={isLoading} />
        </div>
      </div>

      {/* Platform & landlords */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Crown className="h-4 w-4 text-amber-500" />
          <h3 className="text-sm font-semibold text-foreground">Platform overview</h3>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <WebhostStatCard label="System landlords" value={stats?.systemLandlords ?? 0} icon={Home} loading={isLoading}
            sub="Not under any manager" />
          <WebhostStatCard label="Rejected managers" value={stats?.rejectedManagers ?? 0} icon={Users} loading={isLoading} />
          <WebhostStatCard label="Webhost admins" value={stats?.totalWebhosts ?? 0} icon={Shield} loading={isLoading} />
        </div>
      </div>

      {/* Revenue trend */}
      <PlatformRevenueTrend />

      {/* Properties audit trail */}
      <Card>
        <CardHeader className="pb-2 pt-4 px-4 sm:px-5">
          <CardTitle className="text-sm font-semibold">Recent properties audit trail</CardTitle>
          <CardDescription>Last added properties with manager attribution</CardDescription>
        </CardHeader>
        <CardContent className="px-4 sm:px-5 pb-4">
          {isLoadingProperties ? (
            <div className="space-y-2">
              {Array.from({length:4}).map((_,i) => <Skeleton key={i} className="h-14 w-full rounded-lg" />)}
            </div>
          ) : latestProperties.length === 0 ? (
            <div className="py-8 text-center">
              <Building className="h-8 w-8 mx-auto text-muted-foreground/30 mb-2" />
              <p className="text-sm text-muted-foreground">No properties on record yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {(latestProperties as (PropertyRow & { manager_profile: ProfileRow | null })[]).map(prop => (
                <div key={prop.id} className="flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-muted/20 px-3 py-2.5 hover:bg-muted/40 transition-colors">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{prop.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{prop.address}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs font-medium text-foreground truncate max-w-[160px]">
                      {prop.manager_profile?.full_name || 'Unknown'}
                    </p>
                    <p className="text-[10px] text-muted-foreground truncate max-w-[160px]">
                      {prop.manager_profile?.email || '—'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Access policy notice */}
      <Card className="border-blue-200/60 bg-blue-50/30 dark:border-blue-900/30 dark:bg-blue-950/10">
        <CardContent className="p-4 flex items-start gap-3">
          <Shield className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-semibold text-blue-800 dark:text-blue-300">Platform access policy</p>
            <p className="text-xs text-blue-700/70 dark:text-blue-400/70 mt-1 leading-relaxed">
              Webhost admins have zero access to tenant data, rent payments, or tenant personal information.
              Stats above show only platform-level subscription billing — not rent collected from tenants.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default WebhostOverview;
