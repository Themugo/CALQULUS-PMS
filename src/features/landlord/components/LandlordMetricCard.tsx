import { cn } from "@/shared/lib/utils";

interface LandlordMetricCardProps {
  label: string;
  value: string;
  hint?: string;
  tone?: "neutral" | "positive" | "negative" | "warning";
}

const TONE = {
  neutral: "text-foreground",
  positive: "text-success",
  negative: "text-destructive",
  warning: "text-warning",
} as const;

/** Landlord financial metric — statement-style, not a manager StatCard. */
export function LandlordMetricCard({
  label,
  value,
  hint,
  tone = "neutral",
}: LandlordMetricCardProps) {
  return (
    <article className="enterprise-card p-4">
      <p className="type-label">{label}</p>
      <p className={cn("type-metric mt-2 tabular-nums tracking-tight", TONE[tone])}>{value}</p>
      {hint ? <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{hint}</p> : null}
    </article>
  );
}
