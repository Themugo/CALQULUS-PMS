import { useCallback, useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";

type CheckState = { name: string; detail: string; ok: boolean | null; ms: number | null };

const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.replace(/\/$/, "") ?? "";
const SUPABASE_KEY = (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined) ?? "";

const CHECKS = [
  { name: "Database API", detail: "PostgREST reachable", path: "/rest/v1/", okWhen: (s: number) => s < 500 },
  { name: "Authentication", detail: "Auth service reachable", path: "/auth/v1/health", okWhen: (s: number) => s < 500 },
  { name: "Edge functions", detail: "Server functions reachable", path: "/functions/v1/health-check", okWhen: (s: number) => s !== 404 && s < 500 },
] as const;

/** Round-trip checks measured from this browser. Nothing here is a stored or invented figure. */
export function LiveSystemStatus() {
  const [rows, setRows] = useState<CheckState[]>(CHECKS.map((c) => ({ name: c.name, detail: "Checking…", ok: null, ms: null })));
  const [checkedAt, setCheckedAt] = useState<Date | null>(null);
  const [running, setRunning] = useState(false);

  const run = useCallback(async () => {
    if (!SUPABASE_URL || !SUPABASE_KEY) {
      setRows(CHECKS.map((c) => ({ name: c.name, detail: "Not configured in this environment", ok: false, ms: null })));
      setCheckedAt(new Date());
      return;
    }
    setRunning(true);
    const next = await Promise.all(CHECKS.map(async (c): Promise<CheckState> => {
      const started = performance.now();
      try {
        const res = await fetch(`${SUPABASE_URL}${c.path}`, { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } });
        const ms = Math.round(performance.now() - started);
        const ok = c.okWhen(res.status);
        return { name: c.name, detail: ok ? c.detail : `Unavailable (HTTP ${res.status})`, ok, ms };
      } catch {
        return { name: c.name, detail: "Could not be reached from this device", ok: false, ms: null };
      }
    }));
    setRows(next);
    setCheckedAt(new Date());
    setRunning(false);
  }, []);

  useEffect(() => { void run(); }, [run]);

  return (
    <div className="space-y-3 text-xs">
      {rows.map((row) => (
        <div key={row.name} className="flex items-center justify-between rounded-lg border border-border/80 bg-card p-3.5">
          <div className="flex items-center gap-2.5">
            <span className={`h-2.5 w-2.5 rounded-full ${row.ok === null ? "bg-muted-foreground/40" : row.ok ? "bg-success" : "bg-destructive"}`} aria-hidden />
            <div>
              <p className="font-bold text-foreground">{row.name}</p>
              <p className="text-[11px] text-muted-foreground">{row.detail}{row.ms !== null ? ` · ${row.ms} ms` : ""}</p>
            </div>
          </div>
          <Badge variant="outline" className={row.ok === null ? "" : row.ok ? "border-success/40 text-success" : "border-destructive/40 text-destructive"}>
            {row.ok === null ? "Checking" : row.ok ? "Reachable" : "Problem"}
          </Badge>
        </div>
      ))}
      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
        <span>{checkedAt ? `Checked ${checkedAt.toLocaleTimeString()} from this device` : "Running checks…"}</span>
        <Button type="button" size="sm" variant="ghost" className="h-7 gap-1 text-[11px]" onClick={() => void run()} disabled={running}>
          <RefreshCw className={`h-3 w-3 ${running ? "animate-spin" : ""}`} aria-hidden />Re-check
        </Button>
      </div>
    </div>
  );
}
