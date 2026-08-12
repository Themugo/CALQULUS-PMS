import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/shared/components/ui/card';
import { Badge } from '@/shared/components/ui/badge';
import { Skeleton } from '@/shared/components/ui/skeleton';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { formatDistanceToNow } from 'date-fns';
import { checkHealth } from '@/shared/lib/observability';
import {
  Users, Building, TrendingUp,
  CheckCircle, Clock, DollarSign, Home, Search,
  AlertCircle, BarChart3, ArrowRight, Zap, RefreshCw,
  ShieldCheck, Activity, Layers, ScrollText, Tag, ChevronRight,
  ServerCog, MapPin,
} from 'lucide-react';

type ManagerInvoiceRow = { amount: number | null };
type PropertyRow = { id: string; name: string; address: string | null; manager_id: string | null; created_at: string };
type ProfileRow = { id: string; email: string | null; full_name: string | null };

const fmt = (n: number) =>
  new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', minimumFractionDigits: 0 }).format(n);

interface WebhostOverviewProps {
  onNavigateTab?: (tab: string) => void;
}

type HealthState = 'healthy' | 'degraded' | 'unhealthy' | 'unknown';

// Real, lightweight platform health probe. Reuses the existing checkHealth()
// helper from the observability stack — no invented metrics. Aggregates the
// component statuses into a single honest value.
function usePlatformHealth() {
  return useQuery<HealthState>({
    queryKey: ['webhost-overview-health'],
    queryFn: async () => {
      try {
        const checks = await checkHealth();
        if (!checks.length) return 'unknown';
        if (checks.some(c => c.status === 'unhealthy')) return 'unhealthy';
        if (checks.some(c => c.status === 'degraded')) return 'degraded';
        return 'healthy';
      } catch {
        return 'unknown';
      }
    },
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });
}

const HEALTH_COPY: Record<HealthState, { label: string; dot: string; text: string; sub: string }> = {
  healthy: { label: 'System Operational', dot: 'bg-emerald-400', text: 'text-emerald-400', sub: 'Platform services responding normally' },
  degraded: { label: 'System Degraded', dot: 'bg-amber-400', text: 'text-amber-400', sub: 'Some platform services are responding slowly' },
  unhealthy: { label: 'System Issue', dot: 'bg-red-500', text: 'text-red-400', sub: 'A platform service is unreachable — investigate' },
  unknown: { label: 'System Status', dot: 'bg-slate-500', text: 'text-slate-300', sub: 'Health probe unavailable' },
};

// ── Platform status band ─────────────────────────────────────────────
const PlatformStatusBand: React.FC<{ onNavigateTab?: (tab: string) => void }> = ({ onNavigateTab }) => {
  const { data: health = 'unknown', isLoading } = usePlatformHealth();
  const copy = HEALTH_COPY[health];
  return (
    <Card className="bg-muted border border-border shadow-sm backdrop-blur-md rounded-2xl">
      <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="h-10 w-10 rounded-xl bg-amber-400/10 border border-amber-400/20 flex items-center justify-center shrink-0">
            <ServerCog className="h-5 w-5 text-amber-400" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              {isLoading ? (
                <Skeleton className="h-3 w-32 bg-muted/80" />
              ) : (
                <span className="flex items-center gap-1.5">
                  <span className={`h-2 w-2 rounded-full ${copy.dot} ${health === 'healthy' ? 'animate-pulse' : ''}`} aria-hidden />
                  <span className={`text-sm font-bold ${copy.text}`}>{copy.label}</span>
                </span>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5 leading-tight">{copy.sub}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Badge variant="outline" className="text-[10px] border-border bg-muted text-muted-foreground font-bold uppercase tracking-wider">
            Platform Administration
          </Badge>
          {onNavigateTab && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onNavigateTab('security')}
              className="h-7 text-xs text-muted-foreground hover:text-amber-400 hover:bg-amber-400/10 px-2 font-medium"
            >
              Security <ArrowRight className="h-3 w-3 ml-1" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

// ── Empty state for zero-value attention items ───────────────────────
const HealthyEmpty: React.FC<{ message: string; icon: React.ComponentType<{ className?: string }> }> = ({ message, icon: Icon }) => (
  <div className="flex items-center gap-2 rounded-lg bg-emerald-500/5 border border-emerald-500/15 px-2.5 py-1.5">
    <CheckCircle className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
    <span className="text-[11px] font-medium text-emerald-300/90">{message}</span>
  </div>
);

interface RevenueTrendPoint {
  month: string;
  monthFull: string;
  revenue: number;
  rawMonth: string;
}

const CustomRevenueTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ payload: RevenueTrendPoint }> }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-muted border border-amber-500/30 rounded-xl p-3 shadow-sm backdrop-blur-md text-foreground">
        <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">{data.monthFull}</p>
        <p className="text-base font-black text-amber-400 mt-1">
          {fmt(data.revenue)}
        </p>
        <div className="text-[10px] text-emerald-400 font-semibold mt-1 flex items-center gap-1 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 w-fit">
          <CheckCircle className="h-3 w-3" /> Paid Invoices
        </div>
      </div>
    );
  }
  return null;
};

