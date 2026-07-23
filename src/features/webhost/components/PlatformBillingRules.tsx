import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/shared/hooks/use-toast';
import { Card, CardContent } from '@/shared/components/ui/card';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Switch } from '@/shared/components/ui/switch';
import { Textarea } from '@/shared/components/ui/textarea';
import { Skeleton } from '@/shared/components/ui/skeleton';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/shared/components/ui/select';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/shared/components/ui/dialog';
import { Plus, Pencil, Trash2, ScrollText } from 'lucide-react';

interface BillingRule {
  id: string;
  rule_name: string;
  client_type: string;
  billing_model: string;
  rate_amount: number;
  rate_pct: number | null;
  applies_to_tier: string | null;
  registration_fee: number;
  free_trial_days: number;
  is_active: boolean;
  notes: string | null;
}

const CLIENT_TYPES = ['manager', 'landlord', 'agency'];
const BILLING_MODELS = [
  { value: 'per_property', label: 'Per property / month' },
  { value: 'per_unit', label: 'Per unit / month' },
  { value: 'flat_monthly', label: 'Flat monthly fee' },
  { value: 'commission', label: 'Commission (% of rent collected)' },
  { value: 'tiered', label: 'Tiered (from subscription tiers)' },
  { value: 'free', label: 'Free / waived' },
];

const emptyForm = {
  rule_name: '', client_type: 'manager', billing_model: 'commission',
  rate_amount: '0', rate_pct: '1', applies_to_tier: '', registration_fee: '0',
  free_trial_days: '30', notes: '',
};

const fmt = (n: number) =>
  new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', minimumFractionDigits: 0 }).format(n);

