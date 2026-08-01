import React from "react";
import { AlertCircle, AlertTriangle, CheckCircle, Info, X, ArrowRight } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { cn } from "@/shared/lib/utils";

export interface DashboardAlert {
  id: string;
  type: "critical" | "warning" | "info" | "success";
  title: string;
  message: string;
  timestamp?: string;
  actionLabel?: string;
  onAction?: () => void;
  count?: number;
}

interface DashboardAlertBannerProps {
  alerts: DashboardAlert[];
  onDismiss?: (id: string) => void;
  className?: string;
}

export function DashboardAlertBanner({
  alerts,
  onDismiss,
  className,
}: DashboardAlertBannerProps) {
  if (!alerts || alerts.length === 0) return null;

  const typeStyles = {
    critical: {
      bg: "bg-red-500/10 border-red-500/30 text-red-900 dark:text-red-200",
      icon: AlertCircle,
      iconColor: "text-red-500",
      badge: "bg-red-500 text-white",
    },
    warning: {
      bg: "bg-amber-500/10 border-amber-500/30 text-amber-900 dark:text-amber-200",
      icon: AlertTriangle,
      iconColor: "text-amber-500",
      badge: "bg-amber-500 text-slate-900",
    },
    info: {
      bg: "bg-sky-500/10 border-sky-500/30 text-sky-900 dark:text-sky-200",
      icon: Info,
      iconColor: "text-sky-500",
      badge: "bg-sky-500 text-white",
    },
    success: {
      bg: "bg-emerald-500/10 border-emerald-500/30 text-emerald-900 dark:text-emerald-200",
      icon: CheckCircle,
      iconColor: "text-emerald-500",
      badge: "bg-emerald-500 text-white",
    },
  };

  return (
    <div className={cn("space-y-2", className)}>
      {alerts.map((alert) => {
        const style = typeStyles[alert.type];
        const Icon = style.icon;

        return (
          <div
            key={alert.id}
            className={cn(
              "p-3.5 px-4 rounded-xl border flex items-center justify-between gap-3 text-xs sm:text-sm font-medium transition-all shadow-sm",
              style.bg
            )}
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="shrink-0">
                <Icon className={cn("h-5 w-5", style.iconColor)} />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-foreground">{alert.title}</span>
                  {alert.count && (
                    <Badge className={cn("h-4 text-[10px] px-1.5 font-bold", style.badge)}>
                      {alert.count}
                    </Badge>
                  )}
                  {alert.timestamp && (
                    <span className="text-[10px] text-muted-foreground hidden sm:inline">
                      {alert.timestamp}
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground truncate">{alert.message}</p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {alert.actionLabel && alert.onAction && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={alert.onAction}
                  className="h-7 text-xs px-2.5 bg-background/80 hover:bg-background border-border/80 font-semibold gap-1"
                >
                  {alert.actionLabel}
                  <ArrowRight className="h-3 w-3" />
                </Button>
              )}

              {onDismiss && (
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => onDismiss(alert.id)}
                  className="h-7 w-7 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
