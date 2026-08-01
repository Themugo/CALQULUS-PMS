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
import { ArrearsHeatMap } from "@/features/dashboard/components/ArrearsHeatMap";
import {
  Users, FileText, CreditCard, Building2, TrendingUp,
  Home, AlertCircle, Zap, Plus, UserPlus, Wrench,
  Droplets, FileSpreadsheet, ArrowRight, RefreshCw,
  CheckCircle2, Clock, Calendar, BarChart3, ShieldCheck,
  DollarSign, Activity, CheckSquare, Sparkles, Filter
} from "lucide-react";
import { useEffect, useState, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/features/auth/AuthContext";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/shared/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";
import { useCurrency } from "@/shared/hooks/useCurrency";
import { toast } from "@/shared/hooks/use-toast";
import { logError } from "@/shared/lib/errorLogger";
import { useManagerScope } from "@/shared/hooks/useManagerScope";
import { useNavigate } from "react-router-dom";
import { cn } from "@/shared/lib/utils";
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
  totalProperties: number;
  totalUnits: number;
  occupiedUnits: number;
  occupancyRate: number;
  pendingInvoices: number;
  overdueInvoices: number;
  arrearsTotal: number;
}

const quickActions = [
  { label: "Add Property", icon: Building2, href: "/properties", accent: "text-[hsl(214_73%_48%)]", bg: "bg-[hsl(214_73%_48%/0.08)] border-[hsl(214_73%_48%/0.2)]" },
  { label: "Add Tenant", icon: UserPlus, href: "/tenants", accent: "text-emerald-500", bg: "bg-emerald-500/10 border-emerald-500/20" },
  { label: "New Invoice", icon: CreditCard, href: "/billing", accent: "text-amber-500", bg: "bg-amber-400/12 border-amber-400/25" },
  { label: "Maintenance", icon: Wrench, href: "/maintenance", accent: "text-[hsl(38_52%_42%)]", bg: "bg-[hsl(38_52%_42%/0.1)] border-[hsl(38_52%_42%/0.2)]" },
  { label: "Water Billing", icon: Droplets, href: "/water-billing", accent: "text-[hsl(195_60%_42%)]", bg: "bg-[hsl(195_60%_42%/0.1)] border-[hsl(195_60%_42%/0.2)]" },
  { label: "Statements", icon: FileSpreadsheet, href: "/statements", accent: "text-[hsl(218_58%_40%)]", bg: "bg-[hsl(218_58%_40%/0.1)] border-[hsl(218_58%_40%/0.2)]" },
];

