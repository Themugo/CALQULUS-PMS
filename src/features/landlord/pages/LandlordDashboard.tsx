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
  Settings, BarChart3, Users, Zap, CheckSquare, DollarSign, Activity, RefreshCw
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
  revenue: number;
  revenue_share_pct: number;
  manager_id: string | null;
  manager_name: string | null;
  manager_email: string | null;
  assigned_at: string;
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

const fmt = (n: number, currency = 'KES') =>
  new Intl.NumberFormat('en-KE', { style: 'currency', currency, minimumFractionDigits: 0 }).format(n);

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  approved: 'bg-[hsl(214_73%_48%/0.12)] text-[hsl(214_73%_35%)] border-[hsl(214_73%_48%/0.25)]',
  paid: 'bg-green-100 text-green-800 border-green-200',
  rejected: 'bg-red-100 text-red-800 border-red-200',
};

const LandlordDashboard = () => {
  const { user, userRole, signOut, loading } = useAuth();
  const { toast } = useToast();
  const _navigate = useNavigate();
  const queryClient = useQueryClient();

  const [payoutDialogOpen, setPayoutDialogOpen] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState<string>('');
  const [payoutAmount, setPayoutAmount] = useState('');
  const [payoutPeriodStart, setPayoutPeriodStart] = useState('');
  const [payoutPeriodEnd, setPayoutPeriodEnd] = useState('');
  const [payoutNotes, setPayoutNotes] = useState('');
  const [detailPropertyId, setDetailPropertyId] = useState<string | null>(null);

  // ── Fetch landlord's properties ──────────────────────────────────
  const { data: properties = [], isLoading: propertiesLoading } = useQuery({
    queryKey: ['landlord-properties', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data: links, error } = await supabase
        .from('property_landlords')
        .select('property_id, revenue_share_pct, manager_id, assigned_at')
        .eq('landlord_user_id', user.id);

      if (error) throw error;
      if (!links || links.length === 0) return [];

      const propertyIds = links.map((l: { property_id: string }) => l.property_id);

      const { data: props } = await supabase
        .from('properties')
        .select('id, name, address, units, occupied, revenue, category_key, property_type')
        .in('id', propertyIds);

      // Fetch live unit-level occupancy from units table
      const { data: unitCounts } = await supabase
        .from('units')
        .select('property_id, status')
        .in('property_id', propertyIds);

      const unitMap: Record<string, { total: number; occupied: number; vacant: number }> = {};
      (unitCounts || []).forEach((u: { property_id: string; status: string }) => {
        if (!unitMap[u.property_id]) unitMap[u.property_id] = { total: 0, occupied: 0, vacant: 0 };
        unitMap[u.property_id].total++;
        if (u.status === 'occupied') unitMap[u.property_id].occupied++;
        else unitMap[u.property_id].vacant++;
      });

      const managerIds = links.filter((l: { manager_id: string | null }) => l.manager_id).map((l: { manager_id: string }) => l.manager_id);
      let profiles: Array<{ id: string; full_name: string; email: string }> = [];
      if (managerIds.length > 0) {
        const { data } = await supabase
          .from('profiles')
          .select('id, full_name, email')
          .in('id', managerIds);
        profiles = data || [];
      }

      return (props || []).map((p: { id: string; name: string; address: string; units: number; occupied: number; revenue: number }) => {
        const link = links.find((l: { property_id: string }) => l.property_id === p.id) as { revenue_share_pct: number; manager_id: string | null; assigned_at: string };
        const mgr = profiles.find((pr: { id: string }) => pr.id === link?.manager_id);
        const liveUnits = unitMap[p.id];
        return {
          ...p,
          units:    liveUnits?.total    ?? p.units,
          occupied: liveUnits?.occupied ?? p.occupied,
          vacant:   liveUnits?.vacant   ?? (p.units - p.occupied),
          revenue_share_pct: link?.revenue_share_pct ?? 100,
          manager_id:    link?.manager_id ?? null,
          manager_name:  mgr?.full_name ?? null,
          manager_email: mgr?.email ?? null,
          assigned_at:   link?.assigned_at,
        } as PropertySummary;
      });
    },
    enabled: !!user && userRole?.role === 'landlord',
  });

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
      const managerId = (prop as { manager_id?: string | null })?.manager_id ?? null;
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
      const isManaged = !!(prop as { manager_id?: string | null })?.manager_id;
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

  // ── Computed summary stats ───────────────────────────────────────
  const totalUnits = properties.reduce((s, p) => s + p.units, 0);
  const totalOccupied = properties.reduce((s, p) => s + p.occupied, 0);
  const totalRevenue = properties.reduce((s, p) => s + (p.revenue * p.revenue_share_pct / 100), 0);
  const occupancyRate = totalUnits > 0 ? Math.round((totalOccupied / totalUnits) * 100) : 0;
  const pendingPayouts = payouts.filter(p => p.status === 'pending').length;
  const totalPaid = payouts.filter(p => p.status === 'paid').reduce((s, p) => s + p.amount, 0);

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
              <div className="text-[10px] text-muted-foreground tracking-wider">EXECUTIVE LANDLORD PORTAL</div>
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

      <main className="max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">

        {/* ── EXECUTIVE INTELLIGENCE ANSWERS MATRIX ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* 1. What requires attention? */}
          <Card className="border-l-4 border-l-amber-500 border-border/70 bg-card hover:shadow-md transition-all">
            <CardContent className="p-3.5">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                  <AlertCircle className="h-3.5 w-3.5" />
                  What Requires Attention?
                </span>
                <Badge variant="outline" className="text-[10px] h-4 border-amber-300 text-amber-700 dark:text-amber-400">
                  {pendingPayouts} Pending
                </Badge>
              </div>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Pending Payout Requests:</span>
                  <span className="font-semibold text-amber-600 dark:text-amber-400">{pendingPayouts}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Properties Managed:</span>
                  <span className="font-semibold text-foreground">{properties.length} active</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Vacant Units:</span>
                  <span className="font-semibold text-foreground">{totalUnits - totalOccupied} vacant</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 2. What generates revenue? */}
          <Card className="border-l-4 border-l-emerald-500 border-border/70 bg-card hover:shadow-md transition-all">
            <CardContent className="p-3.5">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                  <DollarSign className="h-3.5 w-3.5" />
                  What Generates Revenue?
                </span>
                <Badge variant="outline" className="text-[10px] h-4 border-emerald-300 text-emerald-700 dark:text-emerald-400">
                  {occupancyRate}% Occupancy
                </Badge>
              </div>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Net Share MTD:</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">{fmt(totalRevenue)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Paid Out:</span>
                  <span className="font-semibold text-foreground">{fmt(totalPaid)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Occupied Units:</span>
                  <span className="font-medium text-foreground">{totalOccupied} of {totalUnits}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 3. What needs approval? */}
          <Card className="border-l-4 border-l-sky-500 border-border/70 bg-card hover:shadow-md transition-all">
            <CardContent className="p-3.5">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-sky-600 dark:text-sky-400 flex items-center gap-1.5">
                  <CheckSquare className="h-3.5 w-3.5" />
                  What Needs Approval?
                </span>
                <Badge variant="outline" className="text-[10px] h-4 border-sky-300 text-sky-700 dark:text-sky-400">
                  Payout Tracker
                </Badge>
              </div>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Manager Payout Reviews:</span>
                  <span className="font-medium text-foreground">{pendingPayouts} awaiting review</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Approved Payouts:</span>
                  <span className="font-medium text-emerald-600">{payouts.filter(p => p.status === 'approved' || p.status === 'paid').length} processed</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 4. Portfolio Scope */}
          <Card className="border-l-4 border-l-purple-500 border-border/70 bg-card hover:shadow-md transition-all">
            <CardContent className="p-3.5">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400 flex items-center gap-1.5">
                  <Building2 className="h-3.5 w-3.5" />
                  Portfolio Summary
                </span>
                <Badge variant="outline" className="text-[10px] h-4 border-purple-300 text-purple-700 dark:text-purple-400">
                  {properties.length} Properties
                </Badge>
              </div>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Units Owned:</span>
                  <span className="font-semibold text-foreground">{totalUnits} units</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Occupancy Rate:</span>
                  <span className="font-semibold text-emerald-600">{occupancyRate}%</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ── KPI GRID ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            {
              label: 'My Properties',
              value: propertiesLoading ? '—' : String(properties.length),
              sub: propertiesLoading ? '' : `${totalUnits} total units`,
              icon: Building2,
              iconBg: 'bg-gradient-to-br from-[hsl(214_73%_48%/0.15)] to-[hsl(214_73%_48%/0.05)] border-[hsl(214_73%_48%/0.2)]',
              iconColor: 'text-[hsl(214_73%_48%)]',
              accent: 'via-[hsl(214_73%_48%/0.6)]',
            },
            {
              label: 'Occupancy Rate',
              value: propertiesLoading ? '—' : `${occupancyRate}%`,
              sub: propertiesLoading ? '' : `${totalOccupied} of ${totalUnits} occupied`,
              icon: PieChart,
              iconBg: 'bg-gradient-to-br from-emerald-500/15 to-emerald-500/5 border-emerald-500/20',
              iconColor: 'text-emerald-500',
              accent: 'via-emerald-500/60',
              progress: propertiesLoading ? undefined : occupancyRate,
            },
            {
              label: 'Revenue Share MTD',
              value: propertiesLoading ? '—' : fmt(totalRevenue),
              sub: 'Your portion of collected rent',
              icon: TrendingUp,
              iconBg: 'bg-gradient-to-br from-amber-400/15 to-amber-400/5 border-amber-400/25',
              iconColor: 'text-amber-500',
              accent: 'via-amber-400/60',
            },
            {
              label: 'Total Paid Out',
              value: payoutsLoading ? '—' : fmt(totalPaid),
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

        {/* ── WORKSPACE TABS ── */}
        <Tabs defaultValue="properties">
          <TabsList className="mb-6 flex-wrap h-auto gap-1 p-1 bg-muted/60 border border-border/60">
            <TabsTrigger value="properties" className="gap-1.5 text-xs">
              <Building2 className="h-3.5 w-3.5" />My Properties
            </TabsTrigger>
            <TabsTrigger value="financials" className="gap-1.5 text-xs">
              <BarChart3 className="h-3.5 w-3.5" />Financials
            </TabsTrigger>
            <TabsTrigger value="payouts" className="gap-1.5 text-xs">
              <Banknote className="h-3.5 w-3.5" />
              Payout Requests
              {pendingPayouts > 0 && (
                <Badge className="ml-1 h-4 min-w-4 text-xs px-1 bg-amber-100 text-amber-700 border-amber-200">{pendingPayouts}</Badge>
              )}
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
                          <h3 className="font-semibold truncate text-foreground">{prop.name}</h3>
                          <Badge variant="outline" className="text-xs shrink-0 border-amber-400/30 text-amber-500">
                            {prop.revenue_share_pct}% share
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-3">{prop.address}</p>

                        {/* Occupancy bar */}
                        <div className="mb-3">
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className="text-muted-foreground flex items-center gap-1">
                              <Users className="h-3 w-3" /> Occupancy
                            </span>
                            <span className={`font-medium ${textColor}`}>{occRate}%</span>
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
                                <p className="text-xs">{prop.occupied} of {prop.units} units occupied</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <p className="text-xs text-muted-foreground">Units</p>
                            <p className="font-medium text-sm text-foreground">{prop.occupied}/{prop.units} filled</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Your share (MTD)</p>
                            <p className="font-medium text-sm text-emerald-600 dark:text-emerald-400">
                              {fmt(prop.revenue * prop.revenue_share_pct / 100)}
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        {prop.manager_name && (
                          <div className="text-xs text-muted-foreground">
                            <p className="font-medium text-foreground">{prop.manager_name}</p>
                            <p>{prop.manager_email}</p>
                            <p className="mt-0.5 text-xs opacity-60">Property Manager</p>
                          </div>
                        )}
                        <div className="flex flex-col gap-2 mt-3">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setDetailPropertyId(detailPropertyId === prop.id ? null : prop.id)}
                          >
                            {detailPropertyId === prop.id ? 'Hide details' : 'View details'}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
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
                  <div className="mt-3 border border-border rounded-xl p-4 bg-muted/10">
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

          {/* ── Payouts Tab ── */}
          <TabsContent value="payouts" className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-foreground">Payout Requests</h2>
                <p className="text-sm text-muted-foreground">Submit and track revenue payout requests to your manager</p>
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
                      Your manager will review and approve this request.
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
                          <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full border ${statusColors[payout.status]}`}>
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
                  <p className="text-sm">Link a property first to view financials.</p>
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
