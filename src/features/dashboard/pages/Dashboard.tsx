import { Layout } from "@/shared/components/layout/Layout";
import { StatCard } from "@/features/dashboard/components/StatCard";
import { AttentionStrip } from "@/features/dashboard/components/AttentionStrip";
import { ManagerQuickActions } from "@/features/dashboard/components/ManagerQuickActions";
import { ManagerActivationEmpty } from "@/features/dashboard/components/ManagerActivationEmpty";
import ManagerSubscriptionBanner from "@/features/payments/components/ManagerSubscriptionBanner";
import { ManagerBillingRecoveryBanner } from "@/features/payments/components/ManagerPlanStatus";
import { PaymentSetupStatus } from "@/features/settings/components/PaymentSetupStatus";
import { ArrearsHeatMap } from "@/features/dashboard/components/ArrearsHeatMap";
import { OpenMaintenancePreview } from "@/features/dashboard/components/OpenMaintenancePreview";
import { UpcomingPayments } from "@/features/dashboard/components/UpcomingPayments";
import { PropertiesOverview } from "@/features/dashboard/components/PropertiesOverview";
import {
  Home, RefreshCw, DollarSign, Building2, DoorOpen, Plus, BarChart3,
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
import { useLeaseExpiryReminders } from "@/shared/hooks/useLeaseExpiryReminders";
import { useManagerActivation } from "@/features/dashboard/hooks/useManagerActivation";
import { fetchManagerDashboardStats } from "@/features/dashboard/lib/dashboardStats";
import { buildAttentionItems } from "@/features/dashboard/lib/attentionItems";
import { queryKeys, STALE_TIMES } from "@/shared/hooks/useOptimizedQuery";
import managerHeroImage from "@/assets/marketing/property-residential-thumb.webp";

const RevenueChart = lazy(() =>
  import("@/features/dashboard/components/RevenueChart").then((m) => ({ default: m.RevenueChart })),
);
const OccupancyChart = lazy(() =>
  import("@/features/dashboard/components/OccupancyChart").then((m) => ({ default: m.OccupancyChart })),
);
const RecentActivity = lazy(() =>
  import("@/features/dashboard/components/RecentActivity").then((m) => ({ default: m.RecentActivity })),
);

const ChartFallback = () => <Skeleton className="h-72 w-full rounded-xl" />;
const ActivityFallback = () => <Skeleton className="h-64 w-full rounded-xl" />;

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
    [restrictToAssignedProperties, assignedPropertyIds],
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
      title="Dashboard"
      subtitle="Portfolio overview and today's operational priorities."
      headerActions={
        <div className="flex flex-wrap items-center gap-2">
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
            <SelectTrigger className="w-[120px] h-9 text-sm" aria-label="Currency">
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

      {/* Greeting / context hero — compact, with restrained property imagery */}
      <section
        aria-label="Portfolio overview"
        className="relative mb-6 overflow-hidden rounded-xl border border-border bg-card shadow-[0_1px_2px_0_rgb(13_39_68/0.06)]"
      >
        <div className="relative flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div className="min-w-0">
            <p className="meta-text mb-1 uppercase tracking-wider text-muted-foreground">
              Portfolio overview
            </p>
            <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
              {getGreeting()}, <span className="capitalize">{userName}</span>
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {isEmptyPortfolio
                ? `Portfolio setup ${progress.percent}% complete`
                : stats
                  ? `${stats.totalProperties} properties · ${stats.occupiedUnits}/${stats.totalUnits} units occupied`
                  : "A snapshot of how your portfolio is performing today."}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              className="min-h-11"
              onClick={() => navigate("/properties")}
              aria-label="Add property"
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Add property</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="min-h-11"
              onClick={() => navigate("/reports")}
              aria-label="View reports"
            >
              <BarChart3 className="h-4 w-4" />
              <span className="hidden sm:inline">View reports</span>
            </Button>
          </div>
        </div>
        {/* Subtle photographic veil — restrained, preserves readability */}
        <div className="pointer-events-none absolute inset-y-0 right-0 -z-0 hidden h-full w-72 lg:block" aria-hidden>
          <img
            src={managerHeroImage}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover opacity-[0.16]"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-card via-card/85 to-card/10" />
        </div>
      </section>

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
          {/* Portfolio setup nudge — only while onboarding is incomplete; folded in here rather
              than as a permanent section so a fully set-up manager never sees it again. */}
          {!progress.isComplete && (
            <section className="mb-6">
              <ManagerQuickActions includeSetup includeShortcuts={false} />
            </section>
          )}

          {/* Executive KPI row — one unified metric system */}
          <section className="mb-6 min-w-0" aria-labelledby="dashboard-kpi">
            <div className="mb-3">
              <h2 id="dashboard-kpi" className="section-title">Portfolio</h2>
              <p className="supporting-text hidden sm:block">Properties, units, occupancy, and collections from live records</p>
            </div>
            <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
              {loading || !stats
                ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-[5.5rem] rounded-xl" />)
                : (
                  <>
                    <StatCard
                      compact
                      title="Properties"
                      value={String(stats.totalProperties)}
                      change={stats.activeLeases > 0 ? `${stats.activeLeases} active leases` : undefined}
                      changeType="neutral"
                      icon={Building2}
                      iconColor="primary"
                    />
                    <StatCard
                      compact
                      title="Units"
                      value={String(stats.totalUnits)}
                      change={`${stats.occupiedUnits} occupied · ${stats.vacantUnits} vacant`}
                      changeType="neutral"
                      icon={DoorOpen}
                      iconColor="primary"
                    />
                    <StatCard
                      compact
                      title="Occupancy"
                      value={`${stats.occupancyRate}%`}
                      changeType={stats.occupancyRate >= 90 ? "positive" : stats.occupancyRate >= 70 ? "neutral" : "negative"}
                      icon={Home}
                      iconColor={stats.occupancyRate >= 70 ? "success" : "destructive"}
                      progressValue={stats.occupancyRate}
                    />
                    <StatCard
                      compact
                      title="Collections"
                      value={formatCurrency(stats.collectedRent)}
                      change={stats.revenueChange !== 0 ? `${stats.revenueChange > 0 ? "+" : ""}${stats.revenueChange}% vs last month` : "Same as last month"}
                      changeType={stats.revenueChange > 0 ? "positive" : stats.revenueChange < 0 ? "negative" : "neutral"}
                      icon={DollarSign}
                      iconColor="primary"
                    />
                  </>
                )}
            </div>
          </section>

          <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
            <section className="min-w-0 lg:col-span-2" aria-labelledby="dashboard-collections">
              <div className="mb-3">
                <h2 id="dashboard-collections" className="section-title">Collections performance</h2>
                <p className="supporting-text hidden sm:block">Collected versus expected rent, and outstanding balances by property</p>
              </div>
              <div className="grid gap-4">
                {stats && (
                  <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 rounded-xl border border-border bg-card px-4 py-3 card-shadow">
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-success" aria-hidden />
                      <span className="text-sm text-muted-foreground">Collection rate</span>
                      <span className="text-sm font-semibold text-foreground">{stats.collectionRate}%</span>
                    </div>
                    <div className="hidden h-4 w-px bg-border sm:block" aria-hidden />
                    <span className="text-sm text-muted-foreground">
                      {stats.expectedRent > 0
                        ? `${formatCurrency(stats.collectedRent)} collected of ${formatCurrency(stats.expectedRent)} due`
                        : "No expected rent recorded this month"}
                    </span>
                    {stats.revenueChange !== 0 && (
                      <span className="ml-auto text-sm">
                        <span className={stats.revenueChange > 0 ? "text-success" : "text-destructive"}>
                          {stats.revenueChange > 0 ? "▲" : "▼"} {Math.abs(stats.revenueChange)}%
                        </span>{" "}
                        <span className="text-muted-foreground">vs last month</span>
                      </span>
                    )}
                  </div>
                )}
                <ErrorBoundary compact label="Revenue chart">
                  <Suspense fallback={<ChartFallback />}>
                    <RevenueChart />
                  </Suspense>
                </ErrorBoundary>
                <ArrearsHeatMap />
              </div>
            </section>

            <div className="flex min-w-0 flex-col gap-4">
              <section aria-labelledby="dashboard-occupancy">
                <div className="mb-3">
                  <h2 id="dashboard-occupancy" className="section-title">Occupancy</h2>
                  <p className="supporting-text hidden sm:block">Occupied versus vacant units, by property</p>
                </div>
                <ErrorBoundary compact label="Occupancy chart">
                  <Suspense fallback={<ChartFallback />}>
                    <OccupancyChart />
                  </Suspense>
                </ErrorBoundary>
              </section>

              <section aria-labelledby="dashboard-maintenance">
                <div className="mb-3">
                  <h2 id="dashboard-maintenance" className="section-title">Maintenance</h2>
                  <p className="supporting-text hidden sm:block">
                    {stats
                      ? `${stats.openMaintenanceCount} open · ${stats.urgentMaintenanceCount} urgent`
                      : "Open work orders from live requests"}
                  </p>
                </div>
                <OpenMaintenancePreview />
              </section>
            </div>
          </div>

          {/* Needs attention — operational priorities, above the lower modules */}
          <section className="mb-6 min-w-0" aria-labelledby="dashboard-attention">
            <div className="mb-3">
              <h2 id="dashboard-attention" className="section-title">Needs attention</h2>
              <p className="supporting-text hidden sm:block">Live issues only — overdue collections, open maintenance, expiring leases, and pending actions</p>
            </div>
            <AttentionStrip items={attentionItems} loading={loading} />
          </section>

          {/* Properties — compact portfolio table surfaced high */}
          <section className="mb-6 min-w-0" aria-labelledby="dashboard-properties">
            <div className="mb-3">
              <h2 id="dashboard-properties" className="section-title">Property performance</h2>
              <p className="supporting-text hidden sm:block">Occupancy per property from live records</p>
            </div>
            <PropertiesOverview showHeader={false} />
          </section>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <section className="min-w-0" aria-labelledby="dashboard-activity">
              <div className="mb-3">
                <h2 id="dashboard-activity" className="section-title">Recent activity</h2>
                <p className="supporting-text hidden sm:block">Latest tenant, lease, and payment events</p>
              </div>
              <ErrorBoundary compact label="Recent activity">
                <Suspense fallback={<ActivityFallback />}>
                  <RecentActivity showHeader={false} />
                </Suspense>
              </ErrorBoundary>
            </section>

            <section className="min-w-0" aria-labelledby="dashboard-upcoming">
              <div className="mb-3">
                <h2 id="dashboard-upcoming" className="section-title">Upcoming actions</h2>
                <p className="supporting-text hidden sm:block">Pending and overdue invoices from live billing</p>
              </div>
              <UpcomingPayments showHeader={false} />
            </section>
          </div>
        </>
      )}
    </Layout>
  );
};

export default Dashboard;
