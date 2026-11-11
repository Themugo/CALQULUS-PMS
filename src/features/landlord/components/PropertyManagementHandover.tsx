import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase as typedClient } from "@/integrations/supabase/client";
import type { SupabaseClient } from "@supabase/supabase-js";
import { useAuth } from "@/features/auth/AuthContext";
import { useToast } from "@/shared/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Badge } from "@/shared/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/shared/components/ui/alert-dialog";
import { Building2 } from "lucide-react";
import { errorToast } from "@/shared/lib/errorToast";
import { describeOperator, type HandoverAction } from "@/features/landlord/lib/handover";

const supabase = typedClient as unknown as SupabaseClient;

interface Row { id: string; name: string; manager_id: string | null }
interface Transfer { id: string; property_id: string; status: string; to_operator_id: string }

/** Landlord view: who runs each property, and the choice to manage it directly or hand it to an agency. */
export default function PropertyManagementHandover() {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [emails, setEmails] = useState<Record<string, string>>({});
  const [confirm, setConfirm] = useState<{ row: Row; action: HandoverAction } | null>(null);

  const { data } = useQuery({
    queryKey: ["landlord-handover", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data: links } = await supabase.from("property_landlords").select("property_id").eq("landlord_user_id", user.id);
      const ids = (links ?? []).map((l) => l.property_id);
      if (!ids.length) return { rows: [] as Row[], open: [] as Transfer[] };
      const [props, open] = await Promise.all([
        supabase.from("properties").select("id, name, manager_id").in("id", ids).order("name"),
        supabase.from("property_management_transfers").select("id, property_id, status, to_operator_id").in("property_id", ids).eq("status", "proposed"),
      ]);
      return { rows: (props.data ?? []) as Row[], open: (open.data ?? []) as Transfer[] };
    },
  });

  const run = useMutation({
    mutationFn: async ({ row, action }: { row: Row; action: HandoverAction }) => {
      if (action === "cancel") {
        const t = data?.open.find((o) => o.property_id === row.id);
        if (!t) throw new Error("No open request to cancel");
        const { error } = await supabase.rpc("respond_property_management_transfer_atomic", { p_transfer_id: t.id, p_accept: false });
        if (error) throw error;
        return "cancelled";
      }
      const { data: res, error } = await supabase.rpc("request_property_management_transfer_atomic", {
        p_property_id: row.id,
        p_to_email: action === "take_back" ? null : (emails[row.id] ?? "").trim(),
        p_reason: null,
      });
      if (error) throw error;
      return res?.status as string;
    },
    onSuccess: (status) => {
      toast({
        title: status === "completed" ? "Handover complete" : status === "cancelled" ? "Request cancelled" : "Request sent",
        description: status === "completed" ? "All records moved with the property. Nothing was deleted." : status === "proposed" ? "They need to accept before anything changes." : undefined,
      });
      setConfirm(null);
      qc.invalidateQueries({ queryKey: ["landlord-handover"] });
    },
    onError: (e: Error) => errorToast("Could not change who manages this property", e),
  });

  const rows = data?.rows ?? [];
  if (!rows.length) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base"><Building2 className="h-4 w-4" /> Who manages each property</CardTitle>
        <CardDescription>
          The property is yours. Manage it yourself with your own team, or hand it to an agency or manager and take it back later.
          Tenants, bills, payments, receipts and maintenance history move with the property. Nothing is deleted.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {rows.map((row) => {
          const pending = data?.open.find((o) => o.property_id === row.id);
          const state = describeOperator(user?.id, row.manager_id);
          return (
            <div key={row.id} className="rounded-lg border border-border p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-medium">{row.name}</p>
                <Badge variant="outline">{state.label}</Badge>
              </div>
              {pending ? (
                <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                  Waiting for the agency or manager to accept.
                  <Button size="sm" variant="outline" onClick={() => run.mutate({ row, action: "cancel" })} disabled={run.isPending}>Cancel request</Button>
                </div>
              ) : state.self ? (
                <div className="mt-2 flex flex-wrap items-end gap-2">
                  <Input
                    className="max-w-xs"
                    type="email"
                    placeholder="Agency or manager account email"
                    value={emails[row.id] ?? ""}
                    onChange={(e) => setEmails((m) => ({ ...m, [row.id]: e.target.value }))}
                  />
                  <Button size="sm" disabled={!(emails[row.id] ?? "").includes("@") || run.isPending} onClick={() => setConfirm({ row, action: "hand_over" })}>
                    Hand to agency or manager
                  </Button>
                </div>
              ) : (
                <div className="mt-2">
                  <Button size="sm" variant="outline" disabled={run.isPending} onClick={() => setConfirm({ row, action: "take_back" })}>
                    End management and take it back
                  </Button>
                </div>
              )}
            </div>
          );
        })}
      </CardContent>

      <AlertDialog open={!!confirm} onOpenChange={(o) => !o && setConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirm?.action === "take_back" ? "Take this property back?" : "Hand this property over?"}</AlertDialogTitle>
            <AlertDialogDescription>
              {confirm?.action === "take_back"
                ? "You become the manager again. All tenants, bills, payments and history move to you. The agency's own accounting stays with them and their payment accounts for this property are switched off."
                : "Once they accept, all tenants, bills, payments and history move to them and you keep ownership. By default you keep collecting rent; they can agree a different arrangement with you afterwards."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Not now</AlertDialogCancel>
            <AlertDialogAction onClick={() => confirm && run.mutate(confirm)}>Confirm</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
