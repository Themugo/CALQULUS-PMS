import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/shared/components/ui/card';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Skeleton } from '@/shared/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';
import { Building, MapPin, Users, Home, Search, RefreshCw, AlertTriangle, ChevronDown, ChevronUp, LinkIcon, Unlink, CheckCircle2 } from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import { onActivateKey } from '@/shared/lib/a11y';
import { format } from 'date-fns';

// Webhost property oversight: read-only platform-level view of all properties.
// Webhosts cannot reassign/edit/delete properties — those are manager actions.
// This tab shows the property distribution, unlinked exceptions, and per-property detail.

interface PropertyWithManager {
  id: string;
  name: string;
  address: string;
  units: number;
  occupied: number;
  manager_id: string | null;
  manager_email: string | null;
  manager_name: string | null;
  agency_name: string | null;
  status: string | null;
  property_type: string | null;
  created_at: string | null;
  revenue: number;
}

type StatusFilter = 'all' | 'active' | 'inactive' | 'archived' | 'vacant';
type View = 'all' | 'unlinked';

const STATUS_BADGE: Record<string, string> = {
  active: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  inactive: 'bg-slate-500/15 text-slate-300 border-slate-500/30',
  archived: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  vacant: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
};

const occupancyColor = (occ: number, total: number) => {
  const pct = total > 0 ? (occ / total) * 100 : 0;
  if (pct >= 80) return 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30';
  if (pct >= 50) return 'bg-amber-500/15 text-amber-300 border-amber-500/30';
  return 'bg-red-500/15 text-red-300 border-red-500/30';
};

