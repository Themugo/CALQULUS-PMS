// @ts-nocheck — Phase 12: remaining local types until live supabase gen types
/**
 * InvoiceTable.tsx
 *
 * The invoice rows table extracted from Billing.tsx.
 * Receives already-filtered invoices so the parent controls search/tab filtering.
 */

import { Avatar, AvatarFallback, AvatarImage } from "@/shared/components/ui/avatar";
import { Button } from "@/shared/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/shared/components/ui/table";
import {
  CheckCircle, Clock, AlertCircle, XCircle,
  Building, Download, Receipt, Send, Pencil, Smartphone, Loader2,
} from "lucide-react";
import { useCurrency } from "@/shared/hooks/useCurrency";
import { formatDate } from "@/shared/lib/dateFormat";
import { downloadInvoicePDF } from "@/features/billing/lib/invoicePdfExport";
import { downloadReceiptPDF } from "@/features/billing/lib/receiptPdfExport";
import type { BillingInvoice } from "../hooks/useBillingData";
import { EmptyState } from "@/shared/components/ui/empty-state";
import { statusBadgeClass } from "@/shared/lib/statusBadge";

type InvoiceStatus = "paid" | "pending" | "overdue" | "cancelled" | "partially_paid" | "failed" | "refunded";

const STATUS_CONFIG: Record<
  InvoiceStatus,
  { tone: "success" | "warning" | "danger" | "info" | "neutral"; icon: React.ComponentType<{ className?: string }>; label: string }
> = {
  paid:           { tone: "success", icon: CheckCircle, label: "Paid" },
  partially_paid: { tone: "info",    icon: Clock,       label: "Partial" },
  pending:        { tone: "warning", icon: Clock,       label: "Pending" },
  overdue:        { tone: "danger",  icon: AlertCircle, label: "Overdue" },
  failed:         { tone: "danger",  icon: XCircle,     label: "Failed" },
  refunded:       { tone: "neutral", icon: XCircle,     label: "Refunded" },
  cancelled:      { tone: "neutral", icon: XCircle,     label: "Cancelled" },
};

interface Props {
  invoices: BillingInvoice[];
  isLoading: boolean;
  userId: string | undefined;
  canEdit: boolean;
  onEdit: (invoice: BillingInvoice) => void;
  onMpesa: (invoice: BillingInvoice) => void;
  onMarkPaid: (invoiceId: string) => void;
  onSendReminder: (invoice: BillingInvoice) => void;
}

