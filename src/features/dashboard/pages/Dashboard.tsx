import { Layout } from "@/shared/components/layout/Layout";
import { StatCard } from "@/features/dashboard/components/StatCard";
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
import ManagerOnboarding from "@/features/auth/pages/ManagerOnboarding";
import {
  Users, FileText, CreditCard, Building2, TrendingUp,
  Home, AlertCircle, Zap, Plus, UserPlus, Wrench,
  Droplets, FileSpreadsheet, ArrowRight, RefreshCw,
} from "lucide-react";
import { useEffect, useState, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/features/auth/AuthContext";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { useCurrency } from "@/shared/hooks/useCurrency";
import { toast } from "@/shared/hooks/use-toast";
import { logError } from "@/shared/lib/errorLogger";
import { useManagerScope } from "@/shared/hooks/useManagerScope";
import { useNavigate } from "react-router-dom";
import { cn } from "@/shared/lib/utils";
import { ErrorBoundary } from "@/shared/components/ErrorBoundary";

interface DashboardStats {
  totalTenants: number;
  activeTenants: number;
  inactiveTenants: number;
  newTenantsThisMonth: number;
  activeLeases: number;
  expiringLeases: number;
  revenueMTD: number;
  revenueChange: number;
  totalProperties: number;
  totalUnits: number;
  occupiedUnits: number;
  occupancyRate: number;
  pendingInvoices: number;
  overdueInvoices: number;
  arrearsTotal: number;
}

const quickActions = [
  { label: "Add Property",    icon: Building2,      href: "/properties",    accent: "text-blue-500",    bg: "bg-blue-500/10 border-blue-500/20" },
  { label: "Add Tenant",      icon: UserPlus,       href: "/tenants",       accent: "text-emerald-500", bg: "bg-emerald-500/10 border-emerald-500/20" },
  { label: "New Invoice",     icon: CreditCard,     href: "/billing",       accent: "text-amber-500",   bg: "bg-amber-400/12 border-amber-400/25" },
  { label: "Maintenance",     icon: Wrench,         href: "/maintenance",   accent: "text-violet-500",  bg: "bg-violet-500/10 border-violet-500/20" },
  { label: "Water Billing",   icon: Droplets,       href: "/water-billing", accent: "text-cyan-500",    bg: "bg-cyan-500/10 border-cyan-500/20" },
  { label: "Statements",      icon: FileSpreadsheet,href: "/statements",    accent: "text-rose-500",    bg: "bg-rose-500/10 border-rose-500/20" },
];

const Dashboard = () => {
  const { user } = useAuth();
  const { managerId } = useManagerScope();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState("there");
  const [onboardingDismissed, setOnboardingDismissed] = useState(false);
  const { currency, setCurrency, currencies, formatCurrency } = useCurrency();

  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  };

  const { data: onboardingState, isLoading: agencyLoading } = useQuery({
    queryKey: ['manager-onboarding-state', managerId],
    queryFn: async () => {
      const [agencyRes, propertiesRes, tenantsRes] = await Promise.all([
        supabase.from('agencies').select('id').eq('manager_id', managerId!).maybeSingle(),
        supabase.from('properties').select('id', { count: 'exact', head: true }).eq('manager_id', managerId!),
        supabase.from('tenants').select('id', { count: 'exact', head: true }).eq('manager_id', managerId!),
      ]);
      return {
        hasAgency: !!agencyRes.data,
        hasFootprint: (propertiesRes.count ?? 0) > 0 || (tenantsRes.count ?? 0) > 0,
      };
    },
    enabled: !!managerId,
  });

  const showOnboarding = !agencyLoading && !onboardingDismissed &&
    onboardingState && !onboardingState.hasAgency && !onboardingState.hasFootprint;

  const fetchStats = useCallback(async () => {
    if (!managerId) return;
    try {
      setLoading(true);
      const [profileResult, tenantsResult, activeTenantsResult, inactiveTenantsResult,
        newTenantsResult, activeLeasesResult, expiringLeasesResult, paidInvoicesResult,
        prevMonthResult, pendingInvoicesResult, overdueInvoicesResult, overdueAmountResult,
        propertiesResult] = await Promise.all([
        supabase.from('profiles').select('full_name').eq('id', user!.id).maybeSingle(),
        supabase.from('tenants').select('id', { count: 'exact', head: true }).eq('manager_id', managerId),
        supabase.from('tenants').select('id', { count: 'exact', head: true }).eq('manager_id', managerId).eq('status', 'active'),
        supabase.from('tenants').select('id', { count: 'exact', head: true }).eq('manager_id', managerId).eq('status', 'inactive'),
        supabase.from('tenants').select('id', { count: 'exact', head: true }).eq('manager_id', managerId)
          .gte('created_at', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()),
        supabase.from('leases').select('id', { count: 'exact', head: true }).eq('manager_id', managerId).eq('status', 'active'),
        supabase.from('leases').select('id', { count: 'exact', head: true }).eq('manager_id', managerId).eq('status', 'active')
          .lte('end_date', new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]),
        supabase.from('invoices').select('amount').eq('manager_id', managerId).eq('status', 'paid')
          .gte('paid_date', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]),
        supabase.from('invoices').select('amount').eq('manager_id', managerId).eq('status', 'paid')
          .gte('paid_date', new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1).toISOString().split('T')[0])
          .lt('paid_date', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]),
        supabase.from('invoices').select('id', { count: 'exact', head: true }).eq('manager_id', managerId).eq('status', 'pending'),
        supabase.from('invoices').select('id', { count: 'exact', head: true }).eq('manager_id', managerId).eq('status', 'overdue'),
        supabase.from('invoices').select('balance_due').eq('manager_id', managerId).eq('status', 'overdue'),
        supabase.from('properties').select('id, units:property_units(count), occupied:property_units(count)').eq('manager_id', managerId),
      ]);
      if (profileResult.data?.full_name) setUserName(profileResult.data.full_name.split(' ')[0]);
      const revenueMTD = ((paidInvoicesResult.data as {amount:number}[]) ?? []).reduce((s,i) => s + Number(i.amount), 0);
      const revenuePrev = ((prevMonthResult.data as {amount:number}[]) ?? []).reduce((s,i) => s + Number(i.amount), 0);
      const revenueChange = revenuePrev > 0 ? Math.round(((revenueMTD - revenuePrev) / revenuePrev) * 100) : 0;
      const allProps = (propertiesResult.data as {id:string;units:{count:number}[];occupied:{count:number}[]}[]) ?? [];
      const totalUnits = allProps.reduce((s,p) => s + (p.units?.[0]?.count ?? 0), 0);
      const totalOccupied = allProps.reduce((s,p) => s + (p.occupied?.[0]?.count ?? 0), 0);
      const occupancyRate = totalUnits > 0 ? Math.round((totalOccupied / totalUnits) * 100) : 0;
      setStats({
        totalTenants: tenantsResult.count || 0,
        activeTenants: activeTenantsResult.count || 0,
        inactiveTenants: inactiveTenantsResult.count || 0,
        newTenantsThisMonth: newTenantsResult.count || 0,
        activeLeases: activeLeasesResult.count || 0,
        expiringLeases: expiringLeasesResult.count || 0,
        revenueMTD, revenueChange,
        totalProperties: allProps.length,
        totalUnits, occupiedUnits: totalOccupied, occupancyRate,
        pendingInvoices: pendingInvoicesResult.count || 0,
        overdueInvoices: overdueInvoicesResult.count || 0,
        arrearsTotal: ((overdueAmountResult.data as {balance_due:number}[]) ?? []).reduce((s,i) => s + Number(i.balance_due ?? 0), 0),
      });
    } catch (err) {
      logError('Dashboard.fetchStats', err);
      toast({ title: "Error loading stats", description: "Please refresh the page.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [managerId, user]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchStats();
    const channels = [
      supabase.channel('dash-tenants').on('postgres_changes',{ event:'*',schema:'public',table:'tenants'},fetchStats).subscribe(),
      supabase.channel('dash-leases').on('postgres_changes',{event:'*',schema:'public',table:'leases'},fetchStats).subscribe(),
      supabase.channel('dash-invoices').on('postgres_changes',{event:'*',schema:'public',table:'invoices'},fetchStats).subscribe(),
      supabase.channel('dash-properties').on('postgres_changes',{event:'*',schema:'public',table:'properties'},fetchStats).subscribe(),
    ];
    return () => { channels.forEach(ch => supabase.removeChannel(ch)); };
  }, [fetchStats]);

  return (
    <Layout
      title={`${getGreeting()}, ${userName}`}
      subtitle={stats
        ? `${stats.activeTenants} active tenants · ${stats.totalProperties} properties · ${stats.occupancyRate}% occupancy`
        : "Loading your portfolio…"}
      headerActions={
        <div className="flex items-center gap-2">
          <Button
            variant="ghost" size="icon"
            onClick={() => { queryClient.invalidateQueries(); fetchStats(); }}
            className="h-9 w-9 text-muted-foreground hover:text-foreground"
          >
            // eslint-disable-next-line react-hooks/set-state-in-effect
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
      {showOnboarding && (
        <ManagerOnboarding onComplete={() => {
          setOnboardingDismissed(true);
          queryClient.invalidateQueries({ queryKey: ['manager-onboarding-state'] });
        }} />
      )}

      <PaymentSetupStatus />
      <ManagerSubscriptionBanner compact />

      {/* Demo banner */}
      {user?.email?.includes('@calqulusrms.com') && (
        <div className="mb-5 rounded-xl border border-amber-400/30 bg-amber-400/8 px-4 py-3 flex items-center gap-3">
          <div className="h-2 w-2 rounded-full bg-amber-400 animate-pulse-soft flex-shrink-0" />
          <span className="text-sm text-amber-700 dark:text-amber-300">
            <strong>Demo mode</strong> — browsing sample data. Changes won't persist.
          </span>
        </div>
      )}

      {/* ── KPI Grid ── */}
      <div className="grid gap-3 sm:gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 mb-6">
        {loading
          ? Array.from({length:6}).map((_,i) => <Skeleton key={i} className="h-28 rounded-2xl" />)
          : stats && <>
            <StatCard title="Properties" value={stats.totalProperties.toString()}
              change={`${stats.totalUnits} units`} changeType="neutral" icon={Building2} iconColor="primary" />
            <StatCard title="Tenants" value={stats.totalTenants.toString()}
              change={`${stats.activeTenants} active`}
              changeType={stats.activeTenants > 0 ? "positive" : "neutral"} icon={Users} iconColor="accent" />
            <StatCard title="Occupancy" value={`${stats.occupancyRate}%`}
              change={`${stats.occupiedUnits}/${stats.totalUnits} units`}
              changeType={stats.occupancyRate >= 90 ? "positive" : stats.occupancyRate >= 70 ? "neutral" : "negative"}
              icon={Home} iconColor="success" />
            <StatCard title="Revenue MTD" value={formatCurrency(stats.revenueMTD)}
              change={stats.revenueChange !== 0 ? `${stats.revenueChange > 0 ? "+" : ""}${stats.revenueChange}% vs last month` : "Same as last month"}
              changeType={stats.revenueChange > 0 ? "positive" : stats.revenueChange < 0 ? "negative" : "neutral"}
              icon={TrendingUp} iconColor="warning" />
            <StatCard title="Active Leases" value={stats.activeLeases.toString()}
              change={stats.expiringLeases > 0 ? `${stats.expiringLeases} expiring soon` : "All good"}
              changeType={stats.expiringLeases > 0 ? "neutral" : "positive"} icon={FileText} iconColor="primary" />
            <StatCard title="Invoices Due" value={(stats.pendingInvoices + stats.overdueInvoices).toString()}
              change={stats.overdueInvoices > 0 ? `${stats.overdueInvoices} overdue` : "All on time"}
              changeType={stats.overdueInvoices > 0 ? "negative" : "positive"} icon={CreditCard} iconColor="accent" />
          </>
        }
      </div>

      {/* Arrears alert */}
      {!loading && stats && stats.arrearsTotal > 0 && (
        <div className="mb-6 flex items-center justify-between gap-4 rounded-xl border border-red-200 bg-red-50 dark:border-red-900/40 dark:bg-red-950/20 px-4 py-3">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-red-700 dark:text-red-400">
                {formatCurrency(stats.arrearsTotal)} in outstanding arrears
              </p>
              <p className="text-xs text-red-600/70 dark:text-red-400/60 mt-0.5">
                {stats.overdueInvoices} overdue invoice{stats.overdueInvoices !== 1 ? "s" : ""} need attention
              </p>
            </div>
          </div>
          <Button size="sm" variant="outline"
            className="border-red-200 text-red-700 hover:bg-red-100 dark:border-red-800 dark:text-red-400 shrink-0"
            onClick={() => navigate("/billing?filter=overdue")}>
            View All <ArrowRight className="h-3.5 w-3.5 ml-1" />
          </Button>
        </div>
      )}

      {/* ── Quick Actions ── */}
      <Card className="mb-6">
        <CardContent className="p-4 sm:p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 rounded-md bg-amber-400/15 border border-amber-400/25 flex items-center justify-center">
                <Zap className="h-3.5 w-3.5 text-amber-500" />
              </div>
              <span className="text-sm font-semibold text-foreground">Quick Actions</span>
            </div>
            <Button variant="ghost" size="sm" onClick={() => navigate("/properties")}
              className="text-xs text-muted-foreground h-7 gap-1">
              <Plus className="h-3 w-3" />New
            </Button>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 sm:gap-3">
            {quickActions.map(a => (
              <button key={a.label} onClick={() => navigate(a.href)}
                className={cn(
                  "group flex flex-col items-center gap-2 p-3 sm:p-4 rounded-xl border transition-all duration-200",
                  "hover:-translate-y-0.5 hover:shadow-md active:scale-95 touch-manipulation",
                  a.bg
                )}>
                <div className="h-9 w-9 rounded-xl bg-background/80 border border-border/60 flex items-center justify-center shadow-sm transition-transform duration-200 group-hover:scale-110">
                  <a.icon className={cn("h-4 w-4", a.accent)} />
                </div>
                <p className="text-xs font-semibold text-foreground text-center leading-tight">{a.label}</p>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* ── Charts ── */}
      <div className="grid gap-4 sm:gap-6 grid-cols-1 lg:grid-cols-2 mb-6">
        <ErrorBoundary compact label="Revenue chart"><RevenueChart /></ErrorBoundary>
        <ErrorBoundary compact label="Occupancy chart"><OccupancyChart /></ErrorBoundary>
      </div>

      {/* ── Portfolio Overview ── */}
      <div className="grid gap-4 sm:gap-6 grid-cols-1 lg:grid-cols-2 mb-6">
        <PropertiesOverview />
        <TenantsOverview />
      </div>

      {/* ── Activity + Payments ── */}
      <div className="grid gap-4 sm:gap-6 grid-cols-1 lg:grid-cols-3 mb-6">
        <div className="lg:col-span-2 space-y-4 sm:space-y-6">
          <ErrorBoundary compact label="Activity feed"><RecentActivity /></ErrorBoundary>
          <ErrorBoundary compact label="Upcoming payments"><UpcomingPayments /></ErrorBoundary>
        </div>
        <div>
          <ManagerActivityLog compact limit={15} />
        </div>
      </div>

      {/* ── Deposit Refunds ── */}
      <PendingDepositRefunds />
    </Layout>
  );
};

export default Dashboard;
