import React from "react";
import { Activity, Cpu, HardDrive, Network, Server, RefreshCw, CheckCircle2, AlertTriangle, Zap } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { cn } from "@/shared/lib/utils";

export function SystemHealthMonitoring({ className }: { className?: string }) {
  return (
    <Card className={cn("border-border/80 bg-card shadow-sm", className)}>
      <CardHeader className="p-4 border-b bg-muted/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" />
            <CardTitle className="text-base font-bold text-foreground">System Health & Infrastructure Telemetry</CardTitle>
          </div>
          <CardDescription className="text-xs text-muted-foreground">
            Monitor API response latencies, database connection pools, edge functions, and background queues.
          </CardDescription>
        </div>

        <Button size="sm" variant="outline" className="h-8 text-xs font-semibold gap-1">
          <RefreshCw className="h-3.5 w-3.5" /> Refresh Telemetry
        </Button>
      </CardHeader>

      <CardContent className="p-4 space-y-4 text-xs">
        {/* Core System Telemetry Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="p-3 rounded-xl border border-border/80 bg-card space-y-1">
            <div className="flex items-center justify-between text-muted-foreground text-[10px] font-bold uppercase">
              <span>API P99 Latency</span>
              <Zap className="h-3.5 w-3.5 text-amber-500" />
            </div>
            <strong className="text-lg font-extrabold text-foreground">42 ms</strong>
            <span className="text-[10px] text-emerald-600 block font-semibold">100% SLA compliant</span>
          </div>

          <div className="p-3 rounded-xl border border-border/80 bg-card space-y-1">
            <div className="flex items-center justify-between text-muted-foreground text-[10px] font-bold uppercase">
              <span>DB Connection Pool</span>
              <Server className="h-3.5 w-3.5 text-primary" />
            </div>
            <strong className="text-lg font-extrabold text-foreground">18 / 100</strong>
            <span className="text-[10px] text-muted-foreground block font-semibold">Supabase PostgreSQL</span>
          </div>

          <div className="p-3 rounded-xl border border-border/80 bg-card space-y-1">
            <div className="flex items-center justify-between text-muted-foreground text-[10px] font-bold uppercase">
              <span>Edge Workers Queue</span>
              <Activity className="h-3.5 w-3.5 text-emerald-500" />
            </div>
            <strong className="text-lg font-extrabold text-foreground">0 Pending</strong>
            <span className="text-[10px] text-emerald-600 block font-semibold">Idle & clear</span>
          </div>

          <div className="p-3 rounded-xl border border-border/80 bg-card space-y-1">
            <div className="flex items-center justify-between text-muted-foreground text-[10px] font-bold uppercase">
              <span>Edge Functions Status</span>
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
            </div>
            <strong className="text-lg font-extrabold text-emerald-600">Operational</strong>
            <span className="text-[10px] text-muted-foreground block">3/3 Functions healthy</span>
          </div>
        </div>

        {/* Function Health Breakdown */}
        <div className="border border-border/80 rounded-xl p-3 bg-muted/10 space-y-2">
          <h4 className="text-xs font-bold text-foreground">Deployed Edge Functions Health</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            {[
              { name: "send-tenant-invitation", status: "Healthy (200 OK)", avgMs: "180ms" },
              { name: "create-tenant-account", status: "Healthy (200 OK)", avgMs: "210ms" },
              { name: "notify-manager-tenant-signup", status: "Healthy (200 OK)", avgMs: "140ms" },
            ].map((func, idx) => (
              <div key={idx} className="p-2.5 rounded-lg border bg-card flex items-center justify-between">
                <div>
                  <span className="font-bold text-foreground block">{func.name}</span>
                  <span className="text-[10px] text-emerald-600 font-semibold">{func.status}</span>
                </div>
                <Badge variant="outline" className="text-[10px] font-mono">{func.avgMs}</Badge>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
