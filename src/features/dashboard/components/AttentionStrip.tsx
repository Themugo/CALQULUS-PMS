import { ArrowRight, CheckCircle2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { AttentionItem } from "@/features/dashboard/lib/attentionItems";
import { Button } from "@/shared/components/ui/button";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { cn } from "@/shared/lib/utils";

const TONE_DOT: Record<AttentionItem["tone"], string> = {
  danger: "bg-destructive",
  warning: "bg-warning",
  info: "bg-primary",
};

interface AttentionStripProps {
  items: AttentionItem[];
  loading?: boolean;
}

/**
 * Compact operational alerts from live stats only.
 * Zero-count items are never passed in — `buildAttentionItems` already omits them.
 */
export function AttentionStrip({ items, loading = false }: AttentionStripProps) {
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="flex flex-wrap gap-2" aria-busy="true" aria-label="Loading attention items">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-11 w-44 rounded-xl" />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <CheckCircle2 className="h-4 w-4 text-success shrink-0" aria-hidden />
        Nothing needs attention right now.
      </p>
    );
  }

  return (
    <ul className="flex flex-wrap gap-2" aria-label="Items that need attention">
      {items.map((item) => (
        <li key={item.id} className="min-w-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-auto min-h-11 max-w-full justify-start gap-2 rounded-xl border-border bg-card px-3 py-2 text-left shadow-[0_1px_2px_0_rgb(13_39_68/0.06)] hover:bg-muted"
            onClick={() => navigate(item.href)}
          >
            <span className={cn("h-2 w-2 rounded-full shrink-0", TONE_DOT[item.tone])} aria-hidden />
            <span className="min-w-0">
              <span className="block text-sm font-medium text-foreground truncate">{item.label}</span>
              <span className="block text-xs text-muted-foreground truncate">{item.detail}</span>
            </span>
            <ArrowRight className="h-3.5 w-3.5 ml-1 shrink-0 text-muted-foreground" aria-hidden />
            <span className="sr-only">{item.cta}</span>
          </Button>
        </li>
      ))}
    </ul>
  );
}
