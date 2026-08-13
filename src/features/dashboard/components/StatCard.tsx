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
    bg: "bg-gradient-to-br from-primary/15 to-primary/5 border-primary/20",
    icon: "text-primary",
    glow: "shadow-primary/10",
    progress: "bg-primary",
    accentVia: "via-primary/60",
    spark: "bg-primary",
    sparkMuted: "bg-primary/25",
  },
  accent: {
    bg: "bg-gradient-to-br from-warning/15 to-warning/5 border-warning/25",
    icon: "text-warning",
    glow: "shadow-warning/15",
    progress: "bg-warning",
    accentVia: "via-warning/60",
    spark: "bg-warning",
    sparkMuted: "bg-warning/25",
  },
  success: {
    bg: "bg-gradient-to-br from-success/15 to-success/5 border-success/20",
    icon: "text-success",
    glow: "shadow-success/10",
    progress: "bg-success",
    accentVia: "via-success/60",
    spark: "bg-success",
    sparkMuted: "bg-success/25",
  },
  warning: {
    bg: "bg-gradient-to-br from-warning/15 to-warning/5 border-warning/20",
    icon: "text-warning",
    glow: "shadow-warning/10",
    progress: "bg-warning",
    accentVia: "via-warning/60",
    spark: "bg-warning",
    sparkMuted: "bg-warning/25",
  },
  destructive: {
    bg: "bg-gradient-to-br from-destructive/15 to-destructive/5 border-destructive/20",
    icon: "text-destructive",
    glow: "shadow-destructive/10",
    progress: "bg-destructive",
    accentVia: "via-destructive/60",
    spark: "bg-destructive",
    sparkMuted: "bg-destructive/25",
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
        "enterprise-card group relative overflow-hidden p-4 sm:p-5",
        "transition-all duration-300 hover:shadow-md hover:-translate-y-0.5",
        "active:scale-[0.98] animate-fade-in touch-manipulation"
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
          <p className="meta-text uppercase tracking-widest truncate">{title}</p>
          <p className="metric-value truncate">{value}</p>
          {change && (
            <div className="flex items-center gap-1.5">
              <TrendIcon
                className={cn(
                  "h-3 w-3 flex-shrink-0",
                  changeType === "positive" && "text-success",
                  changeType === "negative" && "text-destructive",
                  changeType === "neutral" && "text-muted-foreground"
                )}
              />
              <span
                className={cn(
                  "supporting-text font-semibold",
                  changeType === "positive" && "text-success",
                  changeType === "negative" && "text-destructive",
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
                      isLast && iconColor === "accent"      && "ring-warning/40",
                      isLast && iconColor === "primary"     && "ring-primary/40",
                      isLast && iconColor === "success"     && "ring-success/40",
                      isLast && iconColor === "warning"     && "ring-warning/40",
                      isLast && iconColor === "destructive" && "ring-destructive/40",
                    )}
                    style={{ height: `${heightPct}%` }}
                  />
                  {/* Tooltip on hover */}
                  {v > 0 && (
                    <span className="absolute -top-5 left-1/2 -translate-x-1/2 meta-text text-foreground bg-popover border border-border rounded px-1 py-0.5 opacity-0 group-hover/bar:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10 shadow-sm">
                      {v}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
          <p className="meta-text mt-1 text-right">{sparkCaption}</p>
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