const PlatformRevenueTrend: React.FC<{ onNavigateTab?: (tab: string) => void }> = ({ onNavigateTab }) => {
  const { data: trend = [], isLoading } = useQuery<RevenueTrendPoint[]>({
    queryKey: ['platform-revenue-6mo'],
    queryFn: async () => {
      const months = Array.from({ length: 6 }, (_, i) => {
        const d = new Date();
        d.setMonth(d.getMonth() - (5 - i));
        return d.toISOString().slice(0, 7);
      });
      return Promise.all(months.map(async (m) => {
        const start = `${m}-01`;
        const end = new Date(start);
        end.setMonth(end.getMonth() + 1);
        const { data } = await supabase.from('manager_invoices').select('amount')
          .eq('status', 'paid').gte('paid_date', start).lt('paid_date', end.toISOString().slice(0, 10));
        const rows = (data as ManagerInvoiceRow[] | null) || [];
        const revenue = rows.reduce((s, i) => s + Number(i.amount), 0);

        const dateObj = new Date(`${m}-01T00:00:00`);
        const monthShort = dateObj.toLocaleDateString('en-US', { month: 'short' });
        const monthFull = dateObj.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

        return {
          month: monthShort,
          monthFull,
          revenue,
          rawMonth: m,
        };
      }));
    },
  });

  const total6Mo = trend.reduce((sum, t) => sum + t.revenue, 0);
  const avgMonthly = Math.round(total6Mo / 6);
  const hasBillingData = total6Mo > 0;

  return (
    <Card className="bg-muted border border-border shadow-md backdrop-blur-md rounded-xl overflow-hidden">
      <CardHeader className="pb-3 pt-5 px-5 border-b border-border">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <CardTitle className="text-sm font-bold flex items-center gap-2 text-foreground">
              <BarChart3 className="h-4 w-4 text-amber-400" />
              Platform Revenue Trend — Last 6 Months
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">Subscription billing collected across registered property managers</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-[10px] border-amber-400/40 text-amber-300 bg-amber-400/10 font-bold">
              Avg: {fmt(avgMonthly)}/mo
            </Badge>
            {onNavigateTab && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onNavigateTab('billing')}
                className="h-7 text-xs text-amber-400 hover:text-amber-300 hover:bg-amber-400/10 px-2 font-medium"
              >
                Billing Details <ArrowRight className="h-3 w-3 ml-1" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-4 sm:px-5 pt-5 pb-4">
        {isLoading ? (
          <Skeleton className="h-48 w-full bg-muted/80 rounded-xl" />
        ) : !hasBillingData ? (
          <div className="h-48 w-full flex flex-col items-center justify-center text-center px-4">
            <div className="h-12 w-12 rounded-2xl bg-muted/80 border border-border flex items-center justify-center mb-3">
              <BarChart3 className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-sm font-semibold text-muted-foreground">No billing activity recorded in the last 6 months</p>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm">
              Paid manager invoices will appear here once subscription billing begins.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="h-48 w-full pt-1">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="amberRevenueGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.45} />
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} vertical={false} />
                  <XAxis 
                    dataKey="month" 
                    stroke="#94a3b8" 
                    tick={{ fontSize: 11, fill: '#94a3b8', fontWeight: 600 }}
                    tickLine={false}
                    axisLine={{ stroke: '#334155' }}
                  />
                  <YAxis 
                    stroke="#94a3b8" 
                    tick={{ fontSize: 10, fill: '#64748b' }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(val) => val >= 1000 ? `${(val / 1000).toFixed(0)}k` : `${val}`}
                  />
                  <Tooltip content={<CustomRevenueTooltip />} />
                  <Area 
                    type="monotone" 
                    dataKey="revenue" 
                    stroke="#fbbf24" 
                    strokeWidth={2.5}
                    fillOpacity={1} 
                    fill="url(#amberRevenueGradient)" 
                    activeDot={{ r: 6, fill: '#fbbf24', stroke: '#0f172a', strokeWidth: 2 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-between items-center text-[11px] text-muted-foreground pt-3 border-t border-border">
              <span>Total 6-Month Billing: <strong className="text-foreground font-bold ml-1">{fmt(total6Mo)}</strong></span>
              <span className="text-amber-400/90 font-medium flex items-center gap-1">
                <Zap className="h-3 w-3 text-amber-400" /> Interactive Recharts Engine
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

type OverviewStats = {
  totalManagers: number;
  pendingManagers: number;
  approvedManagers: number;
  rejectedManagers: number;
  totalProperties: number;
  totalWebhosts: number;
  revenueMTD: number;
  revenueLM: number;
  revenueChange: number;
  pendingManagerInvoices: number;
  overdueManagerInvoices: number;
  systemLandlords: number;
  pendingPayouts: number;
};

interface CardShellProps {
  accent: 'amber' | 'emerald' | 'sky' | 'purple';
  onClick?: () => void;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: { label: string; cls: string };
  children: React.ReactNode;
}

const CardShell: React.FC<CardShellProps> = ({ accent, onClick, title, icon: Icon, badge, children }) => {
  const accents = {
    amber: { bar: 'border-l-amber-500', text: 'text-amber-400', hover: 'hover:border-amber-400/50', glow: 'group-hover:text-amber-300' },
    emerald: { bar: 'border-l-emerald-500', text: 'text-emerald-400', hover: 'hover:border-emerald-400/50', glow: 'group-hover:text-emerald-300' },
    sky: { bar: 'border-l-sky-500', text: 'text-sky-400', hover: 'hover:border-sky-400/50', glow: 'group-hover:text-sky-300' },
    purple: { bar: 'border-l-purple-500', text: 'text-purple-400', hover: 'hover:border-purple-400/50', glow: 'group-hover:text-purple-300' },
  }[accent];
  return (
    <Card
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={(e) => { if (onClick && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); onClick(); } }}
      className={`border-l-4 ${accents.bar} border-y border-r border-border bg-muted hover:shadow-sm ${accents.hover} transition-all ${onClick ? 'cursor-pointer group' : ''} backdrop-blur-md rounded-2xl`}
    >
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2.5">
          <span className={`text-[11px] font-bold uppercase tracking-wider ${accents.text} flex items-center gap-1.5 ${accents.glow}`}>
            <Icon className="h-3.5 w-3.5" />
            {title}
          </span>
          {badge && (
            <Badge variant="outline" className={`text-[10px] h-5 px-2 ${badge.cls} font-bold`}>{badge.label}</Badge>
          )}
        </div>
        {children}
      </CardContent>
    </Card>
  );
};

const WebhostOverview: React.FC<WebhostOverviewProps> = ({ onNavigateTab }) => {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');

  const { data: stats, isLoading } = useQuery<OverviewStats>({
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

  const filteredProperties = latestProperties.filter(prop => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      prop.name.toLowerCase().includes(q) ||
      (prop.address && prop.address.toLowerCase().includes(q)) ||
      (prop.manager_profile?.full_name && prop.manager_profile.full_name.toLowerCase().includes(q)) ||
      (prop.manager_profile?.email && prop.manager_profile.email.toLowerCase().includes(q))
    );
  });

  // ── derived values (no new queries, no invented data) ───────────────
  const s = stats ?? ({} as Partial<OverviewStats>);
  const pendingManagers = s.pendingManagers ?? 0;
  const overdueInvoices = s.overdueManagerInvoices ?? 0;
  const pendingPayouts = s.pendingPayouts ?? 0;
  const attentionCount = pendingManagers + overdueInvoices + pendingPayouts;
  const hasAttention = attentionCount > 0;

  const revenueMTD = s.revenueMTD ?? 0;
  const revenueLM = s.revenueLM ?? 0;
  const pendingInvoices = s.pendingManagerInvoices ?? 0;
  // Only show MoM growth when there is meaningful historical data (last
  // month revenue > 0). Otherwise an honest "no billing activity yet"
  // state — never a misleading "+0% MoM".
  const hasBillingHistory = revenueLM > 0;
  const momChange = s.revenueChange ?? 0;
  const momUp = momChange >= 0;

  const totalManagers = s.totalManagers ?? 0;
  const approvedManagers = s.approvedManagers ?? 0;
  const totalProperties = s.totalProperties ?? 0;
  const systemLandlords = s.systemLandlords ?? 0;
  const totalWebhosts = s.totalWebhosts ?? 0;

  return (
    <div className="space-y-6">
      {/* ── 1. PLATFORM STATUS ── */}
      <PlatformStatusBand onNavigateTab={onNavigateTab} />

      {/* ── 2/3/4. EXECUTIVE ANSWERS (Attention · Billing · Roster · Privacy) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Attention Required */}
        <CardShell
          accent="amber"
          title="Attention Required"
          icon={AlertCircle}
          onClick={() => onNavigateTab?.(pendingManagers > 0 ? 'managers' : overdueInvoices > 0 ? 'billing' : 'billing')}
          badge={hasAttention
            ? { label: `${attentionCount} item${attentionCount === 1 ? '' : 's'}`, cls: 'border-amber-400/30 text-amber-300 bg-amber-400/10' }
            : { label: 'All clear', cls: 'border-emerald-400/30 text-emerald-300 bg-emerald-500/10' }
          }
        >
          {isLoading ? (
            <div className="space-y-2">{[0,1,2].map(i => <Skeleton key={i} className="h-4 w-full bg-muted/80 rounded" />)}</div>
          ) : hasAttention ? (
            <div className="space-y-2 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground font-medium">Pending Managers</span>
                <span className="font-bold text-amber-400 flex items-center gap-1">
                  {pendingManagers}
                  {pendingManagers > 0 && <ChevronRight className="h-3 w-3" />}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground font-medium">Overdue Invoices</span>
                <span className="font-bold text-red-400 flex items-center gap-1">
                  {overdueInvoices}
                  {overdueInvoices > 0 && <ChevronRight className="h-3 w-3" />}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground font-medium">Pending Payouts</span>
                <span className="font-bold text-foreground">{pendingPayouts}</span>
              </div>
            </div>
          ) : (
            <HealthyEmpty message="No outstanding approvals, overdue invoices, or payouts" icon={CheckCircle} />
          )}
        </CardShell>

        {/* Platform Billing */}
        <CardShell
          accent="emerald"
          title="Platform Billing"
          icon={DollarSign}
          onClick={() => onNavigateTab?.('billing')}
          badge={hasBillingHistory
            ? { label: `${momUp ? '+' : ''}${momChange}% MoM`, cls: `border-amber-400/30 ${momUp ? 'text-emerald-300 bg-emerald-500/10' : 'text-red-300 bg-red-500/10'}` }
            : { label: 'No activity', cls: 'border-slate-600 text-slate-300 bg-muted/80' }
          }
        >
          {isLoading ? (
            <div className="space-y-2">{[0,1,2].map(i => <Skeleton key={i} className="h-4 w-full bg-muted/80 rounded" />)}</div>
          ) : hasBillingHistory || revenueMTD > 0 ? (
            <div className="space-y-2 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground font-medium">Revenue MTD</span>
                <span className="font-bold text-emerald-400">{fmt(revenueMTD)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground font-medium">Last Month</span>
                <span className="font-semibold text-foreground">{fmt(revenueLM)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground font-medium">Pending Invoices</span>
                <span className="font-semibold text-amber-400">{pendingInvoices}</span>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">No billing activity yet</p>
              <p className="text-[11px] text-muted-foreground leading-tight">
                Paid manager invoices will populate revenue figures once subscription billing begins.
              </p>
            </div>
          )}
        </CardShell>

        {/* Platform Roster */}
        <CardShell
          accent="sky"
          title="Platform Roster"
          icon={Building}
          onClick={() => onNavigateTab?.('managers')}
          badge={{ label: 'Active scope', cls: 'border-sky-400/30 text-sky-300 bg-sky-500/10' }}
        >
          {isLoading ? (
            <div className="space-y-2">{[0,1,2].map(i => <Skeleton key={i} className="h-4 w-full bg-muted/80 rounded" />)}</div>
          ) : (
            <div className="space-y-2 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground font-medium">Managers</span>
                <span className="font-bold text-foreground">{totalManagers} <span className="text-muted-foreground font-normal">({approvedManagers} approved)</span></span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground font-medium">Properties</span>
                <span className="font-bold text-foreground">{totalProperties}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground font-medium">System Landlords</span>
                <span className="font-bold text-foreground">{systemLandlords}</span>
              </div>
            </div>
          )}
        </CardShell>

        {/* Tenant Data Privacy */}
        <CardShell
          accent="purple"
          title="Tenant Data Privacy"
          icon={ShieldCheck}
          onClick={() => onNavigateTab?.('security')}
          badge={{ label: 'Enforced', cls: 'border-purple-400/30 text-purple-300 bg-purple-500/10' }}
        >
          {isLoading ? (
            <div className="space-y-2">{[0,1,2].map(i => <Skeleton key={i} className="h-4 w-full bg-muted/80 rounded" />)}</div>
          ) : (
            <div className="space-y-2 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground font-medium">Webhost Admins</span>
                <span className="font-bold text-foreground">{totalWebhosts}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground font-medium">Tenant Access</span>
                <span className="font-bold text-emerald-400">Blocked (Firewall)</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground font-medium">Isolation</span>
                <span className="font-bold text-emerald-400">RLS Enforced</span>
              </div>
            </div>
          )}
        </CardShell>
      </div>

      {/* ── 5/6. MAIN WORKSPACE MATRIX ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Column (8 cols): Revenue Trend & Properties Audit */}
        <div className="lg:col-span-8 space-y-5">
          <PlatformRevenueTrend onNavigateTab={onNavigateTab} />

          {/* ── 6. Recent Properties Audit ── */}
          <Card className="bg-muted border border-border shadow-sm backdrop-blur-md rounded-2xl overflow-hidden">
            <CardHeader className="pb-3 pt-4 px-4 sm:px-5 border-b border-border">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-sm font-bold flex items-center gap-2 text-foreground">
                    <Activity className="h-4 w-4 text-amber-400" />
                    Recent Properties Audit Trail
                  </CardTitle>
                  <CardDescription className="text-xs text-muted-foreground">
                    Latest properties registered across manager accounts
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative min-w-[200px]">
                    <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      type="text"
                      placeholder="Search properties..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      aria-label="Search recent properties"
                      className="h-8 pl-8 text-xs bg-muted border-border text-foreground placeholder:text-muted-foreground focus:border-amber-400/50 rounded-lg"
                    />
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => queryClient.invalidateQueries()}
                    aria-label="Refresh data"
                    className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground hover:bg-muted"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-4">
              {isLoadingProperties ? (
                <div className="space-y-2">
                  {Array.from({length:4}).map((_,i) => <Skeleton key={i} className="h-14 w-full bg-muted/80 rounded-xl" />)}
                </div>
              ) : filteredProperties.length === 0 ? (
                <div className="py-10 text-center">
                  <Building className="h-9 w-9 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm font-medium text-muted-foreground">
                    {searchQuery ? 'No matching properties found' : 'No properties on record yet'}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {searchQuery ? 'Try a different search term.' : 'Newly registered properties will appear here.'}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {(filteredProperties as (PropertyRow & { manager_profile: ProfileRow | null })[]).map(prop => {
                    const hasManager = !!prop.manager_profile;
                    const registeredAt = prop.created_at ? formatDistanceToNow(new Date(prop.created_at), { addSuffix: true }) : '';
                    return (
                      <div
                        key={prop.id}
                        onClick={() => onNavigateTab?.('properties')}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onNavigateTab?.('properties'); } }}
                        className="flex items-start justify-between gap-3 rounded-xl border border-border bg-muted p-3 hover:bg-muted/80 hover:border-amber-400/40 transition-all cursor-pointer group focus:outline-none focus:ring-2 focus:ring-primary/30"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-foreground truncate group-hover:text-amber-400 transition-colors">{prop.name}</p>
                          <p className="text-[11px] text-muted-foreground truncate flex items-center gap-1 mt-0.5">
                            <MapPin className="h-3 w-3 text-muted-foreground shrink-0" />
                            {prop.address || 'No location specified'}
                          </p>
                          <div className="flex items-center gap-2 mt-1.5">
                            <Badge variant="outline" className={`text-[9px] h-4 px-1.5 font-bold ${hasManager ? 'border-emerald-500/30 text-emerald-300 bg-emerald-500/10' : 'border-slate-600 text-slate-400 bg-muted/80'}`}>
                              {hasManager ? 'Linked' : 'Unlinked'}
                            </Badge>
                            {registeredAt && (
                              <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                                <Clock className="h-2.5 w-2.5" /> {registeredAt}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="text-right shrink-0 max-w-[130px]">
                          <p className="text-[11px] font-semibold text-amber-400 truncate">
                            {prop.manager_profile?.full_name || (hasManager ? 'Manager' : '—')}
                          </p>
                          <p className="text-[10px] text-muted-foreground truncate">
                            {prop.manager_profile?.email || (hasManager ? '—' : 'No manager')}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column (4 cols): Command Desk & Privacy Policy */}
        <div className="lg:col-span-4 space-y-5">
          {/* ── 7. Platform Command Desk ── */}
          <Card className="bg-muted border border-border shadow-sm backdrop-blur-md rounded-2xl overflow-hidden">
            <CardHeader className="pb-2 pt-4 px-4 sm:px-5 border-b border-border">
              <CardTitle className="text-sm font-bold flex items-center gap-2 text-foreground">
                <Zap className="h-4 w-4 text-amber-400" />
                Platform Command Desk
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">Quick shortcuts to admin modules</CardDescription>
            </CardHeader>
            <CardContent className="p-3">
              <div className="space-y-1.5">
                {([
                  { tab: 'managers', icon: Users, iconColor: 'text-amber-400', hoverText: 'group-hover:text-amber-400', hoverBorder: 'hover:border-amber-400/40', label: 'Manager Accounts', meta: `${approvedManagers} approved` },
                  { tab: 'tiers', icon: Layers, iconColor: 'text-sky-400', hoverText: 'group-hover:text-sky-400', hoverBorder: 'hover:border-sky-400/40', label: 'Subscription Tiers', meta: 'Configured' },
                  { tab: 'billing-rules', icon: ScrollText, iconColor: 'text-emerald-400', hoverText: 'group-hover:text-emerald-400', hoverBorder: 'hover:border-emerald-400/40', label: 'Platform Billing Rules', meta: 'Active' },
                  { tab: 'custom-pricing', icon: Tag, iconColor: 'text-purple-400', hoverText: 'group-hover:text-purple-400', hoverBorder: 'hover:border-purple-400/40', label: 'Custom Pricing Blocks', meta: 'Manage' },
                  { tab: 'unlinked-landlords', icon: Home, iconColor: 'text-amber-400', hoverText: 'group-hover:text-amber-400', hoverBorder: 'hover:border-amber-400/40', label: 'System Landlords', meta: `${systemLandlords} unlinked` },
                  { tab: 'security', icon: ShieldCheck, iconColor: 'text-red-400', hoverText: 'group-hover:text-red-400', hoverBorder: 'hover:border-red-400/40', label: 'Security & Audit Logs', meta: 'Protected' },
                ] as const).map(item => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.tab}
                      type="button"
                      onClick={() => onNavigateTab?.(item.tab)}
                      className={`w-full p-2.5 rounded-xl border border-border bg-muted hover:bg-muted/80 ${item.hoverBorder} flex items-center justify-between text-xs transition-all text-left group focus:outline-none focus:ring-2 focus:ring-primary/30`}
                    >
                      <span className={`font-semibold text-slate-200 flex items-center gap-2 ${item.hoverText}`}>
                        <Icon className={`h-3.5 w-3.5 ${item.iconColor}`} />
                        {item.label}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <Badge variant="outline" className="text-[10px] border-border bg-muted text-muted-foreground font-bold">{item.meta}</Badge>
                        <ChevronRight className={`h-3 w-3 text-slate-500 ${item.hoverText}`} />
                      </div>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* ── 8. Tenant Data Privacy notice ── */}
          <Card
            onClick={() => onNavigateTab?.('security')}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onNavigateTab?.('security'); } }}
            className="border-amber-400/30 bg-amber-400/5 hover:bg-amber-400/10 transition-all cursor-pointer group rounded-2xl backdrop-blur-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            <CardContent className="p-4 flex items-start gap-3">
              <div className="h-9 w-9 rounded-xl bg-amber-400/10 border border-amber-400/20 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <ShieldCheck className="h-5 w-5 text-amber-400" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center justify-between gap-2">
                  <span>Tenant Data Isolation Policy</span>
                  <ChevronRight className="h-3.5 w-3.5 text-amber-400 group-hover:translate-x-0.5 transition-transform shrink-0" />
                </p>
                <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed font-normal">
                  Webhost administrators operate at the platform administration level only. By architecture and Row-Level Security policy, tenant identities, rent payment records, and lease details are completely isolated from Webhost views.
                </p>
                <p className="text-[10px] text-amber-300/70 font-semibold mt-2 uppercase tracking-wider">
                  Platform-level access · No tenant PII
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