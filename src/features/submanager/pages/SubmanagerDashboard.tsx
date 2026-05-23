import { format } from "date-fns";
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/features/auth/AuthContext';
import { Layout } from '@/shared/components/layout/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { Skeleton } from '@/shared/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';
import { Building2, Users, FileText, Wrench, Eye, Activity, Lock, CreditCard, CheckCircle, Play } from 'lucide-react';
import { useCurrency } from '@/shared/hooks/useCurrency';
import { useRBAC } from '@/shared/hooks/useRBAC';
import { useToast } from '@/shared/hooks/use-toast';
import { useActivityLog } from '@/shared/hooks/useActivityLog';

const SubmanagerDashboard = () => {
  const { user, isSubmanager, submanagerPermissions, loading: authLoading } = useAuth();
  const { can } = useRBAC();
  const { toast } = useToast();
  const { logActivity } = useActivityLog();
  const queryClient = useQueryClient();

  // Write action: update maintenance status
  const updateMaintenanceStatus = async (id: string, status: string, title: string) => {
    const { error } = await supabase
      .from('maintenance_requests')
      .update({ status, ...(status === 'completed' ? { completion_date: new Date().toISOString().slice(0, 10) } : {}) })
      .eq('id', id);
    if (error) { toast({ title: 'Failed', description: error.message, variant: 'destructive' }); return; }
    toast({ title: `Request ${status === 'in_progress' ? 'started' : 'completed'}`, description: title });
    logActivity({ action: `maintenance_${status}`, entityType: 'maintenance', entityId: id, entityLabel: title });
    queryClient.invalidateQueries({ queryKey: ['submanager-maintenance'] });
  };

  // Permissions from AuthContext — already fetched and property-scoped on login
  const permissions = submanagerPermissions;
  const navigate = useNavigate();
  const { formatCurrency } = useCurrency();

  // Redirect if not a submanager
  React.useEffect(() => {
    if (!authLoading && !isSubmanager) {
      navigate('/');
    }
  }, [authLoading, isSubmanager, navigate]);

  // Fetch manager info
  const { data: managerInfo } = useQuery({
    queryKey: ['submanager-manager-info', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      const { data: relationship } = await supabase
        .from('manager_submanagers')
        .select('manager_id')
        .eq('submanager_user_id', user.id)
        .maybeSingle();

      if (!relationship) return null;

      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, email')
        .eq('id', relationship.manager_id)
        .maybeSingle();

      return profile;
    },
    enabled: !!user?.id && isSubmanager,
  });

  // Fetch properties
  const { data: properties, isLoading: propertiesLoading } = useQuery({
    queryKey: ['submanager-properties', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('properties')
        .select('*')
        .order('name');
      
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id && isSubmanager && permissions?.can_view_properties,
  });

  // Fetch tenants — scoped to assigned properties only (restrict_to_assigned_properties)
  const { data: tenants, isLoading: tenantsLoading } = useQuery({
    queryKey: ['submanager-tenants', user?.id],
    queryFn: async () => {
      // Always scope by assigned properties if restrict_to_assigned_properties is set
      let query = supabase.from('tenants').select('*').order('name');

      if (permissions?.restrict_to_assigned_properties) {
        // Get assigned property IDs first
        const { data: assignments } = await supabase
          .from('submanager_property_assignments')
          .select('property_id')
          .eq('submanager_user_id', user!.id);
        const propIds = (assignments || []).map((a: any) => a.property_id);
        if (propIds.length === 0) return [];
        query = query.in('property_id', propIds);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id && isSubmanager && permissions?.can_view_tenants,
  });

  // Fetch leases — scoped to assigned properties + manager
  const { data: leases, isLoading: leasesLoading } = useQuery({
    queryKey: ['submanager-leases', user?.id],
    queryFn: async () => {
      let query = supabase.from('leases').select('*').order('created_at', { ascending: false });

      // Scope to assigned properties — RLS handles manager_id filter
      if (permissions?.restrict_to_assigned_properties && permissions.assigned_property_ids?.length > 0) {
        query = query.in('property_id', permissions.assigned_property_ids);
      } else if (permissions?.manager_id) {
        query = query.eq('manager_id', permissions.manager_id);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id && isSubmanager && permissions?.can_view_leases,
  });

  // Fetch invoices — scoped to assigned properties + manager
  const { data: invoices, isLoading: invoicesLoading } = useQuery({
    queryKey: ['submanager-invoices', user?.id],
    queryFn: async () => {
      let query = supabase.from('invoices').select('*').order('created_at', { ascending: false }).limit(20);

      // Scope to assigned properties — RLS handles manager_id filter
      if (permissions?.restrict_to_assigned_properties && permissions.assigned_property_ids?.length > 0) {
        query = query.in('property_id', permissions.assigned_property_ids);
      } else if (permissions?.manager_id) {
        query = query.eq('manager_id', permissions.manager_id);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id && isSubmanager && permissions?.can_view_invoices,
  });

  // Fetch maintenance requests — scoped to assigned properties
  const { data: maintenance, isLoading: maintenanceLoading } = useQuery({
    queryKey: ['submanager-maintenance', user?.id],
    queryFn: async () => {
      let query = supabase
        .from('maintenance_requests')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (permissions?.restrict_to_assigned_properties && permissions.assigned_property_ids?.length > 0) {
        // Scope by property_id via a join approach
        const propNames = await supabase
          .from('properties')
          .select('name')
          .in('id', permissions.assigned_property_ids);
        const names = (propNames.data || []).map((p: any) => p.name);
        if (names.length > 0) query = query.in('property_name', names);
        else return []; // no assigned properties = no results
      } else if (permissions?.manager_id) {
        query = query.eq('manager_id', permissions.manager_id);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id && isSubmanager && permissions?.can_view_maintenance,
  });

  // Fetch contracts
  const { data: contracts, isLoading: contractsLoading } = useQuery({
    queryKey: ['submanager-contracts', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contracts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);
      
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id && isSubmanager && permissions?.can_view_contracts,
  });

  // Fetch activity logs
  const { data: activityLogs, isLoading: activityLoading } = useQuery({
    queryKey: ['submanager-activity', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('activity_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);
      
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id && isSubmanager && permissions?.can_view_activity_logs,
  });

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isSubmanager) {
    return null;
  }

  const totalUnits = properties?.reduce((sum, p) => sum + (p.units || 0), 0) || 0;
  const totalOccupied = properties?.reduce((sum, p) => sum + (p.occupied || 0), 0) || 0;
  const occupancyRate = totalUnits > 0 ? Math.round((totalOccupied / totalUnits) * 100) : 0;

  const NoAccessCard = ({ title }: { title: string }) => (
    <Card>
      <CardContent className="py-12">
        <div className="flex flex-col items-center justify-center text-muted-foreground">
          <Lock className="h-12 w-12 mb-3 opacity-50" />
          <p className="font-medium">Access Restricted</p>
          <p className="text-sm">You don't have permission to view {title.toLowerCase()}</p>
        </div>
      </CardContent>
    </Card>
  );

  // Build available tabs based on permissions
  const availableTabs = [
    { value: 'properties', label: 'Properties', enabled: permissions?.can_view_properties },
    { value: 'tenants', label: 'Tenants', enabled: permissions?.can_view_tenants },
    { value: 'leases', label: 'Leases', enabled: permissions?.can_view_leases },
    { value: 'invoices', label: 'Invoices', enabled: permissions?.can_view_invoices },
    { value: 'maintenance', label: 'Maintenance', enabled: permissions?.can_view_maintenance },
    { value: 'contracts', label: 'Contracts', enabled: permissions?.can_view_contracts },
    { value: 'activity', label: 'Activity Log', enabled: permissions?.can_view_activity_logs },
  ].filter(tab => tab.enabled);

  const defaultTab = availableTabs.length > 0 ? availableTabs[0].value : 'properties';

  return (
    <Layout title="Submanager Dashboard" subtitle={permissions?.restrict_to_assigned_properties ? 'Scoped to assigned properties' : 'Full manager view'}>
      {/* Manager Info Banner */}
      <Card className="mb-6 bg-muted/50">
        <CardContent className="py-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Eye className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Reporting to</p>
              <p className="font-medium">{managerInfo?.full_name || managerInfo?.email || 'Manager'}</p>
            </div>
            <div className="ml-auto flex gap-2">
              {permissions?.restrict_to_assigned_properties && (
                <Badge variant="outline" className="text-xs border-amber-300 text-amber-700 bg-amber-50">
                  Assigned properties only
                </Badge>
              )}
              <Badge variant="secondary">View Access</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards - Only show enabled ones */}
      <div className="grid gap-4 md:grid-cols-4 mb-6">
        {permissions?.can_view_properties && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Properties</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{properties?.length || 0}</div>
              <p className="text-xs text-muted-foreground">{totalUnits} total units</p>
            </CardContent>
          </Card>
        )}
        {permissions?.can_view_tenants && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tenants</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{tenants?.length || 0}</div>
              <p className="text-xs text-muted-foreground">
                {tenants?.filter(t => t.status === 'active').length || 0} active
              </p>
            </CardContent>
          </Card>
        )}
        {permissions?.can_view_properties && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Occupancy</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{occupancyRate}%</div>
              <p className="text-xs text-muted-foreground">{totalOccupied} of {totalUnits} units</p>
            </CardContent>
          </Card>
        )}
        {permissions?.can_view_maintenance && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Maintenance</CardTitle>
              <Wrench className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {maintenance?.filter(m => m.status === 'open').length || 0}
              </div>
              <p className="text-xs text-muted-foreground">open requests</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Tabbed Content */}
      {availableTabs.length > 0 ? (
        <Tabs defaultValue={defaultTab} className="space-y-4">
          <TabsList>
            {availableTabs.map(tab => (
              <TabsTrigger key={tab.value} value={tab.value}>{tab.label}</TabsTrigger>
            ))}
          </TabsList>

          {permissions?.can_view_properties && (
            <TabsContent value="properties">
              <Card>
                <CardHeader>
                  <CardTitle>Properties</CardTitle>
                  <CardDescription>All properties managed</CardDescription>
                </CardHeader>
                <CardContent>
                  {propertiesLoading ? (
                    <div className="space-y-2">
                      {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
                    </div>
                  ) : properties && properties.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Address</TableHead>
                          <TableHead>Units</TableHead>
                          <TableHead>Occupied</TableHead>
                          <TableHead>Revenue</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {properties.map(property => (
                          <TableRow key={property.id}>
                            <TableCell className="font-medium">{property.name}</TableCell>
                            <TableCell>{property.address}</TableCell>
                            <TableCell>{property.units}</TableCell>
                            <TableCell>{property.occupied}</TableCell>
                            <TableCell>{formatCurrency(property.revenue)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <p className="text-muted-foreground text-center py-4">No properties found</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {permissions?.can_view_tenants && (
            <TabsContent value="tenants">
              <Card>
                <CardHeader>
                  <CardTitle>Tenants</CardTitle>
                  <CardDescription>All tenants in managed properties</CardDescription>
                </CardHeader>
                <CardContent>
                  {tenantsLoading ? (
                    <div className="space-y-2">
                      {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
                    </div>
                  ) : tenants && tenants.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Property</TableHead>
                          <TableHead>Unit</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {tenants.map(tenant => (
                          <TableRow key={tenant.id}>
                            <TableCell className="font-medium">{tenant.name}</TableCell>
                            <TableCell>{tenant.email}</TableCell>
                            <TableCell>{tenant.property || '-'}</TableCell>
                            <TableCell>{tenant.unit || '-'}</TableCell>
                            <TableCell>
                              <Badge variant={tenant.status === 'active' ? 'default' : 'secondary'}>
                                {tenant.status}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <p className="text-muted-foreground text-center py-4">No tenants found</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {permissions?.can_view_leases && (
            <TabsContent value="leases">
              <Card>
                <CardHeader>
                  <CardTitle>Lease Agreements</CardTitle>
                  <CardDescription>All lease agreements</CardDescription>
                </CardHeader>
                <CardContent>
                  {leasesLoading ? (
                    <div className="space-y-2">
                      {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
                    </div>
                  ) : leases && leases.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Property</TableHead>
                          <TableHead>Unit</TableHead>
                          <TableHead>Monthly Rent</TableHead>
                          <TableHead>Start Date</TableHead>
                          <TableHead>End Date</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {leases.map(lease => (
                          <TableRow key={lease.id}>
                            <TableCell className="font-medium">{lease.property}</TableCell>
                            <TableCell>{lease.unit}</TableCell>
                            <TableCell>{formatCurrency(lease.monthly_rent)}</TableCell>
                            <TableCell>{format(new Date(lease.start_date), 'dd/MM/yy')}</TableCell>
                            <TableCell>{format(new Date(lease.end_date), 'dd/MM/yy')}</TableCell>
                            <TableCell>
                              <Badge variant={lease.status === 'active' ? 'default' : 'secondary'}>
                                {lease.status}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <p className="text-muted-foreground text-center py-4">No leases found</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {permissions?.can_view_invoices && (
            <TabsContent value="invoices">
              <Card>
                <CardHeader>
                  <CardTitle>Invoices</CardTitle>
                  <CardDescription>Recent invoices</CardDescription>
                </CardHeader>
                <CardContent>
                  {invoicesLoading ? (
                    <div className="space-y-2">
                      {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
                    </div>
                  ) : invoices && invoices.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Invoice #</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Due Date</TableHead>
                          <TableHead>Status</TableHead>
                          {permissions?.can_record_payments && <TableHead>Action</TableHead>}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {invoices.map(invoice => (
                          <TableRow key={invoice.id}>
                            <TableCell className="font-medium">{invoice.invoice_number}</TableCell>
                            <TableCell>{formatCurrency(invoice.amount)}</TableCell>
                            <TableCell>{format(new Date(invoice.due_date), 'dd/MM/yy')}</TableCell>
                            <TableCell>
                              <Badge variant={invoice.status === 'paid' ? 'default' : invoice.status === 'overdue' ? 'destructive' : 'secondary'}>
                                {invoice.status}
                              </Badge>
                            </TableCell>
                            {permissions?.can_record_payments && (
                              <TableCell>
                                {invoice.status !== 'paid' && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-7 text-xs gap-1"
                                    onClick={() => {
                                      // Navigate manager portal billing page with invoice pre-selected
                                      window.location.href = `/billing?invoice=${invoice.id}`;
                                    }}
                                  >
                                    <CreditCard className="h-3 w-3" />Record
                                  </Button>
                                )}
                              </TableCell>
                            )}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <p className="text-muted-foreground text-center py-4">No invoices found</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {permissions?.can_view_maintenance && (
            <TabsContent value="maintenance">
              <Card>
                <CardHeader>
                  <CardTitle>Maintenance Requests</CardTitle>
                  <CardDescription>Recent maintenance requests</CardDescription>
                </CardHeader>
                <CardContent>
                  {maintenanceLoading ? (
                    <div className="space-y-2">
                      {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
                    </div>
                  ) : maintenance && maintenance.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Title</TableHead>
                          <TableHead>Property</TableHead>
                          <TableHead>Priority</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Created</TableHead>
                          {permissions?.can_manage_maintenance && <TableHead>Action</TableHead>}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {maintenance.map(request => (
                          <TableRow key={request.id}>
                            <TableCell className="font-medium">{request.title}</TableCell>
                            <TableCell>{request.property_name}</TableCell>
                            <TableCell>
                              <Badge variant={request.priority === 'high' || request.priority === 'urgent' ? 'destructive' : 'secondary'}>
                                {request.priority}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant={request.status === 'open' ? 'default' : 'secondary'}>
                                {request.status}
                              </Badge>
                            </TableCell>
                            <TableCell>{format(new Date(request.created_at), 'dd/MM/yy')}</TableCell>
                            {permissions?.can_manage_maintenance && (
                              <TableCell>
                                {request.status === 'open' && (
                                  <Button size="sm" variant="outline" className="h-7 text-xs gap-1"
                                    onClick={() => updateMaintenanceStatus(request.id, 'in_progress', request.title)}>
                                    <Play className="h-3 w-3" />Start
                                  </Button>
                                )}
                                {request.status === 'in_progress' && (
                                  <Button size="sm" className="h-7 text-xs gap-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                                    onClick={() => updateMaintenanceStatus(request.id, 'completed', request.title)}>
                                    <CheckCircle className="h-3 w-3" />Complete
                                  </Button>
                                )}
                              </TableCell>
                            )}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <p className="text-muted-foreground text-center py-4">No maintenance requests found</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {permissions?.can_view_contracts && (
            <TabsContent value="contracts">
              <Card>
                <CardHeader>
                  <CardTitle>Contracts</CardTitle>
                  <CardDescription>Recent contracts</CardDescription>
                </CardHeader>
                <CardContent>
                  {contractsLoading ? (
                    <div className="space-y-2">
                      {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
                    </div>
                  ) : contracts && contracts.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Title</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Valid From</TableHead>
                          <TableHead>Valid Until</TableHead>
                          <TableHead>Created</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {contracts.map(contract => (
                          <TableRow key={contract.id}>
                            <TableCell className="font-medium">{contract.title}</TableCell>
                            <TableCell>
                              <Badge variant={contract.status === 'active' ? 'default' : 'secondary'}>
                                {contract.status}
                              </Badge>
                            </TableCell>
                            <TableCell>{contract.valid_from ? format(new Date(contract.valid_from), 'dd/MM/yy') : '-'}</TableCell>
                            <TableCell>{contract.valid_until ? format(new Date(contract.valid_until), 'dd/MM/yy') : '-'}</TableCell>
                            <TableCell>{format(new Date(contract.created_at), 'dd/MM/yy')}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <p className="text-muted-foreground text-center py-4">No contracts found</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {permissions?.can_view_activity_logs && (
            <TabsContent value="activity">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5" />
                    Activity Log
                  </CardTitle>
                  <CardDescription>Recent manager activities</CardDescription>
                </CardHeader>
                <CardContent>
                  {activityLoading ? (
                    <div className="space-y-2">
                      {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
                    </div>
                  ) : activityLogs && activityLogs.length > 0 ? (
                    <div className="space-y-3">
                      {activityLogs.map(log => (
                        <div key={log.id} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                            <Activity className="h-4 w-4 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm">{log.action}</p>
                            <p className="text-xs text-muted-foreground">
                              {log.entity_type} • {new Date(log.created_at).toLocaleString()}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-center py-4">No activity logs found</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>
      ) : (
        <Card>
          <CardContent className="py-12">
            <div className="flex flex-col items-center justify-center text-muted-foreground">
              <Lock className="h-12 w-12 mb-3 opacity-50" />
              <p className="font-medium">No Permissions Granted</p>
              <p className="text-sm">Contact your manager to get access to view data</p>
            </div>
          </CardContent>
        </Card>
      )}
    </Layout>
  );
};

export default SubmanagerDashboard;