const PropertyAssignment: React.FC = () => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [managerFilter, setManagerFilter] = useState<string>('all');
  const [view, setView] = useState<View>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data: properties = [], isLoading, isError, error, refetch } = useQuery({
    queryKey: ['webhost-properties-by-manager'],
    queryFn: async () => {
      const { data: props, error } = await supabase
        .from('properties')
        .select('id, name, address, units, occupied, manager_id, status, property_type, created_at, revenue')
        .order('name');
      if (error) throw error;
      if (!props?.length) return [];

      const enriched = await Promise.all((props || []).map(async (p) => {
        if (!p.manager_id) return { ...p, manager_email: null, manager_name: null, agency_name: null };
        const [profileRes, agencyRes] = await Promise.all([
          supabase.from('profiles').select('email, full_name').eq('id', p.manager_id).maybeSingle(),
          supabase.from('agencies').select('name').eq('manager_id', p.manager_id).maybeSingle(),
        ]);
        return {
          ...p,
          manager_email: profileRes.data?.email ?? null,
          manager_name:  profileRes.data?.full_name ?? null,
          agency_name:   agencyRes.data?.name ?? null,
        };
      }));
      return enriched as PropertyWithManager[];
    },
  });

  // Real derived totals (no invented metrics).
  const total = properties.length;
  const activeCount = properties.filter(p => (p.status ?? 'active') === 'active').length;
  const unlinked = properties.filter(p => !p.manager_id);
  const unlinkedCount = unlinked.length;
  const managerOptions = useMemo(() => {
    const map = new Map<string, { id: string; name: string }>();
    for (const p of properties) {
      if (p.manager_id && !map.has(p.manager_id)) {
        map.set(p.manager_id, { id: p.manager_id, name: p.manager_name ?? p.manager_email ?? p.manager_id.slice(0, 8) });
      }
    }
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [properties]);
  const distinctManagerCount = managerOptions.length;

  // Apply filters + search (all client-side over already-fetched data).
  const searchQ = search.trim().toLowerCase();
  const filtered = properties.filter(p => {
    if (view === 'unlinked' && p.manager_id) return false;
    if (statusFilter !== 'all' && (p.status ?? 'active') !== statusFilter) return false;
    if (managerFilter !== 'all' && p.manager_id !== managerFilter) return false;
    if (!searchQ) return true;
    return (
      p.name.toLowerCase().includes(searchQ) ||
      (p.address?.toLowerCase().includes(searchQ) ?? false) ||
      (p.manager_name?.toLowerCase().includes(searchQ) ?? false) ||
      (p.manager_email?.toLowerCase().includes(searchQ) ?? false)
    );
  });

  const refresh = () => { refetch(); };
  const fmt = (n: number) => new Intl.NumberFormat('en-KE').format(n);

  const summaryCards = [
    { key: 'all',       label: 'Total Properties', count: total,             icon: Building,   active: view === 'all' && statusFilter === 'all' && managerFilter === 'all', cls: 'border-border bg-muted text-slate-300' },
    { key: 'active',    label: 'Active',           count: activeCount,       icon: CheckCircle2, active: false, cls: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300' },
    { key: 'unlinked',  label: 'Unlinked',         count: unlinkedCount,     icon: Unlink,     active: view === 'unlinked', cls: 'border-amber-500/40 bg-amber-500/10 text-amber-300' },
    { key: 'managers',  label: 'By Manager',       count: distinctManagerCount, icon: Users,    active: false, cls: 'border-sky-500/40 bg-sky-500/10 text-sky-300' },
  ] as const;

  const setSummaryFilter = (key: string) => {
    if (key === 'unlinked') { setView('unlinked'); setStatusFilter('all'); setManagerFilter('all'); }
    else if (key === 'all') { setView('all'); setStatusFilter('all'); setManagerFilter('all'); }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-muted border border-border p-4 sm:p-5 rounded-2xl backdrop-blur-md shadow-sm">
        <div>
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            <Building className="h-5 w-5 text-amber-400" />
            Platform Property Oversight Console
          </h2>
          <p className="text-muted-foreground text-xs mt-1">
            Read-only platform view of all properties, their manager relationships, and unlinked exceptions. Reassignment is a manager action.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative flex-1 lg:w-56">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search name, address, manager..."
              className="pl-8 h-9 rounded-xl bg-muted border-border text-foreground placeholder:text-muted-foreground text-xs"
              aria-label="Search properties"
            />
          </div>
          <Button variant="outline" size="sm" className="border-border text-muted-foreground hover:bg-muted hover:text-foreground h-9 rounded-xl text-xs" onClick={refresh} aria-label="Refresh properties">
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" />Refresh
          </Button>
        </div>
      </div>

      {/* Summary cards (clickable for all/unlinked) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {summaryCards.map(({ key, label, count, icon: Icon, active, cls }) => {
          const clickable = key === 'all' || key === 'unlinked';
          const handleClick = () => setSummaryFilter(key);
          return (
            <button
              key={key}
              type="button"
              onClick={clickable ? handleClick : undefined}
              onKeyDown={clickable ? onActivateKey(handleClick) : undefined}
              role={clickable ? 'button' : 'status'}
              tabIndex={clickable ? 0 : -1}
              aria-pressed={clickable ? active : undefined}
              aria-label={`${count} ${label}`}
              className={cn(
                'flex items-center justify-between gap-2 p-3 rounded-xl border text-left transition-all',
                cls,
                clickable && 'hover:brightness-110 cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/30',
                active && 'ring-2 ring-amber-400/60',
              )}
            >
              <div className="min-w-0">
                <span className="text-[10px] font-bold uppercase tracking-wide opacity-80 block">{label}</span>
                <strong className="font-['Outfit'] text-xl font-bold text-foreground">{count}</strong>
              </div>
              <Icon className="h-5 w-5 shrink-0 opacity-80" />
            </button>
          );
        })}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
          <SelectTrigger className="h-8 w-36 text-xs bg-muted border-border text-foreground" aria-label="Filter by property status">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="text-xs">All Statuses</SelectItem>
            <SelectItem value="active" className="text-xs">Active</SelectItem>
            <SelectItem value="inactive" className="text-xs">Inactive</SelectItem>
            <SelectItem value="archived" className="text-xs">Archived</SelectItem>
            <SelectItem value="vacant" className="text-xs">Vacant</SelectItem>
          </SelectContent>
        </Select>
        <Select value={managerFilter} onValueChange={setManagerFilter}>
          <SelectTrigger className="h-8 w-48 text-xs bg-muted border-border text-foreground" aria-label="Filter by manager">
            <SelectValue placeholder="Manager" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="text-xs">All Managers</SelectItem>
            {managerOptions.map(m => (
              <SelectItem key={m.id} value={m.id} className="text-xs">{m.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {(view !== 'all' || statusFilter !== 'all' || managerFilter !== 'all' || searchQ) && (
          <Button variant="ghost" size="sm" className="h-8 text-xs text-muted-foreground hover:text-foreground" onClick={() => { setView('all'); setStatusFilter('all'); setManagerFilter('all'); setSearch(''); }}>
            Clear filters
          </Button>
        )}
      </div>

      {/* Unlinked exception callout */}
      {view === 'all' && unlinkedCount > 0 && (
        <div className="flex items-center gap-2.5 p-3 rounded-xl border border-amber-500/30 bg-amber-500/5">
          <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400" />
          <span className="text-xs text-amber-200">
            <strong className="text-amber-300">{unlinkedCount}</strong> propert{unlinkedCount === 1 ? 'y has' : 'ies have'} no manager assigned.
          </span>
          <Button variant="link" size="sm" className="h-7 px-2 text-xs text-amber-300 underline-offset-2 ml-auto" onClick={() => setView('unlinked')}>
            View unlinked
          </Button>
        </div>
      )}

      {/* List */}
      <Card className="bg-card border-border">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 w-full bg-muted/80" />)}
            </div>
          ) : isError ? (
            <div className="p-8 text-center">
              <AlertTriangle className="h-8 w-8 mx-auto mb-2 text-red-400" />
              <p className="text-sm font-semibold text-red-300">Unable to load properties.</p>
              <p className="text-xs text-muted-foreground mt-1 mb-3">{(error as Error)?.message ?? 'Try again.'}</p>
              <Button variant="outline" size="sm" onClick={refresh} className="border-red-500/40 text-red-300 hover:bg-red-500/10">
                <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Retry
              </Button>
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-10 text-center">
              <Building className="h-10 w-10 mx-auto mb-3 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">
                {total === 0
                  ? 'No properties registered.'
                  : view === 'unlinked'
                    ? 'No unlinked properties.'
                    : searchQ || statusFilter !== 'all' || managerFilter !== 'all'
                      ? 'No properties match the current filters.'
                      : 'No properties registered.'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-800">
              {/* Table header (desktop) */}
              <div className="hidden md:grid grid-cols-12 gap-2 px-4 py-2 text-[10px] font-bold uppercase tracking-wide text-muted-foreground bg-muted">
                <div className="col-span-4">Property</div>
                <div className="col-span-3">Manager</div>
                <div className="col-span-2 text-center">Units</div>
                <div className="col-span-2 text-center">Occupancy</div>
                <div className="col-span-1 text-right">Status</div>
              </div>
              {filtered.map(p => {
                const expanded = expandedId === p.id;
                const isUnlinked = !p.manager_id;
                const occPct = p.units > 0 ? Math.round((p.occupied / p.units) * 100) : 0;
                return (
                  <div key={p.id}>
                    <button
                      type="button"
                      onClick={() => setExpandedId(expanded ? null : p.id)}
                      onKeyDown={onActivateKey(() => setExpandedId(expanded ? null : p.id))}
                      aria-expanded={expanded}
                      aria-label={`View property ${p.name}`}
                      className="w-full text-left grid grid-cols-1 md:grid-cols-12 gap-2 px-4 py-3 items-center hover:bg-muted/80 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/30 focus:ring-inset"
                    >
                      <div className="md:col-span-4 min-w-0 flex items-center gap-2">
                        <Building className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm text-foreground truncate font-medium">{p.name}</p>
                          <p className="text-xs text-muted-foreground flex items-center gap-1 truncate">
                            <MapPin className="h-3 w-3 shrink-0" />{p.address || '—'}
                          </p>
                        </div>
                      </div>
                      <div className="md:col-span-3 min-w-0 flex items-center gap-1.5">
                        {isUnlinked ? (
                          <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-300 border-amber-500/30">
                            <Unlink className="h-3 w-3 mr-1" />Unlinked
                          </Badge>
                        ) : (
                          <div className="min-w-0">
                            <p className="text-xs text-foreground truncate">{p.manager_name ?? 'Unknown'}</p>
                            <p className="text-[10px] text-muted-foreground truncate">{p.manager_email ?? '—'}</p>
                          </div>
                        )}
                      </div>
                      <div className="md:col-span-2 md:text-center flex items-center gap-1 md:justify-center">
                        <Home className="h-3 w-3 text-muted-foreground md:hidden" />
                        <span className="text-xs text-foreground">{p.units ?? 0}</span>
                      </div>
                      <div className="md:col-span-2 md:text-center flex items-center gap-1.5 md:justify-center">
                        <Badge variant="outline" className={cn('text-[10px]', occupancyColor(p.occupied ?? 0, p.units ?? 0))}>
                          {p.occupied ?? 0}/{p.units ?? 0} · {occPct}%
                        </Badge>
                      </div>
                      <div className="md:col-span-1 md:text-right flex items-center justify-between md:justify-end gap-1">
                        <Badge variant="outline" className={cn('text-[10px] capitalize', STATUS_BADGE[p.status ?? 'active'] ?? 'border-border text-slate-300')}>
                          {p.status ?? 'active'}
                        </Badge>
                        {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                      </div>
                    </button>
                    {expanded && (
                      <div className="px-4 py-3 bg-muted border-t border-border grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-2 text-xs">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-muted-foreground">Property type</span>
                          <span className="text-foreground capitalize">{p.property_type ?? '—'}</span>
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-muted-foreground">Created</span>
                          <span className="text-foreground">{p.created_at ? format(new Date(p.created_at), 'dd MMM yyyy') : '—'}</span>
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-muted-foreground">Revenue (recorded)</span>
                          <span className="text-foreground">KES {fmt(p.revenue ?? 0)}</span>
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-muted-foreground flex items-center gap-1"><LinkIcon className="h-3 w-3" />Manager link</span>
                          <span className={cn('font-medium', isUnlinked ? 'text-amber-300' : 'text-emerald-300')}>
                            {isUnlinked ? 'No manager' : 'Assigned'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-muted-foreground">Agency</span>
                          <span className="text-foreground truncate">{p.agency_name ?? '—'}</span>
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-muted-foreground">Manager email</span>
                          <span className="text-foreground truncate">{p.manager_email ?? '—'}</span>
                        </div>
                        {isUnlinked && (
                          <p className="sm:col-span-2 lg:col-span-3 text-amber-300 flex items-start gap-1.5 bg-amber-500/10 p-2 rounded-lg border border-amber-500/20">
                            <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                            This property has no manager assigned. Assignment is performed by a manager or during manager onboarding.
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PropertyAssignment;
