import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase as typedClient } from "@/integrations/supabase/client";
import type { SupabaseClient } from "@supabase/supabase-js";
import { useAuth } from "@/features/auth/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { errorToast } from "@/shared/lib/errorToast";
import { ARCHIVE_RECORD_TYPES, archiveRowsToCsv } from "@/features/landlord/lib/archiveExport";

const supabase = typedClient as unknown as SupabaseClient;

interface Period { id: string; property_id: string; period_start: string | null; completed_at: string; archive_access_until: string | null; name: string }

/** Agency / manager view: read-only records for the period it managed a property that has since moved on. */
export default function ArchivedManagementPeriods() {
  const { user } = useAuth();
  const [busy, setBusy] = useState<string | null>(null);

  const { data: periods = [] } = useQuery({
    queryKey: ["archived-management-periods", user?.id],
    enabled: !!user?.id,
    queryFn: async (): Promise<Period[]> => {
      const { data: rows } = await supabase
        .from("property_management_transfers")
        .select("id, property_id, owner_user_id, period_start, completed_at, archive_access_until")
        .eq("from_operator_id", user!.id)
        .eq("status", "completed")
        .order("completed_at", { ascending: false });
      const mine = (rows ?? []).filter((r: { owner_user_id: string }) => r.owner_user_id !== user!.id);
      const ids = mine.map((r: { property_id: string }) => r.property_id);
      const { data: props } = ids.length ? await supabase.from("properties").select("id, name").in("id", ids) : { data: [] };
      const names = new Map((props ?? []).map((p: { id: string; name: string }) => [p.id, p.name]));
      return mine
        .filter((r: { archive_access_until: string | null }) => !r.archive_access_until || new Date(r.archive_access_until) > new Date())
        .map((r: Period) => ({ ...r, name: names.get(r.property_id) ?? "Property" }));
    },
  });

  const download = async (p: Period, type: string, label: string) => {
    setBusy(`${p.id}:${type}`);
    try {
      const all: Array<Record<string, unknown>> = [];
      for (let offset = 0; offset < 20000; offset += 1000) {
        const { data, error } = await supabase.rpc("get_archived_property_records", { p_transfer_id: p.id, p_table: type, p_limit: 1000, p_offset: offset });
        if (error) throw error;
        const rows = (data?.rows ?? []) as Array<Record<string, unknown>>;
        all.push(...rows);
        if (rows.length < 1000) break;
      }
      const blob = new Blob([archiveRowsToCsv(all)], { type: "text/csv;charset=utf-8" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `${p.name}-${label}-archive.csv`.replace(/[^\w.-]+/g, "_");
      a.click();
      URL.revokeObjectURL(a.href);
    } catch (e) {
      errorToast("Could not download the archive", e as Error);
    } finally {
      setBusy(null);
    }
  };

  if (!periods.length) return null;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Archive of properties you no longer manage</CardTitle>
        <CardDescription>
          Read-only records for the period you managed each property, kept for your accounting and legal needs. Access lasts 7 years after the handover.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {periods.map((p) => (
          <div key={p.id} className="rounded-lg border border-border p-3">
            <p className="font-medium">{p.name}</p>
            <p className="text-xs text-muted-foreground">
              {p.period_start ? new Date(p.period_start).toLocaleDateString() : "Start"} – {new Date(p.completed_at).toLocaleDateString()}
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {ARCHIVE_RECORD_TYPES.map((t) => (
                <Button key={t.id} size="sm" variant="outline" disabled={busy !== null} onClick={() => download(p, t.id, t.label)}>
                  {busy === `${p.id}:${t.id}` ? "Preparing…" : `${t.label} (CSV)`}
                </Button>
              ))}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
