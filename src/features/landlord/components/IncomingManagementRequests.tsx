import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase as typedClient } from "@/integrations/supabase/client";
import type { SupabaseClient } from "@supabase/supabase-js";
import { useAuth } from "@/features/auth/AuthContext";
import { useToast } from "@/shared/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { errorToast } from "@/shared/lib/errorToast";

const supabase = typedClient as unknown as SupabaseClient;

/** Agency / manager view: landlords asking this account to take over management of a property. */
export default function IncomingManagementRequests() {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: requests = [] } = useQuery({
    queryKey: ["incoming-management-requests", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data: rows } = await supabase
        .from("property_management_transfers")
        .select("id, property_id, created_at, reason")
        .eq("to_operator_id", user.id)
        .eq("status", "proposed")
        .order("created_at");
      const ids = (rows ?? []).map((r) => r.property_id);
      const { data: props } = ids.length ? await supabase.from("properties").select("id, name").in("id", ids) : { data: [] };
      const names = new Map((props ?? []).map((p) => [p.id, p.name]));
      return (rows ?? []).map((r) => ({ ...r, name: names.get(r.property_id) ?? "A property" }));
    },
  });

  const respond = useMutation({
    mutationFn: async ({ id, accept }: { id: string; accept: boolean }) => {
      const { error } = await supabase.rpc("respond_property_management_transfer_atomic", { p_transfer_id: id, p_accept: accept });
      if (error) throw error;
      return accept;
    },
    onSuccess: (accepted) => {
      toast({ title: accepted ? "Property taken on" : "Request declined", description: accepted ? "Its tenants, bills and history are now in your workspace." : undefined });
      qc.invalidateQueries();
    },
    onError: (e: Error) => errorToast("Could not respond", e),
  });

  if (!requests.length) return null;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Management requests</CardTitle>
        <CardDescription>Owners asking you to take over a property. Accepting moves its tenants, bills, payments and history to you.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {requests.map((r) => (
          <div key={r.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border p-3">
            <div>
              <p className="font-medium">{r.name}</p>
              {r.reason ? <p className="text-xs text-muted-foreground">{r.reason}</p> : null}
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" disabled={respond.isPending} onClick={() => respond.mutate({ id: r.id, accept: false })}>Decline</Button>
              <Button size="sm" disabled={respond.isPending} onClick={() => respond.mutate({ id: r.id, accept: true })}>Accept</Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
