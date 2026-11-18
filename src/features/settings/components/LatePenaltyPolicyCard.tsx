import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/features/auth/AuthContext";
import { useToast } from "@/shared/hooks/use-toast";
import { errorToast } from "@/shared/lib/errorToast";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Switch } from "@/shared/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { AlertTriangle, Loader2, Save } from "lucide-react";

type OwnerRole = "manager" | "agency" | "landlord";
interface PolicyRow {
  enabled: boolean; penalty_type: "fixed" | "percentage"; penalty_amount: number;
  penalty_pct: number; grace_period_days: number; max_penalty_amount: number | null;
}

/**
 * Business-level late-penalty default for a manager, agency or landlord.
 * Penalties are OFF until the business owner turns them on. A property's own
 * billing configuration still overrides this default.
 */
export function LatePenaltyPolicyCard({ ownerRole }: { ownerRole: OwnerRole }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const key = ["penalty-policy", user?.id, ownerRole];

  const { data, isLoading } = useQuery({
    queryKey: key,
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase.from("penalty_policies" as never).select("*")
        .eq("owner_user_id", user!.id).eq("owner_role", ownerRole).maybeSingle();
      if (error) throw error;
      return (data ?? null) as PolicyRow | null;
    },
  });

  const [form, setForm] = useState({ enabled: false, type: "fixed", amount: "0", pct: "0", grace: "0", max: "" });
  useEffect(() => {
    if (!data) return;
    setForm({
      enabled: data.enabled, type: data.penalty_type, amount: String(data.penalty_amount),
      pct: String(data.penalty_pct), grace: String(data.grace_period_days),
      max: data.max_penalty_amount == null ? "" : String(data.max_penalty_amount),
    });
  }, [data]);

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc("upsert_penalty_policy" as never, {
        p_owner_role: ownerRole, p_enabled: form.enabled, p_penalty_type: form.type,
        p_penalty_amount: parseFloat(form.amount) || 0, p_penalty_pct: parseFloat(form.pct) || 0,
        p_grace_period_days: Math.round(parseFloat(form.grace) || 0),
        p_max_penalty_amount: form.max.trim() === "" ? null : parseFloat(form.max),
      } as never);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: key }); toast({ title: "Late penalty policy saved" }); },
    onError: (e: Error) => errorToast("Could not save policy", e),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base"><AlertTriangle className="h-4 w-4" />Late payment penalty</CardTitle>
        <CardDescription>
          Off by default. When on, one penalty is charged per overdue invoice, on the unpaid balance, after the grace period.
          A property's own billing settings override this default.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : (
          <>
            <div className="flex items-center justify-between">
              <Label htmlFor="pen-enabled">Charge late penalties</Label>
              <Switch id="pen-enabled" checked={form.enabled} onCheckedChange={(v) => setForm((p) => ({ ...p, enabled: v }))} />
            </div>
            {form.enabled && (
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label className="text-xs">Penalty type</Label>
                  <Select value={form.type} onValueChange={(v) => setForm((p) => ({ ...p, type: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fixed">Fixed amount</SelectItem>
                      <SelectItem value="percentage">Percentage of unpaid balance</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {form.type === "fixed" ? (
                  <div className="space-y-1"><Label className="text-xs">Amount</Label>
                    <Input inputMode="decimal" value={form.amount} onChange={(e) => setForm((p) => ({ ...p, amount: e.target.value }))} /></div>
                ) : (
                  <div className="space-y-1"><Label className="text-xs">Percentage (0–100)</Label>
                    <Input inputMode="decimal" value={form.pct} onChange={(e) => setForm((p) => ({ ...p, pct: e.target.value }))} /></div>
                )}
                <div className="space-y-1"><Label className="text-xs">Grace period (days, 0–90)</Label>
                  <Input inputMode="numeric" value={form.grace} onChange={(e) => setForm((p) => ({ ...p, grace: e.target.value }))} /></div>
                <div className="space-y-1"><Label className="text-xs">Maximum penalty (optional)</Label>
                  <Input inputMode="decimal" value={form.max} onChange={(e) => setForm((p) => ({ ...p, max: e.target.value }))} /></div>
              </div>
            )}
            <Button onClick={() => save.mutate()} disabled={save.isPending}>
              {save.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}Save policy
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
