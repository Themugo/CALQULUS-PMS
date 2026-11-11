/**
 * _shared/paymentAnnouncement.ts
 *
 * Tell the right people about a payment that is ALREADY recorded: issue the canonical receipt,
 * then email / SMS / WhatsApp the payer and each tenant (only their own bills, with their own
 * balance), and notify managers and the landlord. Used by every channel that records money
 * without going through process-payment's own notification block: manual recording, bank
 * webhook auto-match, bank reconciliation, receipt-upload approval.
 *
 * Safe to call more than once for a transaction: the first caller claims the announcement
 * (claim_payment_announcement_atomic) and later callers do nothing.
 */
import { requireEnv } from "./env.ts";
import { roundMoney } from "./money.ts";
import { buildReceiptLines, smsBillsText } from "./receiptSummary.ts";
import { planPartyReceipts, type PartyLine, type TenantInfo } from "./partyReceipts.ts";

const SUPABASE_URL = requireEnv("SUPABASE_URL");
const SERVICE_KEY  = requireEnv("SUPABASE_SERVICE_ROLE_KEY");

const log = (step: string, d?: unknown) => console.log(`[announce] ${step}`, d ?? "");

// Build a currency-aware formatter using the manager's company_settings
// currency. Falls back to KES for legacy installations where the column
// is null. Centralised so we never accidentally hard-code KES again.
export const buildFormatter = (currency: string) => {
  const cur = (currency || "KES").toUpperCase();
  // en-KE locale works for KES/UGX/TZS; for other currencies fall back to en-US.
  const locale = ["KES", "UGX", "TZS", "RWF"].includes(cur) ? "en-KE" : "en-US";
  return (n: number) =>
    new Intl.NumberFormat(locale, { style: "currency", currency: cur, minimumFractionDigits: 0 }).format(n);
};

/**
 * Send a notification by invoking another edge function. On failure, persist
 * a row to `notification_failures` so it is visible in the manager dashboard
 * for replay. Never throws — the caller is in a Promise.allSettled batch and
 * an exception here would only show up as 'rejected' with no context.
 */
export const notify = async (
  supabase: any,
  channel: "email" | "sms" | "whatsapp" | "manager_notify" | "landlord_notify",
  fn: string,
  body: Record<string, unknown>,
  context: { transactionId: string | null; tenantId: string | null; managerId: string | null },
): Promise<void> => {
  try {
    const resp = await fetch(`${SUPABASE_URL}/functions/v1/${fn}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${SERVICE_KEY}` },
      body: JSON.stringify(body),
    });
    const responseText = await resp.text().catch(() => "");
    let responseJson: Record<string, unknown> | null = null;
    try {
      responseJson = responseText ? JSON.parse(responseText) : null;
    } catch {
      responseJson = null;
    }
    if (!resp.ok) {
      throw new Error(`${fn} returned ${resp.status}: ${responseText.slice(0, 300)}`);
    }
    if (responseJson?.success === false || responseJson?.skipped === true) {
      const error =
        responseJson.error ??
        responseJson.message ??
        responseJson.reason ??
        "Notification provider reported failure";
      throw new Error(`${fn} provider failure: ${String(error).slice(0, 300)}`);
    }
  } catch (e) {
    const errMsg = e instanceof Error ? e.message : String(e);
    log(`notify ${fn} failed`, { channel, error: errMsg });
    try {
      await supabase.from("notification_failures").insert({
        transaction_id: context.transactionId,
        tenant_id:      context.tenantId,
        manager_id:     context.managerId,
        channel,
        error:          errMsg.slice(0, 1000),
        payload:        body,
        status:         "pending",
      });
    } catch (insertErr) {
      // Last-resort console log — never re-throw, never block the response.
      console.error("[payment] notification_failures insert failed:", insertErr);
    }
  }
};



export const METHOD_LABELS: Record<string, string> = {
  mpesa_stk: "M-Pesa (STK Push)", mpesa_ussd: "M-Pesa (USSD/Paybill)", mpesa_till: "M-Pesa (Buy Goods)",
  bank_transfer: "Bank Transfer", bank_direct_debit: "Bank Direct Debit",
  receipt_upload: "Manual (Receipt Uploaded)", stripe_checkout: "Stripe Checkout",
};

