import { Layout } from "@/shared/components/layout/Layout";
import { StatCard } from "@/features/dashboard/components/StatCard";
import { ManagerQuickActions } from "@/features/dashboard/components/ManagerQuickActions";
import ManagerSubscriptionBanner from "@/features/payments/components/ManagerSubscriptionBanner";
import { PaymentSetupStatus } from "@/features/settings/components/PaymentSetupStatus";
import { RevenueChart } from "@/features/dashboard/components/RevenueChart";
import { OccupancyChart } from "@/features/dashboard/components/OccupancyChart";
import { PendingDepositRefunds } from "@/features/dashboard/components/PendingDepositRefunds";
import { RecentActivity } from "@/features/dashboard/components/RecentActivity";
import { UpcomingPayments } from "@/features/dashboard/components/UpcomingPayments";
import { PropertiesOverview } from "@/features/dashboard/components/PropertiesOverview";
import { TenantsOverview } from "@/features/dashboard/components/TenantsOverview";
import ManagerActivityLog from "@/features/dashboard/components/ManagerActivityLog";
import { ArrearsHeatMap } from "@/features/dashboard/components/ArrearsHeatMap";
import {
  Home, AlertCircle, ArrowRight, RefreshCw,
  BarChart3, ShieldCheck, AlertTriangle, PieChart,
  DollarSign, Activity, CheckSquare, Calendar,
} from "lucide-react";
import { useEffect, useState, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/features/auth/AuthContext";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/shared/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";
import { useCurrency } from "@/shared/hooks/useCurrency";
import { toast } from "@/shared/hooks/use-toast";
import { logError } from "@/shared/lib/errorLogger";
import { useManagerScope } from "@/shared/hooks/useManagerScope";
import { useNavigate } from "react-router-dom";
import { ErrorBoundary } from "@/shared/components/ErrorBoundary";
import { useLeaseExpiryReminders } from "@/shared/hooks/useLeaseExpiryReminders";

interface DashboardStats {
  totalTenants: number;
  activeTenants: number;
  inactiveTenants: number;
  newTenantsThisMonth: number;
  activeLeases: number;
  expiringLeases: number;
  revenueMTD: number;
  revenueChange: number;
  expectedRent: number;
  collectedRent: number;
  outstandingRent: number;
  collectionRate: number;
  totalProperties: number;
  totalUnits: number;
  occupiedUnits: number;
  vacantUnits: number;
  occupancyRate: number;
  pendingInvoices: number;
  overdueInvoices: number;
  arrearsTotal: number;
  openMaintenanceCount: number;
  urgentMaintenanceCount: number;
  pendingDepositRefundsCount: number;
}

const Dashboard = () => {
  const { user } = useAuth();
  const { managerId } = useManagerScope();
  useLeaseExpiryReminders();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [statsError, setStatsError] = useState(false);
  const [userName, setUserName] = useState("there");
  const { currency, setCurrency, currencies, formatCurrency } = useCurrency();
  const [activeTab, setActiveTab] = useState("overview");

  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  };

  const userId = user?.id;

  const fetchStats = useCallback(async () => {
    if (!managerId || !userId) return;
    try {
      setLoading(true);
      setStatsError(false);

      const firstOfThisMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
      const endOfThisMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().split('T')[0];
      const firstOfPrevMonth = new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1).toISOString().split('T')[0];
      const endOfPrevMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 0).toISOString().split('T')[0];

      const [
        profileResult,
        tenantsResult,
        activeTenantsResult,
        inactiveTenantsResult,
        newTenantsResult,
        activeLeasesResult,
        expiringLeasesResult,
        paidInvoicesResult,
        prevMonthResult,
        thisMonthInvoicesResult,
        pendingInvoicesResult,
        overdueInvoicesResult,
        overdueAmountResult,
        propertiesResult,
        maintenanceResult,
        urgentMaintenanceResult,
        depositRefundsResult
      ] = await Promise.all([
        supabase.from('profiles').select('full_name').eq('id', userId).maybeSingle(),
        supabase.from('tenants').select('id', { count: 'exact', head: true }).eq('manager_id', managerId),
        supabase.from('tenants').select('id', { count: 'exact', head: true }).eq('manager_id', managerId).eq('status', 'active'),
        supabase.from('tenants').select('id', { count: 'exact', head: true }).eq('manager_id', managerId).eq('status', 'inactive'),
        supabase.from('tenants').select('id', { count: 'exact', head: true }).eq('manager_id', managerId).gte('created_at', firstOfThisMonth),
        supabase.from('leases').select('id', { count: 'exact', head: true }).eq('manager_id', managerId).eq('status', 'active'),
        supabase.from('leases').select('id', { count: 'exact', head: true }).eq('manager_id', managerId).eq('status', 'active')
          .lte('end_date', new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]),
        supabase.from('invoices').select('amount').eq('manager_id', managerId).eq('status', 'paid').gte('paid_date', firstOfThisMonth),
        supabase.from('invoices').select('amount').eq('manager_id', managerId).eq('status', 'paid').gte('paid_date', firstOfPrevMonth).lte('paid_date', endOfPrevMonth),
        supabase.from('invoices').select('amount, status').eq('manager_id', managerId).gte('due_date', firstOfThisMonth).lte('due_date', endOfThisMonth),
        supabase.from('invoices').select('id', { count: 'exact', head: true }).eq('manager_id', managerId).eq('status', 'pending'),
        supabase.from('invoices').select('id', { count: 'exact', head: true }).eq('manager_id', managerId).eq('status', 'overdue'),
        supabase.from('invoices').select('balance_due').eq('manager_id', managerId).eq('status', 'overdue'),
        supabase.from('properties').select('id, units, occupied').eq('manager_id', managerId),
        supabase.from('maintenance_requests').select('id', { count: 'exact', head: true }).eq('manager_id', managerId).in('status', ['open', 'pending', 'in_progress']),
        supabase.from('maintenance_requests').select('id', { count: 'exact', head: true }).eq('manager_id', managerId).in('status', ['open', 'pending', 'in_progress']).in('priority', ['high', 'urgent']),
        supabase.from('deposit_refunds').select('id', { count: 'exact', head: true }).eq('manager_id', managerId).eq('status', 'pending'),
      ]);

      if (profileResult.data?.full_name) {
        setUserName(profileResult.data.full_name.split(' ')[0]);
      }

      const revenueMTD = ((paidInvoicesResult.data as { amount: number }[]) ?? []).reduce((s, i) => s + Number(i.amount || 0), 0);
      const revenuePrev = ((prevMonthResult.data as { amount: number }[]) ?? []).reduce((s, i) => s + Number(i.amount || 0), 0);
      const revenueChange = revenuePrev > 0 ? Math.round(((revenueMTD - revenuePrev) / revenuePrev) * 100) : 0;

      const thisMonthInvoices = (thisMonthInvoicesResult.data as { amount: number; status: string }[]) ?? [];
      let expectedRent = thisMonthInvoices.reduce((s, i) => s + Number(i.amount || 0), 0);

      // Fallback: if no invoices generated yet this month, query active leases sum
      if (expectedRent === 0) {
        const { data: activeLeaseRows } = await supabase
          .from('leases')
          .select('rent_amount')
          .eq('manager_id', managerId)
          .eq('status', 'active');
        expectedRent = (activeLeaseRows || []).reduce((s, l) => s + Number(l.rent_amount || 0), 0);
      }

      const collectedRent = revenueMTD;
      const collectionRate = expectedRent > 0 ? Math.min(100, Math.round((collectedRent / expectedRent) * 100)) : 0;

      const allProps = (propertiesResult.data as { id: string; units: number; occupied: number }[]) ?? [];
      const totalUnits = allProps.reduce((s, p) => s + (Number(p.units) || 0), 0);
      const totalOccupied = allProps.reduce((s, p) => s + (Number(p.occupied) || 0), 0);
      const vacantUnits = Math.max(0, totalUnits - totalOccupied);
      const occupancyRate = totalUnits > 0 ? Math.round((totalOccupied / totalUnits) * 100) : 0;

      const arrearsTotal = ((overdueAmountResult.data as { balance_due: number }[]) ?? []).reduce((s, i) => s + Number(i.balance_due || 0), 0);

      setStats({
        totalTenants: tenantsResult.count || 0,
        activeTenants: activeTenantsResult.count || 0,
        inactiveTenants: inactiveTenantsResult.count || 0,
        newTenantsThisMonth: newTenantsResult.count || 0,
        activeLeases: activeLeasesResult.count || 0,
        expiringLeases: expiringLeasesResult.count || 0,
        revenueMTD,
        revenueChange,
        expectedRent,
        collectedRent,
        outstandingRent: arrearsTotal,
        collectionRate,
        totalProperties: allProps.length,
        totalUnits,
        occupiedUnits: totalOccupied,
        vacantUnits,
        occupancyRate,
        pendingInvoices: pendingInvoicesResult.count || 0,
        overdueInvoices: overdueInvoicesResult.count || 0,
        arrearsTotal,
        openMaintenanceCount: maintenanceResult.count || 0,
        urgentMaintenanceCount: urgentMaintenanceResult.count || 0,
        pendingDepositRefundsCount: depositRefundsResult.count || 0,
      });
    } catch (err) {
      logError('Dashboard.fetchStats', err);
      setStatsError(true);
      toast({ title: "Error loading stats", description: "Please refresh the page.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [managerId, userId]);

  useEffect(() => {
    fetchStats();
    const channels = [
      supabase.channel('dash-tenants').on('postgres_changes', { event: '*', schema: 'public', table: 'tenants' }, fetchStats).subscribe(),
      supabase.channel('dash-leases').on('postgres_changes', { event: '*', schema: 'public', table: 'leases' }, fetchStats).subscribe(),
      supabase.channel('dash-invoices').on('postgres_changes', { event: '*', schema: 'public', table: 'invoices' }, fetchStats).subscribe(),
      supabase.channel('dash-properties').on('postgres_changes', { event: '*', schema: 'public', table: 'properties' }, fetchStats).subscribe(),
      supabase.channel('dash-maint').on('postgres_changes', { event: '*', schema: 'public', table: 'maintenance_requests' }, fetchStats).subscribe(),
      supabase.channel('dash-refunds').on('postgres_changes', { event: '*', schema: 'public', table: 'deposit_refunds' }, fetchStats).subscribe(),
    ];
    return () => { channels.forEach(ch => supabase.removeChannel(ch)); };
  }, [fetchStats]);

  const { data: leaseExpiryData } = useQuery({
    queryKey: ['lease-expiry-4w', managerId],
    queryFn: async () => {
      if (!managerId) return { counts: [], labels: [], urgentWeeks: [] };
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const weeks = Array.from({ length: 4 }, (_, i) => {
        const start = new Date(today);
        start.setDate(today.getDate() + i * 7);
        const end = new Date(start);
        end.setDate(start.getDate() + 6);
        end.setHours(23, 59, 59, 999);
        return { start, end, label: `Wk ${i + 1}` };
      });
      const results = await Promise.all(
        weeks.map(({ start, end }) =>
          supabase
            .from('leases')
            .select('id', { count: 'exact', head: true })
            .eq('manager_id', managerId)
            .eq('status', 'active')
            .gte('end_date', start.toISOString().split('T')[0])
            .lte('end_date', end.toISOString().split('T')[0])
        )
      );
      const counts = results.map(r => r.count ?? 0);
      const max = Math.max(...counts, 1);
      return {
        counts,
        labels: weeks.map(w => w.label),
        urgentWeeks: counts.map(c => c >= Math.ceil(max * 0.7)),
      };
    },
    enabled: !!managerId,
    staleTime: 10 * 60 * 1000,
  });

  return (
    <Layout
      title={`${getGreeting()}, ${userName}`}
      subtitle={stats
        ? `Portfolio health · ${stats.totalProperties} properties · ${stats.occupiedUnits}/${stats.totalUnits} occupied · ${formatCurrency(stats.collectedRent)} collected this month`
        : "Portfolio health, collections, and what needs action today"}
      headerActions={
        <div className="flex items-center gap-2">
          <Button
            variant="ghost" size="sm"
            onClick={() => { queryClient.invalidateQueries(); fetchStats(); }}
            className="h-9 w-9 text-muted-foreground hover:text-foreground"
            title="Refresh operational stats"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Select value={currency} onValueChange={setCurrency}>
            <SelectTrigger className="w-[120px] h-9 text-sm">
              <SelectValue placeholder="Currency" />
            </SelectTrigger>
            <SelectContent>
              {currencies.map(c => (
                <SelectItem key={c.code} value={c.code}>{c.symbol} {c.code}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      }
    >
      <PaymentSetupStatus />
      <ManagerSubscriptionBanner compact />

      {/* Demo banner */}
      {user?.email?.includes('@calqulusrms.com') && (
        <div className="mb-4 rounded-xl border border-warning/30 bg-warning/10 px-4 py-2.5 flex items-center gap-3">
          <div className="h-2 w-2 rounded-full bg-warning animate-pulse-soft flex-shrink-0" />
          <span className="text-xs text-warning font-medium">
            <strong>Demo mode</strong> — browsing sample property data. Changes won't persist.
          </span>
        </div>
      )}

      {/* ── STATS ERROR / RETRY ── */}
      {statsError && !loading && (
        <div className="mb-5 enterprise-card p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-destructive/30">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-destructive/10 border border-destructive/20 flex items-center justify-center shrink-0">
              <AlertTriangle className="h-4 w-4 text-destructive" />
            </div>
            <div>
              <p className="card-title-exec text-destructive">Couldn't load dashboard metrics</p>
              <p className="supporting-text">A connection issue prevented loading your latest stats. Please retry.</p>
            </div>
          </div>
          <Button
            onClick={() => { queryClient.invalidateQueries(); fetchStats(); }}
            className="btn-brand h-9 shrink-0"
          >
            <RefreshCw className="h-4 w-4 mr-1.5" /> Retry
          </Button>
        </div>
      )}

      {/* ── PORTFOLIO HEALTH ── */}
      <div className="mb-2 flex items-center justify-between">
        <div>
          <h2 className="section-title">Portfolio health</h2>
          <p className="supporting-text hidden sm:block">Collected rent, arrears, occupancy, and leases due soon</p>
        </div>
      </div>
      <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-5 mb-5">
        {loading
          ? Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)
          : stats && (
            <>
              <StatCard
                title="Collected rent"
                value={formatCurrency(stats.revenueMTD)}
                change={stats.revenueChange !== 0 ? `${stats.revenueChange > 0 ? "+" : ""}${stats.revenueChange}% vs last month` : "Same as last month"}
                changeType={stats.revenueChange > 0 ? "positive" : stats.revenueChange < 0 ? "negative" : "neutral"}
                icon={DollarSign}
                iconColor="primary"
              />
              <StatCard
                title="Outstanding arrears"
                value={formatCurrency(stats.arrearsTotal)}
                change={stats.overdueInvoices > 0 ? `${stats.overdueInvoices} overdue invoices` : "All invoices clear"}
                changeType={stats.overdueInvoices > 0 ? "negative" : "positive"}
                icon={AlertTriangle}
                iconColor="neutral"
              />
              <StatCard
                title="Occupancy"
                value={`${stats.occupancyRate}%`}
                change={`${stats.occupiedUnits} occupied · ${stats.vacantUnits} vacant`}
                changeType={stats.occupancyRate >= 90 ? "positive" : stats.occupancyRate >= 70 ? "neutral" : "negative"}
                icon={Home}
                iconColor="neutral"
                progressValue={stats.occupancyRate}
              />
              <StatCard
                title="Collection rate"
                value={`${stats.collectionRate}%`}
                change={`Expected ${formatCurrency(stats.expectedRent)}`}
                changeType={stats.collectionRate >= 90 ? "positive" : stats.collectionRate >= 75 ? "neutral" : "negative"}
                icon={PieChart}
                iconColor="neutral"
              />
              <StatCard
                title="Leases expiring"
                value={stats.expiringLeases.toString()}
                change="Next 30 days"
                changeType={stats.expiringLeases > 0 ? "negative" : "positive"}
                icon={Calendar}
                iconColor="neutral"
                sparkData={leaseExpiryData?.counts}
                sparkLabels={leaseExpiryData?.labels}
                sparkUnit="lease"
                sparkCaption="4-week outlook"
              />
            </>
          )}
      </div>

      {/* ── ATTENTION / ACTION CENTER ── */}
      <div className="mb-2 flex items-center justify-between">
        <div>
          <h2 className="section-title">Needs action today</h2>
          <p className="supporting-text hidden sm:block">Overdue rent, vacancies, expiring leases, and open repairs</p>
        </div>
      </div>
      <div className="enterprise-card mb-5 divide-y divide-border">
        {([
          {
            label: "Overdue invoices",
            detail: loading ? "…" : `${stats?.overdueInvoices ?? 0} · ${formatCurrency(stats?.arrearsTotal ?? 0)}`,
            href: "/billing?filter=overdue",
            tone: (stats?.overdueInvoices ?? 0) > 0 ? "status-danger" : "status-success",
            cta: "Collect",
          },
          {
            label: "Vacant units",
            detail: loading ? "…" : `${stats?.vacantUnits ?? 0} of ${stats?.totalUnits ?? 0}`,
            href: "/properties",
            tone: (stats?.vacantUnits ?? 0) > 0 ? "status-warning" : "status-success",
            cta: "Fill",
          },
          {
            label: "Leases expiring in 30 days",
            detail: loading ? "…" : `${stats?.expiringLeases ?? 0}`,
            href: "/leases",
            tone: (stats?.expiringLeases ?? 0) > 0 ? "status-warning" : "status-neutral",
            cta: "Review",
          },
          {
            label: "Open maintenance",
            detail: loading ? "…" : `${stats?.openMaintenanceCount ?? 0} open · ${stats?.urgentMaintenanceCount ?? 0} urgent`,
            href: "/maintenance",
            tone: (stats?.urgentMaintenanceCount ?? 0) > 0 ? "status-danger" : (stats?.openMaintenanceCount ?? 0) > 0 ? "status-warning" : "status-success",
            cta: "Work orders",
          },
          {
            label: "Deposit refunds",
            detail: loading ? "…" : `${stats?.pendingDepositRefundsCount ?? 0} pending`,
            href: "/tenants",
            tone: (stats?.pendingDepositRefundsCount ?? 0) > 0 ? "status-warning" : "status-neutral",
            cta: "Approve",
          },
        ] as const).map((row) => (
          <button
            key={row.label}
            type="button"
            onClick={() => navigate(row.href)}
            className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left hover:bg-muted/40 transition-colors"
          >
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground">{row.label}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{row.detail}</p>
            </div>
            <span className={`status-badge ${row.tone} shrink-0`}>{row.cta}</span>
          </button>
        ))}
      </div>


      {/* ── ARREARS URGENT ALERT BAR ── */}
      {!loading && stats && stats.arrearsTotal > 0 && (
        <div className="mb-5 flex items-center justify-between gap-4 rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-destructive">
                {formatCurrency(stats.arrearsTotal)} in outstanding arrears
              </p>
              <p className="supporting-text text-destructive/80 mt-0.5">
                {stats.overdueInvoices} overdue invoice{stats.overdueInvoices !== 1 ? "s" : ""} require collection action
              </p>
            </div>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="border-destructive/30 text-destructive hover:bg-destructive/10 shrink-0"
            onClick={() => navigate("/billing?filter=overdue")}
          >
            View Overdue Invoices <ArrowRight className="h-3.5 w-3.5 ml-1" />
          </Button>
        </div>
      )}

      {/* ── ARREARS HEAT MAP (IF OVERDUE EXIST) ── */}
      {!loading && stats && stats.overdueInvoices > 0 && <ArrearsHeatMap />}

      <ManagerQuickActions hasProperties={(stats?.totalProperties ?? 0) > 0} />

      {/* ── MAIN WORKSPACE SECTION (12-COLUMN RESPONSIVE LAYOUT) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 mb-6">
        {/* Left Column (8 cols): Analytics, Approvals & Operations */}
        <div className="lg:col-span-8 space-y-5">
          {/* 1. Revenue / Performance Analytics */}
          <div>
            <h2 className="section-title mb-3">Trends</h2>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <div className="flex items-center justify-between mb-3">
                <TabsList className="bg-muted/60 p-1 border border-border/60">
                  <TabsTrigger value="overview" className="text-xs gap-1.5">
                    <BarChart3 className="h-3.5 w-3.5" />
                    Revenue Analytics
                  </TabsTrigger>
                  <TabsTrigger value="occupancy" className="text-xs gap-1.5">
                    <Home className="h-3.5 w-3.5" />
                    Occupancy Performance
                  </TabsTrigger>
                </TabsList>
                <span className="status-badge status-neutral hidden sm:inline-flex">
                  Real-time analytics
                </span>
              </div>

              <TabsContent value="overview" className="mt-0">
                <ErrorBoundary compact label="Revenue chart">
                  <RevenueChart />
                </ErrorBoundary>
              </TabsContent>
              <TabsContent value="occupancy" className="mt-0">
                <ErrorBoundary compact label="Occupancy chart">
                  <OccupancyChart />
                </ErrorBoundary>
              </TabsContent>
            </Tabs>
          </div>

          {/* 2. Approvals & Action Desk */}
          <Card className="enterprise-card">
            <CardHeader className="pb-3 pt-4 px-4 sm:px-5 border-b border-border/40">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="card-title-exec flex items-center gap-2">
                    <CheckSquare className="h-4 w-4 text-warning" />
                    Approvals & Action Desk
                  </CardTitle>
                  <CardDescription className="supporting-text">
                    Pending deposit refunds, lease renewals, and tenant actions
                  </CardDescription>
                </div>
                <span className="status-badge status-warning">
                  {stats?.pendingDepositRefundsCount ?? 0} pending
                </span>
              </div>
            </CardHeader>
            <CardContent className="p-4 sm:p-5">
              <PendingDepositRefunds />
            </CardContent>
          </Card>

          {/* 3. Property & Tenant Overview */}
          <div>
            <h2 className="section-title mb-3">Property & Tenant Overview</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <PropertiesOverview />
              <TenantsOverview />
            </div>
          </div>

          {/* 4. Upcoming Payments & Collection Forecast */}
          <ErrorBoundary compact label="Upcoming payments">
            <UpcomingPayments />
          </ErrorBoundary>
        </div>

        {/* Right Column (4 cols): Live Activity Feed & Audit Log */}
        <div className="lg:col-span-4 space-y-5">
          {/* Activity Feed */}
          <Card className="enterprise-card">
            <CardHeader className="pb-2 pt-4 px-4 sm:px-5 border-b border-border/40">
              <CardTitle className="card-title-exec flex items-center gap-2">
                <Activity className="h-4 w-4 text-primary" />
                Live Activity Feed
              </CardTitle>
              <CardDescription className="supporting-text">System & tenant events log</CardDescription>
            </CardHeader>
            <CardContent className="p-3 sm:p-4">
              <ErrorBoundary compact label="Activity feed">
                <RecentActivity />
              </ErrorBoundary>
            </CardContent>
          </Card>

          {/* Audit Trail */}
          <Card className="enterprise-card">
            <CardHeader className="pb-2 pt-4 px-4 sm:px-5 border-b border-border/40">
              <CardTitle className="card-title-exec flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-success" />
                Operational Audit Log
              </CardTitle>
              <CardDescription className="supporting-text">Manager system activities</CardDescription>
            </CardHeader>
            <CardContent className="p-3 sm:p-4">
              <ManagerActivityLog compact limit={10} />
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default Dashboard;
