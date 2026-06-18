import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/features/auth/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/components/ui/table';
import { Badge } from '@/shared/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';
import { Input } from '@/shared/components/ui/input';
import { Skeleton } from '@/shared/components/ui/skeleton';
import { format } from 'date-fns';
import {
  Activity, Search, User, Building, FileText,
  CreditCard, Users, Wrench, FileSignature, Bell
} from 'lucide-react';

// Matches activity_logs table from migration 013
interface ActivityEntry {
  id: string;
  actor_id: string | null;
  actor_role: string;
  actor_email: string | null;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  entity_label: string | null;
  property_id: string | null;
  manager_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

const ENTITY_ICONS: Record<string, React.ElementType> = {
  tenant: Users, property: Building, lease: FileText,
  invoice: CreditCard, contract: FileSignature,
  maintenance: Wrench, user: User, notice: Bell,
};

const ROLE_BADGE: Record<string, string> = {
  manager:    'bg-blue-100 text-blue-800 border-blue-200',
  submanager: 'bg-slate-100 text-slate-700 border-slate-200',
  webhost:    'bg-blue-100 text-blue-800 border-blue-200',
  landlord:   'bg-amber-100 text-amber-800 border-amber-200',
  system:     'bg-green-100 text-green-700 border-green-200',
};

const ACTION_COLOR = (action: string): string => {
  const a = action.toLowerCase();
  if (a.includes('create') || a.includes('add') || a.includes('invite')) return 'bg-green-100 text-green-800';
  if (a.includes('update') || a.includes('edit') || a.includes('change')) return 'bg-blue-100 text-blue-800';
  if (a.includes('delete') || a.includes('remove') || a.includes('archive')) return 'bg-red-100 text-red-800';
  if (a.includes('approve') || a.includes('complete')) return 'bg-emerald-100 text-emerald-800';
  if (a.includes('reject') || a.includes('deny') || a.includes('fail')) return 'bg-orange-100 text-orange-800';
  if (a.includes('sign') || a.includes('contract')) return 'bg-amber-400/15 text-amber-700';
  if (a.includes('pay') || a.includes('invoice')) return 'bg-cyan-100 text-cyan-800';
  return 'bg-slate-100 text-slate-700';
};

const ActivityLog: React.FC = () => {
  const { isWebhost, isManager } = useAuth();
  const [entityFilter, setEntityFilter] = useState('all');
  const [roleFilter, setRoleFilter]   = useState('all');
  const [searchTerm, setSearchTerm]   = useState('');

  const { data: activities = [], isLoading } = useQuery({
    queryKey: ['activity-logs-v2', entityFilter, roleFilter],
    queryFn: async () => {
      let query = supabase.from('activity_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);
      if (entityFilter !== 'all') query = query.eq('entity_type', entityFilter);
      if (roleFilter   !== 'all') query = query.eq('actor_role', roleFilter);
      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as ActivityEntry[];
    },
  });

  const filtered = activities.filter(a => {
    if (!searchTerm) return true;
    const q = searchTerm.toLowerCase();
    return (
      (a.actor_email || '').toLowerCase().includes(q) ||
      a.action.toLowerCase().includes(q) ||
      (a.entity_label || '').toLowerCase().includes(q) ||
      (a.entity_type  || '').toLowerCase().includes(q)
    );
  });

  return (
    <Card className="bg-card border-border/60">
      <CardHeader className="pb-4">
        <CardTitle className="text-white flex items-center gap-2">
          <Activity className="h-5 w-5 text-amber-500" />
          Platform Activity Log
        </CardTitle>
        <CardDescription className="text-muted-foreground">
          All significant actions across the platform — managers, submanagers, webhosts
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Filters */}
        <div className="flex gap-3 mb-4 flex-wrap">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search actions, emails, labels…"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="pl-9 bg-card border-border/60 text-white placeholder:text-muted-foreground/70"
            />
          </div>
          <Select value={entityFilter} onValueChange={setEntityFilter}>
            <SelectTrigger className="w-40 bg-card border-border/60 text-white">
              <SelectValue placeholder="Entity type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All entities</SelectItem>
              {['tenant','property','invoice','lease','contract','maintenance','user','notice','payment'].map(e => (
                <SelectItem key={e} value={e} className="capitalize">{e}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-36 bg-card border-border/60 text-white">
              <SelectValue placeholder="Role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All roles</SelectItem>
              {['manager','submanager','webhost','landlord','system'].map(r => (
                <SelectItem key={r} value={r} className="capitalize">{r}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-12 w-full bg-card/80" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground/70">
            <Activity className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p>No activity logs found</p>
          </div>
        ) : (
          <div className="rounded-lg border border-border/60 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="border-border/60 hover:bg-transparent">
                  <TableHead className="text-muted-foreground font-medium">When</TableHead>
                  <TableHead className="text-muted-foreground font-medium">Actor</TableHead>
                  <TableHead className="text-muted-foreground font-medium">Action</TableHead>
                  <TableHead className="text-muted-foreground font-medium">Entity</TableHead>
                  <TableHead className="text-muted-foreground font-medium">Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(entry => {
                  const Icon = ENTITY_ICONS[entry.entity_type || ''] ?? Activity;
                  return (
                    <TableRow key={entry.id} className="border-border/30 hover:bg-muted/20">
                      <TableCell className="text-muted-foreground text-xs whitespace-nowrap">
                        {format(new Date(entry.created_at), 'dd MMM HH:mm')}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className={`text-xs capitalize ${ROLE_BADGE[entry.actor_role] ?? 'bg-slate-100'}`}>
                            {entry.actor_role}
                          </Badge>
                          <span className="text-foreground/90 text-xs truncate max-w-32">{entry.actor_email ?? '—'}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={`text-xs ${ACTION_COLOR(entry.action)}`}>
                          {entry.action.replace(/_/g, ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5 text-foreground/90 text-xs">
                          <Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          <span className="capitalize">{entry.entity_type ?? '—'}</span>
                          {entry.entity_label && <span className="text-muted-foreground">· {entry.entity_label}</span>}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-xs max-w-48 truncate">
                        {entry.metadata ? JSON.stringify(entry.metadata).slice(0, 80) : '—'}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ActivityLog;
