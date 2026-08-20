import { format } from "date-fns";
import React, { useState } from 'react';
import { Navigate } from 'react-router-dom';
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
  LogOut, TrendingUp, Building2, FileText,
  Clock, CheckCircle, AlertCircle,
  Banknote, PieChart, MessageSquare,
  Settings, BarChart3, Users, Activity, RefreshCw,
  AlertTriangle, Wrench, ArrowRight
} from 'lucide-react';
import LandlordBankDetails from '@/features/landlord/components/LandlordBankDetails';
import LandlordFinancialStatement from '@/features/landlord/components/LandlordFinancialStatement';
import LandlordMessages from '@/features/landlord/components/LandlordMessages';
import LandlordPropertyDetail from '@/features/landlord/components/LandlordPropertyDetail';
import LandlordNotificationPreferences from '@/features/landlord/components/LandlordNotificationPreferences';
import LandlordDocuments from '@/features/landlord/components/LandlordDocuments';
import LandlordTeamSettings from '@/features/landlord/components/LandlordTeamSettings';
import { BrandMark } from '@/shared/components/branding/BrandMark';
import { PageHeader } from '@/shared/components/layout/PageHeader';
import { PortalAccentBar, portalSurfaceProps } from '@/core/design';
import { StatCard } from '@/features/dashboard/components/StatCard';
import { occupancyRateColor, occupancyTone, payoutStatusTone, statusBadgeClass } from '@/shared/lib/statusBadge';

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

