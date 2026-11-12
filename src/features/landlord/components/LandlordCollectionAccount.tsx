import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CreditCard, Info, Save } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/features/auth/AuthContext";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Textarea } from "@/shared/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";

type Method = "mpesa_paybill" | "mpesa_till" | "bank_transfer" | "cash";
const EMPTY = { method: "mpesa_till" as Method, label: "Rent collection", paybill: "", accountReference: "", till: "", bank: "", accountName: "", accountNumber: "", branch: "", instructions: "" };

interface Props {
  propertyId: string;
  /** property_landlords.payment_destination as returned by the management overview */
  destination: string | null;
  managerName: string | null;
}

/**
 * The landlord's own collection details for one property, shown to that
 * property's tenants (portal bill + manual payment guide). The server only
 * accepts it when rent for the property is actually collected by the landlord.
 */
export function LandlordCollectionAccount({ propertyId, destination, managerName }: Props) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [form, setForm] = useState(EMPTY);
  const collectsDirectly = destination === "landlord";

  const { data: account, isLoading } = useQuery({
    queryKey: ["landlord-collection-account", propertyId, user?.id],
    enabled: Boolean(user?.id) && collectsDirectly,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payment_collection_accounts" as never)
        .select("*")
        .eq("property_id", propertyId)
        .eq("landlord_user_id", user!.id)
        .is("unit_id", null).is("lease_id", null).is("tenant_id", null).is("agency_id", null)
        .eq("is_active", true).eq("is_default", true)
        .maybeSingle();
      if (error && error.code !== "PGRST116") throw error;
      return (data ?? null) as Record<string, string | null> | null;
    },
  });

  useEffect(() => {
    if (!account) return;
    setForm({
      method: (account.payment_method as Method) ?? "mpesa_till",
      label: account.account_label ?? "Rent collection",
      paybill: account.paybill_number ?? "",
      accountReference: account.account_reference ?? "",
      till: account.till_number ?? "",
      bank: account.bank_name ?? "",
      accountName: account.bank_account_name ?? "",
      accountNumber: account.bank_account_number ?? "",
      branch: account.bank_branch ?? "",
      instructions: account.payment_instructions ?? "",
    });
  }, [account]);

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc("save_landlord_collection_account_atomic" as never, {
        p_property_id: propertyId,
        p_payload: {
          payment_method: form.method,
          account_label: form.label,
          paybill_number: form.paybill,
          account_reference: form.accountReference,
          till_number: form.till,
          bank_name: form.bank,
          bank_account_name: form.accountName,
          bank_account_number: form.accountNumber,
          bank_branch: form.branch,
          payment_instructions: form.instructions,
        },
      } as never);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Collection account saved. Tenants of this property will see it on their bills.");
      qc.invalidateQueries({ queryKey: ["landlord-collection-account", propertyId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!collectsDirectly) {
    return (
      <div className="lg:col-span-4 flex items-start gap-2 rounded-lg border border-dashed p-3 text-xs text-muted-foreground">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
        <span>{managerName || "Your manager or agency"} collects rent for this property, so tenants are shown their payment details. To collect directly instead, request a control review below.</span>
      </div>
    );
  }

  const set = (k: keyof typeof EMPTY) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const needsValue =
    (form.method === "mpesa_paybill" && !form.paybill.trim()) ||
    (form.method === "mpesa_till" && !form.till.trim()) ||
    (form.method === "bank_transfer" && (!form.bank.trim() || !form.accountNumber.trim()));

  return (
    <div className="lg:col-span-4 space-y-3 rounded-lg border p-3">
      <div>
        <p className="flex items-center gap-1.5 text-sm font-semibold"><CreditCard className="h-4 w-4" aria-hidden />Where your tenants pay you</p>
        <p className="text-xs text-muted-foreground">Shown to this property's tenants on every bill, including the manual payment guide in their portal. {account ? "Update it any time." : "Nothing is set yet, so tenants see no payment details."}</p>
      </div>
      {isLoading ? <p className="text-xs text-muted-foreground">Loading…</p> : (
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label className="text-xs">Method</Label>
            <Select value={form.method} onValueChange={(v) => setForm((f) => ({ ...f, method: v as Method }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="mpesa_till">M-Pesa Till (Buy Goods)</SelectItem>
                <SelectItem value="mpesa_paybill">M-Pesa Paybill</SelectItem>
                <SelectItem value="bank_transfer">Bank transfer</SelectItem>
                <SelectItem value="cash">Cash / in person</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div><Label className="text-xs">Label shown to tenants</Label><Input value={form.label} onChange={set("label")} /></div>
          {form.method === "mpesa_till" && <div><Label className="text-xs">Till number</Label><Input value={form.till} onChange={set("till")} inputMode="numeric" /></div>}
          {form.method === "mpesa_paybill" && <>
            <div><Label className="text-xs">Paybill number</Label><Input value={form.paybill} onChange={set("paybill")} inputMode="numeric" /></div>
            <div><Label className="text-xs">Account number tenants should enter</Label><Input value={form.accountReference} onChange={set("accountReference")} placeholder="e.g. their unit number" /></div>
          </>}
          {form.method === "bank_transfer" && <>
            <div><Label className="text-xs">Bank</Label><Input value={form.bank} onChange={set("bank")} /></div>
            <div><Label className="text-xs">Account name</Label><Input value={form.accountName} onChange={set("accountName")} /></div>
            <div><Label className="text-xs">Account number</Label><Input value={form.accountNumber} onChange={set("accountNumber")} /></div>
            <div><Label className="text-xs">Branch</Label><Input value={form.branch} onChange={set("branch")} /></div>
          </>}
          <div className="sm:col-span-2"><Label className="text-xs">Instructions for tenants (optional)</Label><Textarea rows={2} value={form.instructions} onChange={set("instructions")} placeholder="e.g. Use your unit number as the reference, then upload your receipt." /></div>
        </div>
      )}
      <Button size="sm" onClick={() => save.mutate()} disabled={save.isPending || needsValue || isLoading}>
        <Save className="mr-2 h-4 w-4" aria-hidden />{save.isPending ? "Saving…" : "Save collection account"}
      </Button>
    </div>
  );
}