export async function announcePayment(supabase: any, transactionId: string): Promise<Record<string, unknown>> {
  // Receipt first (idempotent), then claim the announcement so it is sent exactly once.
  const { error: rcErr } = await supabase.rpc("issue_payment_receipt_atomic", { p_transaction_id: transactionId });
  if (rcErr) log("Issued receipt creation failed", { transactionId, error: rcErr.message });
  const { data: claimed } = await supabase.rpc("claim_payment_announcement_atomic", { p_transaction_id: transactionId });
  if (claimed === false) return { announced: false, reason: "already_announced" };

  const { data: tx } = await supabase.from("payment_transactions")
    .select("id, status, manager_id, amount, payment_method, payment_type, bank_reference, mpesa_receipt_number, completed_at, credit_amount, destination_label, payment_receiver_type, landlord_id")
    .eq("id", transactionId).maybeSingle();
  if (!tx || tx.status !== "completed") return { announced: false, reason: "not_completed" };

  const { data: allocRows } = await supabase.from("payment_allocations")
    .select("invoice_id, allocated_amount, closes_invoice").eq("transaction_id", transactionId);
  const allocs = (allocRows ?? []) as Array<{ invoice_id: string; allocated_amount: number; closes_invoice: boolean }>;
  const allocIds = allocs.map((a) => a.invoice_id);
  const managerId: string = tx.manager_id;
  const [{ data: invRows }, { data: partiesRaw }, { data: company }, { data: rs }, { data: notifPrefs }] = await Promise.all([
    allocIds.length ? supabase.from("invoices").select("id, invoice_number, balance_due, tenant_id, units(unit_number)").in("id", allocIds) : Promise.resolve({ data: [] }),
    supabase.rpc("get_payment_receipt_parties", { p_transaction_id: transactionId }),
    supabase.from("company_settings").select("company_name, logo_url, currency").maybeSingle(),
    supabase.from("receipt_settings").select("*").eq("manager_user_id", managerId).maybeSingle(),
    supabase.from("manager_notification_settings").select("notify_email, notify_sms, notify_whatsapp").eq("manager_user_id", managerId).maybeSingle(),
  ]);

  const parties = (partiesRaw ?? {}) as { payer?: { name: string | null; email: string | null; phone: string | null } | null; tenants?: Array<Record<string, any>> };
  const tenantOf = new Map<string, string>((invRows ?? []).map((r: any) => [r.id, r.tenant_id]));
  const baseLines = buildReceiptLines(allocs.map((a) => ({ invoiceId: a.invoice_id, alloc: Number(a.allocated_amount) })), (invRows ?? []) as any[]);
  const lines: PartyLine[] = baseLines.map((l) => ({ ...l, tenantId: tenantOf.get(l.invoiceId) ?? "" }));
  const tenants: TenantInfo[] = (parties.tenants ?? []).map((t) => ({
    tenantId: t.tenant_id, name: t.name ?? null, email: t.email ?? null, phone: t.phone ?? null,
    managerId: t.manager_id ?? null, paid: Number(t.paid ?? 0), accountBalance: Number(t.balance_due ?? 0),
  }));
  const plan = planPartyReceipts(parties.payer ?? null, tenants, lines);

  const reference: string = tx.mpesa_receipt_number || tx.bank_reference || transactionId.slice(0, 12);
  const paymentMethod: string = tx.payment_method || tx.payment_type || "";
  const paymentDate: string = (tx.completed_at ?? new Date().toISOString()).slice(0, 10);
  const fmt = buildFormatter((company as any)?.currency ?? "KES");
  const companyName = (company as any)?.company_name ?? "Property Management";
  const methodLabel = METHOD_LABELS[paymentMethod] ?? paymentMethod;
  const sendEmail = (rs as any)?.auto_send_receipts !== false;
  const sendSms = (rs as any)?.send_sms_receipt !== false;
  const sendWA = (notifPrefs as any)?.notify_whatsapp === true;
  const notifyMgr = (notifPrefs as any)?.notify_email !== false;
  const surplus = roundMoney(Number(tx.credit_amount ?? 0));
  const ctxBase = { transactionId, managerId };
  const jobs: Promise<void>[] = [];

  for (const r of plan) {
    const tenantId = r.tenantId;
    const first = r.lines[0];
    const balanceText = r.kind === "tenant" && r.accountBalance !== null
      ? (r.accountBalance > 0 ? `Account balance: ${fmt(r.accountBalance)}.` : "Account fully paid up.")
      : `Balance on these bills: ${fmt(r.billsBalance)}.`;
    if (sendEmail && r.email) {
      jobs.push(notify(supabase, "email", "send-receipt-email", {
        tenantEmail: r.email, tenantName: r.name,
        invoiceNumber: first?.invoiceNumber ?? reference.slice(0, 12),
        amount: r.paid, paidDate: paymentDate, dueDate: null,
        property: r.kind === "payer" ? "Multiple units" : "Property", unit: r.kind === "payer" ? `${r.lines.length} bill(s)` : (first?.unit ?? "—"),
        companyName, logoUrl: (company as any)?.logo_url ?? null,
        mpesaReceipt: paymentMethod.startsWith("mpesa") ? reference : undefined,
        bankRef: paymentMethod.startsWith("bank") ? reference : undefined,
        paymentMethod: methodLabel, destination: tx.destination_label ?? undefined,
        lines: r.lines.length > 1 || r.kind === "payer" ? r.lines : undefined,
        billsBalance: r.billsBalance,
        outstandingBalance: r.kind === "tenant" ? (r.accountBalance ?? r.billsBalance) : r.billsBalance,
        advanceCredit: r.kind === "payer" && surplus > 0 ? surplus : undefined,
        paidBy: r.paidBy ?? undefined,
        primaryColor: (rs as any)?.primary_color ?? "#2F6FED", secondaryColor: (rs as any)?.secondary_color ?? "#1e293b",
        footerMessage: (rs as any)?.footer_message ?? "Thank you for your payment!",
      }, { ...ctxBase, tenantId }));
    }
    if (sendSms && r.phone) {
      jobs.push(notify(supabase, "sms", "send-sms-notification", {
        phoneNumber: r.phone,
        message: `${companyName}: ${fmt(r.paid)} rcvd for ${smsBillsText(r.lines, fmt)}.${r.paidBy ? ` Paid by ${r.paidBy}.` : ""} Ref: ${reference}. ${paymentDate}. ${balanceText}`,
      }, { ...ctxBase, tenantId }));
    }
    if (sendWA && r.phone && r.kind === "tenant") {
      jobs.push(notify(supabase, "whatsapp", "send-whatsapp-notification", {
        phoneNumber: r.phone, tenantName: r.name, companyName,
        invoiceNumber: first?.invoiceNumber ?? reference.slice(0, 12),
        amount: fmt(r.paid), paymentDate, reference,
        paymentMethod: methodLabel, outstandingBalance: r.accountBalance ?? r.billsBalance,
        unit: first?.unit ?? "—", property: "Property",
      }, { ...ctxBase, tenantId }));
    }
  }

  // Managers (and the landlord when they collect) are told once per tenant whose bills were paid.
  for (const t of tenants) {
    const own = lines.filter((l) => l.tenantId === t.tenantId);
    if (own.length === 0) continue;
    const common = {
      tenantName: t.name ?? "Tenant", tenantEmail: t.email ?? "", amount: own.reduce((a, l) => a + l.paid, 0),
      invoiceNumber: own[0].invoiceNumber, paymentDate, propertyName: "Property", unit: own[0].unit ?? "—",
      mpesaReceiptNumber: paymentMethod.startsWith("mpesa") ? reference : undefined,
      bankRef: paymentMethod.startsWith("bank") ? reference : undefined,
      paymentMethod: methodLabel, isPartial: own.some((l) => l.balance > 0), isAdvance: false,
      outstandingBalance: t.accountBalance ?? 0,
    };
    const mgr = t.managerId ?? managerId;
    if (notifyMgr) jobs.push(notify(supabase, "manager_notify", "notify-manager-payment", { managerId: mgr, ...common }, { ...ctxBase, tenantId: t.tenantId, managerId: mgr }));
    if (tx.payment_receiver_type === "landlord" && tx.landlord_id) {
      jobs.push(notify(supabase, "landlord_notify", "notify-manager-payment", { managerId: tx.landlord_id, ...common }, { ...ctxBase, tenantId: t.tenantId, managerId: tx.landlord_id }));
    }
  }
  await Promise.allSettled(jobs);
  return { announced: true, receipts: plan.map((r) => ({ kind: r.kind, tenantId: r.tenantId, paid: r.paid })) };
}
