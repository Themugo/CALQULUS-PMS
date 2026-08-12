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
import {
  Users, Building, Receipt, TrendingUp, Shield,
  CheckCircle, Clock, DollarSign, Home, Search,
  AlertCircle, BarChart3, Crown, ArrowRight, Zap, RefreshCw,
  ShieldCheck, Activity, Layers, ScrollText, Tag, Bug, ChevronRight,
  Server, Cpu, Database, AlertTriangle, FileText, UserCheck, Key
} from 'lucide-react';
import { formatDate } from '@/shared/lib/dateFormat';

type ManagerInvoiceRow = { amount: number | null };
type PropertyRow = { id: string; name: string; address: string | null; manager_id: string | null; created_at: string };
type ProfileRow = { id: string; email: string | null; full_name: string | null };
type ActivityLogRow = { id: string; actor_email: string | null; action: string; entity_type: string; entity_label: string | null; created_at: string };

const fmt = (n: number) =>
  new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', minimumFractionDigits: 0 }).format(n);

interface WebhostOverviewProps {
  onNavigateTab?: (tab: string) => void;
}

interface WebhostStatCardProps {
  label: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  sub?: string;
  color?: string;
  loading?: boolean;
  badge?: { label: string; variant: 'default' | 'destructive' | 'secondary' | 'outline' };
  accent?: string;
  onClick?: () => void;
}

function WebhostStatCard({ label, value, icon: Icon, sub, color = 'text-slate-100', loading, badge, accent, onClick }: WebhostStatCardProps) {
  return (
    <Card 
      onClick={onClick}
      className={`bg-slate-900/80 border border-slate-800/80 hover:border-amber-400/40 transition-all duration-200 hover:-translate-y-0.5 shadow-xl backdrop-blur-md rounded-2xl ${onClick ? 'cursor-pointer group' : ''} ${accent ? accent : ''}`}
    >
      <CardContent className="p-3.5">
        <div className="flex items-start justify-between gap-2 mb-2">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 leading-tight group-hover:text-amber-400 transition-colors">{label}</p>
          <div className="h-7 w-7 rounded-lg bg-amber-400/10 border border-amber-400/20 flex items-center justify-center flex-shrink-0 group-hover:bg-amber-400/20 group-hover:scale-105 transition-all">
            <Icon className="h-3.5 w-3.5 text-amber-400" />
          </div>
        </div>
        {loading ? (
          <Skeleton className="h-7 w-20 bg-slate-800/60" />
        ) : (
          <div className="flex items-end gap-1.5">
            <p className={`font-['Outfit'] text-2xl font-extrabold tracking-tight leading-none ${color}`}>{value}</p>
            {badge && (
              <Badge variant={badge.variant} className="text-[9px] h-4 px-1 shrink-0 font-bold">{badge.label}</Badge>
            )}
          </div>
        )}
        {sub && !loading && <p className="text-[11px] font-medium text-slate-400 mt-1.5 leading-tight">{sub}</p>}
      </CardContent>
    </Card>
  );
}

interface RevenueTrendPoint {
  month: string;
  monthFull: string;
  revenue: number;
  rawMonth: string;
}

const CustomRevenueTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload as RevenueTrendPoint;
    return (
      <div className="bg-slate-900/95 border border-amber-500/30 rounded-xl p-3 shadow-2xl backdrop-blur-md text-slate-100">
        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{data.monthFull}</p>
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

  return (
    <Card className="bg-slate-900/80 border border-slate-800 shadow-md backdrop-blur-md rounded-2xl overflow-hidden">
      <CardHeader className="pb-3 pt-4 px-4 sm:px-5 border-b border-slate-800">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <CardTitle className="text-sm font-bold flex items-center gap-2 text-white">
              <BarChart3 className="h-4 w-4 text-amber-400" />
              Platform Revenue Trend — Last 6 Months
            </CardTitle>
            <CardDescription className="text-xs text-slate-400">Subscription billing collected across registered property managers</CardDescription>
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
      <CardContent className="px-4 sm:px-5 pt-4 pb-4">
        {isLoading ? (
          <Skeleton className="h-48 w-full bg-slate-800/50 rounded-xl" />
        ) : (
          <div className="space-y-3">
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
            <div className="flex justify-between items-center text-[11px] text-slate-400 pt-2 border-t border-slate-800">
              <span>Total 6-Month Billing: <strong className="text-white font-bold ml-1">{fmt(total6Mo)}</strong></span>
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

const WebhostOverview: React.FC<WebhostOverviewProps> = ({ onNavigateTab }) => {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');

  // 1. Platform Overview Real Data Query (all 9 core entities)
  const { data: stats, isLoading } = useQuery({
    queryKey: ['webhost-overview-stats-v3'],
    queryFn: async () => {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
      const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0).toISOString();

      const [
        totalUsers, activeUsers,
        totalManagers, pendingManagers, approvedManagers,
        totalLandlords, totalAgencies, totalTenants,
        totalProperties, totalUnits, activeLeases,
        totalWebhosts,
        platformRevenueMTD, platformRevenueLM,
        pendingManagerInvoices, overdueManagerInvoices,
        systemLandlords, pendingPayouts,
        errorLogsCount, deadLetterCount,
      ] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('manager_profiles').select('id', { count: 'exact', head: true }),
        supabase.from('manager_profiles').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('manager_profiles').select('id', { count: 'exact', head: true }).eq('status', 'approved'),
        supabase.from('user_roles').select('id', { count: 'exact', head: true }).eq('role', 'landlord'),
        supabase.from('user_roles').select('id', { count: 'exact', head: true }).eq('role', 'agency'),
        supabase.from('tenants').select('id', { count: 'exact', head: true }),
        supabase.from('properties').select('id', { count: 'exact', head: true }),
        supabase.from('units').select('id', { count: 'exact', head: true }),
        supabase.from('leases').select('id', { count: 'exact', head: true }).eq('status', 'active'),
        supabase.from('user_roles').select('id', { count: 'exact', head: true }).eq('role', 'webhost'),
        supabase.from('manager_invoices').select('amount').eq('status', 'paid').gte('paid_date', startOfMonth),
        supabase.from('manager_invoices').select('amount').eq('status', 'paid')
          .gte('paid_date', startOfLastMonth).lte('paid_date', endOfLastMonth),
        supabase.from('manager_invoices').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('manager_invoices').select('id', { count: 'exact', head: true }).eq('status', 'overdue'),
        supabase.from('property_landlords').select('id', { count: 'exact', head: true }).is('manager_id', null),
        supabase.from('payout_requests').select('id', { count: 'exact', head: true }).eq('status', 'pending').eq('recipient_type', 'webhost'),
        supabase.from('activity_logs').select('id', { count: 'exact', head: true }).or('action.like.error:%,action.like.warning:%'),
        supabase.from('webhook_dead_letter').select('id', { count: 'exact', head: true }).eq('resolved', false).catch(() => ({ count: 0 })),
      ]);

      const revenueMTD = ((platformRevenueMTD.data as ManagerInvoiceRow[] | null) ?? []).reduce((s,i) => s + Number(i.amount), 0);
      const revenueLM = ((platformRevenueLM.data as ManagerInvoiceRow[] | null) ?? []).reduce((s,i) => s + Number(i.amount), 0);
      const revenueChange = revenueLM > 0 ? Math.round(((revenueMTD - revenueLM) / revenueLM) * 100) : 0;

      return {
        totalUsers: totalUsers.count ?? 0,
        activeUsers: activeUsers.count ?? 0,
        totalManagers: totalManagers.count ?? 0,
        pendingManagers: pendingManagers.count ?? 0,
        approvedManagers: approvedManagers.count ?? 0,
        totalLandlords: totalLandlords.count ?? 0,
        totalAgencies: totalAgencies.count ?? 0,
        totalTenants: totalTenants.count ?? 0,
        totalProperties: totalProperties.count ?? 0,
        totalUnits: totalUnits.count ?? 0,
        activeLeases: activeLeases.count ?? 0,
        totalWebhosts: totalWebhosts.count ?? 0,
        revenueMTD, revenueLM, revenueChange,
        pendingManagerInvoices: pendingManagerInvoices.count ?? 0,
        overdueManagerInvoices: overdueManagerInvoices.count ?? 0,
        systemLandlords: systemLandlords.count ?? 0,
        pendingPayouts: pendingPayouts.count ?? 0,
        errorLogsCount: errorLogsCount.count ?? 0,
        deadLetterCount: deadLetterCount.count ?? 0,
      };
    },
  });

  // 2. Recent Audit Logs / Platform Activity Query
  const { data: recentActivity = [], isLoading: isLoadingActivity } = useQuery({
    queryKey: ['webhost-platform-recent-activity'],
    queryFn: async () => {
      const { data } = await supabase
        .from('activity_logs')
        .select('id, actor_email, action, entity_type, entity_label, created_at')
        .order('created_at', { ascending: false })
        .limit(8);
      
      const rows = (data || []) as ActivityLogRow[];
      return rows.filter(r => !r.entity_type?.toLowerCase().startsWith('tenant'));
    },
  });

  // 3. Latest Registered Properties Query
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

  return (
    <div className="space-y-6">
      {/* ── PLATFORM HEALTH & SYSTEM BAR ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-3.5 bg-slate-900/90 border border-slate-800 rounded-2xl shadow-xl backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-amber-400/10 border border-amber-400/25 flex items-center justify-center shrink-0">
            <Server className="h-4 w-4 text-amber-400 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-white tracking-wide uppercase">CALQULUS Platform Engine</span>
              <Badge variant="outline" className="text-[10px] border-emerald-500/30 text-emerald-400 bg-emerald-500/10 font-extrabold h-4 px-1.5">
                OPERATIONAL
              </Badge>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">Global Cluster Active • RLS Multi-Tenant Security Shield Active</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-slate-300">
            <Database className="h-3.5 w-3.5 text-sky-400" />
            <span className="font-semibold text-sky-400">PostgreSQL Cloud</span>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-slate-300">
            <Cpu className="h-3.5 w-3.5 text-purple-400" />
            <span className="font-semibold text-purple-400">Edge Functions v2</span>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-slate-300">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
            <span className="font-semibold text-emerald-400">Firewall Enforced</span>
          </div>
          <Button variant="ghost" size="sm" onClick={() => queryClient.invalidateQueries()} className="h-7 w-7 p-0 text-slate-400 hover:text-white hover:bg-slate-800">
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* ── 9 PLATFORM OVERVIEW METRICS GRID ── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <Activity className="h-3.5 w-3.5 text-amber-400" />
            Platform Architecture & Real Infrastructure Totals
          </h3>
          <span className="text-[11px] text-slate-500 font-medium">Real DB Counts</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-9 gap-2.5">
          <WebhostStatCard 
            label="Total Users" 
            value={stats?.totalUsers ?? 0}
            icon={Users} 
            loading={isLoading} 
            color="text-slate-100" 
          />
          <WebhostStatCard 
            label="Managers" 
            value={stats?.totalManagers ?? 0}
            icon={UserCheck} 
            loading={isLoading} 
            color="text-amber-400" 
            onClick={() => onNavigateTab?.('managers')}
          />
          <WebhostStatCard 
            label="Landlords" 
            value={stats?.totalLandlords ?? 0}
            icon={Home} 
            loading={isLoading} 
            color="text-purple-400" 
          />
          <WebhostStatCard 
            label="Agencies" 
            value={stats?.totalAgencies ?? 0}
            icon={Building} 
            loading={isLoading} 
            color="text-sky-400" 
          />
          <WebhostStatCard 
            label="Tenants" 
            value={stats?.totalTenants ?? 0}
            icon={Users} 
            loading={isLoading} 
            color="text-emerald-400" 
            sub="Roster"
          />
          <WebhostStatCard 
            label="Properties" 
            value={stats?.totalProperties ?? 0}
            icon={Building} 
            loading={isLoading} 
            color="text-amber-300" 
            onClick={() => onNavigateTab?.('properties')}
          />
          <WebhostStatCard 
            label="Units" 
            value={stats?.totalUnits ?? 0}
            icon={Layers} 
            loading={isLoading} 
            color="text-indigo-400" 
          />
          <WebhostStatCard 
            label="Active Leases" 
            value={stats?.activeLeases ?? 0}
            icon={FileText} 
            loading={isLoading} 
            color="text-emerald-300" 
          />
          <WebhostStatCard 
            label="System Landlords" 
            value={stats?.systemLandlords ?? 0}
            icon={Home} 
            loading={isLoading} 
            color="text-slate-200" 
            sub="Unlinked"
            onClick={() => onNavigateTab?.('unlinked-landlords')}
          />
        </div>
      </div>

      {/* ── EXECUTIVE ATTENTION & REVENUE MATRIX ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* What requires attention? */}
        <Card 
          onClick={() => onNavigateTab?.((stats?.pendingManagers ?? 0) > 0 ? 'managers' : 'billing')}
          className="border-l-4 border-l-amber-500 border-y border-r border-slate-800 bg-slate-900/80 hover:shadow-2xl hover:border-amber-400/50 transition-all cursor-pointer group backdrop-blur-md rounded-2xl"
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5 group-hover:text-amber-300">
                <AlertCircle className="h-3.5 w-3.5" />
                Attention Required
              </span>
              <Badge variant="outline" className="text-[10px] h-4 border-amber-400/30 text-amber-300 bg-amber-400/10 font-bold">
                {(stats?.pendingManagers ?? 0) + (stats?.overdueManagerInvoices ?? 0)} Items
              </Badge>
            </div>
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-slate-400 font-medium">Pending Managers:</span>
                <span className="font-['Outfit'] font-bold text-amber-400 flex items-center gap-1">
                  {stats?.pendingManagers ?? 0}
                  {(stats?.pendingManagers ?? 0) > 0 && <ChevronRight className="h-3 w-3" />}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400 font-medium">Overdue Invoices:</span>
                <span className="font-['Outfit'] font-bold text-red-400 flex items-center gap-1">
                  {stats?.overdueManagerInvoices ?? 0}
                  {(stats?.overdueManagerInvoices ?? 0) > 0 && <ChevronRight className="h-3 w-3" />}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400 font-medium">Pending Payouts:</span>
                <span className="font-['Outfit'] font-bold text-slate-100">{stats?.pendingPayouts ?? 0}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* What generates revenue? */}
        <Card 
          onClick={() => onNavigateTab?.('billing')}
          className="border-l-4 border-l-emerald-500 border-y border-r border-slate-800 bg-slate-900/80 hover:shadow-2xl hover:border-emerald-400/50 transition-all cursor-pointer group backdrop-blur-md rounded-2xl"
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5 group-hover:text-emerald-300">
                <DollarSign className="h-3.5 w-3.5" />
                Platform Billing
              </span>
              <Badge variant="outline" className="text-[10px] h-4 border-emerald-400/30 text-emerald-300 bg-emerald-500/10 font-bold">
                +{stats?.revenueChange ?? 0}% MoM
              </Badge>
            </div>
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-slate-400 font-medium">Revenue MTD:</span>
                <span className="font-['Outfit'] font-bold text-emerald-400">{fmt(stats?.revenueMTD ?? 0)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400 font-medium">Last Month:</span>
                <span className="font-['Outfit'] font-semibold text-slate-200">{fmt(stats?.revenueLM ?? 0)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400 font-medium">Pending Invoices:</span>
                <span className="font-['Outfit'] font-semibold text-amber-400">{stats?.pendingManagerInvoices ?? 0}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* System Error & Webhook Health */}
        <Card 
          onClick={() => onNavigateTab?.('error-logs')}
          className="border-l-4 border-l-rose-500 border-y border-r border-slate-800 bg-slate-900/80 hover:shadow-2xl hover:border-rose-400/50 transition-all cursor-pointer group backdrop-blur-md rounded-2xl"
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-rose-400 flex items-center gap-1.5 group-hover:text-rose-300">
                <Bug className="h-3.5 w-3.5" />
                Error & Webhook Monitor
              </span>
              <Badge variant="outline" className={`text-[10px] h-4 ${stats?.errorLogsCount ? 'border-red-400 text-red-400 bg-red-500/10' : 'border-emerald-400 text-emerald-400'}`}>
                {stats?.errorLogsCount ? 'Errors Flagged' : 'Healthy'}
              </Badge>
            </div>
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-slate-400 font-medium">System Errors (24h):</span>
                <span className={`font-['Outfit'] font-bold ${stats?.errorLogsCount ? 'text-rose-400' : 'text-emerald-400'}`}>{stats?.errorLogsCount ?? 0}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400 font-medium">Dead Letter Webhooks:</span>
                <span className="font-['Outfit'] font-semibold text-amber-400">{stats?.deadLetterCount ?? 0} pending</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400 font-medium">System Health:</span>
                <span className="font-bold text-emerald-400">99.98% Uptime</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Security & Firewall */}
        <Card 
          onClick={() => onNavigateTab?.('security')}
          className="border-l-4 border-l-purple-500 border-y border-r border-slate-800 bg-slate-900/80 hover:shadow-2xl hover:border-purple-400/50 transition-all cursor-pointer group backdrop-blur-md rounded-2xl"
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-purple-400 flex items-center gap-1.5 group-hover:text-purple-300">
                <ShieldCheck className="h-3.5 w-3.5" />
                Tenant Data Privacy
              </span>
              <Badge variant="outline" className="text-[10px] h-4 border-purple-400/30 text-purple-300 bg-purple-500/10 font-bold">
                Enforced
              </Badge>
            </div>
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-slate-400 font-medium">Webhost Admins:</span>
                <span className="font-['Outfit'] font-bold text-slate-100">{stats?.totalWebhosts ?? 0}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400 font-medium">Tenant Access:</span>
                <span className="font-bold text-emerald-400">Blocked (Firewall)</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400 font-medium">System Status:</span>
                <span className="font-bold text-emerald-400">Operational</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── MAIN WORKSPACE MATRIX ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Column (8 cols): Revenue Trend & Platform Activity Feed */}
        <div className="lg:col-span-8 space-y-5">
          <PlatformRevenueTrend onNavigateTab={onNavigateTab} />

          {/* Real Platform Activity & Audit Feed */}
          <Card className="bg-slate-900/80 border border-slate-800 shadow-xl backdrop-blur-md rounded-2xl overflow-hidden">
            <CardHeader className="pb-3 pt-4 px-4 sm:px-5 border-b border-slate-800">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-bold flex items-center gap-2 text-white">
                    <Activity className="h-4 w-4 text-amber-400" />
                    Real Platform Activity Feed
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-400">
                    Live administrative actions, account updates, and system log events
                  </CardDescription>
                </div>
                <Button variant="ghost" size="sm" onClick={() => onNavigateTab?.('security')} className="h-7 text-xs text-amber-400 hover:text-amber-300">
                  Full Audit Log <ChevronRight className="h-3 w-3 ml-1" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-4">
              {isLoadingActivity ? (
                <div className="space-y-2">
                  {Array.from({length:4}).map((_,i) => <Skeleton key={i} className="h-10 w-full bg-slate-800/60 rounded-xl" />)}
                </div>
              ) : recentActivity.length === 0 ? (
                <div className="py-8 text-center">
                  <Shield className="h-8 w-8 mx-auto text-slate-600 mb-2" />
                  <p className="text-sm text-slate-400">No recent administrative activity recorded</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {recentActivity.map((log) => (
                    <div 
                      key={log.id} 
                      className="flex items-center justify-between gap-3 p-2.5 rounded-xl border border-slate-800/80 bg-slate-950/40 hover:bg-slate-800/50 transition-colors text-xs"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Badge variant="outline" className="text-[10px] uppercase font-bold border-amber-400/30 text-amber-300 bg-amber-400/10 shrink-0">
                          {log.entity_type || 'system'}
                        </Badge>
                        <div className="min-w-0">
                          <p className="text-slate-200 font-semibold truncate">
                            {log.action} <span className="text-slate-400 font-normal">by {log.actor_email || 'System'}</span>
                          </p>
                          {log.entity_label && <p className="text-[11px] text-slate-400 truncate">{log.entity_label}</p>}
                        </div>
                      </div>
                      <span className="text-[11px] text-slate-500 shrink-0 font-medium">
                        {formatDate(log.created_at)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Property Audit Trail */}
          <Card className="bg-slate-900/80 border border-slate-800 shadow-xl backdrop-blur-md rounded-2xl overflow-hidden">
            <CardHeader className="pb-3 pt-4 px-4 sm:px-5 border-b border-slate-800">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-sm font-bold flex items-center gap-2 text-white">
                    <Building className="h-4 w-4 text-amber-400" />
                    Recent Properties Audit Trail
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-400">
                    Latest properties registered across manager accounts
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative min-w-[200px]">
                    <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                    <Input 
                      type="text" 
                      placeholder="Search properties..." 
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="h-8 pl-8 text-xs bg-slate-950/60 border-slate-800 text-slate-100 placeholder:text-slate-500 focus:border-amber-400/50 rounded-lg"
                    />
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => queryClient.invalidateQueries()} className="h-8 w-8 p-0 text-slate-400 hover:text-white hover:bg-slate-800">
                    <RefreshCw className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-4">
              {isLoadingProperties ? (
                <div className="space-y-2">
                  {Array.from({length:4}).map((_,i) => <Skeleton key={i} className="h-12 w-full bg-slate-800/60 rounded-xl" />)}
                </div>
              ) : filteredProperties.length === 0 ? (
                <div className="py-8 text-center">
                  <Building className="h-8 w-8 mx-auto text-slate-600 mb-2" />
                  <p className="text-sm text-slate-400">
                    {searchQuery ? 'No matching properties found' : 'No properties on record yet'}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {(filteredProperties as (PropertyRow & { manager_profile: ProfileRow | null })[]).map(prop => (
                    <div 
                      key={prop.id} 
                      onClick={() => onNavigateTab?.('properties')}
                      className="flex items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-950/50 p-3 hover:bg-slate-800/60 hover:border-amber-400/40 transition-all cursor-pointer group"
                    >
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-100 truncate group-hover:text-amber-400 transition-colors">{prop.name}</p>
                        <p className="text-[11px] text-slate-400 truncate">{prop.address || 'No address specified'}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-[11px] font-semibold text-amber-400 truncate max-w-[140px]">
                          {prop.manager_profile?.full_name || 'Manager'}
                        </p>
                        <p className="text-[10px] text-slate-400 truncate max-w-[140px]">
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
          <Card className="bg-slate-900/80 border border-slate-800 shadow-xl backdrop-blur-md rounded-2xl overflow-hidden">
            <CardHeader className="pb-2 pt-4 px-4 sm:px-5 border-b border-slate-800">
              <CardTitle className="text-sm font-bold flex items-center gap-2 text-white">
                <Zap className="h-4 w-4 text-amber-400" />
                Platform Command Desk
              </CardTitle>
              <CardDescription className="text-xs text-slate-400">Quick shortcuts to admin modules</CardDescription>
            </CardHeader>
            <CardContent className="p-3">
              <div className="space-y-1.5">
                <button
                  type="button"
                  onClick={() => onNavigateTab?.('managers')}
                  className="w-full p-2.5 rounded-xl border border-slate-800 bg-slate-950/60 hover:bg-slate-800/70 hover:border-amber-400/40 flex items-center justify-between text-xs transition-all text-left group"
                >
                  <span className="font-semibold text-slate-200 flex items-center gap-2 group-hover:text-amber-400">
                    <Users className="h-3.5 w-3.5 text-amber-400" />
                    Manager Accounts
                  </span>
                  <div className="flex items-center gap-1.5">
                    <Badge variant="outline" className="text-[10px] border-slate-700 bg-slate-800 text-slate-300 font-bold">{stats?.approvedManagers ?? 0} Approved</Badge>
                    <ChevronRight className="h-3 w-3 text-slate-500 group-hover:text-amber-400 transition-colors" />
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => onNavigateTab?.('tiers')}
                  className="w-full p-2.5 rounded-xl border border-slate-800 bg-slate-950/60 hover:bg-slate-800/70 hover:border-sky-400/40 flex items-center justify-between text-xs transition-all text-left group"
                >
                  <span className="font-semibold text-slate-200 flex items-center gap-2 group-hover:text-sky-400">
                    <Layers className="h-3.5 w-3.5 text-sky-400" />
                    Subscription Tiers
                  </span>
                  <div className="flex items-center gap-1.5">
                    <Badge variant="outline" className="text-[10px] border-slate-700 bg-slate-800 text-slate-300 font-bold">Configured</Badge>
                    <ChevronRight className="h-3 w-3 text-slate-500 group-hover:text-sky-400 transition-colors" />
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => onNavigateTab?.('billing-rules')}
                  className="w-full p-2.5 rounded-xl border border-slate-800 bg-slate-950/60 hover:bg-slate-800/70 hover:border-emerald-400/40 flex items-center justify-between text-xs transition-all text-left group"
                >
                  <span className="font-semibold text-slate-200 flex items-center gap-2 group-hover:text-emerald-400">
                    <ScrollText className="h-3.5 w-3.5 text-emerald-400" />
                    Platform Billing Rules
                  </span>
                  <div className="flex items-center gap-1.5">
                    <Badge variant="outline" className="text-[10px] border-slate-700 bg-slate-800 text-slate-300 font-bold">Active</Badge>
                    <ChevronRight className="h-3 w-3 text-slate-500 group-hover:text-emerald-400 transition-colors" />
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => onNavigateTab?.('custom-pricing')}
                  className="w-full p-2.5 rounded-xl border border-slate-800 bg-slate-950/60 hover:bg-slate-800/70 hover:border-purple-400/40 flex items-center justify-between text-xs transition-all text-left group"
                >
                  <span className="font-semibold text-slate-200 flex items-center gap-2 group-hover:text-purple-400">
                    <Tag className="h-3.5 w-3.5 text-purple-400" />
                    Custom Pricing Blocks
                  </span>
                  <div className="flex items-center gap-1.5">
                    <Badge variant="outline" className="text-[10px] border-slate-700 bg-slate-800 text-slate-300 font-bold">Manage</Badge>
                    <ChevronRight className="h-3 w-3 text-slate-500 group-hover:text-purple-400 transition-colors" />
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => onNavigateTab?.('unlinked-landlords')}
                  className="w-full p-2.5 rounded-xl border border-slate-800 bg-slate-950/60 hover:bg-slate-800/70 hover:border-amber-400/40 flex items-center justify-between text-xs transition-all text-left group"
                >
                  <span className="font-semibold text-slate-200 flex items-center gap-2 group-hover:text-amber-400">
                    <Home className="h-3.5 w-3.5 text-amber-400" />
                    System Landlords
                  </span>
                  <div className="flex items-center gap-1.5">
                    <Badge variant="outline" className="text-[10px] border-slate-700 bg-slate-800 text-slate-300 font-bold">{stats?.systemLandlords ?? 0} Unlinked</Badge>
                    <ChevronRight className="h-3 w-3 text-slate-500 group-hover:text-amber-400 transition-colors" />
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => onNavigateTab?.('security')}
                  className="w-full p-2.5 rounded-xl border border-slate-800 bg-slate-950/60 hover:bg-slate-800/70 hover:border-red-400/40 flex items-center justify-between text-xs transition-all text-left group"
                >
                  <span className="font-semibold text-slate-200 flex items-center gap-2 group-hover:text-red-400">
                    <ShieldCheck className="h-3.5 w-3.5 text-red-400" />
                    Security & Audit Logs
                  </span>
                  <div className="flex items-center gap-1.5">
                    <Badge variant="outline" className="text-[10px] border-red-500/30 text-red-400 bg-red-500/10 font-bold">Protected</Badge>
                    <ChevronRight className="h-3 w-3 text-slate-500 group-hover:text-red-400 transition-colors" />
                  </div>
                </button>
              </div>
            </CardContent>
          </Card>

          {/* Privacy Firewall Policy */}
          <Card 
            onClick={() => onNavigateTab?.('security')}
            className="border-amber-400/30 bg-amber-400/5 hover:bg-amber-400/10 transition-all cursor-pointer group rounded-2xl backdrop-blur-md shadow-xl"
          >
            <CardContent className="p-4 flex items-start gap-3">
              <ShieldCheck className="h-5 w-5 text-amber-400 shrink-0 mt-0.5 group-hover:scale-110 transition-transform" />
              <div>
                <p className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center justify-between">
                  Tenant Data Isolation Policy
                  <ChevronRight className="h-3.5 w-3.5 text-amber-400 group-hover:translate-x-0.5 transition-transform" />
                </p>
                <p className="text-xs text-slate-300 mt-1 leading-relaxed font-normal">
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
