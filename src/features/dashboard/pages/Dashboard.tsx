import { Layout } from "@/shared/components/layout/Layout";
import { StatCard } from "@/features/dashboard/components/StatCard";
import { ManagerQuickActions } from "@/features/dashboard/components/ManagerQuickActions";
import { ManagerActivationEmpty } from "@/features/dashboard/components/ManagerActivationEmpty";
import ManagerSubscriptionBanner from "@/features/payments/components/ManagerSubscriptionBanner";
import { ManagerBillingRecoveryBanner } from "@/features/payments/components/ManagerPlanStatus";
import { PaymentSetupStatus } from "@/features/settings/components/PaymentSetupStatus";
import { RecentActivity } from "@/features/dashboard/components/RecentActivity";
import { ArrearsHeatMap } from "@/features/dashboard/components/ArrearsHeatMap";
import { OpenMaintenancePreview } from "@/features/dashboard/components/OpenMaintenancePreview";
import {
  Home, RefreshCw, PieChart, DollarSign, Building2, FileText, Users, CheckCircle2, ArrowRight,
} from "lucide-react";
import { lazy, Suspense, useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/features/auth/AuthContext";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { Button } from "@/shared/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { useCurrency } from "@/shared/hooks/useCurrency";
import { useManagerScope } from "@/shared/hooks/useManagerScope";
import { useNavigate } from "react-router-dom";
import { ErrorBoundary } from "@/shared/components/ErrorBoundary";
import { ErrorState } from "@/shared/components/ui/error-state";
import { EmptyState } from "@/shared/components/ui/empty-state";
import { useLeaseExpiryReminders } from "@/shared/hooks/useLeaseExpiryReminders";
import { useManagerActivation } from "@/features/dashboard/hooks/useManagerActivation";
import { fetchManagerDashboardStats } from "@/features/dashboard/lib/dashboardStats";
import { buildAttentionItems } from "@/features/dashboard/lib/attentionItems";
import { queryKeys, STALE_TIMES } from "@/shared/hooks/useOptimizedQuery";
import { cn } from "@/shared/lib/utils";

const RevenueChart = lazy(() =>
  import("@/features/dashboard/components/RevenueChart").then((m) => ({ default: m.RevenueChart })),
);
const OccupancyChart = lazy(() =>
  import("@/features/dashboard/components/OccupancyChart").then((m) => ({ default: m.OccupancyChart })),
);

const ChartFallback = () => <Skeleton className="h-72 w-full rounded-xl" />;

const TONE_BAR: Record<string, string> = {
  danger: "bg-destructive",
  warning: "bg-warning",
  info: "bg-primary",
};

const Dashboard = () => {
  const { user } = useAuth();
  const { managerId, restrictToAssignedProperties, assignedPropertyIds } = useManagerScope();
  const assignedKey = assignedPropertyIds.join(",");
  useLeaseExpiryReminders();
  const { isEmptyPortfolio, progress } = useManagerActivation();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { currency, setCurrency, currencies, formatCurrency } = useCurrency();

  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  };

  const userId = user?.id;
  const statsScope = useMemo(
    () => ({
      restrictToAssignedProperties,
      assignedPropertyIds,
    }),
    [restrictToAssignedProperties, assignedPropertyIds, assignedKey],
  );

  const {
    data: stats = null,
    isPending: loading,
    isError: statsError,
    refetch: refetchStats,
  } = useQuery({
    queryKey: [...queryKeys.dashboard.stats(managerId ?? ""), assignedKey],
    queryFn: () => fetchManagerDashboardStats(managerId!, statsScope),
    enabled: !!managerId,
    staleTime: STALE_TIMES.frequentlyChanging,
    gcTime: 5 * 60 * 1000,
  });

  const { data: profile } = useQuery({
    queryKey: queryKeys.profile.detail(userId ?? ""),
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("full_name").eq("id", userId).maybeSingle();
      return data;
    },
    enabled: !!userId,
    staleTime: STALE_TIMES.profile,
  });

  const userName = profile?.full_name?.split(" ")[0] || "there";
  const attentionItems = useMemo(
    () => (stats ? buildAttentionItems(stats, formatCurrency) : []),
    [stats, formatCurrency],
  );

  const refreshStats = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.stats(managerId ?? "") });
    void refetchStats();
  };

  useEffect(() => {
    if (!managerId) return;
    const invalidate = () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.stats(managerId) });
    };
    const channels = [
      supabase.channel("dash-tenants").on("postgres_changes", { event: "*", schema: "public", table: "tenants" }, invalidate).subscribe(),
      supabase.channel("dash-leases").on("postgres_changes", { event: "*", schema: "public", table: "leases" }, invalidate).subscribe(),
      supabase.channel("dash-invoices").on("postgres_changes", { event: "*", schema: "public", table: "invoices" }, invalidate).subscribe(),
      supabase.channel("dash-properties").on("postgres_changes", { event: "*", schema: "public", table: "properties" }, invalidate).subscribe(),
      supabase.channel("dash-maint").on("postgres_changes", { event: "*", schema: "public", table: "maintenance_requests" }, invalidate).subscribe(),
      supabase.channel("dash-refunds").on("postgres_changes", { event: "*", schema: "public", table: "deposit_refunds" }, invalidate).subscribe(),
    ];
    return () => { channels.forEach((ch) => supabase.removeChannel(ch)); };
  }, [managerId, queryClient]);

  return (
    <Layout
      title={`${getGreeting()}, ${userName}`}
      subtitle={isEmptyPortfolio
        ? `Portfolio setup ${progress.percent}% complete — add a property to collect rent`
        : stats
          ? `${stats.totalProperties} properties · ${stats.occupiedUnits}/${stats.totalUnits} occupied · ${formatCurrency(stats.collectedRent)} collected this month`
          : "What needs attention, how the portfolio is performing, and what to do next"}
      headerActions={
        <div className="flex items-center gap-2">
          <Button
            variant="ghost" size="sm"
            onClick={refreshStats}
            className="min-h-11 min-w-11 h-11 w-11 text-muted-foreground hover:text-foreground"
            title="Refresh operational stats"
            aria-label="Refresh operational stats"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Select value={currency} onValueChange={setCurrency}>
            <SelectTrigger className="w-[120px] h-9 text-sm">
              <SelectValue placeholder="Currency" />
            </SelectTrigger>
            <SelectContent>
              {currencies.map((c) => (
                <SelectItem key={c.code} value={c.code}>{c.symbol} {c.code}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      }
    >
      {!isEmptyPortfolio && <PaymentSetupStatus />}
      <ManagerSubscriptionBanner compact />
      <ManagerBillingRecoveryBanner />

      {user?.email?.includes("@calqulusrms.com") && (
        <div className="mb-4 rounded-xl border border-warning/30 bg-warning/10 px-4 py-2.5 flex items-center gap-3">
          <div className="h-2 w-2 rounded-full bg-warning animate-pulse-soft flex-shrink-0" />
          <span className="text-xs text-warning font-medium">
            <strong>Demo mode</strong> — browsing sample property data. Changes won't persist.
          </span>
        </div>
      )}

      {statsError && !loading && (
        <div className="mb-5">
          <ErrorState
            title="Couldn't load dashboard metrics"
            message="A connection issue prevented loading your latest stats."
            onRetry={refreshStats}
          />
        </div>
      )}

      {isEmptyPortfolio && !loading ? (
        <ManagerActivationEmpty />
      ) : (
        <>
          {/* 1. Attention / priority actions */}
          <section className="mb-6">
            <div className="mb-3">
              <h2 className="section-title">Needs your attention</h2>
              <p className="supporting-text hidden sm:block">Only live issues — overdue collections, urgent repairs, refunds, and vacancies</p>
            </div>
            {loading ? (
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
              </div>
            ) : attentionItems.length === 0 ? (
              <EmptyState
                icon={CheckCircle2}
                title="Nothing needs attention"
                description="No overdue invoices, urgent repairs, pending refunds, or expiring leases right now."
              />
            ) : (
              <div className="rounded-xl border border-border bg-card divide-y divide-border overflow-hidden">
                {attentionItems.map((item) => (
                  <div key={item.id} className="flex flex-col sm:flex-row sm:items-center gap-3 px-4 py-3">
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <span className={cn("mt-1.5 h-2 w-2 rounded-full shrink-0", TONE_BAR[item.tone])} />
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-foreground">{item.label}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{item.detail}</p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      className={cn(
                        "min-h-11 shrink-0",
                        item.tone === "danger" ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : "",
                      )}
                      onClick={() => navigate(item.href)}
                    >
                      {item.cta}
                      <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* 2. Portfolio health */}
          <section className="mb-6">
            <div className="mb-3">
              <h2 className="section-title">Portfolio health</h2>
              <p className="supporting-text hidden sm:block">Properties, occupancy, leases, and tenants from live records</p>
            </div>
            <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
              {loading || !stats
                ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)
                : (
                  <>
                    <StatCard
                      title="Properties"
                      value={String(stats.totalProperties)}
                      change={`${stats.totalUnits} units`}
                      changeType="neutral"
                      icon={Building2}
                      iconColor="neutral"
                    />
                    <StatCard
                      title="Occupancy"
                      value={`${stats.occupancyRate}%`}
                      change={`${stats.occupiedUnits} occupied · ${stats.vacantUnits} vacant`}
                      changeType={stats.occupancyRate >= 90 ? "positive" : stats.occupancyRate >= 70 ? "neutral" : "negative"}
                      icon={Home}
                      iconColor={stats.occupancyRate >= 70 ? "success" : "destructive"}
                      progressValue={stats.occupancyRate}
                    />
                    <StatCard
                      title="Active leases"
                      value={String(stats.activeLeases)}
                      change={stats.expiringLeases > 0 ? `${stats.expiringLeases} expiring in 30 days` : "None expiring in 30 days"}
                      changeType={stats.expiringLeases > 0 ? "negative" : "positive"}
                      icon={FileText}
                      iconColor="neutral"
                    />
                    <StatCard
                      title="Active tenants"
                      value={String(stats.activeTenants)}
                      change={stats.newTenantsThisMonth > 0 ? `${stats.newTenantsThisMonth} new this month` : "No new tenants this month"}
                      changeType="neutral"
                      icon={Users}
                      iconColor="neutral"
                    />
                  </>
                )}
            </div>
          </section>

          {/* 3. Occupancy */}
          <section className="mb-6">
            <div className="mb-3">
              <h2 className="section-title">Occupancy</h2>
              <p className="supporting-text hidden sm:block">Occupied versus vacant units by property</p>
            </div>
            <ErrorBoundary compact label="Occupancy chart">
              <Suspense fallback={<ChartFallback />}>
                <OccupancyChart />
              </Suspense>
            </ErrorBoundary>
          </section>

          {/* 4. Collections */}
          <section className="mb-6">
            <div className="mb-3">
              <h2 className="section-title">Collections</h2>
              <p className="supporting-text hidden sm:block">Collected rent versus expected this month, from paid invoices</p>
            </div>
            <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-3 mb-4">
              {loading || !stats
                ? Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)
                : (
                  <>
                    <StatCard
                      title="Collected this month"
                      value={formatCurrency(stats.collectedRent)}
                      change={stats.revenueChange !== 0 ? `${stats.revenueChange > 0 ? "+" : ""}${stats.revenueChange}% vs last month` : "Same as last month"}
                      changeType={stats.revenueChange > 0 ? "positive" : stats.revenueChange < 0 ? "negative" : "neutral"}
                      icon={DollarSign}
                      iconColor="primary"
                    />
                    <StatCard
                      title="Expected this month"
                      value={formatCurrency(stats.expectedRent)}
                      change={`${stats.pendingInvoices} pending invoice${stats.pendingInvoices === 1 ? "" : "s"}`}
                      changeType="neutral"
                      icon={FileText}
                      iconColor="neutral"
                    />
                    <StatCard
                      title="Collection rate"
                      value={`${stats.collectionRate}%`}
                      change={`Of ${formatCurrency(stats.expectedRent)} expected`}
                      changeType={stats.collectionRate >= 90 ? "positive" : stats.collectionRate >= 75 ? "neutral" : "negative"}
                      icon={PieChart}
                      iconColor={stats.collectionRate >= 90 ? "success" : stats.collectionRate >= 75 ? "warning" : "destructive"}
                      progressValue={stats.collectionRate}
                    />
                  </>
                )}
            </div>
            <ErrorBoundary compact label="Revenue chart">
              <Suspense fallback={<ChartFallback />}>
                <RevenueChart />
              </Suspense>
            </ErrorBoundary>
          </section>

          {/* 5. Outstanding balances */}
          <section className="mb-6">
            <div className="mb-3">
              <h2 className="section-title">Outstanding balances</h2>
              <p className="supporting-text hidden sm:block">Overdue invoices grouped by property</p>
            </div>
            <ArrearsHeatMap />
          </section>

          {/* 6. Maintenance */}
          <section className="mb-6">
            <div className="mb-3">
              <h2 className="section-title">Maintenance</h2>
              <p className="supporting-text hidden sm:block">
                {stats
                  ? `${stats.openMaintenanceCount} open · ${stats.urgentMaintenanceCount} urgent`
                  : "Open work orders from live requests"}
              </p>
            </div>
            <OpenMaintenancePreview />
          </section>

          {/* 7. Recent activity */}
          <section className="mb-6">
            <div className="mb-3">
              <h2 className="section-title">Recent activity</h2>
              <p className="supporting-text hidden sm:block">Latest tenant and operations events</p>
            </div>
            <ErrorBoundary compact label="Activity feed">
              <RecentActivity showHeader={false} />
            </ErrorBoundary>
          </section>

          {/* 8. Quick actions / next step */}
          <section className="mb-2">
            <div className="mb-3">
              <h2 className="section-title">What to do next</h2>
              <p className="supporting-text hidden sm:block">
                {progress.isComplete
                  ? "Jump to the operational screens you use every day"
                  : progress.nextAction?.description ?? "Finish portfolio setup, then jump into daily operations"}
              </p>
            </div>
            <ManagerQuickActions includeSetup={!progress.isComplete} includeShortcuts />
          </section>
        </>
      )}
    </Layout>
  );
};

export default Dashboard;
