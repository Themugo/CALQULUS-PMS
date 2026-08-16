import { format } from "date-fns";
import React, { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/features/auth/AuthContext';
import { isDevAccessEnabled } from '@/features/auth/lib/devAccess';
import { useToast } from '@/shared/hooks/use-toast';
import { Button } from '@/shared/components/ui/button';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Badge } from '@/shared/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/shared/components/ui/dialog';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Textarea } from '@/shared/components/ui/textarea';
import { Progress } from '@/shared/components/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/shared/components/ui/tooltip';
import { Skeleton } from '@/shared/components/ui/skeleton';
import {
  LogOut, Building2, FileText,
  Clock, CheckCircle, AlertCircle,
  Banknote, PieChart, MessageSquare,
  Settings, BarChart3, CheckSquare, Activity, RefreshCw,
  AlertTriangle, Wrench, ArrowRight, Shield, Home, CreditCard, Wallet
} from 'lucide-react';
import LandlordBankDetails from '@/features/landlord/components/LandlordBankDetails';
import LandlordFinancialStatement from '@/features/landlord/components/LandlordFinancialStatement';
import LandlordMessages from '@/features/landlord/components/LandlordMessages';
import LandlordPropertyDetail from '@/features/landlord/components/LandlordPropertyDetail';
import LandlordNotificationPreferences from '@/features/landlord/components/LandlordNotificationPreferences';
import LandlordDocuments from '@/features/landlord/components/LandlordDocuments';
import LandlordTeamSettings from '@/features/landlord/components/LandlordTeamSettings';
import { StatCard } from '@/features/dashboard/components/StatCard';
import calqulusLogo from '@/assets/calqulus-logo-new.jpg';

interface PropertySummary {
  id: string;
  name: string;
  address: string;
  units: number;
  occupied: number;
  vacant: number;
  revenue: number;
  expectedRent: number;
  collectedRent: number;
  outstandingArrears: number;
  revenue_share_pct: number;
  manager_id: string | null;
  manager_name: string | null;
  manager_email: string | null;
  assigned_at: string;
  openMaintenance: number;
}

interface PayoutRequest {
  id: string;
  property_id: string;
  property_name?: string;
  amount: number;
  period_start: string;
  period_end: string;
  notes: string | null;
  status: 'pending' | 'approved' | 'paid' | 'rejected';
  created_at: string;
  approved_at: string | null;
  paid_at: string | null;
}

interface LandlordActivity {
  id: string;
  type: string;
  description: string;
  timestamp: string;
  propertyName?: string;
}

const fmt = (n: number, currency = 'KES') =>
  new Intl.NumberFormat('en-KE', { style: 'currency', currency, minimumFractionDigits: 0 }).format(n);

const getGreeting = () => {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
};

const statusColors: Record<string, string> = {
  pending: 'bg-warning/15 text-warning border-warning/30',
  approved: 'bg-info/15 text-info border-info/30',
  paid: 'bg-success/15 text-success border-success/30',
  rejected: 'bg-destructive/15 text-destructive border-destructive/30',
};

