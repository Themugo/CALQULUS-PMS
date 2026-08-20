import { useState } from "react";
import { PageHeader } from "@/shared/components/layout/PageHeader";
import { Button } from "@/shared/components/ui/button";
import { cn } from "@/shared/lib/utils";

const BILLING_KPIS = ["Billed", "Collected", "Outstanding", "Overdue"] as const;
const BILLING_COLUMNS = ["Invoice", "Tenant", "Property", "Amount", "Due date", "Status"] as const;
const PAYMENT_COLUMNS = ["Date", "Tenant", "Invoice / reference", "Amount", "Method", "Status"] as const;
const PAYMENT_STATUSES = ["Successful", "Pending", "Failed", "Cancelled"] as const;

type Surface = "billing" | "payments";

function SlotTable({ columns, empty }: { columns: readonly string[]; empty: string }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-card card-shadow">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-muted-foreground">
            {columns.map((column) => (
              <th key={column} scope="col" className="px-3 py-2 font-medium">{column}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="px-3 py-4 text-muted-foreground" colSpan={columns.length}>
              {empty}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

export function ManagerFinancePreview() {
  const [surface, setSurface] = useState<Surface>("billing");

  return (
    <div className="min-w-0 bg-background text-foreground" data-preview="manager-finance">
      <p className="mb-4 text-xs text-muted-foreground">
        Layout preview — amounts, invoices, and payment rows come from live billing and payment_transactions. This canvas does not invent collections or receipts. M-Pesa and Stripe stay on the live desks.
      </p>

      <div role="tablist" aria-label="Finance surfaces" className="mb-5 flex flex-wrap gap-1">
        {([
          ["billing", "Billing"],
          ["payments", "Payments"],
        ] as const).map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={surface === id}
            onClick={() => setSurface(id)}
            className={cn(
              "min-h-11 rounded-xl px-3 text-sm",
              surface === id ? "bg-primary/10 font-semibold text-foreground" : "text-muted-foreground hover:bg-muted",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {surface === "billing" && (
        <div>
          <PageHeader
            title="Billing"
            description="Billed, collected, outstanding, and overdue from live invoices."
            className="px-0 pb-5"
            actions={
              <>
                <Button size="sm" className="min-h-11" type="button">Create invoice</Button>
                <Button size="sm" variant="outline" className="min-h-11" type="button">View payments</Button>
              </>
            }
          />
          <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
            {BILLING_KPIS.map((label) => (
              <div key={label} className="rounded-xl border border-dashed border-border bg-card p-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
                <p className="mt-1 text-sm text-muted-foreground">Live value</p>
              </div>
            ))}
          </div>
          <div className="mb-4 flex flex-wrap gap-2">
            <span className="inline-flex min-h-11 items-center rounded-xl border border-dashed border-border bg-card px-3 text-sm text-muted-foreground">Search</span>
            <span className="inline-flex min-h-11 items-center rounded-xl border border-dashed border-border bg-card px-3 text-sm text-muted-foreground">Status filter</span>
          </div>
          <SlotTable
            columns={BILLING_COLUMNS}
            empty="Rows populate from invoices, tenants, and leases. Amounts use the existing billed and owed columns."
          />
        </div>
      )}

      {surface === "payments" && (
        <div>
          <PageHeader
            title="Payments"
            description="Date, tenant, invoice or reference, amount, method, and payment status from the ledger."
            className="px-0 pb-5"
            actions={<Button size="sm" className="min-h-11" type="button">Record payment</Button>}
          />
          <div className="mb-4 flex flex-wrap gap-2">
            {PAYMENT_STATUSES.map((status) => (
              <span key={status} className="inline-flex min-h-11 items-center rounded-xl border border-dashed border-border bg-card px-3 text-sm text-muted-foreground">
                {status}
              </span>
            ))}
          </div>
          <SlotTable
            columns={PAYMENT_COLUMNS}
            empty="Rows populate from payment_transactions. Method and reference stay M-Pesa, Stripe, bank, or receipt values already stored."
          />
        </div>
      )}
    </div>
  );
}
