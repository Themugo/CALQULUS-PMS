/**
 * BillingStatsBar.tsx
 *
 * The four stat cards at the top of the Invoices tab.
 * Extracted from Billing.tsx (was inline JSX in the component body).
 */

import { useCurrency } from "@/shared/hooks/useCurrency";
import type { BillingInvoice } from "../hooks/useBillingData";

import { Skeleton } from "@/shared/components/ui/skeleton";

interface Props {
  invoices: BillingInvoice[];
  isLoading?: boolean;
}

export function BillingStatsBar({ invoices, isLoading = false }: Props) {
  const { formatCurrency } = useCurrency();

  const stats = {
    total:   invoices.reduce((s, i) => s + i.amount, 0),
    paid:    invoices.filter(i => i.status === "paid").reduce((s, i) => s + i.amount, 0),
    pending: invoices.filter(i => i.status === "pending").reduce((s, i) => s + i.amount, 0),
    overdue: invoices.filter(i => i.status === "overdue").reduce((s, i) => s + i.amount, 0),
  };

  const cards = [
    { label: "Total Billed",  value: stats.total,   color: "text-foreground" },
    { label: "Collected",     value: stats.paid,    color: "text-emerald-400" },
    { label: "Pending",       value: stats.pending, color: "text-amber-400" },
    { label: "Overdue",       value: stats.overdue, color: "text-red-400" },
  ] as const;

  if (isLoading) {
    return (
      <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-border bg-card p-3 sm:p-4 card-shadow">
            <Skeleton className="h-4 w-24 mb-3" />
            <Skeleton className="h-7 w-32" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
      {cards.map(({ label, value, color }, i) => (
        <div
          key={label}
          className="rounded-xl border border-border/60 bg-card p-3 sm:p-4 card-shadow animate-fade-in hover:border-amber-400/20 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
          style={{ animationDelay: `${i * 50}ms` }}
        >
          <p className="text-xs font-semibold text-muted-foreground/70 uppercase tracking-wider mb-2">{label}</p>
          <p className={`font-heading text-lg sm:text-2xl font-bold truncate ${color}`}>
            {formatCurrency(value)}
          </p>
        </div>
      ))}
    </div>
  );
}
