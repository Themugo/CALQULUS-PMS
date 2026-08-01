import { useEffect } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '@/features/auth/AuthContext';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/shared/components/ui/card';
import { Badge } from '@/shared/components/ui/badge';
import { Skeleton } from '@/shared/components/ui/skeleton';
import AgencyLayout from '@/features/agency/components/AgencyLayout';
import {
  Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import {
  Building2, Users, TrendingUp, Shield, DollarSign, Handshake,
  Home, FileText, CreditCard, AlertCircle, Zap, Wrench, BarChart3,
  CheckSquare, Activity, ArrowRight, RefreshCw, CheckCircle2, Calendar
} from 'lucide-react';

const fmt = (n: number) =>
  new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', minimumFractionDigits: 0 }).format(n);
const fmtCompact = (n: number) =>
  new Intl.NumberFormat('en-KE', { notation: 'compact', maximumFractionDigits: 1 }).format(n);

interface MonthPoint { month: string; paid: number; pending: number; }
interface OccupancyRow { name: string; occupied: number; units: number; rate: number; }

const AgencyDashboard = () => {
  const { user, userRole, loading } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: stats, isLoading } = useQuery({
    queryKey: ['agency-dashboard-stats', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const now = new Date();
      const mtdStart = startOfMonth(now).toISOString().split('T')[0];
      const lastStart = startOfMonth(subMonths(now, 1)).toISOString().split('T')[0];
      const lastEnd = endOfMonth(subMonths(now, 1)).toISOString().split('T')[0];
      const seriesStart = startOfMonth(subMonths(now, 5)).toISOString().split('T')[0];

      const [
        { count: totalProperties },
        { data: propRows },
        { count: totalTenants },
        { count: activeTenants },
        { count: activeLeases },
        { count: expiringLeases },
        { count: pendingInvoices },
        { count: overdueInvoices },
        { data: overdueRows },
        { data: paidSeries },
        { data: pendingSeries },
      ] = await Promise.all([
        supabase.from('properties').select('id', { count: 'exact', head: true }).eq('manager_id', user.id),
        supabase.from('properties').select('name, units, occupied').eq('manager_id', user.id).order('name'),
        supabase.from('tenants').select('id', { count: 'exact', head: true }).eq('manager_id', user.id),
        supabase.from('tenants').select('id', { count: 'exact', head: true }).eq('manager_id', user.id).eq('status', 'active'),
        supabase.from('leases').select('id', { count: 'exact', head: true }).eq('manager_id', user.id).eq('status', 'active'),
        supabase.from('leases').select('id', { count: 'exact', head: true }).eq('manager_id', user.id).eq('status', 'expiring'),
        supabase.from('invoices').select('id', { count: 'exact', head: true }).eq('manager_id', user.id).eq('status', 'pending'),
        supabase.from('invoices').select('id', { count: 'exact', head: true }).eq('manager_id', user.id).eq('status', 'overdue'),
        supabase.from('invoices').select('balance_due').eq('manager_id', user.id).eq('status', 'overdue'),
        supabase.from('invoices').select('amount, paid_date').eq('manager_id', user.id).eq('status', 'paid').gte('paid_date', seriesStart),
        supabase.from('invoices').select('amount, due_date').eq('manager_id', user.id).in('status', ['pending', 'overdue']).gte('due_date', seriesStart),
      ]);

      const props = (propRows || []) as { name: string; units: number; occupied: number }[];
      const totalUnits = props.reduce((s, p) => s + Number(p.units ?? 0), 0);
      const occupiedUnits = props.reduce((s, p) => s + Number(p.occupied ?? 0), 0);
      const occupancyRate = totalUnits > 0 ? Math.round((occupiedUnits / totalUnits) * 100) : 0;
      const occupancyByProperty: OccupancyRow[] = props
        .map(p => ({
          name: p.name,
          occupied: Number(p.occupied ?? 0),
          units: Number(p.units ?? 0),
          rate: p.units > 0 ? Math.round((Number(p.occupied ?? 0) / Number(p.units)) * 100) : 0,
        }))
        .sort((a, b) => b.units - a.units)
        .slice(0, 5);

      const inMonth = (d: string | null, start: string, end?: string) =>
        !!d && d >= start && (!end || d <= end);
      const paid = (paidSeries || []) as { amount: number | string | null; paid_date: string | null }[];
      const revenueMTD = paid.filter(r => inMonth(r.paid_date, mtdStart)).reduce((s, r) => s + Number(r.amount ?? 0), 0);
      const revenueLastMonth = paid.filter(r => inMonth(r.paid_date, lastStart, lastEnd)).reduce((s, r) => s + Number(r.amount ?? 0), 0);
      const revenueChange = revenueLastMonth > 0
        ? Math.round(((revenueMTD - revenueLastMonth) / revenueLastMonth) * 100)
        : 0;

      const pend = (pendingSeries || []) as { amount: number | string | null; due_date: string | null }[];
      const series: MonthPoint[] = [];
      for (let i = 5; i >= 0; i--) {
        const m = subMonths(now, i);
        const ms = startOfMonth(m).toISOString().split('T')[0];
        const me = endOfMonth(m).toISOString().split('T')[0];
        const paidMonth = paid.filter(r => inMonth(r.paid_date, ms, me)).reduce((s, r) => s + Number(r.amount ?? 0), 0);
        const pendMonth = pend.filter(r => inMonth(r.due_date, ms, me)).reduce((s, r) => s + Number(r.amount ?? 0), 0);
        series.push({ month: format(m, 'MMM'), paid: paidMonth, pending: pendMonth });
      }

      const arrearsTotal = ((overdueRows || []) as { balance_due: number | string | null }[])
        .reduce((s, r) => s + Number(r.balance_due ?? 0), 0);

      return {
        totalProperties: totalProperties ?? 0,
        totalUnits,
        occupiedUnits,
        occupancyRate,
        occupancyByProperty,
        totalTenants: totalTenants ?? 0,
        activeTenants: activeTenants ?? 0,
        activeLeases: activeLeases ?? 0,
        expiringLeases: expiringLeases ?? 0,
        pendingInvoices: pendingInvoices ?? 0,
        overdueInvoices: overdueInvoices ?? 0,
        invoicesDue: (pendingInvoices ?? 0) + (overdueInvoices ?? 0),
        arrearsTotal,
        revenueMTD,
        revenueChange,
        series,
      };
    },
    enabled: !!user && userRole?.role === 'agency',
  });

  useEffect(() => {
    if (!user || userRole?.role !== 'agency') return;
    const invalidate = () => queryClient.invalidateQueries({ queryKey: ['agency-dashboard-stats', user.id] });
    const channels = [
      supabase.channel('agency-dash-properties').on('postgres_changes', { event: '*', schema: 'public', table: 'properties' }, invalidate).subscribe(),
      supabase.channel('agency-dash-tenants').on('postgres_changes', { event: '*', schema: 'public', table: 'tenants' }, invalidate).subscribe(),
      supabase.channel('agency-dash-leases').on('postgres_changes', { event: '*', schema: 'public', table: 'leases' }, invalidate).subscribe(),
      supabase.channel('agency-dash-invoices').on('postgres_changes', { event: '*', schema: 'public', table: 'invoices' }, invalidate).subscribe(),
    ];
    return () => { channels.forEach(ch => supabase.removeChannel(ch)); };
  }, [user, userRole?.role, queryClient]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-400" />
      </div>
    );
  }

  if (!user || userRole?.role !== 'agency') {
    return <Navigate to="/agency/login" replace />;
  }

  const statCards = [
    { label: 'Properties', value: stats?.totalProperties, sub: `${stats?.totalUnits ?? 0} units`, icon: Building2, color: 'text-amber-500' },
    { label: 'Occupancy', value: stats ? `${stats.occupancyRate}%` : undefined, sub: `${stats?.occupiedUnits ?? 0}/${stats?.totalUnits ?? 0} units`, icon: Home, color: 'text-[hsl(214_73%_48%)]' },
    { label: 'Active tenants', value: stats?.activeTenants, sub: `${stats?.totalTenants ?? 0} total`, icon: Users, color: 'text-amber-500' },
    { label: 'Active leases', value: stats?.activeLeases, sub: (stats?.expiringLeases ?? 0) > 0 ? `${stats?.expiringLeases} expiring` : 'None expiring', icon: FileText, color: 'text-[hsl(38_52%_42%)]' },
    { label: 'Invoices due', value: stats?.invoicesDue, sub: (stats?.overdueInvoices ?? 0) > 0 ? `${stats?.overdueInvoices} overdue` : 'All on time', icon: CreditCard, color: (stats?.overdueInvoices ?? 0) > 0 ? 'text-amber-400' : 'text-amber-500' },
    { label: 'Revenue (MTD)', value: stats ? fmt(stats.revenueMTD) : undefined, sub: stats && stats.revenueChange !== 0 ? `${stats.revenueChange > 0 ? '+' : ''}${stats.revenueChange}% vs last mo.` : 'vs last month', icon: TrendingUp, color: 'text-amber-500' },
  ];

  return (
    <AgencyLayout title="Executive Agency Command Center">
      {/* ── EXECUTIVE INTELLIGENCE ANSWERS MATRIX ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {/* 1. What requires attention? */}
        <Card className="border-l-4 border-l-red-500 border-border/70 bg-card hover:shadow-md transition-all">
          <CardContent className="p-3.5">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-red-600 dark:text-red-400 flex items-center gap-1.5">
                <AlertCircle className="h-3.5 w-3.5" />
                What Requires Attention?
              </span>
              <Badge variant="outline" className="text-[10px] h-4 border-red-200 text-red-700 dark:text-red-400">
                {(stats?.overdueInvoices ?? 0) + (stats?.expiringLeases ?? 0)} Issues
              </Badge>
            </div>
            <div className="space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Arrears Balance:</span>
                <span className="font-semibold text-red-600 dark:text-red-400">{fmt(stats?.arrearsTotal ?? 0)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Overdue Invoices:</span>
                <span className="font-semibold text-foreground">{stats?.overdueInvoices ?? 0} overdue</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Expiring Leases:</span>
                <span className="font-semibold text-amber-500">{stats?.expiringLeases ?? 0} expiring</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 2. What generates revenue? */}
        <Card className="border-l-4 border-l-emerald-500 border-border/70 bg-card hover:shadow-md transition-all">
          <CardContent className="p-3.5">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                <DollarSign className="h-3.5 w-3.5" />
                What Generates Revenue?
              </span>
              <Badge variant="outline" className="text-[10px] h-4 border-emerald-300 text-emerald-700 dark:text-emerald-400">
                +{stats?.revenueChange ?? 0}% MoM
              </Badge>
            </div>
            <div className="space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Revenue MTD:</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">{fmt(stats?.revenueMTD ?? 0)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Occupancy Rate:</span>
                <span className="font-semibold text-foreground">{stats?.occupancyRate ?? 0}% occupied</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Invoices Due:</span>
                <span className="font-medium text-foreground">{stats?.invoicesDue ?? 0} total</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 3. What needs approval? */}
        <Card className="border-l-4 border-l-amber-500 border-border/70 bg-card hover:shadow-md transition-all">
          <CardContent className="p-3.5">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                <CheckSquare className="h-3.5 w-3.5" />
                What Needs Approval?
              </span>
              <Badge variant="outline" className="text-[10px] h-4 border-amber-300 text-amber-700 dark:text-amber-400">
                Agency Ops
              </Badge>
            </div>
            <div className="space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Pending Invoices:</span>
                <span className="font-semibold text-amber-500">{stats?.pendingInvoices ?? 0} pending</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Lease Expiries:</span>
                <span className="font-medium text-foreground">{stats?.expiringLeases ?? 0} for review</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 4. Portfolio Scope */}
        <Card className="border-l-4 border-l-sky-500 border-border/70 bg-card hover:shadow-md transition-all">
          <CardContent className="p-3.5">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-sky-600 dark:text-sky-400 flex items-center gap-1.5">
                <Building2 className="h-3.5 w-3.5" />
                Agency Roster
              </span>
              <Badge variant="outline" className="text-[10px] h-4 border-sky-300 text-sky-700 dark:text-sky-400">
                {stats?.totalProperties ?? 0} Properties
              </Badge>
            </div>
            <div className="space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Active Tenants:</span>
                <span className="font-semibold text-foreground">{stats?.activeTenants ?? 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Active Leases:</span>
                <span className="font-semibold text-foreground">{stats?.activeLeases ?? 0}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* KPI Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-6">
        {statCards.map(stat => (
          <Card key={stat.label} className="bg-card border-border/60">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-muted-foreground">{stat.label}</p>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </div>
              {isLoading ? (
                <Skeleton className="h-7 w-20 bg-muted/60" />
              ) : (
                <>
                  <p className={`text-xl font-bold ${stat.color}`}>{stat.value ?? 0}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{stat.sub}</p>
                </>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Arrears Alert Banner */}
      {!isLoading && (stats?.arrearsTotal ?? 0) > 0 && (
        <Card className="bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-900/40 mb-6">
          <CardContent className="p-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-red-500 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-red-700 dark:text-red-300">
                  {fmt(stats!.arrearsTotal)} in arrears across {stats!.overdueInvoices} overdue invoice{stats!.overdueInvoices !== 1 ? 's' : ''}
                </p>
                <p className="text-xs text-red-600/70 dark:text-red-400/70">Immediate collection follow-up recommended.</p>
              </div>
            </div>
            <Button size="sm" variant="outline" className="border-red-300 text-red-700 dark:border-red-800 dark:text-red-300 shrink-0" onClick={() => navigate('/agency/billing')}>
              View Billing Matrix <ArrowRight className="h-3.5 w-3.5 ml-1" />
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Revenue trend + occupancy snapshot */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 mb-6">
        <div className="lg:col-span-7">
          <Card className="bg-card border-border/60 h-full">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-card-foreground font-semibold text-sm">Revenue Overview</h3>
                  <p className="text-xs text-muted-foreground">6-Month Paid vs Pending Collections</p>
                </div>
                <TrendingUp className="h-4 w-4 text-emerald-500" />
              </div>
              {isLoading ? (
                <Skeleton className="h-[220px] w-full bg-muted/60" />
              ) : (
                <div className="h-[230px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={stats?.series ?? []} margin={{ top: 10, right: 5, left: -12, bottom: 0 }}>
                      <defs>
                        <linearGradient id="agencyPaid" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(42 51% 55%)" stopOpacity={0.35} />
                          <stop offset="95%" stopColor="hsl(42 51% 55%)" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="agencyPending" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#fbbf24" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#fbbf24" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                      <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} tickFormatter={fmtCompact} width={44} />
                      <Tooltip
                        contentStyle={{ background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: 8, color: 'hsl(var(--popover-foreground))' }}
                        formatter={(v: number, name: string) => [fmt(v), name === 'paid' ? 'Collected' : 'Pending']}
                      />
                      <Area type="monotone" dataKey="paid" stroke="hsl(42 51% 55%)" strokeWidth={2} fill="url(#agencyPaid)" />
                      <Area type="monotone" dataKey="pending" stroke="#fbbf24" strokeWidth={2} fill="url(#agencyPending)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-5">
          <Card className="bg-card border-border/60 h-full">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-card-foreground font-semibold text-sm">Occupancy by Property</h3>
                  <p className="text-xs text-muted-foreground">Top properties by size</p>
                </div>
                <Home className="h-4 w-4 text-[hsl(214_73%_58%)]" />
              </div>
              {isLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-9 w-full bg-muted/60" />)}
                </div>
              ) : (stats?.occupancyByProperty?.length ?? 0) === 0 ? (
                <div className="py-10 text-center">
                  <Building2 className="h-9 w-9 mx-auto mb-2 text-amber-400/40" />
                  <p className="text-sm text-muted-foreground">No properties yet</p>
                  <Button size="sm" className="mt-3" onClick={() => navigate('/agency/properties')}>
                    Add a property
                  </Button>
                </div>
              ) : (
                <div className="space-y-3.5">
                  {stats!.occupancyByProperty.map(p => (
                    <div key={p.name}>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-card-foreground font-medium truncate pr-2">{p.name}</span>
                        <span className="text-muted-foreground shrink-0">{p.occupied}/{p.units} · {p.rate}%</span>
                      </div>
                      <div className="h-2 rounded-full bg-muted/60 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${p.rate >= 90 ? 'bg-emerald-500' : p.rate >= 70 ? 'bg-amber-500' : 'bg-red-500'}`}
                          style={{ width: `${Math.min(p.rate, 100)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Quick Actions Desk */}
      <Card className="mb-6 border-border/60">
        <CardContent className="p-4 sm:p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-amber-500" />
              <span className="text-sm font-semibold text-foreground">Agency Action Desk</span>
            </div>
            <Badge variant="outline" className="text-xs">Direct Access</Badge>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
            {[
              { label: 'Properties',  icon: Building2,  href: '/agency/properties',   accent: 'text-[hsl(214_73%_48%)]',    bg: 'bg-[hsl(214_73%_48%/0.08)] border-[hsl(214_73%_48%/0.2)]' },
              { label: 'Tenants',     icon: Users,      href: '/agency/tenants',       accent: 'text-emerald-500', bg: 'bg-emerald-500/10 border-emerald-500/20' },
              { label: 'Billing',     icon: CreditCard, href: '/agency/billing',       accent: 'text-amber-500',   bg: 'bg-amber-400/12 border-amber-400/25' },
              { label: 'Landlords',   icon: Handshake,  href: '/agency/landlords',     accent: 'text-[hsl(38_52%_42%)]',  bg: 'bg-[hsl(38_52%_42%/0.1)] border-[hsl(38_52%_42%/0.2)]' },
              { label: 'Maintenance', icon: Wrench,     href: '/agency/maintenance',   accent: 'text-[hsl(195_60%_42%)]',    bg: 'bg-[hsl(195_60%_42%/0.1)] border-[hsl(195_60%_42%/0.2)]' },
              { label: 'Reports',     icon: BarChart3,  href: '/agency/reports',       accent: 'text-[hsl(218_58%_40%)]',    bg: 'bg-[hsl(218_58%_40%/0.1)] border-[hsl(218_58%_40%/0.2)]' },
            ].map(a => (
              <button key={a.label} onClick={() => navigate(a.href)}
                className={`group flex flex-col items-center gap-2 p-3 sm:p-4 rounded-xl border transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md active:scale-95 touch-manipulation ${a.bg}`}>
                <div className="h-9 w-9 rounded-xl bg-background/80 border border-border/60 flex items-center justify-center shadow-sm transition-transform duration-200 group-hover:scale-110">
                  <a.icon className={`h-4 w-4 ${a.accent}`} />
                </div>
                <p className="text-xs font-semibold text-foreground text-center leading-tight">{a.label}</p>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Info card */}
      <Card className="bg-card border-border/60">
        <CardContent className="p-5">
          <div className="flex items-start gap-3">
            <Shield className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-card-foreground">Agency Operating Architecture</p>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                As a property agency, you operate as a full agent — managing properties on behalf of landlords,
                collecting rent directly or forwarding to landlord destination accounts, and managing tenant relationships.
                Your portal provides tenant lifecycle management, landlord revenue sharing configurations, and staff submanager controls.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </AgencyLayout>
  );
};

export default AgencyDashboard;