const LandlordDashboard = () => {
  const { user, userRole, signOut, loading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [payoutDialogOpen, setPayoutDialogOpen] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState<string>('');
  const [payoutAmount, setPayoutAmount] = useState('');
  const [payoutPeriodStart, setPayoutPeriodStart] = useState('');
  const [payoutPeriodEnd, setPayoutPeriodEnd] = useState('');
  const [payoutNotes, setPayoutNotes] = useState('');
  const [detailPropertyId, setDetailPropertyId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('properties');

  // ── Fetch landlord's properties & deep portfolio analytics ─────────
  const { data: portfolioData, isLoading: propertiesLoading, isError: portfolioError, refetch: refetchPortfolio } = useQuery({
    queryKey: ['landlord-portfolio-deep', user?.id],
    queryFn: async () => {
      if (!user) return null;

      // 1. Get linked properties
      const { data: links, error: linksErr } = await supabase
        .from('property_landlords')
        .select('property_id, revenue_share_pct, manager_id, assigned_at')
        .eq('landlord_user_id', user.id);

      if (linksErr) throw linksErr;
      if (!links || links.length === 0) {
        return {
          properties: [] as PropertySummary[],
          totalProperties: 0,
          totalUnits: 0,
          totalOccupied: 0,
          totalVacant: 0,
          occupancyRate: 0,
          totalExpectedRent: 0,
          totalCollectedRent: 0,
          totalArrears: 0,
          netLandlordShareMTD: 0,
          activeLeasesCount: 0,
          expiringLeasesCount: 0,
          openMaintenanceCount: 0,
          urgentMaintenanceCount: 0,
          activities: [] as LandlordActivity[],
        };
      }

      const propertyIds = links.map((l: { property_id: string }) => l.property_id);

      // Dates for current month
      const firstOfThisMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
      const endOfThisMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().split('T')[0];
      const thirtyDaysAhead = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];

      // Parallel data fetching for landlord's properties
      const [
        propsResult,
        unitsResult,
        invoicesThisMonthResult,
        overdueInvoicesResult,
        leasesResult,
        maintenanceResult,
        profilesResult
      ] = await Promise.all([
        supabase.from('properties').select('id, name, address, units, occupied, revenue').in('id', propertyIds),
        supabase.from('units').select('id, property_id, status, rent_amount').in('property_id', propertyIds),
        supabase.from('invoices').select('property_id, amount, status, paid_date, due_date').in('property_id', propertyIds).gte('due_date', firstOfThisMonth).lte('due_date', endOfThisMonth),
        supabase.from('invoices').select('property_id, balance_due, amount').in('property_id', propertyIds).eq('status', 'overdue'),
        supabase.from('leases').select('id, property_id, status, end_date, rent_amount').in('property_id', propertyIds).eq('status', 'active'),
        supabase.from('maintenance_requests').select('id, property_id, status, priority, title, created_at').in('property_id', propertyIds).in('status', ['open', 'pending', 'in_progress']),
        supabase.from('profiles').select('id, full_name, email').in('id', links.filter((l: { manager_id: string | null }) => l.manager_id).map((l: { manager_id: string }) => l.manager_id))
      ]);

      const props = propsResult.data || [];
      const units = unitsResult.data || [];
      const invoicesThisMonth = invoicesThisMonthResult.data || [];
      const overdueInvoices = overdueInvoicesResult.data || [];
      const leases = leasesResult.data || [];
      const maintenance = maintenanceResult.data || [];
      const profiles = profilesResult.data || [];

      // Per-property aggregation maps
      const unitStatsMap: Record<string, { total: number; occupied: number; vacant: number }> = {};
      units.forEach(u => {
        if (!unitStatsMap[u.property_id]) unitStatsMap[u.property_id] = { total: 0, occupied: 0, vacant: 0 };
        unitStatsMap[u.property_id].total++;
        if (u.status === 'occupied') unitStatsMap[u.property_id].occupied++;
        else unitStatsMap[u.property_id].vacant++;
      });

      const collectedMap: Record<string, number> = {};
      const expectedMap: Record<string, number> = {};
      invoicesThisMonth.forEach(inv => {
        if (inv.status === 'paid') {
          collectedMap[inv.property_id] = (collectedMap[inv.property_id] || 0) + Number(inv.amount || 0);
        }
        expectedMap[inv.property_id] = (expectedMap[inv.property_id] || 0) + Number(inv.amount || 0);
      });

      const arrearsMap: Record<string, number> = {};
      overdueInvoices.forEach(inv => {
        arrearsMap[inv.property_id] = (arrearsMap[inv.property_id] || 0) + Number(inv.balance_due || 0);
      });

      const maintCountMap: Record<string, number> = {};
      maintenance.forEach(m => {
        maintCountMap[m.property_id] = (maintCountMap[m.property_id] || 0) + 1;
      });

      // Construct property summary list
      const propertiesList: PropertySummary[] = props.map(p => {
        const link = links.find((l: { property_id: string }) => l.property_id === p.id) as { revenue_share_pct: number; manager_id: string | null; assigned_at: string };
        const mgr = profiles.find((pr: { id: string }) => pr.id === link?.manager_id);
        const uStats = unitStatsMap[p.id];
        
        const totalUnits = uStats?.total ?? p.units;
        const totalOccupied = uStats?.occupied ?? p.occupied;
        const totalVacant = uStats?.vacant ?? Math.max(0, totalUnits - totalOccupied);

        // Fallback expected rent from active leases if invoice query is 0
        let expRent = expectedMap[p.id] || 0;
        if (expRent === 0) {
          expRent = leases.filter(l => l.property_id === p.id).reduce((s, l) => s + Number(l.rent_amount || 0), 0);
        }

        const collRent = collectedMap[p.id] || Number(p.revenue || 0);
        const arrears = arrearsMap[p.id] || 0;

        return {
          id: p.id,
          name: p.name,
          address: p.address,
          units: totalUnits,
          occupied: totalOccupied,
          vacant: totalVacant,
          revenue: collRent,
          expectedRent: expRent,
          collectedRent: collRent,
          outstandingArrears: arrears,
          revenue_share_pct: link?.revenue_share_pct ?? 100,
          manager_id: link?.manager_id ?? null,
          manager_name: mgr?.full_name ?? null,
          manager_email: mgr?.email ?? null,
          assigned_at: link?.assigned_at,
          openMaintenance: maintCountMap[p.id] || 0,
        };
      });

      // Global aggregates
      const totalUnits = propertiesList.reduce((s, p) => s + p.units, 0);
      const totalOccupied = propertiesList.reduce((s, p) => s + p.occupied, 0);
      const totalVacant = propertiesList.reduce((s, p) => s + p.vacant, 0);
      const occupancyRate = totalUnits > 0 ? Math.round((totalOccupied / totalUnits) * 100) : 0;

      const totalExpectedRent = propertiesList.reduce((s, p) => s + p.expectedRent, 0);
      const totalCollectedRent = propertiesList.reduce((s, p) => s + p.collectedRent, 0);
      const totalArrears = propertiesList.reduce((s, p) => s + p.outstandingArrears, 0);
      const netLandlordShareMTD = propertiesList.reduce((s, p) => s + (p.collectedRent * p.revenue_share_pct / 100), 0);

      const activeLeasesCount = leases.length;
      const expiringLeasesCount = leases.filter(l => l.end_date && l.end_date <= thirtyDaysAhead).length;

      const openMaintenanceCount = maintenance.length;
      const urgentMaintenanceCount = maintenance.filter(m => m.priority === 'high' || m.priority === 'urgent').length;

      // Activity events for landlord properties
      const propNameMap = new Map(props.map(p => [p.id, p.name]));
      const activities: LandlordActivity[] = [
        ...maintenance.slice(0, 5).map(m => ({
          id: `maint-${m.id}`,
          type: 'maintenance',
          description: `Maintenance request: ${m.title}`,
          timestamp: m.created_at,
          propertyName: propNameMap.get(m.property_id),
        })),
        ...leases.slice(0, 5).map(l => ({
          id: `lease-${l.id}`,
          type: 'lease',
          description: `Active lease ending ${l.end_date ? format(new Date(l.end_date), 'dd/MM/yyyy') : 'N/A'}`,
          timestamp: new Date().toISOString(),
          propertyName: propNameMap.get(l.property_id),
        })),
      ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 8);

      return {
        properties: propertiesList,
        totalProperties: propertiesList.length,
        totalUnits,
        totalOccupied,
        totalVacant,
        occupancyRate,
        totalExpectedRent,
        totalCollectedRent,
        totalArrears,
        netLandlordShareMTD,
        activeLeasesCount,
        expiringLeasesCount,
        openMaintenanceCount,
        urgentMaintenanceCount,
        activities,
      };
    },
    enabled: !!user && userRole?.role === 'landlord',
  });

  const properties = portfolioData?.properties ?? [];

  // ── Fetch payout requests ────────────────────────────────────────
  const { data: payouts = [], isLoading: payoutsLoading, isError: payoutsError, refetch: refetchPayouts } = useQuery({
    queryKey: ['landlord-payouts', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('payout_requests')
        .select('*')
        .eq('landlord_user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      const rows = (data || []) as Array<{ id: string; property_id: string; amount: number; period_start: string; period_end: string; notes: string | null; status: string; created_at: string; approved_at: string | null; paid_at: string | null }>;

      const propIds = [...new Set(rows.map((r) => r.property_id))];
      const propNames: Record<string, string> = {};
      if (propIds.length > 0) {
        const { data: ps } = await supabase.from('properties').select('id, name').in('id', propIds);
        (ps || []).forEach((p: { id: string; name: string }) => { propNames[p.id] = p.name; });
      }

      return rows.map((r) => ({ ...r, property_name: propNames[r.property_id] ?? 'Property' })) as PayoutRequest[];
    },
    enabled: !!user && userRole?.role === 'landlord',
  });

  // ── Create payout request ────────────────────────────────────────
  const createPayout = useMutation({
    mutationFn: async () => {
      if (!user) {
        throw new Error('You must be signed in to request a payout');
      }
      if (!selectedProperty || !payoutAmount || !payoutPeriodStart || !payoutPeriodEnd) {
        throw new Error('All fields are required');
      }
      const prop = properties.find(p => p.id === selectedProperty);
      const managerId = prop?.manager_id ?? null;
      const recipientType = managerId ? 'manager' : 'webhost';
      const { error } = await supabase
        .from('payout_requests')
        .insert({
          property_id: selectedProperty,
          landlord_user_id: user.id,
          manager_id: managerId,
          recipient_type: recipientType,
          amount: Number(payoutAmount),
          period_start: payoutPeriodStart,
          period_end: payoutPeriodEnd,
          notes: payoutNotes || null,
          status: 'pending',
        });
      if (error) throw error;
    },
    onSuccess: () => {
      const prop = properties.find(p => p.id === selectedProperty);
      const isManaged = !!prop?.manager_id;
      toast({
        title: 'Payout request submitted',
        description: isManaged
          ? 'Your property manager will review and approve it.'
          : 'The platform admin will review and approve it.',
      });
      queryClient.invalidateQueries({ queryKey: ['landlord-payouts'] });
      setPayoutDialogOpen(false);
      setPayoutAmount('');
      setPayoutPeriodStart('');
      setPayoutPeriodEnd('');
      setPayoutNotes('');
      setSelectedProperty('');
    },
    onError: (err: Error) => toast({ title: 'Failed', description: err.message, variant: 'destructive' }),
  });

  const pendingPayouts = payouts.filter(p => p.status === 'pending').length;
  const totalPaidOut = payouts.filter(p => p.status === 'paid').reduce((s, p) => s + p.amount, 0);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!isDevAccessEnabled() && (!user || userRole?.role !== 'landlord')) {
    return <Navigate to="/landlord/login" replace />;
  }

  const landlordName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Landlord';

  return (
    <div className="landlord-portal min-h-screen bg-background text-foreground">
      {/* Header — compact light header */}
      <header className="sticky top-0 z-40 border-b border-border bg-card/95 backdrop-blur-xl">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <img src={calqulusLogo} alt="CALQULUS PMS" className="h-9 w-auto object-contain flex-shrink-0" />
            <div className="min-w-0">
              <div className="font-heading font-bold text-sm text-gradient leading-none">CALQULUS PMS</div>
              <div className="text-[10px] text-muted-foreground tracking-wider uppercase">Landlord Workspace</div>
            </div>
            <Badge variant="outline" className="ml-1 text-xs border-primary/30 text-primary bg-primary/10">
              <Shield className="h-3 w-3 mr-1" />Property Owner
            </Badge>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="hidden sm:flex flex-col items-end min-w-0 max-w-[180px]">
              <span className="text-xs font-semibold text-foreground truncate">{landlordName}</span>
              <span className="text-[10px] text-muted-foreground truncate">{user?.email}</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => queryClient.invalidateQueries()}
              className="h-9 w-9 p-0 text-muted-foreground hover:text-primary"
              title="Refresh Portfolio"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={signOut} className="h-9 text-muted-foreground border border-border/60 hover:text-primary">
              <LogOut className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Sign out</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">

        {/* ── PORTFOLIO DATA ERROR BANNER (distinguish ERROR from REAL ZERO) ── */}
        {portfolioError && !propertiesLoading && (
          <div className="flex items-center justify-between gap-4 rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-destructive">Couldn't load your portfolio</p>
                <p className="supporting-text text-destructive/80 mt-0.5">
                  A connection issue prevented loading your portfolio data. Please retry.
                </p>
              </div>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="border-destructive/30 text-destructive hover:bg-destructive/10 shrink-0"
              onClick={() => refetchPortfolio()}
            >
              <RefreshCw className="h-3.5 w-3.5 mr-1" /> Retry
            </Button>
          </div>
        )}

        {/* ── EXECUTIVE PAGE HEADER BAND (light) ── */}
        <div className="enterprise-card p-5 sm:p-6 relative overflow-hidden">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 relative z-10">
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-primary">
                  CALQULUS PMS
                </span>
                <span className="h-3 w-px bg-border" />
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Landlord Workspace
                </span>
              </div>
              <h1 className="page-title text-foreground">
                {getGreeting()}, {landlordName}
              </h1>
              <p className="supporting-text mt-1">
                {portfolioData
                  ? `Portfolio overview · ${portfolioData.totalProperties} properties · ${portfolioData.totalUnits} units · ${portfolioData.occupancyRate}% occupied`
                  : propertiesLoading
                    ? "Loading your portfolio overview…"
                    : "Your portfolio overview will appear here."}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              {portfolioData && (
                <>
                  <span className="status-badge status-success">
                    <Home className="h-3 w-3" /> {portfolioData.occupancyRate}% Occupied
                  </span>
                  <span className="status-badge status-neutral">
                    <Wallet className="h-3 w-3" /> KES
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* ── EXECUTIVE KPI GRID (single, consolidated) ── */}
        <div>
          <h2 className="section-title mb-3">Portfolio & Financial Metrics</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <StatCard
              title="Portfolio Properties"
              value={propertiesLoading ? '—' : String(portfolioData?.totalProperties ?? 0)}
              change={propertiesLoading ? undefined : `${portfolioData?.totalUnits ?? 0} units · ${portfolioData?.totalVacant ?? 0} vacant`}
              changeType="neutral"
              icon={Building2}
              iconColor="primary"
            />
            <StatCard
              title="Portfolio Occupancy"
              value={propertiesLoading ? '—' : `${portfolioData?.occupancyRate ?? 0}%`}
              change={propertiesLoading ? undefined : `${portfolioData?.totalOccupied ?? 0} of ${portfolioData?.totalUnits ?? 0} occupied`}
              changeType="positive"
              icon={PieChart}
              iconColor="success"
              progressValue={propertiesLoading ? undefined : portfolioData?.occupancyRate}
            />
            <StatCard
              title="Net Share (MTD)"
              value={propertiesLoading ? '—' : fmt(portfolioData?.netLandlordShareMTD ?? 0)}
              change="Your portion of collected rent"
              changeType="positive"
              icon={Wallet}
              iconColor="success"
            />
            <StatCard
              title="Total Paid Out"
              value={payoutsLoading ? '—' : fmt(totalPaidOut)}
              change={payoutsLoading ? undefined : `${pendingPayouts} request${pendingPayouts !== 1 ? 's' : ''} pending`}
              changeType={pendingPayouts > 0 ? 'neutral' : 'positive'}
              icon={Banknote}
              iconColor="primary"
            />
          </div>
        </div>

        {/* ── ATTENTION / ACTION CENTER ── */}
        <div>
          <h2 className="section-title mb-3">Attention Center</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* 1. Critical — overdue arrears (RED) */}
            <div className="enterprise-card p-4 hover:shadow-md transition-all">
              <div className="flex items-center justify-between mb-3">
                <span className="status-badge status-danger">
                  <AlertCircle className="h-3 w-3 shrink-0" />
                  Requires Attention
                </span>
                <span className="meta-text font-semibold">
                  {propertiesLoading ? <Skeleton className="h-4 w-10" /> : `${(portfolioData?.totalArrears ?? 0) > 0 ? 1 : 0 + (portfolioData?.urgentMaintenanceCount ?? 0)} issue${((portfolioData?.totalArrears ?? 0) > 0 ? 1 : 0 + (portfolioData?.urgentMaintenanceCount ?? 0)) !== 1 ? 's' : ''}`}
                </span>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="supporting-text">Total arrears</span>
                  <span className="supporting-text font-bold text-destructive">
                    {propertiesLoading ? <Skeleton className="h-4 w-16" /> : fmt(portfolioData?.totalArrears ?? 0)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="supporting-text">Expected rent (MTD)</span>
                  <span className="supporting-text font-semibold">
                    {propertiesLoading ? <Skeleton className="h-4 w-16" /> : fmt(portfolioData?.totalExpectedRent ?? 0)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="supporting-text">Uncollected</span>
                  <span className="supporting-text font-semibold text-warning">
                    {propertiesLoading ? <Skeleton className="h-4 w-16" /> : fmt(Math.max(0, (portfolioData?.totalExpectedRent ?? 0) - (portfolioData?.totalCollectedRent ?? 0)))}
                  </span>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setActiveTab('financials')}
                className="mt-3 w-full h-8 supporting-text font-semibold justify-between text-destructive hover:bg-destructive/10"
              >
                <span>View financial breakdown</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </div>

            {/* 2. Warning — pending approvals & expiring leases (AMBER) */}
            <div className="enterprise-card p-4 hover:shadow-md transition-all">
              <div className="flex items-center justify-between mb-3">
                <span className="status-badge status-warning">
                  <CheckSquare className="h-3 w-3 shrink-0" />
                  Pending & Expiring
                </span>
                <span className="meta-text font-semibold">
                  {propertiesLoading || payoutsLoading ? <Skeleton className="h-4 w-12" /> : `${pendingPayouts + (portfolioData?.expiringLeasesCount ?? 0)} pending`}
                </span>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="supporting-text">Pending payouts</span>
                  <span className="supporting-text font-semibold text-warning">
                    {payoutsLoading ? <Skeleton className="h-4 w-12" /> : `${pendingPayouts} awaiting`}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="supporting-text">Expiring leases (30d)</span>
                  <span className="supporting-text font-semibold">
                    {propertiesLoading ? <Skeleton className="h-4 w-12" /> : `${portfolioData?.expiringLeasesCount ?? 0} leases`}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="supporting-text">Collected (MTD)</span>
                  <span className="supporting-text font-semibold text-success">
                    {propertiesLoading ? <Skeleton className="h-4 w-16" /> : fmt(portfolioData?.totalCollectedRent ?? 0)}
                  </span>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setActiveTab('payouts')}
                className="mt-3 w-full h-8 supporting-text font-semibold justify-between text-warning hover:bg-warning/10"
              >
                <span>Review payout requests</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </div>

            {/* 3. Healthy — occupancy & active leases (GREEN) */}
            <div className="enterprise-card p-4 hover:shadow-md transition-all">
              <div className="flex items-center justify-between mb-3">
                <span className="status-badge status-success">
                  <Home className="h-3 w-3 shrink-0" />
                  Portfolio Health
                </span>
                <span className="meta-text font-semibold">
                  {propertiesLoading ? <Skeleton className="h-4 w-12" /> : `${portfolioData?.occupancyRate ?? 0}% occupied`}
                </span>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="supporting-text">Occupied units</span>
                  <span className="supporting-text font-semibold text-success">
                    {propertiesLoading ? <Skeleton className="h-4 w-14" /> : `${portfolioData?.totalOccupied ?? 0} of ${portfolioData?.totalUnits ?? 0}`}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="supporting-text">Active leases</span>
                  <span className="supporting-text font-semibold">
                    {propertiesLoading ? <Skeleton className="h-4 w-10" /> : `${portfolioData?.activeLeasesCount ?? 0} active`}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="supporting-text">Collection rate</span>
                  <span className="supporting-text font-semibold text-success">
                    {propertiesLoading || !portfolioData?.totalExpectedRent ? <Skeleton className="h-4 w-10" /> : `${Math.min(100, Math.round(((portfolioData?.totalCollectedRent ?? 0) / (portfolioData?.totalExpectedRent || 1)) * 100))}%`}
                  </span>
                </div>
              </div>
            </div>

            {/* 4. Informational — maintenance (BLUE) */}
            <div className="enterprise-card p-4 hover:shadow-md transition-all">
              <div className="flex items-center justify-between mb-3">
                <span className="status-badge status-info">
                  <Wrench className="h-3 w-3 shrink-0" />
                  Maintenance
                </span>
                <span className="meta-text font-semibold">
                  {propertiesLoading ? <Skeleton className="h-4 w-12" /> : `${portfolioData?.openMaintenanceCount ?? 0} open`}
                </span>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="supporting-text">Open repairs</span>
                  <span className="supporting-text font-semibold">
                    {propertiesLoading ? <Skeleton className="h-4 w-10" /> : `${portfolioData?.openMaintenanceCount ?? 0} requests`}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="supporting-text">Urgent / high</span>
                  <span className={`supporting-text font-semibold ${(portfolioData?.urgentMaintenanceCount ?? 0) > 0 ? 'text-destructive' : 'text-success'}`}>
                    {propertiesLoading ? <Skeleton className="h-4 w-10" /> : `${portfolioData?.urgentMaintenanceCount ?? 0} urgent`}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="supporting-text">Total paid out</span>
                  <span className="supporting-text font-semibold">
                    {payoutsLoading ? <Skeleton className="h-4 w-16" /> : fmt(totalPaidOut)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── ARREARS URGENT ALERT BAR ── */}
        {!propertiesLoading && portfolioData && portfolioData.totalArrears > 0 && (
          <div className="flex items-center justify-between gap-4 rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-destructive">
                  {fmt(portfolioData.totalArrears)} in outstanding arrears across your portfolio
                </p>
                <p className="supporting-text text-destructive/80 mt-0.5">
                  Your property manager is handling collection efforts for these accounts.
                </p>
              </div>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="border-destructive/30 text-destructive hover:bg-destructive/10 shrink-0"
              onClick={() => setActiveTab('financials')}
            >
              View Financial Breakdown <ArrowRight className="h-3.5 w-3.5 ml-1" />
            </Button>
          </div>
        )}

        {/* ── WORKSPACE TABS ── */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="animate-fade-in">
          <TabsList className="mb-6 flex-wrap h-auto gap-1 p-1 bg-muted/60 border border-border/60">
            <TabsTrigger value="properties" className="gap-1.5 text-xs">
              <Building2 className="h-3.5 w-3.5" />My Properties
            </TabsTrigger>
            <TabsTrigger value="financials" className="gap-1.5 text-xs">
              <BarChart3 className="h-3.5 w-3.5" />Financial Performance
            </TabsTrigger>
            <TabsTrigger value="payouts" className="gap-1.5 text-xs">
              <CreditCard className="h-3.5 w-3.5" />
              Payout Requests
              {pendingPayouts > 0 && (
                <Badge className="ml-1 h-4 min-w-4 text-xs px-1 bg-warning/15 text-warning border-warning/30">{pendingPayouts}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="activity" className="gap-1.5 text-xs">
              <Activity className="h-3.5 w-3.5" />Recent Activity
            </TabsTrigger>
            <TabsTrigger value="messages" className="gap-1.5 text-xs">
              <MessageSquare className="h-3.5 w-3.5" />Messages
            </TabsTrigger>
            <TabsTrigger value="documents" className="gap-1.5 text-xs">
              <FileText className="h-3.5 w-3.5" />Documents
            </TabsTrigger>
            <TabsTrigger value="settings" className="gap-1.5 text-xs">
              <Settings className="h-3.5 w-3.5" />Bank & Settings
            </TabsTrigger>
          </TabsList>

          {/* ── Properties Tab ── */}
          <TabsContent value="properties" className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="section-title">Property Portfolio</h2>
              {!propertiesLoading && properties.length > 0 && (
                <span className="meta-text font-semibold">
                  {properties.length} {properties.length === 1 ? 'property' : 'properties'}
                </span>
              )}
            </div>
            {propertiesLoading ? (
              Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-28 w-full rounded-xl" />)
            ) : properties.length === 0 ? (
              <Card className="border-border/60 bg-card">
                <CardContent className="py-12 text-center space-y-4">
                  <Building2 className="h-12 w-12 mx-auto text-muted-foreground/30 mb-2" />
                  <div>
                    <h3 className="font-semibold text-foreground">No properties in your portfolio yet</h3>
                    <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
                      To see your properties and revenue, your property manager needs to link them to your account.
                    </p>
                  </div>
                  <div className="rounded-lg border border-border bg-secondary-background p-4 text-left max-w-sm mx-auto space-y-2">
                    <p className="text-xs font-semibold text-foreground uppercase tracking-wide">Next steps</p>
                    <ol className="text-sm text-muted-foreground space-y-1">
                      <li className="flex gap-2"><span className="font-bold shrink-0 text-primary">1.</span>Share your account email with your property manager</li>
                      <li className="flex gap-2"><span className="font-bold shrink-0 text-primary">2.</span>They will link your properties from their portal</li>
                      <li className="flex gap-2"><span className="font-bold shrink-0 text-primary">3.</span>You will receive access immediately</li>
                    </ol>
                    <p className="text-xs text-muted-foreground pt-1">Your email: <strong className="text-foreground">{user?.email}</strong></p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              properties.map(prop => {
                const occRate = prop.units > 0 ? Math.round((prop.occupied / prop.units) * 100) : 0;
                const barColor = occRate >= 80 ? 'bg-success' : occRate >= 50 ? 'bg-warning' : 'bg-destructive';
                const textColor = occRate >= 80 ? 'text-success' : occRate >= 50 ? 'text-warning' : 'text-destructive';
                return (
                  <React.Fragment key={prop.id}>
                    <Card className="enterprise-card hover:shadow-md transition-shadow">
                      <CardContent className="p-5">
                        <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <h3 className="card-title-exec truncate text-foreground">{prop.name}</h3>
                              <Badge variant="outline" className="text-xs shrink-0 border-primary/30 text-primary bg-primary/10">
                                <Wallet className="h-3 w-3 mr-1" />{prop.revenue_share_pct}% share
                              </Badge>
                              {prop.outstandingArrears > 0 ? (
                                <Badge variant="outline" className="text-xs shrink-0 border-destructive/30 text-destructive bg-destructive/10">
                                  <AlertCircle className="h-3 w-3 mr-1" />Arrears
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-xs shrink-0 border-success/30 text-success bg-success/10">
                                  <CheckCircle className="h-3 w-3 mr-1" />Healthy
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground mb-3">{prop.address}</p>

                            {/* Occupancy bar */}
                            <div className="mb-3">
                              <div className="flex items-center justify-between text-xs mb-1">
                                <span className="text-muted-foreground flex items-center gap-1">
                                  <Home className="h-3 w-3" /> Occupancy Rate
                                </span>
                                <span className={`font-semibold ${textColor}`}>{occRate}% ({prop.occupied} of {prop.units} units occupied)</span>
                              </div>
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Progress
                                      value={occRate}
                                      className="h-2.5 bg-muted"
                                      indicatorClassName={barColor}
                                    />
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p className="text-xs">{prop.occupied} occupied, {prop.vacant} vacant</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-border/40">
                              <div>
                                <p className="meta-text">Units Status</p>
                                <p className="text-sm font-medium text-foreground">{prop.occupied} filled / {prop.vacant} vacant</p>
                              </div>
                              <div>
                                <p className="meta-text">Collected Rent (MTD)</p>
                                <p className="text-sm font-medium text-foreground">{fmt(prop.collectedRent)}</p>
                              </div>
                              <div>
                                <p className="meta-text">Your Share (MTD)</p>
                                <p className="text-sm font-semibold text-success">
                                  {fmt(prop.collectedRent * prop.revenue_share_pct / 100)}
                                </p>
                              </div>
                              <div>
                                <p className="meta-text">Arrears</p>
                                <p className={`text-sm font-medium ${prop.outstandingArrears > 0 ? 'text-destructive font-semibold' : 'text-foreground'}`}>
                                  {fmt(prop.outstandingArrears)}
                                </p>
                              </div>
                            </div>
                          </div>
                          <div className="text-right shrink-0 w-full sm:w-auto">
                            {prop.manager_name && (
                              <div className="text-xs text-muted-foreground bg-muted/30 p-2.5 rounded-lg border border-border/40 mb-3">
                                <p className="font-semibold text-foreground">{prop.manager_name}</p>
                                <p className="text-[11px] truncate max-w-[160px]">{prop.manager_email}</p>
                                <Badge variant="secondary" className="mt-1 text-[10px]">Property Manager</Badge>
                              </div>
                            )}
                            <div className="flex flex-row sm:flex-col gap-2 justify-end">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setDetailPropertyId(detailPropertyId === prop.id ? null : prop.id)}
                                className="flex-1 sm:flex-none"
                              >
                                {detailPropertyId === prop.id ? 'Hide Details' : 'View Details'}
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="flex-1 sm:flex-none border-primary/30 text-primary hover:bg-primary/10"
                                onClick={() => {
                                  setSelectedProperty(prop.id);
                                  setPayoutDialogOpen(true);
                                }}
                              >
                                <Banknote className="h-3.5 w-3.5 mr-1" />Request Payout
                              </Button>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    {detailPropertyId === prop.id && (
                      <div className="mt-3 enterprise-card p-4 shadow-inner">
                        <LandlordPropertyDetail
                          propertyId={prop.id}
                          propertyName={prop.name}
                          revenueSharePct={prop.revenue_share_pct}
                        />
                      </div>
                    )}
                  </React.Fragment>
                );
              })
            )}
          </TabsContent>

          {/* ── Activity Tab ── */}
          <TabsContent value="activity" className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="section-title">Recent Activity</h2>
              <span className="meta-text font-semibold">
                {portfolioData?.activities?.length ?? 0} events
              </span>
            </div>
            <Card className="border-border/60">
              <CardHeader className="pb-3 pt-4 px-4 sm:px-5 border-b border-border/40">
                <CardTitle className="card-title-exec flex items-center gap-2">
                  <Activity className="h-4 w-4 text-info" />
                  Recent Portfolio Activity
                </CardTitle>
                <CardDescription className="supporting-text">
                  Property events, maintenance updates, and lease milestones
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 sm:p-5">
                {propertiesLoading ? (
                  <div className="space-y-3">
                    {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
                  </div>
                ) : portfolioData?.activities && portfolioData.activities.length > 0 ? (
                  <div className="space-y-3">
                    {portfolioData.activities.map(act => {
                      const isMaint = act.type === 'maintenance';
                      return (
                        <div key={act.id} className="flex items-start gap-3 p-3 rounded-lg border border-border/50 bg-muted/20">
                          <div className={`h-8 w-8 rounded-lg border flex items-center justify-center shrink-0 mt-0.5 ${isMaint ? 'bg-warning/10 border-warning/20' : 'bg-info/10 border-info/20'}`}>
                            {isMaint ? <Wrench className="h-4 w-4 text-warning" /> : <FileText className="h-4 w-4 text-info" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2 flex-wrap">
                              <p className="text-sm font-semibold text-foreground">{act.propertyName ?? 'Property'}</p>
                              <span className="meta-text text-muted-foreground">
                                {format(new Date(act.timestamp), 'dd/MM/yyyy')}
                              </span>
                            </div>
                            <p className="supporting-text mt-0.5">{act.description}</p>
                            <span className={`meta-text inline-flex items-center gap-1 mt-1 font-semibold ${isMaint ? 'text-warning' : 'text-info'}`}>
                              {isMaint ? <Wrench className="h-3 w-3" /> : <FileText className="h-3 w-3" />}
                              {isMaint ? 'Maintenance' : 'Lease'}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="py-12 text-center text-muted-foreground">
                    <Activity className="h-10 w-10 mx-auto mb-3 opacity-30" />
                    <p className="text-sm font-medium">No recent activity.</p>
                    <p className="supporting-text mt-1">Property events will appear here as they happen.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Payouts Tab ── */}
          <TabsContent value="payouts" className="space-y-4">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <h2 className="section-title">Payout Requests</h2>
                <p className="supporting-text">Submit and track revenue payout requests to your property manager</p>
              </div>
              <Dialog open={payoutDialogOpen} onOpenChange={setPayoutDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="btn-brand font-semibold">
                    <Banknote className="h-4 w-4 mr-2" />
                    New Payout Request
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Request a Payout</DialogTitle>
                    <DialogDescription>
                      Your property manager will review and process this payout request.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label>Property</Label>
                      <select
                        className="w-full mt-1 rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
                        value={selectedProperty}
                        onChange={e => setSelectedProperty(e.target.value)}
                      >
                        <option value="">Select a property</option>
                        {properties.map(p => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>Period start</Label>
                        <Input type="date" value={payoutPeriodStart} onChange={e => setPayoutPeriodStart(e.target.value)} className="mt-1" />
                      </div>
                      <div>
                        <Label>Period end</Label>
                        <Input type="date" value={payoutPeriodEnd} onChange={e => setPayoutPeriodEnd(e.target.value)} className="mt-1" />
                      </div>
                    </div>
                    <div>
                      <Label>Amount (KES)</Label>
                      <Input
                        type="number"
                        placeholder="0"
                        value={payoutAmount}
                        onChange={e => setPayoutAmount(e.target.value)}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label>Notes (optional)</Label>
                      <Textarea
                        placeholder="Any additional notes for your manager..."
                        value={payoutNotes}
                        onChange={e => setPayoutNotes(e.target.value)}
                        className="mt-1 resize-none"
                        rows={3}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setPayoutDialogOpen(false)}>Cancel</Button>
                    <Button
                      onClick={() => createPayout.mutate()}
                      disabled={createPayout.isPending}
                      className="btn-brand font-semibold"
                    >
                      {createPayout.isPending ? 'Submitting...' : 'Submit Request'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            {payoutsLoading ? (
              Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-xl" />)
            ) : payoutsError ? (
              <Card className="border-destructive/30">
                <CardContent className="py-10 text-center space-y-3">
                  <AlertTriangle className="h-10 w-10 mx-auto text-destructive/60" />
                  <h3 className="card-title-exec text-destructive">Couldn't load payout requests</h3>
                  <p className="supporting-text text-muted-foreground">A connection issue occurred. Please retry.</p>
                  <Button size="sm" variant="outline" className="border-destructive/30 text-destructive hover:bg-destructive/10" onClick={() => refetchPayouts()}>
                    <RefreshCw className="h-3.5 w-3.5 mr-1" /> Retry
                  </Button>
                </CardContent>
              </Card>
            ) : payouts.length === 0 ? (
              <Card className="border-border/60">
                <CardContent className="py-16 text-center">
                  <Banknote className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
                  <h3 className="card-title-exec text-muted-foreground">No payout requests yet</h3>
                  <p className="supporting-text mt-1">
                    Create your first payout request above.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <Card className="enterprise-card overflow-hidden">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Property</TableHead>
                        <TableHead>Period</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Submitted</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {payouts.map(payout => (
                        <TableRow key={payout.id}>
                          <TableCell className="font-medium text-foreground">{payout.property_name}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {format(new Date(payout.period_start), 'dd/MM')}
                            {' – '}
                            {format(new Date(payout.period_end), 'dd/MM/yy')}
                          </TableCell>
                          <TableCell className="font-semibold text-foreground">{fmt(payout.amount)}</TableCell>
                          <TableCell>
                            <span className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full border ${statusColors[payout.status]}`}>
                              {payout.status === 'paid' && <CheckCircle className="h-3 w-3" />}
                              {payout.status === 'pending' && <Clock className="h-3 w-3" />}
                              {payout.status === 'rejected' && <AlertCircle className="h-3 w-3" />}
                              {payout.status.charAt(0).toUpperCase() + payout.status.slice(1)}
                            </span>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {format(new Date(payout.created_at), 'dd/MM/yy')}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </Card>
            )}
          </TabsContent>

          {/* ── Financials Tab ── */}
          <TabsContent value="financials" className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="section-title">Financial Performance</h2>
            </div>
            {properties.length === 0 ? (
              <Card className="border-border/60">
                <CardContent className="py-12 text-center text-muted-foreground">
                  <BarChart3 className="h-10 w-10 mx-auto mb-3 opacity-30" />
                  <p className="supporting-text">Link a property first to view financial statements.</p>
                </CardContent>
              </Card>
            ) : (
              <LandlordFinancialStatement properties={properties} />
            )}
          </TabsContent>

          {/* ── Messages Tab ── */}
          <TabsContent value="messages" className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="section-title">Messages</h2>
            </div>
            {properties.length === 0 ? (
              <Card className="border-border/60">
                <CardContent className="py-12 text-center text-muted-foreground">
                  <MessageSquare className="h-10 w-10 mx-auto mb-3 opacity-30" />
                  <p className="supporting-text">No properties linked yet — no managers to message.</p>
                </CardContent>
              </Card>
            ) : (
              <LandlordMessages properties={properties} />
            )}
          </TabsContent>

          {/* ── Bank & Settings Tab ── */}
          <TabsContent value="settings" className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="section-title">Bank & Settings</h2>
            </div>
            <LandlordTeamSettings />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <LandlordBankDetails />
              <LandlordNotificationPreferences />
            </div>
          </TabsContent>

          {/* ── Documents Tab ── */}
          <TabsContent value="documents" className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="section-title">Documents</h2>
            </div>
            <LandlordDocuments />
          </TabsContent>

        </Tabs>
      </main>
    </div>
  );
};

export default LandlordDashboard;
