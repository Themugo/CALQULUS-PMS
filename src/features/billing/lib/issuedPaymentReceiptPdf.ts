import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { supabase } from "@/integrations/supabase/client";
import { createCurrencyFormatter, drawCompanyPdfHeader, fetchCompanySettings } from "@/shared/lib/pdf/companyPdfHeader";
import { composeBrandConfig } from "@/core/brand/composeBrandConfig";
import { documentAccent, documentFooter, documentShowLogo, documentTitle } from "@/core/brand/pdfCompany";
import type { OrgBrandRecord } from "@/core/brand/parseOrgRecord";

export interface IssuedPaymentReceiptPayload {
  receipt: { id: string; receipt_number: string; issued_at: string; total_amount: number };
  payer?: { display_name?: string | null; phone?: string | null; party_type?: string | null } | null;
  transaction?: { id: string; payment_type?: string | null; payment_method?: string | null; mpesa_receipt_number?: string | null; bank_reference?: string | null; phone_number?: string | null } | null;
  allocations: Array<{
    invoice_number?: string | null; unit_number?: string | null; property_name?: string | null; amount?: number | null;
    tenant_name?: string | null; invoice_amount?: number | null; invoice_balance_due?: number | null;
  }>;
  advance_credit?: number | null;
  destination?: { label?: string | null; receiver_type?: string | null; receiver_name?: string | null } | null;
}

const METHOD_LABELS: Record<string, string> = {
  mpesa_stk: "M-Pesa (STK Push)",
  mpesa_ussd: "M-Pesa (Paybill)",
  mpesa_till: "M-Pesa (Till)",
  paystack_mpesa: "M-Pesa (Paystack)",
  bank_transfer: "Bank transfer",
  bank_direct_debit: "Bank direct debit",
  receipt_upload: "Manual (receipt uploaded)",
  cash: "Cash",
};

/** Human label for the payment method; never shows a raw enum like "mpesa_stk". */
export function receiptMethodLabel(method?: string | null): string {
  const key = String(method ?? "").trim();
  if (!key) return "Payment";
  return METHOD_LABELS[key] ?? key.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase());
}

/** Receipt lines must add up to the receipt total: allocations plus any advance credit. */
export function receiptReconciles(payload: Pick<IssuedPaymentReceiptPayload, "receipt" | "allocations" | "advance_credit">): boolean {
  const allocated = payload.allocations.reduce((sum, a) => sum + Number(a.amount || 0), 0);
  const credit = Number(payload.advance_credit || 0);
  return Math.abs(allocated + credit - Number(payload.receipt.total_amount || 0)) < 0.005;
}

const hexToRgb = (hex: string): [number, number, number] => {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return m ? [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)] : [34, 197, 94];
};

export async function fetchIssuedPaymentReceipt(id: string): Promise<IssuedPaymentReceiptPayload> {
  const { data, error } = await supabase.rpc("get_payment_receipt" as any, { p_receipt_id: id });
  if (error) throw error;
  if (!data?.receipt) throw new Error("Receipt could not be loaded");
  return data as IssuedPaymentReceiptPayload;
}

export async function generateIssuedPaymentReceiptPDF(payload: IssuedPaymentReceiptPayload): Promise<jsPDF> {
  const doc = new jsPDF();
  const width = doc.internal.pageSize.getWidth();
  const settings = await fetchCompanySettings();
  const brand = composeBrandConfig((settings as OrgBrandRecord | null) ?? null);
  const accent = hexToRgb(documentAccent(brand, "receipts"));
  const formatCurrency = createCurrencyFormatter("KES");
  let y = await drawCompanyPdfHeader(doc, settings, 14, { includeLogo: documentShowLogo(brand, "receipts") });

  doc.setFillColor(...accent); doc.circle(width / 2, y + 5, 8, "F");
  doc.setTextColor(255,255,255); doc.setFont("helvetica","bold"); doc.setFontSize(12); doc.text("✓", width / 2 - 2, y + 8);
  doc.setTextColor(0,0,0); y += 20;
  doc.setFontSize(21); doc.text(documentTitle(brand, "receipts"), width / 2, y, { align: "center" }); y += 7;
  doc.setFontSize(10); doc.setTextColor(...accent); doc.text("PAYMENT RECEIVED", width / 2, y, { align: "center" }); doc.setTextColor(0,0,0); y += 13;

  doc.setFontSize(10); doc.setFont("helvetica","bold"); doc.text(`Receipt: ${payload.receipt.receipt_number}`, 14, y);
  doc.setFont("helvetica","normal"); doc.text(new Date(payload.receipt.issued_at).toLocaleString(), width - 14, y, { align: "right" }); y += 8;
  doc.line(14, y, width - 14, y); y += 9;

  doc.setFont("helvetica","bold"); doc.text("Payer", 14, y); doc.setFont("helvetica","normal");
  doc.text(payload.payer?.display_name || "Payment party", 14, y + 5);
  if (payload.payer?.phone) doc.text(payload.payer.phone, 14, y + 10);
  doc.setFont("helvetica","bold"); doc.text("Payment", width / 2 + 8, y); doc.setFont("helvetica","normal");
  doc.text(receiptMethodLabel(payload.transaction?.payment_method || payload.transaction?.payment_type), width / 2 + 8, y + 5);
  const reference = payload.transaction?.mpesa_receipt_number || payload.transaction?.bank_reference || payload.transaction?.id;
  doc.text(`Reference: ${reference || "—"}`, width / 2 + 8, y + 10);
  const paidTo = payload.destination?.label || payload.destination?.receiver_name;
  if (paidTo) doc.text(`Paid to: ${paidTo}`, width / 2 + 8, y + 15);
  const tenantNames = Array.from(new Set(payload.allocations.map(a => a.tenant_name).filter(Boolean)));
  if (tenantNames.length) doc.text(`For: ${tenantNames.join(", ")}`, 14, y + 15);
  y += 27;

  autoTable(doc, {
    startY: y,
    head: [["Property", "Unit", "Invoice", "Invoice total", "Paid now", "Balance"]],
    body: [
      ...payload.allocations.map(a => [
        a.property_name || "—", a.unit_number || "—", a.invoice_number || "—",
        a.invoice_amount == null ? "—" : formatCurrency(Number(a.invoice_amount)),
        formatCurrency(Number(a.amount || 0)),
        a.invoice_balance_due == null ? "—" : formatCurrency(Number(a.invoice_balance_due)),
      ]),
      ...(Number(payload.advance_credit || 0) > 0
        ? [["", "", "Held as advance credit", "", formatCurrency(Number(payload.advance_credit)), ""]]
        : []),
    ],
    foot: [["", "", "", "TOTAL RECEIVED", formatCurrency(Number(payload.receipt.total_amount || 0)), ""]],
    theme: "grid",
    headStyles: { fillColor: accent },
    footStyles: { fontStyle: "bold" },
    styles: { fontSize: 9 },
  });
  const finalY = (doc as any).lastAutoTable?.finalY ?? y + 20;
  doc.setFontSize(9); doc.setTextColor(100,100,100); doc.text(documentFooter(brand, "receipts"), 14, Math.min(finalY + 16, 280));
  return doc;
}

export async function downloadIssuedPaymentReceiptPDF(id: string): Promise<void> {
  const payload = await fetchIssuedPaymentReceipt(id);
  const doc = await generateIssuedPaymentReceiptPDF(payload);
  doc.save(`${payload.receipt.receipt_number}.pdf`);
}
