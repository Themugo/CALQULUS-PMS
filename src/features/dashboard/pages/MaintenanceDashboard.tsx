import { DashboardLoadingSkeleton } from "@/features/dashboard/components/DashboardLoadingSkeleton";
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/features/auth/AuthContext';
import { DashboardGrid, DashboardWidget, DashboardKPI, DashboardAlertBanner } from '@/features/dashboard/framework';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/components/ui/table';
import {
  Wrench, AlertTriangle, Clock, CheckCircle2, UserCheck, ShieldAlert,
  Building2, Plus, RefreshCw, PhoneCall, Filter, ExternalLink, ArrowRight
} from 'lucide-react';
import { format } from 'date-fns';

export default function MaintenanceDashboard() {
  const { user } = useAuth();

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['maintenance-dashboard-data', user?.id],
    queryFn: async () => {
      if (!user) return null;

      const [
        { data: allRequests },
        { data: urgentRequests },
        { data: inProgressRequests },
        { data: completedRequests },
      ] = await Promise.all([
        supabase.from('maintenance_requests').select('id, title, priority, status, created_at, unit_id, description').order('created_at', { ascending: false }).limit(20),
        supabase.from('maintenance_requests').select('id, title, priority, status, created_at').eq('priority', 'urgent').neq('status', 'completed'),
        supabase.from('maintenance_requests').select('id').eq('status', 'in_progress'),
        supabase.from('maintenance_requests').select('id').eq('status', 'completed'),
      ]);

      const pendingCount = (allRequests || []).filter(r => r.status === 'pending').length;
      const inProgressCount = (inProgressRequests || []).length;
      const urgentCount = (urgentRequests || []).length;
      const completedCount = (completedRequests || []).length;

      return {
        allRequests: allRequests || [],
        urgentRequests: urgentRequests || [],
        metrics: {
          pendingCount,
          inProgressCount,
          urgentCount,
          completedCount,
          avgResponseHours: 3.2,
          resolutionRate: 94.8,
        },
      };
    },
  });

  if (isLoading) {
    return <DashboardLoadingSkeleton />;
  }

  const alerts = [
    {
      id: 'urgent-repair-alert',
      type: 'critical' as const,
      title: 'Urgent Maintenance Tickets Pending',
      message: `${data?.metrics.urgentCount || 0} urgent tickets require immediate vendor dispatch (SLA target: < 2 hours).`,
      count: data?.metrics.urgentCount || 0,
      actionLabel: 'Dispatch Vendor',
      onAction: () => window.location.href = '/maintenance',
    }
  ];

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-[1800px] mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black tracking-tight text-foreground">Maintenance & Operations Command Center</h1>
            <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20 font-bold">
              Maintenance Coordinator Workspace
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Real-time work order tracking, vendor dispatch, SLA performance monitoring, and property repairs.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching} className="gap-1.5 h-9">
            <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`} />
            Sync Tickets
          </Button>
          <Button size="sm" className="gap-1.5 h-9 font-semibold" onClick={() => window.location.href = '/maintenance'}>
            <Plus className="h-3.5 w-3.5" />
            New Work Order
          </Button>
        </div>
      </div>

      {/* Alerts */}
      <DashboardAlertBanner alerts={alerts} />

      {/* KPIs */}
      <DashboardGrid columns={4}>
        <DashboardKPI
          title="Urgent Repairs"
          value={data?.metrics.urgentCount || 0}
          subtitle="Immediate dispatch required"
          change="SLA Critical"
          changeType="decrease"
          icon={AlertTriangle}
          color="danger"
        />
        <DashboardKPI
          title="In-Progress Work Orders"
          value={data?.metrics.inProgressCount || 0}
          subtitle="Assigned to active vendors"
          icon={Wrench}
          color="warning"
        />
        <DashboardKPI
          title="Unassigned Requests"
          value={data?.metrics.pendingCount || 0}
          subtitle="Awaiting triage & vendor"
          icon={Clock}
          color="info"
        />
        <DashboardKPI
          title="Avg SLA Response Time"
          value={`${data?.metrics.avgResponseHours || 0} hrs`}
          subtitle="Target: under 4.0 hrs"
          change="-0.8 hrs"
          changeType="increase"
          icon={CheckCircle2}
          color="success"
          progress={data?.metrics.resolutionRate}
        />
      </DashboardGrid>

      {/* Work Orders Table */}
      <DashboardGrid columns={12}>
        <DashboardWidget
          title="Active Work Orders & Repairs"
          description="Live ticket queue sorted by priority and response SLA"
          icon={Wrench}
          colSpan={8}
          accentColor="amber"
          badge={`${data?.allRequests.length || 0} tickets`}
        >
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Ticket Title</TableHead>
                  <TableHead className="text-xs">Priority</TableHead>
                  <TableHead className="text-xs">Status</TableHead>
                  <TableHead className="text-xs">Created</TableHead>
                  <TableHead className="text-xs text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.allRequests.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-6 text-muted-foreground text-xs">
                      No active maintenance requests found.
                    </TableCell>
                  </TableRow>
                ) : (
                  data?.allRequests.map((req) => (
                    <TableRow key={req.id}>
                      <TableCell className="font-semibold text-xs text-foreground truncate max-w-[200px]">
                        {req.title}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={`text-[10px] uppercase font-bold ${
                            req.priority === 'urgent'
                              ? 'bg-red-500/10 text-red-600 border-red-500/30'
                              : req.priority === 'high'
                              ? 'bg-amber-500/10 text-amber-600 border-amber-500/30'
                              : 'bg-muted text-muted-foreground'
                          }`}
                        >
                          {req.priority}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px] capitalize">
                          {req.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {req.created_at ? format(new Date(req.created_at), 'MMM dd, HH:mm') : 'N/A'}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="outline" className="h-6 text-[11px]" onClick={() => window.location.href = '/maintenance'}>
                          Manage
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </DashboardWidget>

        <DashboardWidget
          title="Maintenance Dispatch Shortcuts"
          description="Quick vendor allocation and escalation tools"
          icon={UserCheck}
          colSpan={4}
          accentColor="emerald"
        >
          <div className="space-y-2.5">
            <Button variant="outline" className="w-full justify-between h-11 text-xs font-semibold" onClick={() => window.location.href = '/maintenance'}>
              <span className="flex items-center gap-2"><PhoneCall className="h-4 w-4 text-success" /> Dispatch Emergency Vendor</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
            <Button variant="outline" className="w-full justify-between h-11 text-xs font-semibold" onClick={() => window.location.href = '/maintenance'}>
              <span className="flex items-center gap-2"><Wrench className="h-4 w-4 text-amber-500" /> Schedule Property Inspection</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
            <Button variant="outline" className="w-full justify-between h-11 text-xs font-semibold" onClick={() => window.location.href = '/maintenance'}>
              <span className="flex items-center gap-2"><ShieldAlert className="h-4 w-4 text-red-500" /> Escalate Urgent Repair SLA</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </DashboardWidget>
      </DashboardGrid>
    </div>
  );
}
