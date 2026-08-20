import { format } from "date-fns";
import { Link } from "react-router-dom";
import { FileText, Receipt, ScrollText, Wrench } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { TENANT_ROUTES } from "@/features/tenant-portal/lib/tenantPaths";

type Invoice = {
  id: string;
  invoice_number: string;
  amount: number;
  due_date: string;
  paid_date: string | null;
  status: string;
  balance_due?: number | null;
};

type ActivityItem = {
  id: string;
  label: string;
  detail: string;
};

interface TenantHomeProps {
  greeting: string;
  firstName: string;
  propertyName: string | null;
  unit: string | null;
  amountDue: number;
  dueDate: string | null;
  overdue: boolean;
  formatCurrency: (amount: number) => string;
  onPayRent: () => void;
  payDisabled?: boolean;
  maintenanceOpen?: number;
  recentActivity: ActivityItem[];
}

const SHORTCUTS = [
  { label: "Lease", href: TENANT_ROUTES.lease, icon: ScrollText },
  { label: "Maintenance", href: TENANT_ROUTES.maintenance, icon: Wrench },
  { label: "Receipts", href: TENANT_ROUTES.receipts, icon: Receipt },
  { label: "Documents", href: TENANT_ROUTES.documents, icon: FileText },
] as const;

export function amountOnInvoice(invoice: Invoice): number {
  return Number(invoice.balance_due ?? invoice.amount);
}

export default function TenantHome({
  greeting,
  firstName,
  propertyName,
  unit,
  amountDue,
  dueDate,
  overdue,
  formatCurrency,
  onPayRent,
  payDisabled = false,
  maintenanceOpen = 0,
  recentActivity,
}: TenantHomeProps) {
  const hasBalance = amountDue > 0;
  const homeLine = [propertyName, unit ? `Unit ${unit}` : null].filter(Boolean).join(" · ") || "Your home";

  return (
    <div className="mx-auto w-full max-w-xl space-y-6 pt-2 md:pt-4">
      <header>
        <p className="text-sm text-muted-foreground">{greeting}</p>
        <h1 className="page-title mt-0.5">{firstName}</h1>
      </header>

      <section>
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Your home</p>
        <p className="mt-1 text-base font-medium">{homeLine}</p>
      </section>

      <section className="rounded-xl border border-border bg-card p-5">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {overdue ? "Rent overdue" : hasBalance ? "Rent due" : "Rent"}
        </p>
        <p className={`mt-2 font-heading text-4xl font-bold tracking-tight ${overdue ? "text-destructive" : "text-foreground"}`}>
          {formatCurrency(amountDue)}
        </p>
        {dueDate ? (
          <p className="mt-1 text-sm text-muted-foreground">
            Due {format(new Date(dueDate), "d MMM yyyy")}
            {overdue ? " · Overdue" : ""}
          </p>
        ) : (
          <p className="mt-1 text-sm text-muted-foreground">Nothing due right now</p>
        )}
        <Button
          className="mt-5 min-h-12 w-full text-base font-semibold"
          size="lg"
          disabled={payDisabled || !hasBalance}
          onClick={onPayRent}
        >
          {hasBalance ? "Pay rent" : "All paid"}
        </Button>
      </section>

      <nav aria-label="Common tasks" className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {SHORTCUTS.map((item) => (
          <Link
            key={item.href}
            to={item.href}
            className="flex min-h-11 flex-col items-start gap-1 rounded-xl border border-border bg-card px-3 py-3 text-left hover:bg-muted/50"
          >
            <item.icon className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">
              {item.label}
              {item.label === "Maintenance" && maintenanceOpen > 0 ? ` · ${maintenanceOpen}` : ""}
            </span>
          </Link>
        ))}
      </nav>

      <section>
        <h2 className="section-title mb-3">Recent activity</h2>
        {recentActivity.length === 0 ? (
          <p className="text-sm text-muted-foreground">No recent payments or requests.</p>
        ) : (
          <ul className="divide-y divide-border rounded-xl border border-border bg-card">
            {recentActivity.map((item) => (
              <li key={item.id} className="px-4 py-3">
                <p className="text-sm font-medium">{item.label}</p>
                <p className="text-xs text-muted-foreground">{item.detail}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
