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
  Home, LogOut, TrendingUp, Building2, FileText,
  Clock, CheckCircle, AlertCircle,
  Banknote, PieChart, MessageSquare,
  Settings, BarChart3, Users, Zap, CheckSquare, DollarSign, Activity, RefreshCw,
  AlertTriangle, Key, Wrench, ArrowRight, ShieldCheck, FileSpreadsheet, Layers
} from 'lucide-react';
import LandlordBankDetails from '@/features/landlord/components/LandlordBankDetails';
import LandlordFinancialStatement from '@/features/landlord/components/LandlordFinancialStatement';
import LandlordMessages from '@/features/landlord/components/LandlordMessages';
import LandlordPropertyDetail from '@/features/landlord/components/LandlordPropertyDetail';
import LandlordNotificationPreferences from '@/features/landlord/components/LandlordNotificationPreferences';
import LandlordDocuments from '@/features/landlord/components/LandlordDocuments';
import LandlordTeamSettings from '@/features/landlord/components/LandlordTeamSettings';
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

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-950/40 dark:text-yellow-300 dark:border-yellow-900',
  approved: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900',
  paid: 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900',
  rejected: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-900',
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
  const { data: portfolioData, isLoading: propertiesLoading } = useQuery({
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
  const { data: payouts = [], isLoading: payoutsLoading } = useQuery({
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
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-400" />
      </div>
    );
  }

  if (!isDevAccessEnabled() && (!user || userRole?.role !== 'landlord')) {
    return <Navigate to="/landlord/login" replace />;
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border/60 bg-card/90 backdrop-blur-xl">
        <div className="max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <img src={calqulusLogo} alt="CALQULUS PMS" className="h-9 w-auto object-contain flex-shrink-0" />
            <div className="min-w-0">
              <div className="font-heading font-bold text-sm text-gradient leading-none">CALQULUS PMS</div>
              <div className="text-[10px] text-muted-foreground tracking-wider uppercase">Portfolio & Investment Command Center</div>
            </div>
            <Badge variant="outline" className="ml-1 text-xs border-amber-400/30 text-amber-500 bg-amber-400/10">
              Property Owner Workspace
            </Badge>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => queryClient.invalidateQueries()}
              className="h-9 w-9 p-0 text-muted-foreground hover:text-foreground"
              title="Refresh Portfolio"
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

      <main className="max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">

        {/* ── EXECUTIVE ANSWERS MATRIX (5 EXECUTIVE QUESTIONS) ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* 1. What Do I Own? */}
          <Card className="border-l-4 border-l-purple-500 border-border/70 bg-card hover:shadow-md transition-all">
            <CardContent className="p-3.5">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400 flex items-center gap-1.5">
                  <Building2 className="h-3.5 w-3.5 shrink-0" />
                  What Do I Own?
                </span>
                <Badge variant="outline" className="text-[10px] h-4 border-purple-300 text-purple-700 dark:text-purple-400">
                  {portfolioData?.totalProperties ?? 0} Props
                </Badge>
              </div>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground truncate">Total Units:</span>
                  <span className="font-semibold text-foreground">{propertiesLoading ? "..." : `${portfolioData?.totalUnits ?? 0} units`}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground truncate">Occupied Units:</span>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">{propertiesLoading ? "..." : `${portfolioData?.totalOccupied ?? 0} units`}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground truncate">Vacant Units:</span>
                  <span className="font-semibold text-foreground">{propertiesLoading ? "..." : `${portfolioData?.totalVacant ?? 0} units`}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 2. How Is My Portfolio Performing? */}
          <Card className="border-l-4 border-l-emerald-500 border-border/70 bg-card hover:shadow-md transition-all">
            <CardContent className="p-3.5">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                  <PieChart className="h-3.5 w-3.5 shrink-0" />
                  Portfolio Health
                </span>
                <Badge variant="outline" className="text-[10px] h-4 border-emerald-300 text-emerald-700 dark:text-emerald-400">
                  {portfolioData?.occupancyRate ?? 0}% Occupancy
                </Badge>
              </div>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground truncate">Active Leases:</span>
                  <span className="font-semibold text-foreground">{propertiesLoading ? "..." : `${portfolioData?.activeLeasesCount ?? 0} active`}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground truncate">Collection Rate:</span>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                    {propertiesLoading || !portfolioData?.totalExpectedRent ? "..." : `${Math.min(100, Math.round(((portfolioData?.totalCollectedRent ?? 0) / (portfolioData?.totalExpectedRent || 1)) * 100))}%`}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground truncate">Open Repairs:</span>
                  <span className="font-medium text-foreground">{propertiesLoading ? "..." : `${portfolioData?.openMaintenanceCount ?? 0} open`}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 3. How Much Money Is Being Collected? */}
          <Card className="border-l-4 border-l-amber-500 border-border/70 bg-card hover:shadow-md transition-all">
            <CardContent className="p-3.5">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                  <DollarSign className="h-3.5 w-3.5 shrink-0" />
                  Collected This Month
                </span>
                <Badge variant="outline" className="text-[10px] h-4 border-amber-300 text-amber-700 dark:text-amber-400">
                  MTD
                </Badge>
              </div>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground truncate">Total Collected:</span>
                  <span className="font-bold text-foreground">{propertiesLoading ? "..." : fmt(portfolioData?.totalCollectedRent ?? 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground truncate">Net Landlord Share:</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">{propertiesLoading ? "..." : fmt(portfolioData?.netLandlordShareMTD ?? 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground truncate">Total Paid Out:</span>
                  <span className="font-semibold text-foreground">{payoutsLoading ? "..." : fmt(totalPaidOut)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 4. What Is Outstanding? */}
          <Card className="border-l-4 border-l-red-500 border-border/70 bg-card hover:shadow-md transition-all">
            <CardContent className="p-3.5">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-red-600 dark:text-red-400 flex items-center gap-1.5">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  What Is Outstanding?
                </span>
                <Badge variant="outline" className="text-[10px] h-4 border-red-200 text-red-700 dark:text-red-400">
                  Arrears
                </Badge>
              </div>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground truncate">Total Arrears:</span>
                  <span className="font-bold text-red-600 dark:text-red-400">{propertiesLoading ? "..." : fmt(portfolioData?.totalArrears ?? 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground truncate">Expected Rent:</span>
                  <span className="font-semibold text-foreground">{propertiesLoading ? "..." : fmt(portfolioData?.totalExpectedRent ?? 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground truncate">Uncollected Balance:</span>
                  <span className="font-semibold text-amber-600 dark:text-amber-400">
                    {propertiesLoading ? "..." : fmt(Math.max(0, (portfolioData?.totalExpectedRent ?? 0) - (portfolioData?.totalCollectedRent ?? 0)))}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 5. What Needs Attention? */}
          <Card className="border-l-4 border-l-sky-500 border-border/70 bg-card hover:shadow-md transition-all">
            <CardContent className="p-3.5">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-sky-600 dark:text-sky-400 flex items-center gap-1.5">
                  <CheckSquare className="h-3.5 w-3.5 shrink-0" />
                  What Needs Attention?
                </span>
                <Badge variant="outline" className="text-[10px] h-4 border-sky-300 text-sky-700 dark:text-sky-400">
                  {pendingPayouts + (portfolioData?.expiringLeasesCount ?? 0) + (portfolioData?.urgentMaintenanceCount ?? 0)} Alerts
                </Badge>
              </div>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground truncate">Pending Payouts:</span>
                  <span className="font-semibold text-amber-600 dark:text-amber-400">{pendingPayouts} awaiting review</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground truncate">Expiring Leases (30d):</span>
                  <span className="font-medium text-foreground">{portfolioData?.expiringLeasesCount ?? 0} leases</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground truncate">Urgent Repairs:</span>
                  <span className="font-medium text-foreground">{portfolioData?.urgentMaintenanceCount ?? 0} requests</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ── STATS CARDS ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            {
              label: 'Portfolio Properties',
              value: propertiesLoading ? '—' : String(portfolioData?.totalProperties ?? 0),
              sub: propertiesLoading ? '' : `${portfolioData?.totalUnits ?? 0} total units (${portfolioData?.totalVacant ?? 0} vacant)`,
              icon: Building2,
              iconBg: 'bg-gradient-to-br from-[hsl(214_73%_48%/0.15)] to-[hsl(214_73%_48%/0.05)] border-[hsl(214_73%_48%/0.2)]',
              iconColor: 'text-[hsl(214_73%_48%)]',
              accent: 'via-[hsl(214_73%_48%/0.6)]',
            },
            {
              label: 'Portfolio Occupancy',
              value: propertiesLoading ? '—' : `${portfolioData?.occupancyRate ?? 0}%`,
              sub: propertiesLoading ? '' : `${portfolioData?.totalOccupied ?? 0} of ${portfolioData?.totalUnits ?? 0} occupied`,
              icon: PieChart,
              iconBg: 'bg-gradient-to-br from-emerald-500/15 to-emerald-500/5 border-emerald-500/20',
              iconColor: 'text-emerald-500',
              accent: 'via-emerald-500/60',
              progress: propertiesLoading ? undefined : portfolioData?.occupancyRate,
            },
            {
              label: 'Net Share MTD',
              value: propertiesLoading ? '—' : fmt(portfolioData?.netLandlordShareMTD ?? 0),
              sub: 'Your portion of collected rent',
              icon: TrendingUp,
              iconBg: 'bg-gradient-to-br from-amber-400/15 to-amber-400/5 border-amber-400/25',
              iconColor: 'text-amber-500',
              accent: 'via-amber-400/60',
            },
            {
              label: 'Total Paid Out',
              value: payoutsLoading ? '—' : fmt(totalPaidOut),
              sub: payoutsLoading ? '' : `${pendingPayouts} request${pendingPayouts !== 1 ? 's' : ''} pending`,
              icon: Banknote,
              iconBg: 'bg-gradient-to-br from-[hsl(38_52%_42%/0.15)] to-[hsl(38_52%_42%/0.05)] border-[hsl(38_52%_42%/0.2)]',
              iconColor: 'text-[hsl(38_52%_42%)]',
              accent: 'via-[hsl(38_52%_42%/0.6)]',
            },
          ].map(stat => (
            <div
              key={stat.label}
              className="group relative overflow-hidden rounded-2xl border bg-card p-4 sm:p-5 shadow-sm transition-all duration-300 hover:shadow-lg hover:-translate-y-1 border-border/60 hover:border-amber-400/20"
            >
              <div className={`absolute top-0 left-0 right-0 h-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-r from-transparent ${stat.accent} to-transparent`} />
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1.5 min-w-0 flex-1">
                  <p className="text-xs font-semibold text-muted-foreground/70 uppercase tracking-widest truncate">{stat.label}</p>
                  {propertiesLoading || payoutsLoading ? (
                    <Skeleton className="h-7 w-24" />
                  ) : (
                    <p className="font-heading text-2xl font-bold text-card-foreground tracking-tight truncate">{stat.value}</p>
                  )}
                  {stat.sub && !propertiesLoading && !payoutsLoading && (
                    <p className="text-xs text-muted-foreground truncate">{stat.sub}</p>
                  )}
                </div>
                <div className={`rounded-xl border p-2.5 flex-shrink-0 shadow-sm transition-all duration-300 group-hover:scale-110 ${stat.iconBg}`}>
                  <stat.icon className={`h-5 w-5 ${stat.iconColor}`} />
                </div>
              </div>
              {stat.progress !== undefined && !propertiesLoading && (
                <div className="mt-3 pt-3 border-t border-border/40">
                  <div className="h-1.5 w-full rounded-full bg-muted/60 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-emerald-500 transition-all duration-700 ease-out"
                      style={{ width: `${Math.min(100, Math.max(0, stat.progress))}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* ── ARREARS URGENT ALERT BAR ── */}
        {!propertiesLoading && portfolioData && portfolioData.totalArrears > 0 && (
          <div className="flex items-center justify-between gap-4 rounded-xl border border-red-200 bg-red-50 dark:border-red-900/40 dark:bg-red-950/20 px-4 py-3">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-red-700 dark:text-red-400">
                  {fmt(portfolioData.totalArrears)} in outstanding arrears across your portfolio
                </p>
                <p className="text-xs text-red-600/70 dark:text-red-400/60 mt-0.5">
                  Your property manager is handling collection efforts for these accounts.
                </p>
              </div>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="border-red-200 text-red-700 hover:bg-red-100 dark:border-red-800 dark:text-red-400 shrink-0"
              onClick={() => setActiveTab('financials')}
            >
              View Financial Breakdown <ArrowRight className="h-3.5 w-3.5 ml-1" />
            </Button>
          </div>
        )}

        {/* ── WORKSPACE TABS ── */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6 flex-wrap h-auto gap-1 p-1 bg-muted/60 border border-border/60">
            <TabsTrigger value="properties" className="gap-1.5 text-xs">
              <Building2 className="h-3.5 w-3.5" />My Properties
            </TabsTrigger>
            <TabsTrigger value="financials" className="gap-1.5 text-xs">
              <BarChart3 className="h-3.5 w-3.5" />Financial Performance
            </TabsTrigger>
            <TabsTrigger value="payouts" className="gap-1.5 text-xs">
              <Banknote className="h-3.5 w-3.5" />
              Payout Requests
              {pendingPayouts > 0 && (
                <Badge className="ml-1 h-4 min-w-4 text-xs px-1 bg-amber-100 text-amber-700 border-amber-200">{pendingPayouts}</Badge>
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
            {propertiesLoading ? (
              Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-28 w-full rounded-xl" />)
            ) : properties.length === 0 ? (
              <Card className="border-amber-200 bg-amber-50/30 dark:border-amber-900/40 dark:bg-amber-950/20">
                <CardContent className="py-12 text-center space-y-4">
                  <Building2 className="h-12 w-12 mx-auto text-amber-500 mb-2" />
                  <div>
                    <h3 className="font-semibold text-amber-900 dark:text-amber-300">No properties linked to your account yet</h3>
                    <p className="text-sm text-amber-700 dark:text-amber-400 mt-1 max-w-md mx-auto">
                      To see your properties and revenue, your property manager needs to link them to your account.
                    </p>
                  </div>
                  <div className="rounded-lg border border-amber-200 dark:border-amber-800 bg-card p-4 text-left max-w-sm mx-auto space-y-2">
                    <p className="text-xs font-semibold text-amber-900 dark:text-amber-300 uppercase tracking-wide">Next steps</p>
                    <ol className="text-sm text-amber-800 dark:text-amber-400 space-y-1">
                      <li className="flex gap-2"><span className="font-bold shrink-0">1.</span>Share your account email with your property manager</li>
                      <li className="flex gap-2"><span className="font-bold shrink-0">2.</span>They will link your properties from their portal</li>
                      <li className="flex gap-2"><span className="font-bold shrink-0">3.</span>You will receive access immediately</li>
                    </ol>
                    <p className="text-xs text-amber-600 dark:text-amber-500 pt-1">Your email: <strong>{user?.email}</strong></p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              properties.map(prop => {
                const occRate = prop.units > 0 ? Math.round((prop.occupied / prop.units) * 100) : 0;
                const barColor = occRate >= 80 ? 'bg-emerald-500' : occRate >= 50 ? 'bg-amber-400' : 'bg-red-400';
                const textColor = occRate >= 80 ? 'text-emerald-600 dark:text-emerald-400' : occRate >= 50 ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400';
                return (
                  <React.Fragment key={prop.id}>
                    <Card className="border-border/60 hover:shadow-md transition-shadow">
                      <CardContent className="p-5">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-semibold truncate text-foreground text-base">{prop.name}</h3>
                              <Badge variant="outline" className="text-xs shrink-0 border-amber-400/30 text-amber-500">
                                {prop.revenue_share_pct}% revenue share
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground mb-3">{prop.address}</p>

                            {/* Occupancy bar */}
                            <div className="mb-3">
                              <div className="flex items-center justify-between text-xs mb-1">
                                <span className="text-muted-foreground flex items-center gap-1">
                                  <Users className="h-3 w-3" /> Occupancy Rate
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
                                <p className="text-xs text-muted-foreground">Units Status</p>
                                <p className="font-medium text-sm text-foreground">{prop.occupied} filled / {prop.vacant} vacant</p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground">Collected Rent (MTD)</p>
                                <p className="font-medium text-sm text-foreground">{fmt(prop.collectedRent)}</p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground">Your Share (MTD)</p>
                                <p className="font-semibold text-sm text-emerald-600 dark:text-emerald-400">
                                  {fmt(prop.collectedRent * prop.revenue_share_pct / 100)}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground">Arrears</p>
                                <p className={`font-medium text-sm ${prop.outstandingArrears > 0 ? 'text-red-600 dark:text-red-400 font-semibold' : 'text-foreground'}`}>
                                  {fmt(prop.outstandingArrears)}
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
                                variant="outline"
                                size="sm"
                                onClick={() => setDetailPropertyId(detailPropertyId === prop.id ? null : prop.id)}
                              >
                                {detailPropertyId === prop.id ? 'Hide Details' : 'View Property Details'}
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="border-amber-400/40 text-amber-700 dark:text-amber-300 hover:bg-amber-400/10"
                                onClick={() => {
                                  setSelectedProperty(prop.id);
                                  setPayoutDialogOpen(true);
                                }}
                              >
                                Request Payout
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
                  <Activity className="h-4 w-4 text-sky-500" />
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
                        <div className="h-8 w-8 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center shrink-0 mt-0.5">
                          {act.type === 'maintenance' ? <Wrench className="h-4 w-4 text-amber-500" /> : <FileText className="h-4 w-4 text-sky-500" />}
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
                  <Button className="bg-amber-500 hover:bg-amber-600 text-slate-900 font-semibold">
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
                      className="bg-amber-500 hover:bg-amber-600 text-slate-900 font-semibold"
                    >
                      {createPayout.isPending ? 'Submitting...' : 'Submit Request'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            {payoutsLoading ? (
              Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-xl" />)
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
