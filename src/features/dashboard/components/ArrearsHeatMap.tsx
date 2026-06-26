import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useManagerScope } from "@/shared/hooks/useManagerScope";
import { useCurrency } from "@/shared/hooks/useCurrency";
import { logError } from "@/shared/lib/errorLogger";
import { cn } from "@/shared/lib/utils";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { Card, CardContent } from "@/shared/components/ui/card";
import { CheckCircle2, AlertTriangle, Flame, ArrowRight } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { useNavigate } from "react-router-dom";

interface PropertyArrears {
  propertyId: string | null;
  propertyName: string;
  totalArrears: number;
  overdueCount: number;
}

interface RawInvoice {
  balance_due: number;
  leases: {
    property: string | null;
    property_id: string | null;
  } | null;
}

function heatLevel(amount: number, max: number): 0 | 1 | 2 | 3 | 4 {
  if (max === 0 || amount === 0) return 0;
  const ratio = amount / max;
  if (ratio < 0.25) return 1;
  if (ratio < 0.50) return 2;
  if (ratio < 0.75) return 3;
  return 4;
}

const heatStyles: Record<0 | 1 | 2 | 3 | 4, { tile: string; badge: string; label: string }> = {
  0: {
    tile:  "bg-emerald-500/8 border-emerald-500/20 hover:border-emerald-500/40",
    badge: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
    label: "Clear",
  },
  1: {
    tile:  "bg-amber-400/10 border-amber-400/30 hover:border-amber-400/60",
    badge: "bg-amber-400/20 text-amber-700 dark:text-amber-400",
    label: "Low",
  },
  2: {
    tile:  "bg-orange-400/12 border-orange-400/35 hover:border-orange-400/65",
    badge: "bg-orange-400/20 text-orange-700 dark:text-orange-400",
    label: "Medium",
  },
  3: {
    tile:  "bg-red-400/15 border-red-400/40 hover:border-red-500/70",
    badge: "bg-red-400/20 text-red-700 dark:text-red-400",
    label: "High",
  },
  4: {
    tile:  "bg-red-600/20 border-red-500/50 hover:border-red-500/80",
    badge: "bg-red-500/25 text-red-700 dark:text-red-300 font-bold",
    label: "Critical",
  },
};

