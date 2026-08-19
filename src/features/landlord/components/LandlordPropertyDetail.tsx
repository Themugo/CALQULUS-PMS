// @ts-nocheck — Phase 12: remaining local types until live supabase gen types
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Badge } from '@/shared/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';
import { Skeleton } from '@/shared/components/ui/skeleton';
import { Progress } from '@/shared/components/ui/progress';
import {
  Building2, Home, Wrench, DollarSign, BarChart3, CheckCircle
} from 'lucide-react';
import { occupancyRateColor, maintenancePriorityTone, maintenanceStatusTone, statusBadgeClass } from '@/shared/lib/statusBadge';
import { format, differenceInDays } from 'date-fns';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid
} from 'recharts';

const fmt = (n: number) =>
  new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', minimumFractionDigits: 0 }).format(n);

const STATUS_BADGE: Record<string, string> = {
  occupied:    'bg-success/15 text-success border-success/30',
  vacant:      'bg-warning/15 text-warning border-warning/30',
  maintenance: 'bg-destructive/15 text-destructive border-destructive/30',
  reserved:    'bg-teal/15 text-teal border-teal/30',
};

interface Props {
  propertyId: string;
  propertyName: string;
  revenueSharePct: number;
}

const LandlordPropertyDetail: React.FC<Props> = ({ propertyId, propertyName, revenueSharePct }) => {

  // Units — no tenant personal data (name/email/phone) — only unit facts
  const { data: units = [], isLoading: unitsLoading } = useQuery({
    queryKey: ['landlord-units', propertyId],
    queryFn: async () => {
      const { data } = await supabase
        .from('units')
        .select(`
          id, unit_number, label, status, monthly_rent,
          unit_type, floor_number, bedrooms, house_deposit,
          available_from
        `)
        .eq('property_id', propertyId)
        .neq('status', 'inactive')
        .order('unit_number');
      return (data || []) as Array<{ id: string; unit_number: string; status: string; monthly_rent: number }>;
    },
  });

  const { data: ops, isLoading: opsLoading } = useQuery({
    queryKey: ['landlord-property-ops', propertyId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_landlord_property_ops', { p_property_id: propertyId });
      if (error) throw error;
      const payload = (data ?? {}) as {
        unit_revenue?: Record<string, { billed: number; collected: number }>;
        trend?: Array<{ month: string; gross: number }>;
        maintenance?: Array<{
          id: string; unit_number: string; unit_id: string | null; category: string;
          priority: string; status: string; requested_date: string; completion_date: string | null;
          budget: number | null; deposit_deduction_amount: number | null; created_at: string;
        }>;
      };
      return payload;
    },
  });

  const unitRevenue = ops?.unit_revenue ?? {};
  const maintenance = ops?.maintenance ?? [];
  const trend = (ops?.trend ?? []).map((row) => ({
    month: row.month,
    gross: Number(row.gross),
    net: Math.round(Number(row.gross) * revenueSharePct / 100),
  }));
  const maintLoading = opsLoading;

  const totalUnits = units.length;
  const occupiedUnits = units.filter(u => u.status === 'occupied').length;
  const vacantUnits = units.filter(u => u.status === 'vacant').length;
  const maintenanceUnits = units.filter(u => u.status === 'maintenance').length;
  const occupancyRate = totalUnits > 0 ? Math.round((occupiedUnits / totalUnits) * 100) : 0;
  const openMaintenance = maintenance.filter(m => m.status !== 'completed').length;
  const monthlyGross = units.filter(u => u.status === 'occupied')
    .reduce((s, u) => s + Number(u.monthly_rent ?? 0), 0);

  return (
    <div className="space-y-6">
      {/* Summary KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Occupancy', value: `${occupancyRate}%`, sub: `${occupiedUnits}/${totalUnits} units`, icon: Home, color: occupancyRateColor(occupancyRate), bg: 'bg-card' },
          { label: 'Vacant units', value: vacantUnits, sub: maintenanceUnits > 0 ? `+${maintenanceUnits} on maintenance` : 'Ready to let', icon: Building2, color: 'text-muted-foreground', bg: 'bg-card' },
          { label: 'Billed', value: fmt(monthlyGross), sub: `${fmt(Math.round(monthlyGross * revenueSharePct / 100))} net to you`, icon: DollarSign, color: 'text-foreground', bg: 'bg-card' },
          { label: 'Open maintenance', value: openMaintenance, sub: openMaintenance > 0 ? 'Requires attention' : 'All clear', icon: Wrench, color: openMaintenance > 0 ? 'text-destructive' : 'text-success', bg: 'bg-card' },
        ].map(s => (
          <div key={s.label} className={`rounded-xl border border-border p-4 ${s.bg}`}>
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs text-muted-foreground">{s.label}</p>
              <s.icon className={`h-4 w-4 ${s.color}`} />
            </div>
            <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{s.sub}</p>
          </div>
        ))}
      </div>

      <Tabs defaultValue="units">
        <TabsList className="flex-wrap h-auto gap-1 p-1">
          <TabsTrigger value="units" className="text-xs gap-1.5">
            <Home className="h-3.5 w-3.5" />Units ({totalUnits})
          </TabsTrigger>
          <TabsTrigger value="maintenance" className="text-xs gap-1.5">
            <Wrench className="h-3.5 w-3.5" />
            Maintenance
            {openMaintenance > 0 && (
              <span className="ml-1 h-4 w-4 rounded-full bg-destructive text-destructive-foreground text-xs flex items-center justify-center font-bold">{openMaintenance}</span>
            )}
          </TabsTrigger>
          <TabsTrigger value="revenue" className="text-xs gap-1.5">
            <BarChart3 className="h-3.5 w-3.5" />Revenue trend
          </TabsTrigger>
        </TabsList>

        {/* ── Units tab ── */}
        <TabsContent value="units" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Unit occupancy — {propertyName}</CardTitle>
              <CardDescription>
                Unit numbers and status only — tenant personal information is managed privately by your property manager.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {unitsLoading ? (
                <div className="space-y-2">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
              ) : (
                <div className="space-y-2">
                  {units.map(unit => {
                    const rev = unitRevenue[unit.id];
                    const daysVacant = unit.status === 'vacant' && unit.available_from
                      ? differenceInDays(new Date(), new Date(unit.available_from))
                      : null;
                    return (
                      <div key={unit.id} className={`flex items-center justify-between p-3 rounded-lg border ${
                        unit.status === 'vacant' ? 'border-warning/30 bg-warning/5' :
                        unit.status === 'maintenance' ? 'border-destructive/30 bg-destructive/5' :
                        'border-border'
                      }`}>
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`h-8 w-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${
                            unit.status === 'occupied' ? 'bg-success/15 text-success' :
                            unit.status === 'vacant' ? 'bg-warning/15 text-warning' :
                            'bg-destructive/15 text-destructive'
                          }`}>
                            {(unit.label || unit.unit_number).slice(-2)}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="text-sm font-medium">{unit.label || unit.unit_number}</p>
                              <Badge variant="outline" className={`text-xs ${STATUS_BADGE[unit.status] || ''}`}>
                                {unit.status}
                              </Badge>
                              {unit.bedrooms && <span className="text-xs text-muted-foreground">{unit.bedrooms}BR</span>}
                              {unit.floor_number && <span className="text-xs text-muted-foreground">Floor {unit.floor_number}</span>}
                            </div>
                            {daysVacant !== null && daysVacant > 0 && (
                              <p className="text-xs text-warning mt-0.5">
                                Vacant {daysVacant} day{daysVacant !== 1 ? 's' : ''}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          {unit.monthly_rent && (
                            <p className="text-sm font-semibold">{fmt(unit.monthly_rent)}/mo</p>
                          )}
                          {rev && (
                            <p className={`text-xs mt-0.5 ${rev.collected < rev.billed ? 'text-warning' : 'text-success'}`}>
                              {fmt(rev.collected)} collected
                              {rev.collected < rev.billed && ` · ${fmt(rev.billed - rev.collected)} outstanding`}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Occupancy progress */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium">Overall occupancy</p>
                <span className="text-sm font-bold text-success">{occupancyRate}%</span>
              </div>
              <Progress value={occupancyRate} className="h-3" />
              <div className="flex justify-between text-xs text-muted-foreground mt-2">
                <span>{occupiedUnits} occupied</span>
                <span>{vacantUnits} vacant</span>
                {maintenanceUnits > 0 && <span>{maintenanceUnits} maintenance</span>}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Maintenance tab ── */}
        <TabsContent value="maintenance" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Wrench className="h-4 w-4" />
                Maintenance requests — {propertyName}
              </CardTitle>
              <CardDescription>
                Unit numbers and categories only — managed by your property manager.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {maintLoading ? (
                <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
              ) : maintenance.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">
                  <CheckCircle className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No maintenance requests</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {maintenance.map(m => (
                    <div key={m.id} className={`flex items-center justify-between p-3 rounded-lg border ${
                      m.status === 'completed' ? 'border-success/30 bg-success/5 opacity-75' :
                      m.priority === 'urgent' || m.priority === 'high' ? 'border-destructive/30 bg-destructive/5' :
                      'border-border'
                    }`}>
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-medium">{m.unit_number ? `Unit ${m.unit_number}` : 'Common area'}</p>
                            <Badge variant="outline" className={`text-xs ${statusBadgeClass(maintenanceStatusTone(m.status))}`}>
                              {m.status?.replace('_', ' ')}
                            </Badge>
                            {(m.priority === 'urgent' || m.priority === 'high') && (
                              <span className={statusBadgeClass(maintenancePriorityTone(m.priority))}>
                                {m.priority === 'urgent' ? 'Urgent' : 'High'}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {m.category || 'Maintenance'}
                            {m.unit_number && ` · Unit ${m.unit_number}`}
                            {m.requested_date && ` · Submitted ${format(new Date(m.requested_date), 'dd/MM/yy')}`}
                            {m.completion_date && ` · Resolved ${format(new Date(m.completion_date), 'dd/MM/yy')}`}
                          </p>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        {m.budget && <p className="text-xs text-muted-foreground">Budget: {fmt(m.budget)}</p>}
                        {m.deposit_deduction_amount > 0 && (
                          <p className="text-xs text-warning">Deposit deduction: {fmt(m.deposit_deduction_amount)}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Revenue trend tab ── */}
        <TabsContent value="revenue" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">6-month revenue — {propertyName}</CardTitle>
              <CardDescription>Collected vs net to you ({revenueSharePct}% share)</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={trend} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`} />
                  <Tooltip formatter={(v: number) => fmt(v)} />
                  <Bar dataKey="gross" name="Collected" fill="hsl(var(--teal))" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="net" name={`Net to you (${revenueSharePct}%)`} fill="hsl(var(--success))" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
              <div className="flex gap-4 justify-center mt-2 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><span className="h-3 w-3 rounded-sm bg-teal inline-block" />Collected</span>
                <span className="flex items-center gap-1"><span className="h-3 w-3 rounded-sm bg-success inline-block" />Net to you ({revenueSharePct}%)</span>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default LandlordPropertyDetail;
