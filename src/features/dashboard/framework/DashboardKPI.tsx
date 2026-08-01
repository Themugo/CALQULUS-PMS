import React from "react";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";
import { Progress } from "@/shared/components/ui/progress";
import { TrendingUp, TrendingDown, Minus, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { cn } from "@/shared/lib/utils";

export interface DashboardKPIProps {
  title: string;
  value: string | number;
  change?: string | number;
  changeType?: "increase" | "decrease" | "neutral";
  periodLabel?: string;
  icon?: React.ElementType;
  color?: "primary" | "emerald" | "amber" | "red" | "sky" | "purple";
  progress?: number;
  subtitle?: string;
  onClick?: () => void;
  className?: string;
}

export function DashboardKPI({
  title,
  value,
  change,
  changeType = "neutral",
  periodLabel = "vs last month",
  icon: Icon,
  color = "primary",
  progress,
  subtitle,
  onClick,
  className,
}: DashboardKPIProps) {
  const colorStyles = {
    primary: {
      bg: "bg-primary/5",
      border: "border-primary/20",
      iconBg: "bg-primary/10 text-primary",
      badge: "bg-primary/10 text-primary border-primary/20",
    },
    emerald: {
      bg: "bg-emerald-500/5",
      border: "border-emerald-500/20",
      iconBg: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
      badge: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    },
    amber: {
      bg: "bg-amber-500/5",
      border: "border-amber-500/20",
      iconBg: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
      badge: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
    },
    red: {
      bg: "bg-red-500/5",
      border: "border-red-500/20",
      iconBg: "bg-red-500/10 text-red-600 dark:text-red-400",
      badge: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
    },
    sky: {
      bg: "bg-sky-500/5",
      border: "border-sky-500/20",
      iconBg: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
      badge: "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20",
    },
    purple: {
      bg: "bg-purple-500/5",
      border: "border-purple-500/20",
      iconBg: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
      badge: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
    },
  };

  const style = colorStyles[color];

  return (
    <Card
      onClick={onClick}
      className={cn(
        "border bg-card hover:shadow-md transition-all duration-200",
        onClick && "cursor-pointer hover:border-primary/40",
        style.border,
        className
      )}
    >
      <CardContent className="p-4 space-y-2.5">
        <div className="flex items-start justify-between gap-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{title}</p>
          {Icon && (
            <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center shrink-0", style.iconBg)}>
              <Icon className="h-4 w-4" />
            </div>
          )}
        </div>

        <div>
          <h3 className="text-2xl font-black text-foreground tracking-tight">{value}</h3>
          {subtitle && <p className="text-[11px] text-muted-foreground mt-0.5">{subtitle}</p>}
        </div>

        {progress !== undefined && (
          <div className="space-y-1 pt-1">
            <div className="flex justify-between text-[11px] font-medium text-muted-foreground">
              <span>Target Progress</span>
              <span>{progress}%</span>
            </div>
            <Progress value={progress} className="h-1.5" />
          </div>
        )}

        {change !== undefined && (
          <div className="flex items-center gap-1.5 pt-1 text-[11px]">
            <Badge
              variant="outline"
              className={cn(
                "h-5 px-1.5 gap-0.5 text-[10px] font-bold border",
                changeType === "increase"
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                  : changeType === "decrease"
                  ? "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30"
                  : "bg-muted text-muted-foreground border-border"
              )}
            >
              {changeType === "increase" && <ArrowUpRight className="h-3 w-3" />}
              {changeType === "decrease" && <ArrowDownRight className="h-3 w-3" />}
              {changeType === "neutral" && <Minus className="h-3 w-3" />}
              {change}
            </Badge>
            <span className="text-muted-foreground truncate">{periodLabel}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
