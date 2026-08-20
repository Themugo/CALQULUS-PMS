import { Layout } from "@/shared/components/layout/Layout";
import { StatCard } from "@/features/dashboard/components/StatCard";
import { ManagerQuickActions } from "@/features/dashboard/components/ManagerQuickActions";
import { ManagerActivationEmpty } from "@/features/dashboard/components/ManagerActivationEmpty";
import ManagerSubscriptionBanner from "@/features/payments/components/ManagerSubscriptionBanner";
import { ManagerBillingRecoveryBanner } from "@/features/payments/components/ManagerPlanStatus";
import { PaymentSetupStatus } from "@/features/settings/components/PaymentSetupStatus";
import { ArrearsHeatMap } from "@/features/dashboard/components/ArrearsHeatMap";
import { OpenMaintenancePreview } from "@/features/dashboard/components/OpenMaintenancePreview";
import {
  Home, RefreshCw, DollarSign, Wrench, CheckCircle2, ArrowRight, Building2, DoorOpen, Plus,
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
const RecentActivity = lazy(() =>
  import("@/features/dashboard/components/RecentActivity").then((m) => ({ default: m.RecentActivity })),
);

const ChartFallback = () => <Skeleton className="h-72 w-full rounded-xl" />;
const ActivityFallback = () => <Skeleton className="h-64 w-full rounded-xl" />;

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
      title={`${getGreeting()}, ${userName}`}
      subtitle={isEmptyPortfolio
        ? `Portfolio setup ${progress.percent}% complete — add a property to collect rent`
        : stats
          ? `${stats.totalProperties} properties · ${stats.occupiedUnits}/${stats.totalUnits} occupied · ${formatCurrency(stats.collectedRent)} collected this month`
          : "What needs attention, how the portfolio is performing, and what to do next"}
      headerActions={
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            className="min-h-11"
            onClick={() => navigate("/properties")}
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Add property</span>
          </Button>
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
          {/* 1. Attention — real overdue payments, urgent maintenance, expiring leases */}
          <section className="mb-6">
            <div className="mb-3">
              <h2 className="section-title">Attention</h2>
              <p className="supporting-text hidden sm:block">Only live issues — overdue collections, urgent repairs, refunds, and expiring leases</p>
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

          {/* Portfolio setup nudge — only while onboarding is incomplete; folded in here rather
              than as a permanent section so a fully set-up manager never sees it again. */}
          {!progress.isComplete && (
            <section className="mb-6">
              <ManagerQuickActions includeSetup includeShortcuts={false} />
            </section>
          )}

          {/* 2. Portfolio health — the four numbers that summarise the whole book */}
          <section className="mb-6">
            <div className="mb-3">
              <h2 className="section-title">Portfolio</h2>
              <p className="supporting-text hidden sm:block">Properties, units, occupancy, and collections from live records</p>
            </div>
            <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
              {loading || !stats
                ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-lg" />)
                : (
                  <>
                    <StatCard
                      title="Properties"
                      value={String(stats.totalProperties)}
                      icon={Building2}
                      iconColor="primary"
                    />
                    <StatCard
                      title="Units"
                      value={String(stats.totalUnits)}
                      change={`${stats.occupiedUnits} occupied · ${stats.vacantUnits} vacant`}
                      changeType="neutral"
                      icon={DoorOpen}
                      iconColor="primary"
                    />
                    <StatCard
                      title="Occupancy"
                      value={`${stats.occupancyRate}%`}
                      changeType={stats.occupancyRate >= 90 ? "positive" : stats.occupancyRate >= 70 ? "neutral" : "negative"}
                      icon={Home}
                      iconColor={stats.occupancyRate >= 70 ? "success" : "destructive"}
                      progressValue={stats.occupancyRate}
                    />
                    <StatCard
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

          {/* 3. Occupancy — per-property breakdown behind the headline rate */}
          <section className="mb-6">
            <div className="mb-3">
              <h2 className="section-title">Occupancy</h2>
              <p className="supporting-text hidden sm:block">Occupied versus vacant units, by property</p>
            </div>
            <ErrorBoundary compact label="Occupancy chart">
              <Suspense fallback={<ChartFallback />}>
                <OccupancyChart />
              </Suspense>
            </ErrorBoundary>
          </section>

          {/* 4. Collections — financial performance: trend plus who owes what */}
          <section className="mb-6">
            <div className="mb-3">
              <h2 className="section-title">Collections</h2>
              <p className="supporting-text hidden sm:block">Collected versus expected rent, and outstanding balances by property</p>
            </div>
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
              <ErrorBoundary compact label="Revenue chart">
                <Suspense fallback={<ChartFallback />}>
                  <RevenueChart />
                </Suspense>
              </ErrorBoundary>
              <ArrearsHeatMap />
            </div>
          </section>

          {/* 5. Maintenance — operations */}
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

          {/* 6. Recent activity */}
          <section className="mb-2">
            <div className="mb-3">
              <h2 className="section-title">Recent activity</h2>
              <p className="supporting-text hidden sm:block">Latest tenant, lease, and payment events</p>
            </div>
            <ErrorBoundary compact label="Recent activity">
              <Suspense fallback={<ActivityFallback />}>
                <RecentActivity />
              </Suspense>
            </ErrorBoundary>
          </section>
        </>
      )}
    </Layout>
  );
};

export default Dashboard;
