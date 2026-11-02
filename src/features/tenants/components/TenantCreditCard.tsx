import { useCallback, useEffect, useState } from "react";
import { PiggyBank, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Textarea } from "@/shared/components/ui/textarea";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/shared/components/ui/dialog";
import { useToast } from "@/shared/hooks/use-toast";
import { useCurrency } from "@/shared/hooks/useCurrency";
import { formatDate } from "@/shared/lib/dateFormat";
import { logError } from "@/shared/lib/errorLogger";
import { functionErrorMessage } from "@/features/payments/lib/functionError";

interface LedgerRow {
  id: string;
  entry_type: "credit" | "debit" | "refund";
  amount: number;
  balance_after: number;
  description: string | null;
  created_at: string;
}

const SIGN: Record<LedgerRow["entry_type"], string> = { credit: "+", debit: "−", refund: "−" };

/**
 * Manager view of a tenant's advance (overpayment) credit: balance, recent
 * movements, apply to open invoices, and recall (return) credit.
 * All money-state changes go through edge functions backed by atomic RPCs.
 */
export function TenantCreditCard({ tenantId }: { tenantId: string }) {
  const { formatCurrency } = useCurrency();
  const { toast } = useToast();
  const [rows, setRows] = useState<LedgerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [recallOpen, setRecallOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from("tenant_credit_ledger")
      .select("id, entry_type, amount, balance_after, description, created_at")
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false })
      .limit(5);
    if (error) logError("TenantCreditCard", error);
    setRows((data ?? []) as LedgerRow[]);
    setLoading(false);
  }, [tenantId]);

  useEffect(() => { setLoading(true); void load(); }, [load]);

  const balance = Number(rows[0]?.balance_after ?? 0);
  if (loading || (rows.length === 0)) return null;

  const apply = async () => {
    setBusy(true);
    const { data, error } = await supabase.functions.invoke("apply-credit", { body: { tenant_id: tenantId } });
    setBusy(false);
    if (error) {
      toast({ title: "Could not apply credit", description: await functionErrorMessage(error, data, "Please retry."), variant: "destructive" });
      return;
    }
    const applied = Number((data as { applied?: number })?.applied ?? 0);
    toast({ title: applied > 0 ? "Credit applied" : "Nothing to apply", description: applied > 0 ? `${formatCurrency(applied)} applied to open invoices.` : "There are no open invoices for this credit." });
    void load();
  };

  const recall = async () => {
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0 || value > balance || !reason.trim()) return;
    setBusy(true);
    const { data, error } = await supabase.functions.invoke("recall-credit", {
      body: { tenant_id: tenantId, amount: value, reason: reason.trim() },
    });
    setBusy(false);
    if (error) {
      toast({ title: "Could not recall credit", description: await functionErrorMessage(error, data, "Please retry."), variant: "destructive" });
      return;
    }
    toast({ title: "Credit recalled", description: `${formatCurrency(value)} removed from the tenant's credit. Return the money to the tenant directly.` });
    setRecallOpen(false); setAmount(""); setReason("");
    void load();
  };

  const invalidAmount = !(Number(amount) > 0) || Number(amount) > balance;

  return (
    <div className="mb-4 rounded-lg border border-border p-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <PiggyBank className="h-5 w-5 text-primary" />
          <div>
            <p className="text-xs text-muted-foreground">Advance credit</p>
            <p className="text-lg font-semibold">{formatCurrency(balance)}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" disabled={busy || balance <= 0} onClick={apply}>
            {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Apply to invoices
          </Button>
          <Button size="sm" variant="outline" disabled={busy || balance <= 0} onClick={() => { setAmount(String(balance)); setRecallOpen(true); }}>
            Recall credit
          </Button>
        </div>
      </div>
      <ul className="divide-y divide-border text-sm">
        {rows.map((r) => (
          <li key={r.id} className="flex items-center justify-between gap-3 py-1.5">
            <span className="min-w-0 truncate text-muted-foreground">{r.description ?? r.entry_type} · {formatDate(r.created_at)}</span>
            <span className="shrink-0 font-medium">{SIGN[r.entry_type]}{formatCurrency(Number(r.amount))}</span>
          </li>
        ))}
      </ul>

      <Dialog open={recallOpen} onOpenChange={setRecallOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Recall credit</DialogTitle>
            <DialogDescription>
              Removes credit from the tenant's account. This only records the recall; return the money to the tenant yourself (M-Pesa or bank).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="recall-amount">Amount (max {formatCurrency(balance)})</Label>
              <Input id="recall-amount" type="number" inputMode="decimal" min="0" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="recall-reason">Reason</Label>
              <Textarea id="recall-reason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Tenant requested refund of overpayment" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRecallOpen(false)} disabled={busy}>Cancel</Button>
            <Button onClick={recall} disabled={busy || invalidAmount || !reason.trim()}>
              {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Recall
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