export function ArrearsHeatMap() {
  const { managerId } = useManagerScope();
  const { formatCurrency } = useCurrency();
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ["arrears-heatmap", managerId],
    queryFn: async (): Promise<PropertyArrears[]> => {
      if (!managerId) return [];
      const { data: rows, error } = await supabase
        .from("invoices")
        .select("balance_due, leases(property, property_id)")
        .eq("manager_id", managerId)
        .eq("status", "overdue");

      if (error) throw error;

      const byProperty = new Map<string, PropertyArrears>();
      for (const row of (rows ?? []) as RawInvoice[]) {
        const name = row.leases?.property ?? "Unknown Property";
        const pid  = row.leases?.property_id ?? name;
        const existing = byProperty.get(pid);
        if (existing) {
          existing.totalArrears += Number(row.balance_due ?? 0);
          existing.overdueCount += 1;
        } else {
          byProperty.set(pid, {
            propertyId:   pid,
            propertyName: name,
            totalArrears: Number(row.balance_due ?? 0),
            overdueCount: 1,
          });
        }
      }

      return Array.from(byProperty.values()).sort(
        (a, b) => b.totalArrears - a.totalArrears
      );
    },
    enabled: !!managerId,
    staleTime: 5 * 60 * 1000,
    throwOnError: (err) => {
      logError("ArrearsHeatMap", err);
      return false;
    },
  });

  const maxArrears = data ? Math.max(...data.map((p) => p.totalArrears), 1) : 1;
  const totalArrears  = data?.reduce((s, p) => s + p.totalArrears, 0) ?? 0;
  const totalOverdue  = data?.reduce((s, p) => s + p.overdueCount, 0) ?? 0;
  const criticalCount = data?.filter((p) => heatLevel(p.totalArrears, maxArrears) >= 3).length ?? 0;

  return (
    <Card className="mb-6 overflow-hidden border-border/60">
      <CardContent className="p-4 sm:p-5">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-red-500/15 to-orange-500/5 border border-red-500/20 flex items-center justify-center shadow-sm">
              <Flame className="h-3.5 w-3.5 text-red-500" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground leading-tight">Arrears Heat Map</p>
              <p className="text-[11px] text-muted-foreground/70 leading-tight">Per-property overdue invoices</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!isLoading && criticalCount > 0 && (
              <span className="flex items-center gap-1 text-[11px] font-semibold text-red-600 dark:text-red-400 bg-red-500/10 border border-red-500/20 rounded-full px-2 py-0.5">
                <AlertTriangle className="h-3 w-3" />
                {criticalCount} critical
              </span>
            )}
            <Button
              size="sm"
              variant="ghost"
              className="text-xs text-muted-foreground h-7 gap-1 hover:text-foreground"
              onClick={() => navigate("/billing?filter=overdue")}
            >
              View all <ArrowRight className="h-3 w-3" />
            </Button>
          </div>
        </div>

        {/* Loading state */}
        {isLoading && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-2 sm:gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-xl" />
            ))}
          </div>
        )}

        {/* All-clear state */}
        {!isLoading && (!data || data.length === 0) && (
          <div className="flex flex-col items-center justify-center py-10 gap-3">
            <div className="h-12 w-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
              <CheckCircle2 className="h-6 w-6 text-emerald-500" />
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold text-foreground">All properties clear</p>
              <p className="text-xs text-muted-foreground mt-0.5">No overdue invoices across your portfolio</p>
            </div>
          </div>
        )}

        {/* Heat map grid */}
        {!isLoading && data && data.length > 0 && (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-2 sm:gap-3">
              {data.map((prop) => {
                const level  = heatLevel(prop.totalArrears, maxArrears);
                const styles = heatStyles[level];
                return (
                  <button
                    key={prop.propertyId}
                    onClick={() => navigate(`/billing?filter=overdue&property=${encodeURIComponent(prop.propertyName)}`)}
                    className={cn(
                      "group relative text-left rounded-xl border p-3 transition-all duration-200",
                      "hover:-translate-y-0.5 hover:shadow-md active:scale-[0.97] touch-manipulation",
                      styles.tile,
                      "animate-fade-in"
                    )}
                  >
                    {/* Heat intensity bar along top edge */}
                    <div
                      className={cn(
                        "absolute top-0 inset-x-0 h-0.5 rounded-t-xl transition-opacity duration-300",
                        level === 0 && "bg-emerald-500/40 opacity-60",
                        level === 1 && "bg-amber-400/70",
                        level === 2 && "bg-orange-400",
                        level === 3 && "bg-red-400",
                        level === 4 && "bg-red-600 opacity-90",
                      )}
                      style={{
                        width: level === 0
                          ? "100%"
                          : `${Math.max(20, Math.round((prop.totalArrears / maxArrears) * 100))}%`,
                      }}
                    />

                    {/* Badge */}
                    <span className={cn("inline-flex text-[10px] font-semibold rounded-full px-1.5 py-0.5 mb-2", styles.badge)}>
                      {styles.label}
                    </span>

                    {/* Property name */}
                    <p className="text-xs font-semibold text-foreground leading-tight line-clamp-2 mb-1.5 min-h-[2rem]">
                      {prop.propertyName}
                    </p>

                    {/* Arrears amount */}
                    <p className={cn(
                      "text-sm font-bold tracking-tight",
                      level >= 3 ? "text-red-600 dark:text-red-400" : "text-foreground"
                    )}>
                      {formatCurrency(prop.totalArrears)}
                    </p>

                    {/* Overdue count */}
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {prop.overdueCount} invoice{prop.overdueCount !== 1 ? "s" : ""} overdue
                    </p>
                  </button>
                );
              })}
            </div>

            {/* Footer summary */}
            <div className="mt-4 pt-3 border-t border-border/40 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-4">
                <div>
                  <p className="text-[10px] text-muted-foreground/60 uppercase tracking-widest font-semibold">Total Arrears</p>
                  <p className="text-sm font-bold text-red-600 dark:text-red-400">{formatCurrency(totalArrears)}</p>
                </div>
                <div className="h-6 w-px bg-border/60" />
                <div>
                  <p className="text-[10px] text-muted-foreground/60 uppercase tracking-widest font-semibold">Overdue Invoices</p>
                  <p className="text-sm font-bold text-foreground">{totalOverdue}</p>
                </div>
                <div className="h-6 w-px bg-border/60" />
                <div>
                  <p className="text-[10px] text-muted-foreground/60 uppercase tracking-widest font-semibold">Properties Affected</p>
                  <p className="text-sm font-bold text-foreground">{data.length}</p>
                </div>
              </div>
              {/* Heat scale legend */}
              <div className="hidden sm:flex items-center gap-1.5">
                <span className="text-[10px] text-muted-foreground/60 mr-1">Heat:</span>
                {([0, 1, 2, 3, 4] as const).map((lvl) => (
                  <span key={lvl} className={cn("text-[10px] font-semibold rounded-full px-2 py-0.5", heatStyles[lvl].badge)}>
                    {heatStyles[lvl].label}
                  </span>
                ))}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