const Dashboard = () => {
  const { user } = useAuth();
  const { managerId } = useManagerScope();
  useLeaseExpiryReminders();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState("there");
  const [onboardingDismissed, setOnboardingDismissed] = useState(false);
  const { currency, setCurrency, currencies, formatCurrency } = useCurrency();
  const [activeTab, setActiveTab] = useState("overview");

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

  const userId = user?.id;

  const fetchStats = useCallback(async () => {
    if (!managerId || !userId) return;
    try {
      setLoading(true);
      const [profileResult, tenantsResult, activeTenantsResult, inactiveTenantsResult,
        newTenantsResult, activeLeasesResult, expiringLeasesResult, paidInvoicesResult,
        prevMonthResult, pendingInvoicesResult, overdueInvoicesResult, overdueAmountResult,
        propertiesResult] = await Promise.all([
        supabase.from('profiles').select('full_name').eq('id', userId).maybeSingle(),
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
  }, [managerId, userId]);

  useEffect(() => {
    fetchStats();
    const channels = [
      supabase.channel('dash-tenants').on('postgres_changes',{ event:'*',schema:'public',table:'tenants'},fetchStats).subscribe(),
      supabase.channel('dash-leases').on('postgres_changes',{event:'*',schema:'public',table:'leases'},fetchStats).subscribe(),
      supabase.channel('dash-invoices').on('postgres_changes',{event:'*',schema:'public',table:'invoices'},fetchStats).subscribe(),
      supabase.channel('dash-properties').on('postgres_changes',{event:'*',schema:'public',table:'properties'},fetchStats).subscribe(),
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

  const { data: tenantSparkData } = useQuery({
    queryKey: ['tenant-sparkline-7d', managerId],
    queryFn: async () => {
      if (!managerId) return { counts: [], labels: [] };
      const days = Array.from({ length: 7 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (6 - i));
        return d;
      });
      const results = await Promise.all(
        days.map(d => {
          const start = new Date(d); start.setHours(0, 0, 0, 0);
          const end   = new Date(d); end.setHours(23, 59, 59, 999);
          return supabase
            .from('tenants')
            .select('id', { count: 'exact', head: true })
            .eq('manager_id', managerId)
            .gte('created_at', start.toISOString())
            .lte('created_at', end.toISOString());
        })
      );
      const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      return {
        counts: results.map(r => r.count ?? 0),
        labels: days.map(d => DAY_LABELS[d.getDay()]),
      };
    },
    enabled: !!managerId,
    staleTime: 5 * 60 * 1000,
  });

  // Query for pending maintenance items (What requires attention)
  const { data: pendingMaintenanceCount = 0 } = useQuery({
    queryKey: ['dashboard-pending-maintenance', managerId],
    queryFn: async () => {
      if (!managerId) return 0;
      const { count } = await supabase
        .from('maintenance_requests')
        .select('id', { count: 'exact', head: true })
        .eq('manager_id', managerId)
        .in('status', ['pending', 'open', 'in_progress']);
      return count ?? 0;
    },
    enabled: !!managerId,
  });

  // Query for pending deposit refund requests (What needs approval)
  const { data: pendingDepositRefundsCount = 0 } = useQuery({
    queryKey: ['dashboard-pending-deposit-refunds-count', managerId],
    queryFn: async () => {
      if (!managerId) return 0;
      const { count } = await supabase
        .from('deposit_refunds')
        .select('id', { count: 'exact', head: true })
        .eq('manager_id', managerId)
        .eq('status', 'pending');
      return count ?? 0;
    },
    enabled: !!managerId,
  });

  return (
    <Layout
      title={`${getGreeting()}, ${userName}`}
      subtitle={stats
        ? `Executive Command Center · ${stats.activeTenants} Active Tenants · ${stats.totalProperties} Properties · ${stats.occupancyRate}% Occupancy`
        : "Loading operational command center…"}
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
        <div className="mb-4 rounded-xl border border-amber-400/30 bg-amber-400/8 px-4 py-2.5 flex items-center gap-3">
          <div className="h-2 w-2 rounded-full bg-amber-400 animate-pulse-soft flex-shrink-0" />
          <span className="text-xs text-amber-700 dark:text-amber-300">
            <strong>Demo mode</strong> — browsing sample property data. Changes won't persist.
          </span>
        </div>
      )}

      {/* ── EXECUTIVE COMMAND MATRIX (ANSWERS 4 CORE QUESTIONS) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        {/* 1. What requires attention? */}
        <Card className="border-l-4 border-l-red-500 border-border/70 bg-card hover:shadow-md transition-all">
          <CardContent className="p-3.5">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-red-600 dark:text-red-400 flex items-center gap-1.5">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                What Requires Attention?
              </span>
              <Badge variant="outline" className="text-[10px] h-4 border-red-200 text-red-700 dark:text-red-400">
                {(stats?.overdueInvoices ?? 0) + (stats?.expiringLeases ?? 0) + pendingMaintenanceCount} Issues
              </Badge>
            </div>
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground truncate">Overdue Arrears:</span>
                <span className="font-semibold text-red-600 dark:text-red-400">
                  {loading ? "..." : formatCurrency(stats?.arrearsTotal ?? 0)}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground truncate">Overdue Invoices:</span>
                <span className="font-medium text-foreground">
                  {loading ? "..." : `${stats?.overdueInvoices ?? 0} invoices`}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground truncate">Expiring Leases (30d):</span>
                <span className="font-medium text-amber-600 dark:text-amber-400">
                  {loading ? "..." : `${stats?.expiringLeases ?? 0} leases`}
                </span>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/billing?filter=overdue")}
              className="mt-2 w-full h-7 text-[11px] justify-between text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 p-0 px-2"
            >
              <span>Resolve Arrears</span>
              <ArrowRight className="h-3 w-3" />
            </Button>
          </CardContent>
        </Card>

        {/* 2. What needs approval? */}
        <Card className="border-l-4 border-l-amber-500 border-border/70 bg-card hover:shadow-md transition-all">
          <CardContent className="p-3.5">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                <CheckSquare className="h-3.5 w-3.5 shrink-0" />
                What Needs Approval?
              </span>
              <Badge variant="outline" className="text-[10px] h-4 border-amber-300 text-amber-700 dark:text-amber-400">
                {pendingDepositRefundsCount} Pending
              </Badge>
            </div>
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground truncate">Deposit Refunds:</span>
                <span className="font-semibold text-foreground">
                  {pendingDepositRefundsCount} pending
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground truncate">Maintenance Requests:</span>
                <span className="font-medium text-foreground">
                  {pendingMaintenanceCount} open
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground truncate">Pending Invoices:</span>
                <span className="font-medium text-foreground">
                  {loading ? "..." : `${stats?.pendingInvoices ?? 0} due`}
                </span>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/maintenance")}
              className="mt-2 w-full h-7 text-[11px] justify-between text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30 p-0 px-2"
            >
              <span>Manage Approvals</span>
              <ArrowRight className="h-3 w-3" />
            </Button>
          </CardContent>
        </Card>

        {/* 3. What generates revenue? */}
        <Card className="border-l-4 border-l-emerald-500 border-border/70 bg-card hover:shadow-md transition-all">
          <CardContent className="p-3.5">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                <DollarSign className="h-3.5 w-3.5 shrink-0" />
                What Generates Revenue?
              </span>
              <Badge variant="outline" className="text-[10px] h-4 border-emerald-300 text-emerald-700 dark:text-emerald-400">
                {stats?.occupancyRate ?? 0}% Occupied
              </Badge>
            </div>
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground truncate">Revenue MTD:</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">
                  {loading ? "..." : formatCurrency(stats?.revenueMTD ?? 0)}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground truncate">Occupied Units:</span>
                <span className="font-medium text-foreground">
                  {loading ? "..." : `${stats?.occupiedUnits ?? 0} / ${stats?.totalUnits ?? 0}`}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground truncate">Revenue Growth:</span>
                <span className={cn(
                  "font-semibold",
                  (stats?.revenueChange ?? 0) >= 0 ? "text-emerald-600" : "text-red-500"
                )}>
                  {loading ? "..." : `${(stats?.revenueChange ?? 0) >= 0 ? "+" : ""}${stats?.revenueChange ?? 0}% MoM`}
                </span>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/reports")}
              className="mt-2 w-full h-7 text-[11px] justify-between text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 p-0 px-2"
            >
              <span>Financial Reports</span>
              <ArrowRight className="h-3 w-3" />
            </Button>
          </CardContent>
        </Card>

        {/* 4. What happened today? */}
        <Card className="border-l-4 border-l-sky-500 border-border/70 bg-card hover:shadow-md transition-all">
          <CardContent className="p-3.5">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-sky-600 dark:text-sky-400 flex items-center gap-1.5">
                <Activity className="h-3.5 w-3.5 shrink-0" />
                What Happened Today?
              </span>
              <Badge variant="outline" className="text-[10px] h-4 border-sky-300 text-sky-700 dark:text-sky-400">
                Live Log
              </Badge>
            </div>
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground truncate">New Tenants MTD:</span>
                <span className="font-semibold text-sky-600 dark:text-sky-400">
                  +{stats?.newTenantsThisMonth ?? 0} joined
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground truncate">Active Leases:</span>
                <span className="font-medium text-foreground">
                  {stats?.activeLeases ?? 0} active
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground truncate">Properties Monitored:</span>
                <span className="font-medium text-foreground">
                  {stats?.totalProperties ?? 0} total
                </span>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/tenants")}
              className="mt-2 w-full h-7 text-[11px] justify-between text-sky-600 dark:text-sky-400 hover:bg-sky-50 dark:hover:bg-sky-950/30 p-0 px-2"
            >
              <span>View Roster</span>
              <ArrowRight className="h-3 w-3" />
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* ── KPI GRID ── */}
      <div className="grid gap-3 sm:gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 mb-5">
        {loading
          ? Array.from({length:6}).map((_,i) => <Skeleton key={i} className="h-28 rounded-2xl" />)
          : stats && <>
            <StatCard title="Properties" value={stats.totalProperties.toString()}
              change={`${stats.totalUnits} units`} changeType="neutral" icon={Building2} iconColor="primary" />
            <StatCard title="Tenants" value={stats.totalTenants.toString()}
              change={`+${stats.newTenantsThisMonth} this month`}
              changeType={stats.newTenantsThisMonth > 0 ? "positive" : "neutral"} icon={Users} iconColor="accent"
              sparkData={tenantSparkData?.counts}
              sparkLabels={tenantSparkData?.labels} />
            <StatCard title="Occupancy" value={`${stats.occupancyRate}%`}
              change={`${stats.occupiedUnits}/${stats.totalUnits} units`}
              changeType={stats.occupancyRate >= 90 ? "positive" : stats.occupancyRate >= 70 ? "neutral" : "negative"}
              icon={Home} iconColor="success" progressValue={stats.occupancyRate} />
            <StatCard title="Revenue MTD" value={formatCurrency(stats.revenueMTD)}
              change={stats.revenueChange !== 0 ? `${stats.revenueChange > 0 ? "+" : ""}${stats.revenueChange}% vs last month` : "Same as last month"}
              changeType={stats.revenueChange > 0 ? "positive" : stats.revenueChange < 0 ? "negative" : "neutral"}
              icon={TrendingUp} iconColor="warning" />
            <StatCard title="Active Leases" value={stats.activeLeases.toString()}
              change={stats.expiringLeases > 0 ? `${stats.expiringLeases} expiring soon` : "All good"}
              changeType={stats.expiringLeases > 0 ? "neutral" : "positive"} icon={FileText} iconColor="primary"
              sparkData={leaseExpiryData?.counts}
              sparkLabels={leaseExpiryData?.labels}
              sparkUnit="lease"
              sparkCaption="expiring next 4 weeks" />
            <StatCard title="Invoices Due" value={(stats.pendingInvoices + stats.overdueInvoices).toString()}
              change={stats.overdueInvoices > 0 ? `${stats.overdueInvoices} overdue` : "All on time"}
              changeType={stats.overdueInvoices > 0 ? "negative" : "positive"} icon={CreditCard} iconColor="accent" />
          </>
        }
      </div>

      {/* ── ARREARS URGENT ALERT BAR ── */}
      {!loading && stats && stats.arrearsTotal > 0 && (
        <div className="mb-5 flex items-center justify-between gap-4 rounded-xl border border-red-200 bg-red-50 dark:border-red-900/40 dark:bg-red-950/20 px-4 py-3">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-red-700 dark:text-red-400">
                {formatCurrency(stats.arrearsTotal)} in outstanding arrears
              </p>
              <p className="text-xs text-red-600/70 dark:text-red-400/60 mt-0.5">
                {stats.overdueInvoices} overdue invoice{stats.overdueInvoices !== 1 ? "s" : ""} need immediate collection follow-up
              </p>
            </div>
          </div>
          <Button size="sm" variant="outline"
            className="border-red-200 text-red-700 hover:bg-red-100 dark:border-red-800 dark:text-red-400 shrink-0"
            onClick={() => navigate("/billing?filter=overdue")}>
            View Overdue Invoices <ArrowRight className="h-3.5 w-3.5 ml-1" />
          </Button>
        </div>
      )}

      {/* ── ARREARS HEAT MAP (IF OVERDUE EXIST) ── */}
      {!loading && stats && stats.overdueInvoices > 0 && <ArrearsHeatMap />}

      {/* ── MAIN WORKSPACE SECTION (12-COLUMN RESPONSIVE LAYOUT) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 mb-6">
        {/* Left Column (8 cols): Analytics, Approvals & Operations */}
        <div className="lg:col-span-8 space-y-5">

          {/* 1. Financial & Occupancy Analytics Module */}
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
              <Badge variant="outline" className="text-[11px] text-muted-foreground hidden sm:inline-flex">
                Real-time Analytics Engine
              </Badge>
            </div>

            <TabsContent value="overview" className="mt-0">
              <ErrorBoundary compact label="Revenue chart"><RevenueChart /></ErrorBoundary>
            </TabsContent>
            <TabsContent value="occupancy" className="mt-0">
              <ErrorBoundary compact label="Occupancy chart"><OccupancyChart /></ErrorBoundary>
            </TabsContent>
          </Tabs>

          {/* 2. Operational Approvals & Tasks Hub */}
          <Card className="border-border/60">
            <CardHeader className="pb-3 pt-4 px-4 sm:px-5 border-b border-border/40">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <CheckSquare className="h-4 w-4 text-amber-500" />
                    Operational Approvals & Action Desk
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Pending deposit refunds, lease renewals, and tenant actions
                  </CardDescription>
                </div>
                <Badge variant="secondary" className="text-xs">
                  {pendingDepositRefundsCount} Pending Approvals
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-4 sm:p-5 space-y-4">
              {/* Deposit Refunds component */}
              <PendingDepositRefunds />
            </CardContent>
          </Card>

          {/* 3. Portfolio & Tenant Roster Desk */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <PropertiesOverview />
            <TenantsOverview />
          </div>

          {/* 4. Upcoming Payments & Collection Forecast */}
          <ErrorBoundary compact label="Upcoming payments">
            <UpcomingPayments />
          </ErrorBoundary>

        </div>

        {/* Right Column (4 cols): Quick Actions, Activity Feed & Calendar */}
        <div className="lg:col-span-4 space-y-5">

          {/* Quick Actions Panel */}
          <Card className="border-border/60">
            <CardHeader className="pb-2 pt-4 px-4 sm:px-5">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Zap className="h-4 w-4 text-amber-500" />
                  Executive Actions
                </CardTitle>
                <Button variant="ghost" size="sm" onClick={() => navigate("/properties")} className="text-xs h-7 px-2">
                  <Plus className="h-3 w-3 mr-1" />New
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-3 sm:p-4">
              <div className="grid grid-cols-2 gap-2">
                {quickActions.map(a => (
                  <button key={a.label} onClick={() => navigate(a.href)}
                    className={cn(
                      "group flex flex-col items-start gap-1.5 p-3 rounded-xl border transition-all duration-200",
                      "hover:-translate-y-0.5 hover:shadow-sm active:scale-98 touch-manipulation text-left",
                      a.bg
                    )}>
                    <div className="h-7 w-7 rounded-lg bg-background/90 border border-border/60 flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
                      <a.icon className={cn("h-3.5 w-3.5", a.accent)} />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-foreground leading-snug">{a.label}</p>
                    </div>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Activity Feed ("What happened today?") */}
          <Card className="border-border/60">
            <CardHeader className="pb-2 pt-4 px-4 sm:px-5 border-b border-border/40">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Activity className="h-4 w-4 text-sky-500" />
                Live Activity Feed
              </CardTitle>
              <CardDescription className="text-xs">System & tenant events log</CardDescription>
            </CardHeader>
            <CardContent className="p-3 sm:p-4">
              <ErrorBoundary compact label="Activity feed">
                <RecentActivity />
              </ErrorBoundary>
            </CardContent>
          </Card>

          {/* Audit Trail & Manager Actions */}
          <Card className="border-border/60">
            <CardHeader className="pb-2 pt-4 px-4 sm:px-5 border-b border-border/40">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-emerald-500" />
                Operational Audit Log
              </CardTitle>
              <CardDescription className="text-xs">Manager system activities</CardDescription>
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
