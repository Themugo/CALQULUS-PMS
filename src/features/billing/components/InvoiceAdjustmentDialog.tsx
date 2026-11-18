import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/shared/hooks/use-toast";
import { errorToast } from "@/shared/lib/errorToast";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Textarea } from "@/shared/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/shared/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { Loader2 } from "lucide-react";

type Kind = "waive_penalty" | "discount" | "write_off";
interface Row { id: string; adjustment_type: string; amount: number; reason: string; created_at: string; reversed_by_id: string | null; actor_capacity: string }
interface Props { invoiceId: string | null; invoiceNumber?: string; open: boolean; onOpenChange: (o: boolean) => void; onDone: () => void }

const LABEL: Record<string, string> = { waive_penalty: "Penalty waived", discount: "Discount", write_off: "Written off", reversal: "Reversal" };

/** Waive a penalty, give a discount or write off debt on one invoice, with a mandatory reason and a visible history. */
export function InvoiceAdjustmentDialog({ invoiceId, invoiceNumber, open, onOpenChange, onDone }: Props) {
  const { toast } = useToast();
  const [info, setInfo] = useState<{ invoice_type: string | null; balance_due: number; status: string; due_date: string } | null>(null);
  const [history, setHistory] = useState<Row[]>([]);
  const [kind, setKind] = useState<Kind>("discount");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  const load = async () => {
    if (!invoiceId) return;
    const { data } = await supabase.from("invoices").select("invoice_type, balance_due, status, due_date").eq("id", invoiceId).maybeSingle();
    if (data) {
      const d = data as { invoice_type: string | null; balance_due: number | null; status: string; due_date: string };
      setInfo({ ...d, balance_due: Number(d.balance_due ?? 0) });
      setKind(d.invoice_type === "penalty" ? "waive_penalty" : "discount");
      setAmount(String(Number(d.balance_due ?? 0)));
    }
    const { data: h } = await supabase.from("invoice_adjustments" as never).select("*").eq("invoice_id", invoiceId).order("created_at", { ascending: false });
    setHistory((h ?? []) as Row[]);
  };
  useEffect(() => { if (open) { setReason(""); void load(); } }, [open, invoiceId]); // eslint-disable-line react-hooks/exhaustive-deps

  const isPenalty = info?.invoice_type === "penalty";
  const overdue = !!info && (info.status === "overdue" || info.due_date < new Date().toISOString().slice(0, 10));
  const parsed = Math.round((parseFloat(amount) || 0) * 100) / 100;
  const valid = !!info && parsed > 0 && parsed <= info.balance_due && reason.trim().length >= 5 && (kind !== "write_off" || overdue);

  const submit = async () => {
    if (!invoiceId || !valid) return;
    setBusy(true);
    try {
      const { error } = await supabase.rpc("adjust_invoice_atomic" as never, { p_invoice_id: invoiceId, p_type: kind, p_amount: parsed, p_reason: reason.trim() } as never);
      if (error) throw error;
      toast({ title: `${LABEL[kind]} recorded`, description: "The balance was updated and the action was logged." });
      onDone();
      onOpenChange(false);
    } catch (e) { errorToast("Could not record adjustment", e as Error); } finally { setBusy(false); }
  };

  const reverse = async (id: string) => {
    const why = window.prompt("Reason for reversing this adjustment (min 5 characters):") ?? "";
    if (why.trim().length < 5) return;
    try {
      const { error } = await supabase.rpc("reverse_invoice_adjustment_atomic" as never, { p_adjustment_id: id, p_reason: why.trim() } as never);
      if (error) throw error;
      toast({ title: "Adjustment reversed" });
      onDone();
      await load();
    } catch (e) { errorToast("Could not reverse", e as Error); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Adjust balance{invoiceNumber ? ` — ${invoiceNumber}` : ""}</DialogTitle>
          <DialogDescription>
            Waive a penalty, give a discount, or write off debt you will not collect. Forgiven amounts are not cash: payments and landlord income are unaffected. Every action is logged with your reason.
          </DialogDescription>
        </DialogHeader>
        {!info ? <Loader2 className="h-4 w-4 animate-spin" /> : (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Outstanding balance: <span className="font-medium text-foreground">{info.balance_due.toLocaleString()}</span></p>
            <div className="space-y-1">
              <Label className="text-xs">Action</Label>
              <Select value={kind} onValueChange={(v) => setKind(v as Kind)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {isPenalty
                    ? <SelectItem value="waive_penalty">Waive penalty</SelectItem>
                    : <SelectItem value="discount">Discount</SelectItem>}
                  <SelectItem value="write_off" disabled={!overdue}>Write off bad debt{overdue ? "" : " (overdue only)"}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Amount (max {info.balance_due.toLocaleString()})</Label>
              <Input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Reason (required, kept in the audit log)</Label>
              <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} maxLength={500} />
            </div>
            {history.length > 0 && (
              <div className="space-y-1 border-t pt-3">
                <Label className="text-xs">History</Label>
                {history.map((h) => (
                  <div key={h.id} className="flex items-start justify-between gap-2 text-xs">
                    <span>{LABEL[h.adjustment_type] ?? h.adjustment_type} · {Number(h.amount).toLocaleString()} · {new Date(h.created_at).toLocaleDateString()} — {h.reason}{h.reversed_by_id ? " (reversed)" : ""}</span>
                    {h.adjustment_type !== "reversal" && !h.reversed_by_id && <Button variant="ghost" size="sm" onClick={() => reverse(h.id)}>Reverse</Button>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
          <Button onClick={submit} disabled={!valid || busy}>{busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}Record</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
