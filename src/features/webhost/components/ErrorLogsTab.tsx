import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Skeleton } from '@/shared/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/shared/components/ui/dialog';
import { format } from 'date-fns';
import {
  AlertTriangle, Bug, RefreshCw, Search, Eye, Download, Activity, ShieldAlert, ChevronRight,
} from 'lucide-react';

interface ErrorLog {
  id: string;
  action: string;
  actor_email: string | null;
  actor_role: string | null;
  entity_type: string | null;
  entity_label: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

type TypeFilter = 'all' | 'error' | 'warning';

const stripPrefix = (action: string) => action.replace(/^error:/, '').replace(/^warning:/, '');

const metaOf = (log: ErrorLog): { context?: string; message?: string; url?: string; timestamp?: string } => {
  const m = (log.metadata ?? {}) as Record<string, unknown>;
  return {
    context: typeof m.context === 'string' ? m.context : undefined,
    message: typeof m.message === 'string' ? m.message : undefined,
    url: typeof m.url === 'string' ? m.url : undefined,
    timestamp: typeof m.timestamp === 'string' ? m.timestamp : undefined,
  };
};

const isSecretKey = (k: string): boolean =>
  /password|secret|token|api[_-]?key|service[_-]?role|private[_-]?key|authorization|cookie/i.test(k);

const safeMetaString = (log: ErrorLog): string => {
  const m = (log.metadata ?? {}) as Record<string, unknown>;
  const redacted: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(m)) {
    redacted[k] = isSecretKey(k) ? '[redacted]' : v;
  }
  try {
    return JSON.stringify(redacted, null, 2);
  } catch {
    return '{}';
  }
};