export function InvoiceTable({
  invoices,
  isLoading,
  userId,
  canEdit,
  onEdit,
  onMpesa,
  onMarkPaid,
  onSendReminder,
}: Props) {
  const { formatCurrency } = useCurrency();

  if (isLoading) {
    return (
      <div className="p-8 text-center text-muted-foreground flex items-center justify-center gap-2">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading invoices…
      </div>
    );
  }

  if (invoices.length === 0) {
    return (
      <EmptyState
        icon={Building}
        title="No invoices in this view"
        description="Create an invoice from a lease, then record payment and download the receipt."
      />
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow className="hover:bg-transparent border-border">
          <TableHead>Status</TableHead>
          <TableHead>Invoice</TableHead>
          <TableHead>Tenant</TableHead>
          <TableHead>Property / Unit</TableHead>
          <TableHead>Amount</TableHead>
          <TableHead>Due</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {invoices.map((invoice) => {
          const status = invoice.status as InvoiceStatus;
          const cfg    = STATUS_CONFIG[status] ?? STATUS_CONFIG.cancelled;
          const StatusIcon = cfg.icon;

          return (
            <TableRow
              key={invoice.id}
              className="hover:bg-muted/30 border-border"
            >
              <TableCell>
                <span className={`${statusBadgeClass(cfg.tone)} gap-1`}>
                  <StatusIcon className="h-3 w-3" />
                  {cfg.label}
                </span>
              </TableCell>
              <TableCell className="font-medium font-mono text-foreground">
                {invoice.invoice_number}
              </TableCell>

              <TableCell>
                <div className="flex items-center gap-2 min-w-0">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={invoice.tenants?.photo_url ?? undefined} />
                    <AvatarFallback className="bg-primary/10 text-primary text-xs">
                      {invoice.tenants?.name?.split(" ").map(n => n[0]).join("") ?? "?"}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-foreground truncate">{invoice.tenants?.name ?? "No Tenant"}</span>
                </div>
              </TableCell>

              <TableCell>
                {invoice.leases ? (
                  <div className="text-sm">
                    <p className="text-foreground truncate">{invoice.leases.property}</p>
                    <p className="text-xs text-muted-foreground">{invoice.leases.unit}</p>
                  </div>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </TableCell>

              <TableCell className="font-semibold text-foreground">
                <div>{formatCurrency(invoice.amount)}</div>
                {(status === "partially_paid" || Number(invoice.balance_due ?? 0) > 0) && status !== "paid" && (
                  <div className="text-xs font-normal text-muted-foreground">
                    Due {formatCurrency(Number(invoice.balance_due ?? invoice.amount))}
                  </div>
                )}
              </TableCell>

              <TableCell className="text-muted-foreground">
                {formatDate(invoice.due_date)}
              </TableCell>

              <TableCell>
                <div className="flex items-center justify-end gap-2">
                  {/* Download invoice PDF */}
                  <Button
                    variant="ghost" size="sm" className="h-8 px-2"
                    title="Download Invoice PDF"
                    onClick={() => downloadInvoicePDF({
                      invoice_number: invoice.invoice_number,
                      amount: invoice.amount,
                      due_date: invoice.due_date,
                      paid_date: invoice.paid_date,
                      status,
                      description: invoice.description,
                      created_at: invoice.created_at,
                      tenant: invoice.tenants
                        ? { name: invoice.tenants.name, email: invoice.tenants.email, phone: invoice.tenants.phone }
                        : null,
                      lease: invoice.leases
                        ? { property: invoice.leases.property, unit: invoice.leases.unit }
                        : null,
                    })}
                  >
                    <Download className="h-4 w-4" />
                  </Button>

                  {/* Download receipt PDF (paid only) */}
                  {status === "paid" && (
                    <Button
                      variant="ghost" size="sm" className="h-8 px-2 text-success"
                      title="Download Receipt PDF"
                      onClick={() => downloadReceiptPDF({
                        invoice_number: invoice.invoice_number,
                        amount: invoice.amount,
                        due_date: invoice.due_date,
                        paid_date: invoice.paid_date,
                        description: invoice.description,
                        tenant: invoice.tenants
                          ? { name: invoice.tenants.name, email: invoice.tenants.email, phone: invoice.tenants.phone }
                          : null,
                        lease: invoice.leases
                          ? { property: invoice.leases.property, unit: invoice.leases.unit }
                          : null,
                      }, userId)}
                    >
                      <Receipt className="h-4 w-4" />
                    </Button>
                  )}

                  {/* Send reminder (pending only) */}
                  {status === "pending" && (
                    <Button
                      variant="ghost" size="sm" className="h-8 px-2"
                      title="Send Reminder"
                      onClick={() => onSendReminder(invoice)}
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  )}

                  {/* Edit + M-Pesa + Mark Paid (non-terminal statuses) */}
                  {status !== "paid" && status !== "cancelled" && status !== "failed" && status !== "refunded" && (
                    <>
                      {canEdit && (
                        <Button
                          variant="ghost" size="sm" className="h-8 px-2"
                          title="Edit Invoice"
                          onClick={() => onEdit(invoice)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant="outline" size="sm"
                        className="h-8 text-xs text-success border-success/30 hover:bg-success/10"
                        onClick={() => onMpesa(invoice)}
                      >
                        <Smartphone className="h-3.5 w-3.5 mr-1" />
                        M-Pesa
                      </Button>
                      <Button
                        variant="outline" size="sm" className="h-8 text-xs"
                        onClick={() => onMarkPaid(invoice.id)}
                      >
                        Mark Paid
                      </Button>
                    </>
                  )}
                </div>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
