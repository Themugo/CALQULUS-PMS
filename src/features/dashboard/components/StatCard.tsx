import { LucideIcon } from "lucide-react";
import { cn } from "@/shared/lib/utils";

interface StatCardProps {
  title: string;
  value: string;
  change?: string;
  changeType?: "positive" | "negative" | "neutral";
  icon: LucideIcon;
  iconColor?: "primary" | "accent" | "success" | "warning" | "destructive";
}

const iconColorMap = {
  primary: {
    bg: "bg-gradient-to-br from-blue-600/15 to-blue-600/5 border-blue-500/20",
    icon: "text-blue-500",
    glow: "shadow-blue-500/10",
  },
  accent: {
    bg: "bg-gradient-to-br from-amber-400/15 to-amber-400/5 border-amber-400/25",
    icon: "text-amber-500",
    glow: "shadow-amber-400/15",
  },
  success: {
    bg: "bg-gradient-to-br from-emerald-500/15 to-emerald-500/5 border-emerald-500/20",
    icon: "text-emerald-500",
    glow: "shadow-emerald-500/10",
  },
  warning: {
    bg: "bg-gradient-to-br from-orange-500/15 to-orange-500/5 border-orange-500/20",
    icon: "text-orange-500",
    glow: "shadow-orange-500/10",
  },
  destructive: {
    bg: "bg-gradient-to-br from-red-500/15 to-red-500/5 border-red-500/20",
    icon: "text-red-500",
    glow: "shadow-red-500/10",
  },
};

export function StatCard({
  title,
  value,
  change,
  changeType = "neutral",
  icon: Icon,
  iconColor = "accent",
}: StatCardProps) {
  const colors = iconColorMap[iconColor];

  return (
    <div className={cn(
      "group relative overflow-hidden rounded-2xl border bg-card p-4 sm:p-5",
      "shadow-sm transition-all duration-300 hover:shadow-lg hover:-translate-y-1",
      "active:scale-[0.98] animate-fade-in touch-manipulation",
      "border-border/60 hover:border-amber-400/20"
    )}>
      {/* Gold top accent line */}
      <div className={cn(
        "absolute top-0 left-0 right-0 h-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-300",
        iconColor === "accent" ? "bg-gradient-to-r from-transparent via-amber-400/60 to-transparent" :
        iconColor === "success" ? "bg-gradient-to-r from-transparent via-emerald-500/60 to-transparent" :
        iconColor === "destructive" ? "bg-gradient-to-r from-transparent via-red-500/60 to-transparent" :
        "bg-gradient-to-r from-transparent via-blue-500/60 to-transparent"
      )} />

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
              <span className={cn(
                "text-xs font-semibold",
                changeType === "positive" && "text-emerald-500",
                changeType === "negative" && "text-red-500",
                changeType === "neutral" && "text-muted-foreground"
              )}>
                {changeType === "positive" && "↑ "}
                {changeType === "negative" && "↓ "}
                {change}
              </span>
            </div>
          )}
        </div>

        <div className={cn(
          "rounded-xl border p-2.5 sm:p-3 flex-shrink-0 shadow-sm",
          "transition-all duration-300 group-hover:scale-110 group-hover:shadow-md",
          colors.bg, colors.glow
        )}>
          <Icon className={cn("h-5 w-5 sm:h-5 sm:w-5", colors.icon)} />
        </div>
      </div>
    </div>
  );
}