export default function ErrorLogsTab() {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [sourceFilter, setSourceFilter] = useState<string>('all');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [selected, setSelected] = useState<ErrorLog | null>(null);

  const { data: logs = [], isLoading, isError, error, refetch, dataUpdatedAt } = useQuery<ErrorLog[]>({
    queryKey: ['error-logs'],
    queryFn: async () => {
      const { data, error: qErr } = await supabase
        .from('activity_logs')
        .select('id, action, actor_email, actor_role, entity_type, entity_label, metadata, created_at')
        .or('action.like.error:%,action.like.warning:%')
        .order('created_at', { ascending: false })
        .limit(100);
      if (qErr) throw qErr;
      return (data ?? []) as ErrorLog[];
    },
    refetchInterval: 30_000, // periodic refresh — not real-time
  });

  const sources = useMemo(() => {
    const set = new Set<string>();
    logs.forEach(l => {
      const c = metaOf(l).context;
      if (c) set.add(c);
    });
    return Array.from(set).sort();
  }, [logs]);

  const filtered = useMemo(() => {
    return logs.filter(l => {
      if (typeFilter === 'error' && !l.action.startsWith('error:')) return false;
      if (typeFilter === 'warning' && !l.action.startsWith('warning:')) return false;
      const src = metaOf(l).context ?? '';
      if (sourceFilter !== 'all' && src !== sourceFilter) return false;
      if (from || to) {
        const t = new Date(l.created_at).getTime();
        if (from && t < new Date(from).getTime()) return false;
        if (to && t > new Date(to).getTime() + 86_399_999) return false;
      }
      if (search) {
        const q = search.toLowerCase();
        const msg = (l.entity_label ?? '') + ' ' + (metaOf(l).message ?? '') + ' ' + l.action + ' ' + (l.actor_email ?? '');
        if (!msg.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [logs, typeFilter, sourceFilter, from, to, search]);

  const errorCount = logs.filter(l => l.action.startsWith('error:')).length;
  const warningCount = logs.filter(l => l.action.startsWith('warning:')).length;

  const exportCsv = () => {
    const rows = [
      ['id', 'type', 'source', 'message', 'actor', 'timestamp', 'url'],
      ...filtered.map(l => {
        const m = metaOf(l);
        return [
          l.id,
          l.action.startsWith('error:') ? 'error' : 'warning',
          m.context ?? '',
          (l.entity_label ?? m.message ?? '').replace(/"/g, '""'),
          l.actor_email ?? '',
          l.created_at,
          m.url ?? '',
        ].map(c => `"${String(c).replace(/"/g, '""')}"`);
      }),
    ];
    const blob = new Blob([rows.map(r => r.join(',')).join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `error-logs-${format(new Date(), 'yyyy-MM-dd-HHmm')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card className="border-red-500/15 bg-card">
        <CardHeader>
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2 text-white">
                <Bug className="h-5 w-5 text-red-400" />
                Production Error & Incident Console
              </CardTitle>
              <CardDescription className="text-red-400/70">
                Application errors and warnings recorded in the audit log (last 100). Auto-refreshes every 30 seconds.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => refetch()} className="border-red-500/20 text-red-300 hover:bg-red-500/10">
                <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Refresh
              </Button>
              <Button variant="outline" size="sm" onClick={exportCsv} disabled={filtered.length === 0} className="border-red-500/20 text-red-300 hover:bg-red-500/10">
                <Download className="h-3.5 w-3.5 mr-1.5" /> Export
              </Button>
            </div>
          </div>
          {dataUpdatedAt ? (
            <p className="text-[10px] text-slate-500 mt-1">Last updated {format(new Date(dataUpdatedAt), 'dd MMM yyyy HH:mm:ss')}</p>
          ) : null}
        </CardHeader>
      </Card>

      {/* Overview — real counts only */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="border-red-500/20 bg-red-500/5">
          <CardContent className="p-4 flex items-center gap-3">
            <Bug className="h-8 w-8 text-red-400" />
            <div>
              <div className="text-2xl font-bold text-red-300">{errorCount}</div>
              <div className="text-sm text-red-400/80">Errors (last 100)</div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-amber-500/20 bg-amber-500/5">
          <CardContent className="p-4 flex items-center gap-3">
            <AlertTriangle className="h-8 w-8 text-amber-400" />
            <div>
              <div className="text-2xl font-bold text-amber-300">{warningCount}</div>
              <div className="text-sm text-amber-400/80">Warnings (last 100)</div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-500/20 bg-card">
          <CardContent className="p-4 flex items-center gap-3">
            <Activity className="h-8 w-8 text-slate-400" />
            <div>
              <div className="text-2xl font-bold text-white">{logs.length}</div>
              <div className="text-sm text-slate-400">Total events (last 100)</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Registry */}
      <Card className="border-red-500/15 bg-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <ShieldAlert className="h-5 w-5 text-red-400" />
            Error Registry
          </CardTitle>
          <CardDescription className="text-red-400/70">
            Read-only audit records. Severity reflects the error/warning type only — no separate severity classification exists.
          </CardDescription>
          {/* Filters */}
          <div className="grid gap-3 md:grid-cols-4 mt-3">
            <div className="relative md:col-span-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
              <Input
                placeholder="Search message, source, actor…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-10 bg-slate-700/50 border-red-500/20"
              />
            </div>
            <Select value={typeFilter} onValueChange={v => setTypeFilter(v as TypeFilter)}>
              <SelectTrigger className="bg-slate-700/50 border-red-500/20"><SelectValue placeholder="Type" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                <SelectItem value="error">Errors</SelectItem>
                <SelectItem value="warning">Warnings</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sourceFilter} onValueChange={setSourceFilter}>
              <SelectTrigger className="bg-slate-700/50 border-red-500/20"><SelectValue placeholder="Source" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All sources</SelectItem>
                {sources.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-wrap items-center gap-3 mt-3">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">From</span>
              <Input type="date" value={from} onChange={e => setFrom(e.target.value)} className="w-40 bg-slate-700/50 border-red-500/20" />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">To</span>
              <Input type="date" value={to} onChange={e => setTo(e.target.value)} className="w-40 bg-slate-700/50 border-red-500/20" />
            </div>
            {(search || typeFilter !== 'all' || sourceFilter !== 'all' || from || to) && (
              <Button variant="ghost" size="sm" onClick={() => { setSearch(''); setTypeFilter('all'); setSourceFilter('all'); setFrom(''); setTo(''); }} className="text-slate-400 hover:text-white">
                Clear filters
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-2 p-4">{[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-14 w-full" />)}</div>
          ) : isError ? (
            <div className="p-8 text-center">
              <AlertTriangle className="h-8 w-8 mx-auto mb-2 text-red-400" />
              <p className="text-sm font-semibold text-red-300">Unable to load error logs.</p>
              <p className="text-xs text-slate-400 mt-1 mb-3">{(error as Error)?.message ?? 'Try again.'}</p>
              <Button variant="outline" size="sm" onClick={() => refetch()} className="border-red-500/40 text-red-300 hover:bg-red-500/10">
                <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Retry
              </Button>
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-10 text-center text-slate-400">
              <Bug className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">{logs.length === 0 ? 'No application errors recorded.' : 'No errors match the current filters.'}</p>
              <p className="text-xs text-slate-500 mt-1">{logs.length === 0 ? 'Application errors and warnings will appear here as they occur.' : 'Adjust filters to see more results.'}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-red-500/10 text-left text-red-400/70">
                    <th className="py-2 px-4 font-medium">Type</th>
                    <th className="py-2 px-4 font-medium">Message</th>
                    <th className="py-2 px-4 font-medium">Source</th>
                    <th className="py-2 px-4 font-medium">Actor</th>
                    <th className="py-2 px-4 font-medium">Timestamp</th>
                    <th className="py-2 px-4 font-medium text-right">View</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(l => {
                    const isError = l.action.startsWith('error:');
                    const m = metaOf(l);
                    return (
                      <tr key={l.id} className="border-b border-red-500/5 hover:bg-red-500/5 cursor-pointer" onClick={() => setSelected(l)}>
                        <td className="py-2.5 px-4">
                          <Badge className={isError ? 'bg-red-500/15 text-red-300 border border-red-500/30' : 'bg-amber-500/15 text-amber-300 border border-amber-500/30'}>
                            {isError ? 'error' : 'warning'}
                          </Badge>
                        </td>
                        <td className="py-2.5 px-4">
                          <p className="font-medium text-white max-w-[320px] truncate" title={l.entity_label ?? m.message ?? ''}>
                            {l.entity_label || m.message || 'No message'}
                          </p>
                          <p className="text-xs text-slate-500 font-mono">{stripPrefix(l.action)}</p>
                        </td>
                        <td className="py-2.5 px-4 text-slate-300">{m.context ?? '—'}</td>
                        <td className="py-2.5 px-4 text-slate-400 text-xs truncate max-w-[160px]" title={l.actor_email ?? ''}>{l.actor_email ?? 'system'}</td>
                        <td className="py-2.5 px-4 text-xs text-slate-400 whitespace-nowrap">{format(new Date(l.created_at), 'dd MMM HH:mm:ss')}</td>
                        <td className="py-2.5 px-4 text-right">
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-slate-300 hover:bg-slate-700/50" onClick={e => { e.stopPropagation(); setSelected(l); }} aria-label="View detail">
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          {filtered.length > 0 && (
            <p className="p-4 text-xs text-slate-500 border-t border-red-500/5">
              Showing {filtered.length} of {logs.length} records{logs.length === 100 ? ' (limited to last 100)' : ''}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Detail dialog */}
      <Dialog open={!!selected} onOpenChange={open => !open && setSelected(null)}>
        <DialogContent className="max-w-2xl bg-slate-900 border-red-500/15">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-white">
              <ChevronRight className="h-4 w-4 text-red-400" />
              Error Detail
            </DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Badge className={selected.action.startsWith('error:') ? 'bg-red-500/15 text-red-300 border border-red-500/30' : 'bg-amber-500/15 text-amber-300 border border-amber-500/30'}>
                  {selected.action.startsWith('error:') ? 'error' : 'warning'}
                </Badge>
                <span className="font-mono text-xs text-slate-400">{stripPrefix(selected.action)}</span>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <p className="text-[10px] uppercase tracking-wide text-red-400/70">Message</p>
                  <p className="text-sm text-white break-words">{selected.entity_label || metaOf(selected).message || 'No message'}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wide text-red-400/70">Source / module</p>
                  <p className="text-sm text-white">{metaOf(selected).context ?? '—'}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wide text-red-400/70">Timestamp</p>
                  <p className="text-sm text-white">{format(new Date(selected.created_at), "dd MMM yyyy HH:mm:ss")}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wide text-red-400/70">Actor</p>
                  <p className="text-sm text-white">{selected.actor_email ?? 'system'}{selected.actor_role ? ` (${selected.actor_role})` : ''}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wide text-red-400/70">Reference ID</p>
                  <p className="text-xs text-slate-400 font-mono">{selected.id}</p>
                </div>
                {metaOf(selected).url && (
                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-red-400/70">URL / path</p>
                    <p className="text-xs text-slate-400 font-mono break-all">{metaOf(selected).url}</p>
                  </div>
                )}
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wide text-red-400/70 mb-1">Context / metadata</p>
                <pre className="bg-slate-950/60 p-3 rounded-md text-xs overflow-x-auto border border-red-500/10 text-slate-300">{safeMetaString(selected)}</pre>
              </div>
              <p className="text-[10px] text-slate-500 flex items-center gap-1">
                <ShieldAlert className="h-3 w-3" />
                Audit records are append-only. No resolution lifecycle or status is stored — this is a diagnostic view, not an incident tracker.
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