const occupancyBarClass = (pct: number) => {
  const tone = occupancyTone(pct);
  if (tone === 'success') return 'bg-success';
  if (tone === 'info') return 'bg-primary';
  if (tone === 'warning') return 'bg-warning';
  return 'bg-destructive';
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

      // Parallel data fetching for landlord's properties
      const [
        propsResult,
        unitsResult,
        profilesResult,
        portfolioStatsResult,
      ] = await Promise.all([
        supabase.from('properties').select('id, name, address, units, occupied, revenue').in('id', propertyIds),
        supabase.from('units').select('id, property_id, status, rent_amount').in('property_id', propertyIds),
        supabase.from('profiles').select('id, full_name, email').in('id', links.filter((l: { manager_id: string | null }) => l.manager_id).map((l: { manager_id: string }) => l.manager_id)),
        supabase.rpc('get_landlord_portfolio_stats'),
      ]);

      if (propsResult.error) throw propsResult.error;
      if (unitsResult.error) throw unitsResult.error;
      if (portfolioStatsResult.error) throw portfolioStatsResult.error;

      const props = propsResult.data || [];
      const units = unitsResult.data || [];
      const profiles = profilesResult.data || [];
      const stats = (portfolioStatsResult.data ?? {}) as {
        properties?: Array<{
          id: string;
          expected_rent: number;
          collected_rent: number;
          arrears: number;
          open_maintenance: number;
          urgent_maintenance: number;
        }>;
        active_leases?: number;
        expiring_leases?: number;
        activities?: LandlordActivity[];
      };
      const financeByProperty = new Map((stats.properties ?? []).map((row) => [row.id, row]));

      // Per-property aggregation maps
      const unitStatsMap: Record<string, { total: number; occupied: number; vacant: number }> = {};
      units.forEach(u => {
        if (!unitStatsMap[u.property_id]) unitStatsMap[u.property_id] = { total: 0, occupied: 0, vacant: 0 };
        unitStatsMap[u.property_id].total++;
        if (u.status === 'occupied') unitStatsMap[u.property_id].occupied++;
        else unitStatsMap[u.property_id].vacant++;
      });

      // Construct property summary list
      const propertiesList: PropertySummary[] = props.map(p => {
        const link = links.find((l: { property_id: string }) => l.property_id === p.id) as { revenue_share_pct: number; manager_id: string | null; assigned_at: string };
        const mgr = profiles.find((pr: { id: string }) => pr.id === link?.manager_id);
        const uStats = unitStatsMap[p.id];
        const fin = financeByProperty.get(p.id);

        const totalUnits = uStats?.total ?? p.units;
        const totalOccupied = uStats?.occupied ?? p.occupied;
        const totalVacant = uStats?.vacant ?? Math.max(0, totalUnits - totalOccupied);

        const expRent = Number(fin?.expected_rent ?? 0);
        const collRent = Number(fin?.collected_rent ?? 0);
        const arrears = Number(fin?.arrears ?? 0);

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
          openMaintenance: Number(fin?.open_maintenance ?? 0),
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

      const activeLeasesCount = Number(stats.active_leases ?? 0);
      const expiringLeasesCount = Number(stats.expiring_leases ?? 0);
      const openMaintenanceCount = propertiesList.reduce((s, p) => s + p.openMaintenance, 0);
      const urgentMaintenanceCount = (stats.properties ?? []).reduce((s, row) => s + Number(row.urgent_maintenance ?? 0), 0);

      const activities: LandlordActivity[] = (stats.activities ?? []).map((a) => ({
        id: a.id,
        type: a.type,
        description: a.description,
        timestamp: a.timestamp,
        propertyName: a.propertyName ?? (a as { property_name?: string }).property_name,
      }));

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
      <div className="min-h-screen flex items-center justify-center bg-background" {...portalSurfaceProps("landlord")}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!isDevAccessEnabled() && (!user || userRole?.role !== 'landlord')) {
    return <Navigate to="/landlord/login" replace />;
  }

  const landlordName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Landlord';

  return (
    <div className="min-h-screen bg-background text-foreground" {...portalSurfaceProps("landlord")}>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:z-[100] focus:left-4 focus:top-4 focus:rounded-md focus:bg-primary focus:px-4 focus:py-2.5 focus:text-sm focus:font-semibold focus:text-primary-foreground"
      >
        Skip to main content
      </a>
      <PortalAccentBar />
      {/* Header — identity and tools. Page title lives in PageHeader. */}
      <header className="sticky top-0 z-40 border-b border-border/60 bg-card/90 backdrop-blur-xl">
        <div className="max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <BrandMark size="md" showWordmark subtitle="Landlord" />
            <Badge variant="outline" className="ml-1 text-xs border-border text-muted-foreground">
              Portfolio
            </Badge>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex flex-col items-end min-w-0 max-w-[180px]">
              <span className="text-xs font-semibold text-foreground truncate">{landlordName}</span>
              <span className="text-[10px] text-muted-foreground truncate">{user?.email}</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => queryClient.invalidateQueries()}
              className="h-9 w-9 p-0 text-muted-foreground hover:text-foreground"
              title="Refresh"
              aria-label="Refresh portfolio"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={signOut} className="text-muted-foreground border border-border/60">
              <LogOut className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Sign out</span>
            </Button>
          </div>
        </div>
      </header>

      <main id="main-content" tabIndex={-1} className="max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 outline-none">
        <PageHeader
          title="How are my properties performing?"
          description="Collected is rent received this month. Outstanding is uncollected arrears. Net is your share after revenue split."
          className="border-0 px-0 py-0"
        />

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

        <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-5">
          {propertiesLoading ? (
            Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)
          ) : (
            <>
              <StatCard
                title="Collected"
                value={fmt(portfolioData?.totalCollectedRent ?? 0)}
                change={`Billed ${fmt(portfolioData?.totalExpectedRent ?? 0)}`}
                changeType={(portfolioData?.totalCollectedRent ?? 0) >= (portfolioData?.totalExpectedRent ?? 0) ? 'positive' : 'neutral'}
                icon={Banknote}
                iconColor="success"
              />
              <StatCard
                title="Outstanding"
                value={fmt(portfolioData?.totalArrears ?? 0)}
                change={(portfolioData?.totalArrears ?? 0) > 0 ? 'Uncollected arrears' : 'No arrears'}
                changeType={(portfolioData?.totalArrears ?? 0) > 0 ? 'negative' : 'positive'}
                icon={AlertCircle}
                iconColor={(portfolioData?.totalArrears ?? 0) > 0 ? 'destructive' : 'success'}
              />
              <StatCard
                title="Occupancy"
                value={`${portfolioData?.occupancyRate ?? 0}%`}
                change={`${portfolioData?.totalOccupied ?? 0} occupied · ${portfolioData?.totalVacant ?? 0} vacant`}
                changeType={(portfolioData?.occupancyRate ?? 0) >= 90 ? 'positive' : (portfolioData?.occupancyRate ?? 0) >= 70 ? 'neutral' : 'negative'}
                icon={PieChart}
                iconColor={(portfolioData?.occupancyRate ?? 0) >= 90 ? 'success' : (portfolioData?.occupancyRate ?? 0) >= 70 ? 'primary' : 'warning'}
                progressValue={portfolioData?.occupancyRate ?? 0}
              />
              <StatCard
                title="Net to you"
                value={fmt(portfolioData?.netLandlordShareMTD ?? 0)}
                change="Your share of collected rent"
                changeType="positive"
                icon={TrendingUp}
                iconColor="success"
              />
              <StatCard
                title="Portfolio"
                value={String(portfolioData?.totalProperties ?? 0)}
                change={`${portfolioData?.totalUnits ?? 0} units · ${payoutsLoading ? '…' : fmt(totalPaidOut)} paid out`}
                changeType="neutral"
                icon={Building2}
                iconColor="primary"
              />
            </>
          )}
        </div>

        {!propertiesLoading && portfolioData && (
          (portfolioData.totalArrears > 0 ||
            portfolioData.urgentMaintenanceCount > 0 ||
            portfolioData.openMaintenanceCount > 0 ||
            pendingPayouts > 0 ||
            portfolioData.expiringLeasesCount > 0) && (
          <div className="enterprise-card p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h2 className="section-title">Needs attention</h2>
              <span className="meta-text">
                {(portfolioData.totalArrears > 0 ? 1 : 0) +
                  (portfolioData.urgentMaintenanceCount > 0 || portfolioData.openMaintenanceCount > 0 ? 1 : 0) +
                  (pendingPayouts > 0 ? 1 : 0) +
                  (portfolioData.expiringLeasesCount > 0 ? 1 : 0)} items
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {portfolioData.totalArrears > 0 && (
                <button type="button" className="text-left rounded-lg border border-destructive/20 bg-destructive/5 p-3" onClick={() => setActiveTab('financials')}>
                  <p className="text-xs text-muted-foreground">Outstanding</p>
                  <p className="text-sm font-semibold text-destructive mt-0.5">{fmt(portfolioData.totalArrears)}</p>
                  <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">Statements <ArrowRight className="h-3 w-3" /></p>
                </button>
              )}
              {(portfolioData.urgentMaintenanceCount > 0 || portfolioData.openMaintenanceCount > 0) && (
                <button type="button" className="text-left rounded-lg border border-warning/20 bg-warning/5 p-3" onClick={() => setActiveTab('properties')}>
                  <p className="text-xs text-muted-foreground">Maintenance</p>
                  <p className="text-sm font-semibold mt-0.5">
                    {portfolioData.urgentMaintenanceCount > 0
                      ? `${portfolioData.urgentMaintenanceCount} urgent`
                      : `${portfolioData.openMaintenanceCount} open`}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">Portfolio <ArrowRight className="h-3 w-3" /></p>
                </button>
              )}
              {pendingPayouts > 0 && (
                <button type="button" className="text-left rounded-lg border border-warning/20 bg-warning/5 p-3" onClick={() => setActiveTab('payouts')}>
                  <p className="text-xs text-muted-foreground">Pending payouts</p>
                  <p className="text-sm font-semibold text-warning mt-0.5">{pendingPayouts} awaiting review</p>
                  <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">Payouts <ArrowRight className="h-3 w-3" /></p>
                </button>
              )}
              {portfolioData.expiringLeasesCount > 0 && (
                <button type="button" className="text-left rounded-lg border border-border bg-muted/20 p-3" onClick={() => setActiveTab('properties')}>
                  <p className="text-xs text-muted-foreground">Leases expiring (30d)</p>
                  <p className="text-sm font-semibold mt-0.5">{portfolioData.expiringLeasesCount}</p>
                  <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">Portfolio <ArrowRight className="h-3 w-3" /></p>
                </button>
              )}
            </div>
          </div>
          )
        )}

        {!propertiesLoading && (portfolioData?.activities?.length ?? 0) > 0 && (
          <div className="enterprise-card p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="section-title">Recent activity</h2>
              <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => setActiveTab('activity')}>
                View all <ArrowRight className="h-3 w-3 ml-1" />
              </Button>
            </div>
            <div className="space-y-2">
              {portfolioData!.activities.slice(0, 3).map((act) => (
                <div key={act.id} className="flex items-start gap-3 py-1.5">
                  <div className="h-7 w-7 rounded-md bg-muted flex items-center justify-center shrink-0">
                    {act.type === 'maintenance' ? <Wrench className="h-3.5 w-3.5 text-muted-foreground" /> : <FileText className="h-3.5 w-3.5 text-muted-foreground" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-foreground truncate">{act.description}</p>
                    <p className="text-xs text-muted-foreground">
                      {act.propertyName ?? 'Property'} · {format(new Date(act.timestamp), 'dd/MM/yyyy')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── WORKSPACE TABS ── */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6 flex-wrap h-auto gap-1 p-1 bg-muted/60 border border-border/60">
            <TabsTrigger value="properties" className="gap-1.5 text-xs">
              <Building2 className="h-3.5 w-3.5" />Portfolio
            </TabsTrigger>
            <TabsTrigger value="financials" className="gap-1.5 text-xs">
              <BarChart3 className="h-3.5 w-3.5" />Statements
            </TabsTrigger>
            <TabsTrigger value="payouts" className="gap-1.5 text-xs">
              <Banknote className="h-3.5 w-3.5" />
              Payouts
              {pendingPayouts > 0 && (
                <span className={`${statusBadgeClass('warning')} ml-1`}>{pendingPayouts}</span>
              )}
            </TabsTrigger>
            <TabsTrigger value="documents" className="gap-1.5 text-xs">
              <FileText className="h-3.5 w-3.5" />Documents
            </TabsTrigger>
            <span className="hidden sm:inline-block w-px h-5 bg-border mx-1 self-center" aria-hidden />
            <TabsTrigger value="activity" className="gap-1.5 text-xs text-muted-foreground data-[state=active]:text-foreground">
              <Activity className="h-3.5 w-3.5" />Activity
            </TabsTrigger>
            <TabsTrigger value="messages" className="gap-1.5 text-xs text-muted-foreground data-[state=active]:text-foreground">
              <MessageSquare className="h-3.5 w-3.5" />Messages
            </TabsTrigger>
            <TabsTrigger value="settings" className="gap-1.5 text-xs text-muted-foreground data-[state=active]:text-foreground">
              <Settings className="h-3.5 w-3.5" />Account
            </TabsTrigger>
          </TabsList>

          {/* ── Properties Tab ── */}
          <TabsContent value="properties" className="space-y-4">
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
                      <li className="flex gap-2"><span className="font-bold shrink-0 text-teal">1.</span>Share your account email with your property manager</li>
                      <li className="flex gap-2"><span className="font-bold shrink-0 text-teal">2.</span>They will link your properties from their portal</li>
                      <li className="flex gap-2"><span className="font-bold shrink-0 text-teal">3.</span>You will receive access immediately</li>
                    </ol>
                    <p className="text-xs text-muted-foreground pt-1">Your email: <strong className="text-foreground">{user?.email}</strong></p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              properties.map(prop => {
                const occRate = prop.units > 0 ? Math.round((prop.occupied / prop.units) * 100) : 0;
                const barColor = occupancyBarClass(occRate);
                const textColor = occupancyRateColor(occRate);
                return (
                  <React.Fragment key={prop.id}>
                    <Card className="border-border/60 hover:shadow-md transition-shadow">
                      <CardContent className="p-5">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-semibold truncate text-foreground text-base">{prop.name}</h3>
                              <Badge variant="outline" className="text-xs shrink-0 border-teal/30 text-teal">
                                {prop.revenue_share_pct}% revenue share
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground mb-3">{prop.address}</p>

                            {/* Occupancy bar */}
                            <div className="mb-3">
                              <div className="flex items-center justify-between text-xs mb-1">
                                <span className="text-muted-foreground flex items-center gap-1">
                                  <Users className="h-3 w-3" /> Occupancy
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
                                <p className="text-xs text-muted-foreground">Billed</p>
                                <p className="font-medium text-sm text-foreground">{fmt(prop.expectedRent)}</p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground">Collected</p>
                                <p className="font-medium text-sm text-foreground">{fmt(prop.collectedRent)}</p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground">Outstanding</p>
                                <p className={`font-medium text-sm ${prop.outstandingArrears > 0 ? 'text-destructive font-semibold' : 'text-foreground'}`}>
                                  {fmt(prop.outstandingArrears)}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground">Net to you</p>
                                <p className="font-semibold text-sm text-success">
                                  {fmt(prop.collectedRent * prop.revenue_share_pct / 100)}
                                </p>
                              </div>
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            {prop.manager_name && (
                              <div className="text-xs text-muted-foreground bg-muted/30 p-2.5 rounded-lg border border-border/40 mb-3">
                                <p className="font-semibold text-foreground">{prop.manager_name}</p>
                                <p className="text-[11px] truncate max-w-[160px]">{prop.manager_email}</p>
                                <Badge variant="secondary" className="mt-1 text-[10px]">Property Manager</Badge>
                              </div>
                            )}
                            <div className="flex flex-col gap-2">
                              <Button
                                size="sm"
                                className="btn-brand"
                                onClick={() => setDetailPropertyId(detailPropertyId === prop.id ? null : prop.id)}
                              >
                                {detailPropertyId === prop.id ? 'Hide details' : 'View details'}
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-muted-foreground"
                                onClick={() => {
                                  setSelectedProperty(prop.id);
                                  setPayoutDialogOpen(true);
                                }}
                              >
                                Request payout
                              </Button>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    {detailPropertyId === prop.id && (
                      <div className="mt-3 border border-border rounded-xl p-4 bg-card shadow-inner">
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
            <Card className="border-border/60">
              <CardHeader className="pb-3 pt-4 px-4 sm:px-5 border-b border-border/40">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Activity className="h-4 w-4 text-info" />
                  Recent Portfolio Activity
                </CardTitle>
                <CardDescription className="text-xs">
                  Property events, maintenance updates, and lease milestones
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 sm:p-5">
                {portfolioData?.activities && portfolioData.activities.length > 0 ? (
                  <div className="space-y-3">
                    {portfolioData.activities.map(act => (
                      <div key={act.id} className="flex items-start gap-3 p-3 rounded-lg border border-border/50 bg-muted/20">
                        <div className="h-8 w-8 rounded-lg bg-info/10 border border-info/20 flex items-center justify-center shrink-0 mt-0.5">
                          {act.type === 'maintenance' ? <Wrench className="h-4 w-4 text-warning" /> : <FileText className="h-4 w-4 text-info" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-xs font-semibold text-foreground">{act.propertyName ?? 'Property'}</p>
                            <span className="text-[10px] text-muted-foreground">{format(new Date(act.timestamp), 'dd/MM/yyyy')}</span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">{act.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-12 text-center text-muted-foreground">
                    <Activity className="h-10 w-10 mx-auto mb-3 opacity-30" />
                    <p className="text-sm">No recent activity events recorded for your properties.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Payouts Tab ── */}
          <TabsContent value="payouts" className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-foreground">Payout Requests</h2>
                <p className="text-sm text-muted-foreground">Submit and track revenue payout requests to your property manager</p>
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
                  <h3 className="font-medium text-destructive">Couldn't load payout requests</h3>
                  <p className="text-sm text-muted-foreground">A connection issue occurred. Please retry.</p>
                  <Button size="sm" variant="outline" className="border-destructive/30 text-destructive hover:bg-destructive/10" onClick={() => refetchPayouts()}>
                    <RefreshCw className="h-3.5 w-3.5 mr-1" /> Retry
                  </Button>
                </CardContent>
              </Card>
            ) : payouts.length === 0 ? (
              <Card className="border-border/60">
                <CardContent className="py-16 text-center">
                  <Banknote className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
                  <h3 className="font-medium text-muted-foreground">No payout requests yet</h3>
                  <p className="text-sm text-muted-foreground/70 mt-1">
                    Create your first payout request above.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <Card className="border-border/60">
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
                          <span className={`inline-flex items-center gap-1 ${statusBadgeClass(payoutStatusTone(payout.status))}`}>
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
              </Card>
            )}
          </TabsContent>

          {/* ── Financials Tab ── */}
          <TabsContent value="financials" className="space-y-4">
            {properties.length === 0 ? (
              <Card className="border-border/60">
                <CardContent className="py-12 text-center text-muted-foreground">
                  <BarChart3 className="h-10 w-10 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">Link a property first to view financial statements.</p>
                </CardContent>
              </Card>
            ) : (
              <LandlordFinancialStatement properties={properties} />
            )}
          </TabsContent>

          {/* ── Messages Tab ── */}
          <TabsContent value="messages" className="space-y-4">
            {properties.length === 0 ? (
              <Card className="border-border/60">
                <CardContent className="py-12 text-center text-muted-foreground">
                  <MessageSquare className="h-10 w-10 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">No properties linked yet — no managers to message.</p>
                </CardContent>
              </Card>
            ) : (
              <LandlordMessages properties={properties} />
            )}
          </TabsContent>

          {/* ── Bank & Settings Tab ── */}
          <TabsContent value="settings" className="space-y-4">
            <LandlordTeamSettings />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <LandlordBankDetails />
              <LandlordNotificationPreferences />
            </div>
          </TabsContent>

          {/* ── Documents Tab ── */}
          <TabsContent value="documents" className="space-y-4">
            <LandlordDocuments />
          </TabsContent>

        </Tabs>
      </main>
    </div>
  );
};

export default LandlordDashboard;
