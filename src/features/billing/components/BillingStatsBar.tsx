/**
 * BillingStatsBar.tsx
 *
 * The four stat cards at the top of the Invoices tab.
 * Extracted from Billing.tsx (was inline JSX in the component body).
 */

import { useCurrency } from "@/shared/hooks/useCurrency";
import { roundMoney, invoiceOwedMinor, fromMinorUnits } from "@/shared/lib/money";
import type { BillingInvoice } from "../hooks/useBillingData";

import { Skeleton } from "@/shared/components/ui/skeleton";

interface Props {
  invoices: BillingInvoice[];
  isLoading?: boolean;
}

export function BillingStatsBar({ invoices, isLoading = false }: Props) {
  const { formatCurrency } = useCurrency();

  // "Billed" and "Collected" use the real original_amount/paid_amount columns
  // (comprehensive-payment-schema migration) so a partially-paid invoice
  // contributes its full billed amount to "Billed" and only what's actually
  // been paid to "Collected" — not the same number counted twice.
  // "Outstanding" and "Overdue" use invoiceOwedMinor() (shared/lib/money.ts),
  // the same balance-owed calculation the payment-allocation engine itself
  // uses, so the stat bar can never disagree with what a payment would
  // actually close.
  const live = invoices.filter(i => i.status !== "cancelled" && i.status !== "refunded");
  const unpaid = live.filter(i => i.status !== "paid");
  const overdueInvoices = invoices.filter(i => i.status === "overdue");

  const stats = {
    billed:      roundMoney(live.reduce((s, i) => s + Number(i.original_amount ?? i.amount ?? 0), 0)),
    collected:   roundMoney(invoices.reduce((s, i) => s + Number(i.paid_amount ?? (i.status === "paid" ? i.amount : 0) ?? 0), 0)),
    outstanding: fromMinorUnits(unpaid.reduce((s, i) => s + invoiceOwedMinor(i), 0)),
    overdue:     fromMinorUnits(overdueInvoices.reduce((s, i) => s + invoiceOwedMinor(i), 0)),
  };

  const cards = [
    { label: "Billed",      value: stats.billed,      tone: "text-foreground",  hint: "All invoices this period" },
    { label: "Collected",   value: stats.collected,   tone: "text-success",     hint: "Received to date" },
    { label: "Outstanding", value: stats.outstanding, tone: "text-warning",     hint: "Remaining balance owed" },
    { label: "Overdue",     value: stats.overdue,     tone: "text-destructive", hint: "Past due" },
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
