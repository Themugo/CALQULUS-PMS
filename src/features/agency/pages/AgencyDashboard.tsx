// @ts-nocheck — Phase 12: remaining local types until live supabase gen types
import { useEffect } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '@/features/auth/AuthContext';
import { isDevAccessEnabled } from '@/features/auth/lib/devAccess';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/shared/components/ui/button';
import { Skeleton } from '@/shared/components/ui/skeleton';
import AgencyLayout from '@/features/agency/components/AgencyLayout';
import {
  Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { ArrowRight } from 'lucide-react';

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
    if (!isDevAccessEnabled() && (!user || userRole?.role !== 'agency')) return;
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
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!isDevAccessEnabled() && (!user || userRole?.role !== 'agency')) {
    return <Navigate to="/agency/login" replace />;
  }

  const issueCount = (stats?.overdueInvoices ?? 0) + (stats?.expiringLeases ?? 0);
  const hasAttention = (stats?.arrearsTotal ?? 0) > 0 || issueCount > 0;

  return (
    <AgencyLayout
      title="Dashboard"
      description="Properties, occupancy, collections, and what needs attention"
    >
      <section className="mb-6">
        <div className="mb-3">
          <h2 className="section-title">Needs attention</h2>
        </div>
        {isLoading ? (
          <Skeleton className="h-16 w-full" />
        ) : !hasAttention ? (
          <p className="text-sm text-muted-foreground">No overdue invoices or expiring leases right now.</p>
        ) : (
          <div className="rounded-lg border border-border bg-card divide-y divide-border">
            {(stats?.arrearsTotal ?? 0) > 0 && (
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-foreground">{fmt(stats!.arrearsTotal)} in arrears</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {stats!.overdueInvoices} overdue invoice{stats!.overdueInvoices !== 1 ? 's' : ''}
                  </p>
                </div>
                <Button size="sm" className="min-h-11 shrink-0" onClick={() => navigate('/agency/billing')}>
                  Open billing
                  <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
                </Button>
              </div>
            )}
            {(stats?.expiringLeases ?? 0) > 0 && (
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-foreground">{stats!.expiringLeases} lease{stats!.expiringLeases !== 1 ? 's' : ''} expiring</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Review before they lapse</p>
                </div>
                <Button size="sm" variant="outline" className="min-h-11 shrink-0" onClick={() => navigate('/agency/leases')}>
                  Open leases
                  <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
                </Button>
              </div>
            )}
          </div>
        )}
      </section>

      <section className="mb-6">
        <div className="mb-3">
          <h2 className="section-title">Portfolio</h2>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: 'Occupancy', value: stats ? `${stats.occupancyRate}%` : '—', sub: `${stats?.occupiedUnits ?? 0}/${stats?.totalUnits ?? 0} units` },
            { label: 'Collected MTD', value: stats ? fmt(stats.revenueMTD) : '—', sub: stats && stats.revenueChange !== 0 ? `${stats.revenueChange > 0 ? '+' : ''}${stats.revenueChange}% vs last month` : 'vs last month' },
            { label: 'Invoices due', value: stats?.invoicesDue ?? '—', sub: (stats?.overdueInvoices ?? 0) > 0 ? `${stats?.overdueInvoices} overdue` : 'None overdue' },
            { label: 'Properties', value: stats?.totalProperties ?? '—', sub: `${stats?.activeTenants ?? 0} active tenants` },
          ].map((stat) => (
            <div key={stat.label} className="rounded-lg border border-border bg-card p-4">
              <p className="text-xs text-muted-foreground">{stat.label}</p>
              {isLoading ? (
                <Skeleton className="h-7 w-20 mt-2" />
              ) : (
                <>
                  <p className="text-xl font-semibold text-foreground mt-1">{stat.value}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{stat.sub}</p>
                </>
              )}
            </div>
          ))}
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 mb-6">
        <div className="lg:col-span-7 rounded-lg border border-border bg-card p-5">
          <h3 className="text-sm font-semibold text-foreground">Collections</h3>
          <p className="text-xs text-muted-foreground mb-4">Paid versus pending over six months</p>
          {isLoading ? (
            <Skeleton className="h-[220px] w-full" />
          ) : (
            <div className="h-[230px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stats?.series ?? []} margin={{ top: 10, right: 5, left: -12, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} tickFormatter={fmtCompact} width={44} />
                  <Tooltip
                    contentStyle={{ background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: 8, color: 'hsl(var(--popover-foreground))' }}
                    formatter={(v: number, name: string) => [fmt(v), name === 'paid' ? 'Collected' : 'Pending']}
                  />
                  <Area type="monotone" dataKey="paid" stroke="hsl(var(--navy-mid))" strokeWidth={2} fill="transparent" />
                  <Area type="monotone" dataKey="pending" stroke="hsl(var(--warning))" strokeWidth={2} fill="transparent" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="lg:col-span-5 rounded-lg border border-border bg-card p-5">
          <h3 className="text-sm font-semibold text-foreground">Occupancy by property</h3>
          <p className="text-xs text-muted-foreground mb-4">Largest properties first</p>
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-9 w-full" />)}
            </div>
          ) : (stats?.occupancyByProperty?.length ?? 0) === 0 ? (
            <div className="py-8">
              <p className="text-sm text-muted-foreground">No properties yet</p>
              <Button size="sm" className="mt-3" onClick={() => navigate('/agency/properties')}>
                Add a property
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {stats!.occupancyByProperty.map(p => (
                <div key={p.name}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-foreground font-medium truncate pr-2">{p.name}</span>
                    <span className="text-muted-foreground shrink-0">{p.occupied}/{p.units} · {p.rate}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className={`h-full ${p.rate >= 90 ? 'bg-success' : p.rate >= 70 ? 'bg-warning' : 'bg-destructive'}`}
                      style={{ width: `${Math.min(p.rate, 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <nav aria-label="Agency shortcuts" className="flex flex-wrap gap-2">
        {[
          { label: 'Properties', href: '/agency/properties' },
          { label: 'Tenants', href: '/agency/tenants' },
          { label: 'Billing', href: '/agency/billing' },
          { label: 'Landlords', href: '/agency/landlords' },
          { label: 'Maintenance', href: '/agency/maintenance' },
          { label: 'Reports', href: '/agency/reports' },
        ].map((item) => (
          <Button key={item.href} variant="outline" size="sm" className="min-h-11" onClick={() => navigate(item.href)}>
            {item.label}
          </Button>
        ))}
      </nav>
    </AgencyLayout>
  );
};

export default AgencyDashboard;
