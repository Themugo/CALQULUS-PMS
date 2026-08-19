/**
 * BillingStatsBar.tsx
 *
 * The four stat cards at the top of the Invoices tab.
 * Extracted from Billing.tsx (was inline JSX in the component body).
 */

import { useCurrency } from "@/shared/hooks/useCurrency";
import { roundMoney } from "@/shared/lib/money";
import type { BillingInvoice } from "../hooks/useBillingData";

import { Skeleton } from "@/shared/components/ui/skeleton";

interface Props {
  invoices: BillingInvoice[];
  isLoading?: boolean;
}

export function BillingStatsBar({ invoices, isLoading = false }: Props) {
  const { formatCurrency } = useCurrency();

  const stats = {
    total:   roundMoney(invoices.reduce((s, i) => s + Number(i.amount ?? 0), 0)),
    paid:    roundMoney(invoices.reduce((s, i) => s + Number(i.paid_amount ?? (i.status === "paid" ? i.amount : 0)), 0)),
    pending: roundMoney(invoices.filter(i => i.status === "pending" || i.status === "partially_paid").reduce((s, i) => s + Number(i.balance_due ?? i.amount), 0)),
    overdue: roundMoney(invoices.filter(i => i.status === "overdue").reduce((s, i) => s + Number(i.balance_due ?? i.amount), 0)),
  };

  const cards = [
    { label: "Total billed",  value: stats.total,   tone: "text-foreground",     hint: "All invoices this period" },
    { label: "Collected",     value: stats.paid,    tone: "text-foreground",     hint: "Paid in full" },
    { label: "Pending",       value: stats.pending, tone: "text-warning",        hint: "Awaiting payment" },
    { label: "Overdue",       value: stats.overdue, tone: "text-destructive",    hint: "Past due" },
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
      {cards.map(({ label, value, tone, hint }) => (
        <div
          key={label}
          className="rounded-xl border border-border bg-card p-3 sm:p-4 card-shadow"
        >
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">{label}</p>
          <p className={`font-heading text-lg sm:text-2xl font-bold truncate ${tone}`}>
            {formatCurrency(value)}
          </p>
          <p className="text-[11px] text-muted-foreground mt-1">{hint}</p>
        </div>
      ))}
    </div>
  );
}
