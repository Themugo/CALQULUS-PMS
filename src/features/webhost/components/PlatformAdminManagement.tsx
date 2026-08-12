import { format } from 'date-fns';
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';
import { Switch } from '@/shared/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/shared/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/shared/components/ui/alert-dialog';
import { Badge } from '@/shared/components/ui/badge';
import { useToast } from '@/shared/hooks/use-toast';
import { useAuth, type PlatformAdminInfo, type PlatformAdminType } from '@/features/auth/AuthContext';
import { Crown, Shield, User, UserPlus, Ban, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { useActivityLog } from '@/shared/hooks/useActivityLog';

const ADMIN_TYPE_LABELS: Record<PlatformAdminType, string> = {
  owner: 'Owner',
  business: 'Business',
  admin: 'Admin',
};

const ADMIN_TYPE_BADGES: Record<PlatformAdminType, React.ReactNode> = {
  owner: <Badge className="bg-amber-400/15 text-amber-300 border-amber-400/30 font-extrabold shadow-sm"><Crown className="h-3 w-3 mr-1 text-amber-400" />Owner (Immutable)</Badge>,
  business: <Badge className="bg-emerald-500/15 text-emerald-300 border-emerald-500/30 font-bold"><Shield className="h-3 w-3 mr-1 text-emerald-400" />Business</Badge>,
  admin: <Badge variant="outline" className="border-slate-700 text-slate-300 font-medium"><User className="h-3 w-3 mr-1 text-slate-400" />Admin</Badge>,
};

const SUSPENSION_RULES = {
  owner: 'Cannot be suspended (immutable)',
  business: 'Can be suspended by Owner only',
  admin: 'Can be suspended by Owner or Business',
};

const PlatformAdminManagement = () => {
  const { toast } = useToast();
  const { user: currentUser, isPlatformOwner, isPlatformBusiness, platformAdminInfo } = useAuth();
  const queryClient = useQueryClient();
  const { logActivity } = useActivityLog();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [suspendTarget, setSuspendTarget] = useState<PlatformAdminInfo | null>(null);
  const [suspendReason, setSuspendReason] = useState('');
  const [newAdmin, setNewAdmin] = useState({
    email: '',
    password: '',
    displayName: '',
    adminType: 'admin' as PlatformAdminType,
  });

  const canManage = isPlatformOwner || isPlatformBusiness;
  const canCreateOwner = isPlatformOwner;

  const { data: admins, isLoading } = useQuery({
    queryKey: ['platform-admins'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('platform_admins')
        .select('*')
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data as PlatformAdminInfo[];
    },
    enabled: canManage,
  });

  const canSuspend = (admin: PlatformAdminInfo): boolean => {
    if (admin.is_immutable) return false;
    if (isPlatformOwner) return true;
    if (isPlatformBusiness && admin.admin_type !== 'owner') return true;
    return false;
  };

  const createAdmin = useMutation({
    mutationFn: async () => {
      const redirectUrl = `${window.location.origin}/webhost/dashboard`;
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: newAdmin.email,
        password: newAdmin.password,
        options: {
          emailRedirectTo: redirectUrl,
          data: { full_name: newAdmin.displayName },
        },
      });
      if (authError) throw authError;
      if (!authData.user) throw new Error('Failed to create user');
      const { error: roleError } = await supabase
        .from('user_roles')
        .insert({ user_id: authData.user.id, role: 'webhost', approval_status: 'approved' });
      if (roleError) throw roleError;
      const { error: permError } = await supabase
        .from('admin_permissions')
        .insert({
          user_id: authData.user.id,
          admin_level: newAdmin.adminType === 'owner' ? 'super_admin' : newAdmin.adminType === 'business' ? 'super_admin' : 'admin',
          can_manage_managers: true,
          can_manage_billing: true,
          can_manage_properties: true,
          can_create_webhosts: newAdmin.adminType === 'owner',
          can_manage_system_landlords: true,
          can_view_activity_logs: true,
          created_by: currentUser?.id,
        });
      if (permError) throw permError;
      const { error } = await supabase
        .from('platform_admins')
        .insert({
          user_id: authData.user.id,
          admin_type: newAdmin.adminType,
          display_name: newAdmin.displayName,
          email: newAdmin.email,
          can_create_admins: newAdmin.adminType === 'owner' || newAdmin.adminType === 'business',
          can_manage_managers: true,
          can_manage_billing: true,
          can_manage_properties: true,
          can_manage_landlords: true,
          can_view_activity_logs: true,
          can_manage_platform_settings: newAdmin.adminType === 'owner' || newAdmin.adminType === 'business',
          is_immutable: newAdmin.adminType === 'owner',
          created_by: currentUser?.id,
        });
      if (error) throw error;
      logActivity({
        action: 'Created Platform Admin',
        entityType: 'platform_admins',
        entityId: authData.user.id,
        metadata: { email: newAdmin.email, adminType: newAdmin.adminType, name: newAdmin.displayName },
      });
    },
    onSuccess: () => {
      toast({ title: 'Platform admin created' });
      queryClient.invalidateQueries({ queryKey: ['platform-admins'] });
      setIsDialogOpen(false);
      setNewAdmin({ email: '', password: '', displayName: '', adminType: 'admin' });
    },
    onError: (err: Error) => {
      toast({ title: 'Failed', description: err.message, variant: 'destructive' });
    },
  });

  const toggleSuspend = useMutation({
    mutationFn: async ({ admin, reason }: { admin: PlatformAdminInfo; reason: string }) => {
      if (!canSuspend(admin)) throw new Error('You do not have permission to suspend this admin');
      const newSuspended = !admin.suspended;
      const { error } = await supabase
        .from('platform_admins')
        .update({
          suspended: newSuspended,
          suspended_at: newSuspended ? new Date().toISOString() : null,
          suspended_by: newSuspended ? currentUser?.id : null,
          suspension_reason: newSuspended ? reason : null,
          updated_by: currentUser?.id,
        })
        .eq('id', admin.id);
      if (error) throw error;
      // Also suspend/unsuspend admin_permissions for admin type
      if (admin.admin_type === 'admin') {
        await supabase.from('admin_permissions').update({ admin_level: newSuspended ? 'limited_admin' : 'admin' }).eq('user_id', admin.user_id);
      }
      logActivity({
        action: newSuspended ? 'Suspended Platform Admin' : 'Unsuspended Platform Admin',
        entityType: 'platform_admins',
        entityId: admin.id,
        metadata: { email: admin.email, reason, by: currentUser?.email },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platform-admins'] });
      setSuspendTarget(null);
      setSuspendReason('');
      toast({ title: 'Updated' });
    },
    onError: (err: Error) => {
      toast({ title: 'Failed', description: err.message, variant: 'destructive' });
    },
  });

  const deleteAdmin = useMutation({
    mutationFn: async (admin: PlatformAdminInfo) => {
      if (admin.is_immutable) throw new Error('Cannot delete immutable admin');
      // Remove platform_admin record, admin_permissions, and user_role
      await supabase.from('platform_admins').delete().eq('id', admin.id);
      await supabase.from('admin_permissions').delete().eq('user_id', admin.user_id);
      await supabase.from('user_roles').delete().eq('user_id', admin.user_id).eq('role', 'webhost');
      logActivity({
        action: 'Deleted Platform Admin',
        entityType: 'platform_admins',
        entityId: admin.id,
        metadata: { email: admin.email, adminType: admin.admin_type },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platform-admins'] });
      toast({ title: 'Admin removed' });
    },
    onError: (err: Error) => {
      toast({ title: 'Failed', description: err.message, variant: 'destructive' });
    },
  });

  return (
    <Card className="bg-slate-900/80 border-slate-800 text-slate-100 shadow-xl backdrop-blur-md">
      <CardHeader className="border-b border-slate-800/80 pb-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2 text-xl font-extrabold text-white">
              <Crown className="h-5 w-5 text-amber-400" />
              Platform Admin Hierarchy
            </CardTitle>
            <CardDescription className="text-slate-400 text-xs sm:text-sm mt-1">
              Manage owner, business, and admin accounts with suspension rules.
              {canCreateOwner && (
                <span className="block mt-1 text-xs text-amber-400/80 font-medium">
                  Owner is immutable — cannot be suspended or deleted. Business can be suspended by Owner only.
                  Admin can be suspended by Owner or Business.
                </span>
              )}
            </CardDescription>
          </div>
          {canManage && (
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 font-bold hover:from-amber-300 hover:to-amber-400 shadow-md">
                  <UserPlus className="h-4 w-4 mr-2" />
                  Add Platform Admin
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-slate-900 border-slate-800 text-slate-100">
                <DialogHeader>
                  <DialogTitle className="text-white text-lg font-bold">Create Platform Admin</DialogTitle>
                  <DialogDescription className="text-slate-400 text-xs">
                    {canCreateOwner ? 'You can create owner, business, or admin accounts.' : 'You can create admin accounts only.'}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-3">
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold text-slate-300">Admin Type</Label>
                    <Select
                      value={newAdmin.adminType}
                      onValueChange={(v: PlatformAdminType) => setNewAdmin(prev => ({ ...prev, adminType: v }))}
                    >
                      <SelectTrigger className="bg-slate-950 border-slate-800 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-900 border-slate-800 text-white">
                        {canCreateOwner && <SelectItem value="owner">Owner (Immutable)</SelectItem>}
                        <SelectItem value="business">Business</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold text-slate-300">Display Name</Label>
                    <Input className="bg-slate-950 border-slate-800 text-white" value={newAdmin.displayName} onChange={e => setNewAdmin(prev => ({ ...prev, displayName: e.target.value }))} placeholder="e.g. Mugo James" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold text-slate-300">Email Address</Label>
                    <Input className="bg-slate-950 border-slate-800 text-white" type="email" value={newAdmin.email} onChange={e => setNewAdmin(prev => ({ ...prev, email: e.target.value }))} placeholder="admin@calqulus.site" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold text-slate-300">Initial Password</Label>
                    <Input className="bg-slate-950 border-slate-800 text-white" type="password" value={newAdmin.password} onChange={e => setNewAdmin(prev => ({ ...prev, password: e.target.value }))} placeholder="••••••••" />
                  </div>
                  {newAdmin.adminType === 'owner' && (
                    <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 text-xs text-amber-300 flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0 text-amber-400" />
                      <span>Owner accounts are immutable and cannot be suspended or deleted. Only one primary owner should exist.</span>
                    </div>
                  )}
                  <Button
                    className="w-full bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 font-bold hover:from-amber-300 hover:to-amber-400"
                    onClick={() => createAdmin.mutate()}
                    disabled={createAdmin.isPending || !newAdmin.email || !newAdmin.password || !newAdmin.displayName}
                  >
                    {createAdmin.isPending ? 'Creating Admin...' : 'Create Admin Account'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-0 sm:p-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-400" />
          </div>
        ) : !canManage ? (
          <div className="text-center py-12 text-slate-400">
            <Shield className="h-10 w-10 mx-auto mb-2 opacity-40 text-amber-400" />
            <p className="text-sm">Only platform owners and business admins can manage the admin hierarchy.</p>
          </div>
        ) : !admins || admins.length === 0 ? (
          <div className="text-center py-12 text-slate-400">
            <User className="h-10 w-10 mx-auto mb-2 opacity-40 text-amber-400" />
            <p className="text-sm">No platform admins configured yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-950/60 border-b border-slate-800">
                <TableRow className="hover:bg-transparent border-slate-800">
                  <TableHead className="text-slate-400 font-bold text-xs uppercase tracking-wider">Type</TableHead>
                  <TableHead className="text-slate-400 font-bold text-xs uppercase tracking-wider">Name</TableHead>
                  <TableHead className="text-slate-400 font-bold text-xs uppercase tracking-wider">Email</TableHead>
                  <TableHead className="text-slate-400 font-bold text-xs uppercase tracking-wider">Status</TableHead>
                  <TableHead className="text-slate-400 font-bold text-xs uppercase tracking-wider">Created</TableHead>
                  <TableHead className="text-right text-slate-400 font-bold text-xs uppercase tracking-wider">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {admins.map(admin => (
                  <TableRow key={admin.id} className={`border-slate-800/60 hover:bg-slate-800/40 transition-colors ${admin.suspended ? 'opacity-50' : ''}`}>
                    <TableCell>{ADMIN_TYPE_BADGES[admin.admin_type]}</TableCell>
                    <TableCell className="font-semibold text-slate-100">{admin.display_name}</TableCell>
                    <TableCell className="text-slate-300 text-sm font-mono">{admin.email}</TableCell>
                    <TableCell>
                      {admin.suspended ? (
                        <Badge variant="destructive" className="flex items-center gap-1 w-fit bg-red-500/20 text-red-300 border-red-500/30">
                          <Ban className="h-3 w-3" /> Suspended
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="flex items-center gap-1 w-fit bg-emerald-500/15 text-emerald-400 border-emerald-500/30 font-semibold">
                          <CheckCircle className="h-3 w-3" /> Active
                        </Badge>
                      )}
                      {admin.is_immutable && (
                        <Badge variant="outline" className="ml-1.5 border-amber-400/40 text-amber-300 bg-amber-400/10">
                          <Crown className="h-3 w-3 mr-1 text-amber-400" />Immutable
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-slate-400 text-xs">
                      {'created_at' in admin ? format(new Date((admin as any).created_at), 'MMM d, yyyy') : '-'}
                    </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      {canSuspend(admin) && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSuspendTarget(admin);
                            setSuspendReason('');
                          }}
                        >
                          {admin.suspended ? <CheckCircle className="h-4 w-4" /> : <Ban className="h-4 w-4" />}
                          <span className="ml-1">{admin.suspended ? 'Unsuspend' : 'Suspend'}</span>
                        </Button>
                      )}
                      {isPlatformOwner && !admin.is_immutable && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-500 hover:text-red-700 hover:bg-red-50"
                          onClick={() => {
                            if (confirm(`Remove ${admin.display_name} as platform admin?`)) {
                              deleteAdmin.mutate(admin);
                            }
                          }}
                        >
                          <XCircle className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        )}
      </CardContent>

      {/* Suspend dialog */}
      <AlertDialog open={!!suspendTarget} onOpenChange={v => !v && setSuspendTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {suspendTarget?.suspended ? 'Unsuspend' : 'Suspend'} {suspendTarget?.display_name}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {suspendTarget?.suspended ? (
                'Re-activate this admin account.'
              ) : (
                <>
                  <p className="mb-2">This will restrict {suspendTarget?.admin_type} access to the platform.</p>
                  {suspendTarget && (
                    <span className="text-xs text-muted-foreground block">
                      {SUSPENSION_RULES[suspendTarget.admin_type]}
                    </span>
                  )}
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {!suspendTarget?.suspended && (
            <div className="space-y-2">
              <Label>Reason for suspension</Label>
              <Input value={suspendReason} onChange={e => setSuspendReason(e.target.value)} placeholder="Required" />
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (suspendTarget) toggleSuspend.mutate({ admin: suspendTarget, reason: suspendReason });
              }}
              disabled={!suspendTarget?.suspended && !suspendReason}
            >
              {suspendTarget?.suspended ? 'Unsuspend' : 'Suspend'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
};

export default PlatformAdminManagement;