export default function PlatformBillingRules() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [editing, setEditing] = useState<BillingRule | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [deleteTarget, setDeleteTarget] = useState<BillingRule | null>(null);

  const { data: rules, isLoading } = useQuery({
    queryKey: ['platform-billing-rules'],
    queryFn: async () => {
      const { data, error } = await (supabase.from('platform_billing_rules') as any)
        .select('*')
        .order('client_type', { ascending: true });
      if (error) throw error;
      return (data || []) as BillingRule[];
    },
  });

  const openNew = () => {
    setForm(emptyForm);
    setIsNew(true);
    setEditing({} as BillingRule);
  };

  const openEdit = (rule: BillingRule) => {
    setForm({
      rule_name: rule.rule_name,
      client_type: rule.client_type,
      billing_model: rule.billing_model,
      rate_amount: String(rule.rate_amount ?? 0),
      rate_pct: String(rule.rate_pct ?? 0),
      applies_to_tier: rule.applies_to_tier ?? '',
      registration_fee: String(rule.registration_fee ?? 0),
      free_trial_days: String(rule.free_trial_days ?? 30),
      notes: rule.notes ?? '',
    });
    setIsNew(false);
    setEditing(rule);
  };

  const save = useMutation({
    mutationFn: async () => {
      if (!form.rule_name.trim()) throw new Error('Give this rule a name');
      const payload = {
        rule_name: form.rule_name.trim(),
        client_type: form.client_type,
        billing_model: form.billing_model,
        rate_amount: Number(form.rate_amount) || 0,
        rate_pct: Number(form.rate_pct) || 0,
        applies_to_tier: form.applies_to_tier.trim() || null,
        registration_fee: Number(form.registration_fee) || 0,
        free_trial_days: Number(form.free_trial_days) || 0,
        notes: form.notes.trim() || null,
      };
      if (isNew) {
        const { error } = await (supabase.from('platform_billing_rules') as any).insert(payload);
        if (error) throw error;
      } else {
        const { error } = await (supabase.from('platform_billing_rules') as any)
          .update(payload).eq('id', editing!.id);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platform-billing-rules'] });
      toast({ title: isNew ? 'Rule created' : 'Rule updated' });
      setEditing(null);
    },
    onError: (err: Error) => toast({ title: 'Failed to save rule', description: err.message, variant: 'destructive' }),
  });

  const toggleActive = useMutation({
    mutationFn: async (rule: BillingRule) => {
      const { error } = await (supabase.from('platform_billing_rules') as any)
        .update({ is_active: !rule.is_active }).eq('id', rule.id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['platform-billing-rules'] }),
  });

  const removeRule = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase.from('platform_billing_rules') as any).delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platform-billing-rules'] });
      toast({ title: 'Rule deleted' });
      setDeleteTarget(null);
    },
    onError: (err: Error) => toast({ title: 'Failed to delete rule', description: err.message, variant: 'destructive' }),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold">Platform billing rules</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Defines the intended billing model per client type and tier.
          </p>
        </div>
        <Button size="sm" className="gap-1.5" onClick={openNew}>
          <Plus className="h-3.5 w-3.5" /> New rule
        </Button>
      </div>

      <div className="flex items-start gap-2 p-3 rounded-lg border border-amber-400/30 bg-amber-400/5">
        <ScrollText className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
        <p className="text-xs text-muted-foreground">
          These rules are reference configuration. The current monthly invoice run uses a single
          platform-wide commission rate rather than reading per-rule values from here — treat this
          as the source of truth for what billing <em>should</em> be per client type until that's wired up.
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-2">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 w-full" />)}</div>
      ) : !rules || rules.length === 0 ? (
        <p className="text-sm text-muted-foreground py-8 text-center">No billing rules configured yet.</p>
      ) : (
        <div className="space-y-2">
          {rules.map((rule) => (
            <Card key={rule.id} className={!rule.is_active ? 'opacity-60' : ''}>
              <CardContent className="p-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium">{rule.rule_name}</p>
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 capitalize">{rule.client_type}</Badge>
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                      {BILLING_MODELS.find((m) => m.value === rule.billing_model)?.label ?? rule.billing_model}
                    </Badge>
                    {!rule.is_active && <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-muted-foreground">Inactive</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {rule.billing_model === 'commission'
                      ? `${rule.rate_pct}% of rent collected`
                      : rule.billing_model === 'free'
                      ? 'No charge'
                      : `${fmt(Number(rule.rate_amount || 0))}${rule.billing_model === 'flat_monthly' ? '/mo' : ''}`}
                    {rule.registration_fee > 0 && ` · ${fmt(Number(rule.registration_fee))} registration fee`}
                    {rule.free_trial_days > 0 && ` · ${rule.free_trial_days}-day free trial`}
                  </p>
                  {rule.notes && <p className="text-xs text-muted-foreground mt-0.5 italic">{rule.notes}</p>}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Switch checked={rule.is_active} onCheckedChange={() => toggleActive.mutate(rule)} />
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(rule)} aria-label="Edit rule">
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setDeleteTarget(rule)} aria-label="Delete rule">
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create/edit dialog */}
      <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{isNew ? 'New billing rule' : 'Edit billing rule'}</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label>Rule name</Label>
              <Input value={form.rule_name} onChange={(e) => setForm((p) => ({ ...p, rule_name: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Client type</Label>
                <Select value={form.client_type} onValueChange={(v) => setForm((p) => ({ ...p, client_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CLIENT_TYPES.map((t) => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Billing model</Label>
                <Select value={form.billing_model} onValueChange={(v) => setForm((p) => ({ ...p, billing_model: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {BILLING_MODELS.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {form.billing_model === 'commission' ? (
              <div>
                <Label>Rate (%)</Label>
                <Input type="number" min="0" step="0.1" value={form.rate_pct} onChange={(e) => setForm((p) => ({ ...p, rate_pct: e.target.value }))} />
              </div>
            ) : form.billing_model !== 'free' && (
              <div>
                <Label>Rate amount (KES)</Label>
                <Input type="number" min="0" value={form.rate_amount} onChange={(e) => setForm((p) => ({ ...p, rate_amount: e.target.value }))} />
              </div>
            )}
            {form.billing_model === 'tiered' && (
              <div>
                <Label>Applies to tier</Label>
                <Input placeholder="e.g. starter, growth, enterprise" value={form.applies_to_tier} onChange={(e) => setForm((p) => ({ ...p, applies_to_tier: e.target.value }))} />
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Registration fee (KES)</Label>
                <Input type="number" min="0" value={form.registration_fee} onChange={(e) => setForm((p) => ({ ...p, registration_fee: e.target.value }))} />
              </div>
              <div>
                <Label>Free trial (days)</Label>
                <Input type="number" min="0" value={form.free_trial_days} onChange={(e) => setForm((p) => ({ ...p, free_trial_days: e.target.value }))} />
              </div>
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            <Button onClick={() => save.mutate()} disabled={save.isPending}>
              {save.isPending ? 'Saving…' : 'Save rule'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Delete this rule?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">
            "{deleteTarget?.rule_name}" will be permanently removed.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => deleteTarget && removeRule.mutate(deleteTarget.id)} disabled={removeRule.isPending}>
              {removeRule.isPending ? 'Deleting…' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
