import { LucideIcon, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/shared/lib/utils";

interface StatCardProps {
  title: string;
  value: string;
  change?: string;
  changeType?: "positive" | "negative" | "neutral";
  icon: LucideIcon;
  iconColor?: "primary" | "accent" | "success" | "warning" | "destructive";
  progressValue?: number;
  /** Counts per bar rendered as a mini sparkline bar chart */
  sparkData?: number[];
  /** Labels per bar for tooltip (e.g. ["Mon","Tue",...] or ["Wk 1","Wk 2",...]) */
  sparkLabels?: string[];
  /** Noun appended to count in bar tooltip, e.g. "lease" → "3 leases expiring" */
  sparkUnit?: string;
  /** Label shown below the sparkline (default: "7-day trend") */
  sparkCaption?: string;
}

const iconColorMap = {
  primary: {
    bg: "bg-gradient-to-br from-blue-600/15 to-blue-600/5 border-blue-500/20",
    icon: "text-blue-500",
    glow: "shadow-blue-500/10",
    progress: "bg-blue-500",
    accentVia: "via-blue-500/60",
    spark: "bg-blue-500",
    sparkMuted: "bg-blue-500/25",
  },
  accent: {
    bg: "bg-gradient-to-br from-amber-400/15 to-amber-400/5 border-amber-400/25",
    icon: "text-amber-500",
    glow: "shadow-amber-400/15",
    progress: "bg-amber-400",
    accentVia: "via-amber-400/60",
    spark: "bg-amber-400",
    sparkMuted: "bg-amber-400/25",
  },
  success: {
    bg: "bg-gradient-to-br from-emerald-500/15 to-emerald-500/5 border-emerald-500/20",
    icon: "text-emerald-500",
    glow: "shadow-emerald-500/10",
    progress: "bg-emerald-500",
    accentVia: "via-emerald-500/60",
    spark: "bg-emerald-500",
    sparkMuted: "bg-emerald-500/25",
  },
  warning: {
    bg: "bg-gradient-to-br from-orange-500/15 to-orange-500/5 border-orange-500/20",
    icon: "text-orange-500",
    glow: "shadow-orange-500/10",
    progress: "bg-orange-500",
    accentVia: "via-orange-500/60",
    spark: "bg-orange-500",
    sparkMuted: "bg-orange-500/25",
  },
  destructive: {
    bg: "bg-gradient-to-br from-red-500/15 to-red-500/5 border-red-500/20",
    icon: "text-red-500",
    glow: "shadow-red-500/10",
    progress: "bg-red-500",
    accentVia: "via-red-500/60",
    spark: "bg-red-500",
    sparkMuted: "bg-red-500/25",
  },
};

export function StatCard({
  title,
  value,
  change,
  changeType = "neutral",
  icon: Icon,
  iconColor = "accent",
  progressValue,
  sparkData,
  sparkLabels,
  sparkUnit = "item",
  sparkCaption = "7-day trend",
}: StatCardProps) {
  const colors = iconColorMap[iconColor];

  const TrendIcon =
    changeType === "positive"
      ? TrendingUp
      : changeType === "negative"
        ? TrendingDown
        : Minus;

  const sparkMax = sparkData ? Math.max(...sparkData, 1) : 1;

  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-2xl border bg-card p-4 sm:p-5",
        "shadow-sm transition-all duration-300 hover:shadow-lg hover:-translate-y-1",
        "active:scale-[0.98] animate-fade-in touch-manipulation",
        "border-border/60 hover:border-amber-400/20"
      )}
    >
      {/* Colored top accent line on hover */}
      <div
        className={cn(
          "absolute top-0 left-0 right-0 h-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-300",
          "bg-gradient-to-r from-transparent",
          colors.accentVia,
          "to-transparent"
        )}
      />

      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1.5 min-w-0 flex-1">
          <p className="text-xs font-semibold text-muted-foreground/70 uppercase tracking-widest truncate">
            {title}
          </p>
          <p className="font-heading text-2xl sm:text-3xl font-bold text-card-foreground tracking-tight truncate">
            {value}
          </p>
          {change && (
            <div className="flex items-center gap-1.5">
              <TrendIcon
                className={cn(
                  "h-3 w-3 flex-shrink-0",
                  changeType === "positive" && "text-emerald-500",
                  changeType === "negative" && "text-red-500",
                  changeType === "neutral" && "text-muted-foreground"
                )}
              />
              <span
                className={cn(
                  "text-xs font-semibold",
                  changeType === "positive" && "text-emerald-500",
                  changeType === "negative" && "text-red-500",
                  changeType === "neutral" && "text-muted-foreground"
                )}
              >
                {change}
              </span>
            </div>
          )}
        </div>

        <div
          className={cn(
            "rounded-xl border p-2.5 sm:p-3 flex-shrink-0 shadow-sm",
            "transition-all duration-300 group-hover:scale-110 group-hover:shadow-md",
            colors.bg,
            colors.glow
          )}
        >
          <Icon className={cn("h-5 w-5", colors.icon)} />
        </div>
      </div>

      {/* Sparkline bar chart (7-day trend) */}
      {sparkData && sparkData.length > 0 && (
        <div className="mt-3 pt-3 border-t border-border/40">
          <div className="flex items-end gap-0.5 h-7">
            {sparkData.map((v, i) => {
              const isLast = i === sparkData.length - 1;
              const heightPct = sparkMax > 0 ? Math.max(8, Math.round((v / sparkMax) * 100)) : 8;
              const label = sparkLabels?.[i];
              const plural = v !== 1 ? "s" : "";
              const tooltipText = label
                ? `${label}: ${v} ${sparkUnit}${plural}`
                : `${v} ${sparkUnit}${plural}`;
              return (
                <div
                  key={i}
                  className="group/bar relative flex-1 flex flex-col items-center justify-end h-full"
                  title={tooltipText}
                >
                  <div
                    className={cn(
                      "w-full rounded-sm transition-all duration-500",
                      isLast ? colors.spark : colors.sparkMuted,
                      isLast && "ring-1 ring-offset-0",
                      isLast && iconColor === "accent"      && "ring-amber-400/40",
                      isLast && iconColor === "primary"     && "ring-blue-500/40",
                      isLast && iconColor === "success"     && "ring-emerald-500/40",
                      isLast && iconColor === "warning"     && "ring-orange-500/40",
                      isLast && iconColor === "destructive" && "ring-red-500/40",
                    )}
                    style={{ height: `${heightPct}%` }}
                  />
                  {/* Tooltip on hover */}
                  {v > 0 && (
                    <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[9px] font-bold text-foreground bg-popover border border-border rounded px-1 py-0.5 opacity-0 group-hover/bar:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10 shadow-sm">
                      {v}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
          <p className="text-[9px] text-muted-foreground/50 mt-1 text-right">{sparkCaption}</p>
        </div>
      )}

      {/* Progress bar (e.g. occupancy %) — only shown if no sparkline */}
      {progressValue !== undefined && !sparkData && (
        <div className="mt-3 pt-3 border-t border-border/40">
          <div className="h-1.5 w-full rounded-full bg-muted/60 overflow-hidden">
            <div
              className={cn("h-full rounded-full transition-all duration-700 ease-out", colors.progress)}
              style={{ width: `${Math.min(100, Math.max(0, progressValue))}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
