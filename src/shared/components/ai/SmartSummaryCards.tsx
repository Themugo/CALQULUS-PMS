import React from "react";
import { Sparkles, TrendingUp, AlertTriangle, ShieldCheck, FileText, Wrench, CheckCircle2, ArrowUpRight, Zap } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { cn } from "@/shared/lib/utils";

export interface SummaryCardProps {
  type: "dashboard" | "lease" | "maintenance" | "anomaly" | "prediction";
  title: string;
  badgeLabel: string;
  summaryText: string;
  keyInsights: string[];
  recommendedAction?: string;
  riskLevel?: "low" | "medium" | "high";
  className?: string;
}

export function SmartSummaryCard({
  type,
  title,
  badgeLabel,
  summaryText,
  keyInsights,
  recommendedAction,
  riskLevel = "low",
  className,
}: SummaryCardProps) {
  return (
    <Card
      className={cn(
        "border-border/80 bg-card shadow-sm hover:border-primary/40 transition-all text-xs space-y-3 p-4",
        riskLevel === "high" && "border-amber-500/30 bg-amber-500/5",
        className
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary shrink-0" />
          <h4 className="font-bold text-foreground text-xs">{title}</h4>
        </div>

        <Badge
          variant="outline"
          className={cn(
            "text-[9px] font-bold uppercase",
            riskLevel === "high" && "bg-amber-500/10 text-amber-600 border-amber-500/20",
            riskLevel === "medium" && "bg-blue-500/10 text-blue-600 border-blue-500/20",
            riskLevel === "low" && "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
          )}
        >
          {badgeLabel}
        </Badge>
      </div>

      <p className="text-[11px] text-muted-foreground leading-relaxed">{summaryText}</p>

      {/* Bullet Insights */}
      <div className="space-y-1.5 pt-1 border-t border-border/50">
        <span className="text-[10px] font-bold text-foreground uppercase tracking-wider block">Key AI Insights:</span>
        <ul className="space-y-1 text-[11px] text-muted-foreground">
          {keyInsights.map((insight, idx) => (
            <li key={idx} className="flex items-start gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
              <span>{insight}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Recommended Action */}
      {recommendedAction && (
        <div className="pt-2 border-t border-border/50 flex items-center justify-between gap-2">
          <span className="text-[10px] font-bold text-foreground">Action: {recommendedAction}</span>
          <Button size="sm" variant="outline" className="h-6 text-[10px] font-bold gap-1 px-2 border-primary/30 text-primary">
            Execute <ArrowUpRight className="h-3 w-3" />
          </Button>
        </div>
      )}
    </Card>
  );
}

export function SmartSummaryGrid({ className }: { className?: string }) {
  return (
    <div className={cn("grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4", className)}>
      <SmartSummaryCard
        type="dashboard"
        title="Executive Portfolio AI Summary"
        badgeLabel="Monthly Overview"
        summaryText="Occupancy rate stands at 94.2% across 142 total units with zero critical lease defaults detected this week."
        keyInsights={[
          "M-Pesa STK push conversion increased by 14% month-over-month",
          "Kilimani Heights Block A generated KES 1.2M gross revenue",
        ]}
        recommendedAction="Send automated landlord revenue payout report"
      />

      <SmartSummaryCard
        type="anomaly"
        title="Utility Anomaly & Leak Detection"
        badgeLabel="High Priority Risk"
        riskLevel="high"
        summaryText="Unit 12B water consumption spiked by 340% compared to 6-month historical baseline."
        keyInsights={[
          "Meter reading registered 42 m³ in 48 hours",
          "Potential hidden plumbing leakage or stuck valve",
        ]}
        recommendedAction="Dispatch emergency maintenance ticket to plumber"
      />

      <SmartSummaryCard
        type="prediction"
        title="Future-Ready Lease Renewal Prediction"
        badgeLabel="30-Day Outlook"
        riskLevel="medium"
        summaryText="AI predictive model identifies 3 tenant leases maturing next month with 88% probability of automatic renewal."
        keyInsights={[
          "Average tenant tenure is 2.4 years across portfolio",
          "Market rental yield projection supports 5% escalation",
        ]}
        recommendedAction="Generate digital lease renewal agreements"
      />
    </div>
  );
}
