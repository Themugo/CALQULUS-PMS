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
  LogOut, Building2, FileText,

  Clock, CheckCircle, AlertCircle,
  Banknote, MessageSquare,
  Settings, BarChart3, Users, Activity, RefreshCw,
  AlertTriangle, Wrench, ArrowRight,
} from 'lucide-react';
import LandlordBankDetails from '@/features/landlord/components/LandlordBankDetails';
import LandlordFinancialStatement from '@/features/landlord/components/LandlordFinancialStatement';
import LandlordMessages from '@/features/landlord/components/LandlordMessages';
import LandlordPropertyDetail from '@/features/landlord/components/LandlordPropertyDetail';
import LandlordNotificationPreferences from '@/features/landlord/components/LandlordNotificationPreferences';
import LandlordDocuments from '@/features/landlord/components/LandlordDocuments';
import LandlordTeamSettings from '@/features/landlord/components/LandlordTeamSettings';
import { LandlordMetricCard } from '@/features/landlord/components/LandlordMetricCard';
import { BrandMark } from '@/shared/components/branding/BrandMark';
import { occupancyRateColor, occupancyTone, payoutStatusTone, statusBadgeClass } from '@/shared/lib/statusBadge';
import { formatCurrency } from '@/shared/lib/formatCurrency';
import {
  collectionRatePercent,
  landlordNetShare,
  managementFeeFromShare,
  occupancyPercent,
} from '@/features/landlord/lib/portfolioMetrics';

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
  managementFee: number;
  netToYou: number;
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
          totalManagementFee: 0,
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
        supabase.from('units').select('id, property_id, status').in('property_id', propertyIds),
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
        const share = link?.revenue_share_pct ?? 100;

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
          revenue_share_pct: share,
          manager_id: link?.manager_id ?? null,
          manager_name: mgr?.full_name ?? null,
          manager_email: mgr?.email ?? null,
          assigned_at: link?.assigned_at,
          openMaintenance: Number(fin?.open_maintenance ?? 0),
          managementFee: managementFeeFromShare(collRent, share),
          netToYou: landlordNetShare(collRent, share),
        };
      });

      // Global aggregates
      const totalUnits = propertiesList.reduce((s, p) => s + p.units, 0);
      const totalOccupied = propertiesList.reduce((s, p) => s + p.occupied, 0);
      const totalVacant = propertiesList.reduce((s, p) => s + p.vacant, 0);
      const occupancyRate = occupancyPercent(totalOccupied, totalUnits);

      const totalExpectedRent = propertiesList.reduce((s, p) => s + p.expectedRent, 0);
      const totalCollectedRent = propertiesList.reduce((s, p) => s + p.collectedRent, 0);
      const totalArrears = propertiesList.reduce((s, p) => s + p.outstandingArrears, 0);
      const totalManagementFee = propertiesList.reduce((s, p) => s + p.managementFee, 0);
      const netLandlordShareMTD = propertiesList.reduce((s, p) => s + p.netToYou, 0);

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
        totalManagementFee,
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
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border/60 bg-card/90 backdrop-blur-xl [box-shadow:inset_0_2px_0_0_var(--primary)]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
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

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">

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

        <div>
          <h1 className="page-title">How are my properties performing?</h1>
          <p className="supporting-text mt-1">
            Income is rent billed this month. Collections is rent received. Outstanding is uncollected
            arrears. Expenses is the management fee from your revenue share. Net is what remains for you.
          </p>
        </div>

        <section aria-labelledby="portfolio-overview-heading">
          <h2 id="portfolio-overview-heading" className="section-title mb-3">Portfolio overview</h2>
          {propertiesLoading ? (
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <article className="enterprise-card p-3">
                <p className="type-label">Properties</p>
                <p className="mt-1 font-heading text-xl font-semibold tabular-nums">{portfolioData?.totalProperties ?? 0}</p>
              </article>
              <article className="enterprise-card p-3">
                <p className="type-label">Units</p>
                <p className="mt-1 font-heading text-xl font-semibold tabular-nums">{portfolioData?.totalUnits ?? 0}</p>
              </article>
              <article className="enterprise-card p-3">
                <p className="type-label">Occupancy</p>
                <p className="mt-1 font-heading text-xl font-semibold tabular-nums">{portfolioData?.occupancyRate ?? 0}%</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {portfolioData?.totalOccupied ?? 0} occupied · {portfolioData?.totalVacant ?? 0} vacant
                </p>
              </article>
              <article className="enterprise-card p-3">
                <p className="type-label">Paid out</p>
                <p className="mt-1 font-heading text-xl font-semibold tabular-nums">
                  {payoutsLoading ? '…' : formatCurrency(totalPaidOut)}
                </p>
              </article>
            </div>
          )}
        </section>

        <section aria-labelledby="income-heading">
          <h2 id="income-heading" className="section-title mb-3">Income, collections, outstanding, expenses</h2>
          {propertiesLoading ? (
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <LandlordMetricCard
                label="Income"
                value={formatCurrency(portfolioData?.totalExpectedRent ?? 0)}
                hint="Rent billed this month"
              />
              <LandlordMetricCard
                label="Collections"
                value={formatCurrency(portfolioData?.totalCollectedRent ?? 0)}
                hint={`${collectionRatePercent(portfolioData?.totalCollectedRent ?? 0, portfolioData?.totalExpectedRent ?? 0)}% of billed received`}
                tone={(portfolioData?.totalCollectedRent ?? 0) >= (portfolioData?.totalExpectedRent ?? 0) && (portfolioData?.totalExpectedRent ?? 0) > 0 ? 'positive' : 'neutral'}
              />
              <LandlordMetricCard
                label="Outstanding"
                value={formatCurrency(portfolioData?.totalArrears ?? 0)}
                hint={(portfolioData?.totalArrears ?? 0) > 0 ? 'Uncollected arrears' : 'No arrears'}
                tone={(portfolioData?.totalArrears ?? 0) > 0 ? 'negative' : 'positive'}
              />
              <LandlordMetricCard
                label="Expenses"
                value={formatCurrency(portfolioData?.totalManagementFee ?? 0)}
                hint="Management fee from your revenue share — not a separate expense ledger"
              />
            </div>
          )}
        </section>

        {!propertiesLoading && (
          <section className="enterprise-card flex flex-col gap-2 p-4 sm:flex-row sm:items-end sm:justify-between" aria-labelledby="net-heading">
            <div>
              <h2 id="net-heading" className="type-label">Net to you</h2>
              <p className="type-metric mt-1 text-success tabular-nums">
                {formatCurrency(portfolioData?.netLandlordShareMTD ?? 0)}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Collections minus management fee. Your share of rent received this month.
              </p>
            </div>
          </section>
        )}

        <section aria-labelledby="occupancy-heading">
          <h2 id="occupancy-heading" className="section-title mb-3">Occupancy</h2>
          {propertiesLoading ? (
            <Skeleton className="h-20 rounded-xl" />
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <article className="enterprise-card p-3">
                <p className="type-label">Occupied</p>
                <p className="mt-1 font-heading text-xl font-semibold tabular-nums">{portfolioData?.totalOccupied ?? 0}</p>
              </article>
              <article className="enterprise-card p-3">
                <p className="type-label">Vacant</p>
                <p className="mt-1 font-heading text-xl font-semibold tabular-nums">{portfolioData?.totalVacant ?? 0}</p>
              </article>
              <article className="enterprise-card p-3">
                <p className="type-label">Rate</p>
                <p className="mt-1 font-heading text-xl font-semibold tabular-nums">{portfolioData?.occupancyRate ?? 0}%</p>
              </article>
              <article className="enterprise-card p-3">
                <p className="type-label">Leases</p>
                <p className="mt-1 font-heading text-xl font-semibold tabular-nums">{portfolioData?.activeLeasesCount ?? 0}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {(portfolioData?.expiringLeasesCount ?? 0) > 0
                    ? `${portfolioData?.expiringLeasesCount} expiring in 30 days`
                    : 'Count only — no tenant names'}
                </p>
              </article>
            </div>
          )}
        </section>

        <section aria-labelledby="property-performance-heading">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 id="property-performance-heading" className="section-title">Property performance</h2>
            <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => setActiveTab('properties')}>
              Details <ArrowRight className="h-3 w-3 ml-1" />
            </Button>
          </div>
          {propertiesLoading ? (
            <Skeleton className="h-32 rounded-xl" />
          ) : properties.length === 0 ? (
            <p className="text-sm text-muted-foreground">No linked properties yet.</p>
          ) : (
            <div className="enterprise-card overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Property</TableHead>
                    <TableHead>Occupancy</TableHead>
                    <TableHead className="text-right">Income</TableHead>
                    <TableHead className="text-right">Collections</TableHead>
                    <TableHead className="text-right">Outstanding</TableHead>
                    <TableHead className="text-right">Expenses</TableHead>
                    <TableHead className="text-right">Net to you</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {properties.map((prop) => {
                    const occ = occupancyPercent(prop.occupied, prop.units);
                    return (
                      <TableRow key={prop.id}>
                        <TableCell className="font-medium">{prop.name}</TableCell>
                        <TableCell>
                          <span className={occupancyRateColor(occ)}>{occ}%</span>
                          <span className="ml-1 text-xs text-muted-foreground">
                            {prop.occupied}/{prop.units}
                          </span>
                        </TableCell>
                        <TableCell className="text-right tabular-nums">{formatCurrency(prop.expectedRent)}</TableCell>
                        <TableCell className="text-right tabular-nums">{formatCurrency(prop.collectedRent)}</TableCell>
                        <TableCell className={`text-right tabular-nums ${prop.outstandingArrears > 0 ? 'font-semibold text-destructive' : ''}`}>
                          {formatCurrency(prop.outstandingArrears)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-muted-foreground">{formatCurrency(prop.managementFee)}</TableCell>
                        <TableCell className="text-right tabular-nums font-semibold text-success">{formatCurrency(prop.netToYou)}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </section>

        <section aria-labelledby="recent-activity-heading" className="enterprise-card p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 id="recent-activity-heading" className="section-title">Recent activity</h2>
            <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => setActiveTab('activity')}>
              View all <ArrowRight className="h-3 w-3 ml-1" />
            </Button>
          </div>
          {propertiesLoading ? (
            <Skeleton className="h-16 rounded-lg" />
          ) : (portfolioData?.activities?.length ?? 0) > 0 ? (
            <div className="space-y-2">
              {portfolioData!.activities.slice(0, 4).map((act) => (
                <div key={act.id} className="flex items-start gap-3 py-1.5">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-muted">
                    {act.type === 'maintenance' ? <Wrench className="h-3.5 w-3.5 text-muted-foreground" /> : <FileText className="h-3.5 w-3.5 text-muted-foreground" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-foreground">{act.description}</p>
                    <p className="text-xs text-muted-foreground">
                      {act.propertyName ?? 'Property'} · {format(new Date(act.timestamp), 'dd/MM/yyyy')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No recent property events. Maintenance appears here by unit number only.</p>
          )}
        </section>

        {!propertiesLoading && portfolioData && (
          (portfolioData.totalArrears > 0 ||
            portfolioData.urgentMaintenanceCount > 0 ||
            portfolioData.openMaintenanceCount > 0 ||
            pendingPayouts > 0 ||
            portfolioData.expiringLeasesCount > 0) && (
          <div className="enterprise-card space-y-3 p-4">
            <div className="flex items-center justify-between gap-2">
              <h2 className="section-title">Needs attention</h2>
              <span className="meta-text">
                {(portfolioData.totalArrears > 0 ? 1 : 0) +
                  (portfolioData.urgentMaintenanceCount > 0 || portfolioData.openMaintenanceCount > 0 ? 1 : 0) +
                  (pendingPayouts > 0 ? 1 : 0) +
                  (portfolioData.expiringLeasesCount > 0 ? 1 : 0)} items
              </span>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {portfolioData.totalArrears > 0 && (
                <button type="button" className="rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-left" onClick={() => setActiveTab('financials')}>
                  <p className="text-xs text-muted-foreground">Outstanding</p>
                  <p className="mt-0.5 text-sm font-semibold text-destructive">{formatCurrency(portfolioData.totalArrears)}</p>
                  <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">Statements <ArrowRight className="h-3 w-3" /></p>
                </button>
              )}
              {(portfolioData.urgentMaintenanceCount > 0 || portfolioData.openMaintenanceCount > 0) && (
                <button type="button" className="rounded-lg border border-warning/20 bg-warning/5 p-3 text-left" onClick={() => setActiveTab('maintenance')}>
                  <p className="text-xs text-muted-foreground">Maintenance</p>
                  <p className="mt-0.5 text-sm font-semibold">
                    {portfolioData.urgentMaintenanceCount > 0
                      ? `${portfolioData.urgentMaintenanceCount} urgent`
                      : `${portfolioData.openMaintenanceCount} open`}
                  </p>
                  <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">Visibility <ArrowRight className="h-3 w-3" /></p>
                </button>
              )}
              {pendingPayouts > 0 && (
                <button type="button" className="rounded-lg border border-warning/20 bg-warning/5 p-3 text-left" onClick={() => setActiveTab('payouts')}>
                  <p className="text-xs text-muted-foreground">Pending payouts</p>
                  <p className="mt-0.5 text-sm font-semibold text-warning">{pendingPayouts} awaiting review</p>
                  <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">Payouts <ArrowRight className="h-3 w-3" /></p>
                </button>
              )}
              {portfolioData.expiringLeasesCount > 0 && (
                <button type="button" className="rounded-lg border border-border bg-muted/20 p-3 text-left" onClick={() => setActiveTab('properties')}>
                  <p className="text-xs text-muted-foreground">Leases expiring (30d)</p>
                  <p className="mt-0.5 text-sm font-semibold">{portfolioData.expiringLeasesCount}</p>
                  <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">Properties <ArrowRight className="h-3 w-3" /></p>
                </button>
              )}
            </div>
          </div>
          )
        )}

        {/* ── WORKSPACE TABS ── */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6 flex w-full flex-wrap h-auto gap-1 p-1 bg-muted/60 border border-border/60 overflow-x-auto">
            <TabsTrigger value="properties" className="gap-1.5 text-xs">
              <Building2 className="h-3.5 w-3.5" />Portfolio
            </TabsTrigger>
            <TabsTrigger value="financials" className="gap-1.5 text-xs">
              <BarChart3 className="h-3.5 w-3.5" />Statements
            </TabsTrigger>
            <TabsTrigger value="maintenance" className="gap-1.5 text-xs">
              <Wrench className="h-3.5 w-3.5" />Maintenance
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
                const barColor = occupancyBarClass(occRate);
                const textColor = occupancyRateColor(occRate);
                return (
                  <React.Fragment key={prop.id}>
                    <Card className="border-border/60 hover:shadow-md transition-shadow">
                      <CardContent className="p-4 sm:p-5">
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-semibold truncate text-foreground text-base">{prop.name}</h3>
                              <Badge variant="outline" className="text-xs shrink-0 border-primary/30 text-primary">
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
                                <p className="font-medium text-sm text-foreground">{formatCurrency(prop.expectedRent)}</p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground">Collected</p>
                                <p className="font-medium text-sm text-foreground">{formatCurrency(prop.collectedRent)}</p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground">Outstanding</p>
                                <p className={`font-medium text-sm ${prop.outstandingArrears > 0 ? 'text-destructive font-semibold' : 'text-foreground'}`}>
                                  {formatCurrency(prop.outstandingArrears)}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground">Net to you</p>
                                <p className="font-semibold text-sm text-success">
                                  {formatCurrency(prop.netToYou)}
                                </p>
                              </div>
                            </div>
                          </div>
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-start lg:flex-col lg:w-44 lg:shrink-0">
                            {prop.manager_name && (
                              <div className="text-xs text-muted-foreground bg-muted/30 p-2.5 rounded-lg border border-border/40 flex-1">
                                <p className="font-semibold text-foreground">{prop.manager_name}</p>
                                <p className="text-[11px] truncate">{prop.manager_email}</p>
                                <Badge variant="secondary" className="mt-1 text-[10px]">Property Manager</Badge>
                              </div>
                            )}
                            <div className="flex gap-2 sm:flex-col sm:min-w-[10rem]">
                              <Button
                                size="sm"
                                className="btn-brand flex-1"
                                onClick={() => setDetailPropertyId(detailPropertyId === prop.id ? null : prop.id)}
                              >
                                {detailPropertyId === prop.id ? 'Hide details' : 'View details'}
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-muted-foreground flex-1"
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
                        <TableCell className="font-semibold text-foreground">{formatCurrency(payout.amount)}</TableCell>
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

          {/* ── Maintenance visibility — unit number / category only, no tenant PII ── */}
          <TabsContent value="maintenance" className="space-y-4">
            <Card className="border-border/60">
              <CardHeader className="pb-3 pt-4 px-4 sm:px-5 border-b border-border/40">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Wrench className="h-4 w-4 text-primary" />
                  Maintenance visibility
                </CardTitle>
                <CardDescription className="text-xs">
                  Open tickets by property and unit number. Tenant names and contact details are not shown.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 sm:p-5 space-y-4">
                {properties.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Link a property to see maintenance status.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Property</TableHead>
                          <TableHead className="text-right">Open</TableHead>
                          <TableHead></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {properties.map((prop) => (
                          <TableRow key={prop.id}>
                            <TableCell className="font-medium">{prop.name}</TableCell>
                            <TableCell className="text-right tabular-nums">{prop.openMaintenance}</TableCell>
                            <TableCell className="text-right">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setDetailPropertyId(prop.id);
                                  setActiveTab('properties');
                                }}
                              >
                                Unit detail
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
                {(portfolioData?.activities ?? []).filter((a) => a.type === 'maintenance').length > 0 && (
                  <ul className="space-y-2">
                    {portfolioData!.activities.filter((a) => a.type === 'maintenance').map((act) => (
                      <li key={act.id} className="rounded-lg border border-border bg-muted/20 p-3 text-sm">
                        <p className="text-foreground">{act.description}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {act.propertyName ?? 'Property'} · {format(new Date(act.timestamp), 'dd/MM/yyyy')}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
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
