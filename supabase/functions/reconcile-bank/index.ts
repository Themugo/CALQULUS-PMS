/**
 * reconcile-bank/index.ts
 * Records bank transfer, marks invoice paid, sends instant email+SMS receipt with balance
 */
import { getCorsHeaders, preflightResponse } from "../_shared/cors.ts";
import { serve } from "std/http/server.ts";
import { createClient } from "supabase/supabase-js@2";
import { requireEnv } from "../_shared/env.ts";
import { identifyUserServiceOrCron } from "../_shared/assertCaller.ts";
import { checkManagerAccess } from "../_shared/authorization.ts";
import { errorResponse } from "../_shared/errors.ts";
import { announcePayment } from "../_shared/paymentAnnouncement.ts";
import { matchBankTransaction, type OpenInvoice } from "../_shared/bankMatching.ts";

const SUPABASE_URL = requireEnv("SUPABASE_URL");
const SERVICE_KEY  = requireEnv("SUPABASE_SERVICE_ROLE_KEY");

const log = (s: string, d?: unknown) => console.log(`[BANK-RECONCILE] ${s}`, d ? JSON.stringify(d) : "");

serve(async (req) => {
  if (req.method === "OPTIONS") return preflightResponse(req);

  const caller = await identifyUserServiceOrCron(req);
  if (!caller.ok) return caller.response;

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

  try {
    const body = await req.json();

    // Single bank payment recording
    if (body.invoiceId) {
      const { invoiceId, amount, bankRef, paymentDate, managerId } = body;
      if (!invoiceId || typeof amount !== "number" || !isFinite(amount) || amount <= 0 || !bankRef) {
        return new Response(JSON.stringify({ error: "invoiceId, amount, bankRef required" }),
          { status: 400, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } });
      }

      const paidDate = paymentDate ?? new Date().toISOString().slice(0, 10);

      const { data: invoice } = await supabase.from("invoices")
        .select(`id, invoice_number, amount, status, due_date, tenant_id, manager_id, tenants(id, name, email, phone), leases(property, unit, unit_id, property_id)`)
        .eq("id", invoiceId).single();

      if (!invoice) return new Response(JSON.stringify({ error: "Invoice not found" }),
        { status: 404, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } });

      if (invoice.status === "paid") return new Response(JSON.stringify({ error: "Already paid" }),
        { status: 409, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } });

      const effectiveManagerId = managerId ?? invoice.manager_id;
      if (!effectiveManagerId) return new Response(JSON.stringify({ error: "managerId required" }),
        { status: 400, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } });

      if (caller.userId) {
        if (effectiveManagerId !== caller.userId || invoice.manager_id !== caller.userId) {
          return errorResponse("You do not have access to this invoice", 403);
        }
        const access = await checkManagerAccess(caller.userId);
        if (!access.allowed) return errorResponse(access.error ?? "Manager access denied", 403);
      } else if (effectiveManagerId !== invoice.manager_id) {
        return errorResponse("Invoice manager mismatch", 403);
      }

      const { data: payment, error: paymentError } = await supabase.rpc("process_payment_atomic", {
        p_tenant_id: invoice.tenant_id,
        p_manager_id: effectiveManagerId,
        p_amount: Number(amount),
        p_payment_method: "bank_transfer",
        p_payment_date: paidDate,
        p_reference: bankRef,
        p_invoice_id: invoiceId,
        p_invoice_ids: null,
        p_unit_id: (invoice.leases as any)?.unit_id ?? null,
        p_property_id: (invoice.leases as any)?.property_id ?? null,
        p_unit_number: (invoice.leases as any)?.unit ?? null,
        p_phone: (invoice as any).tenants?.phone ?? null,
        p_recorded_by: null,
        p_notes: "Bank reconciliation",
        p_existing_transaction_id: null,
      });

      if (paymentError) throw new Error(`Atomic bank payment failed: ${paymentError.message}`);
      const paymentResult = (Array.isArray(payment) ? payment[0] : payment) as any;
      if (!paymentResult?.success) throw new Error("Atomic bank payment failed");

      // Receipts and notifications (payer/tenant receipt with the amount actually paid, the
      // tenant's real balance, managers) go through the shared announcer exactly once.
      const transactionId = paymentResult.transaction_id as string | undefined;
      let announced: Record<string, unknown> = { announced: false };
      if (transactionId) {
        try { announced = await announcePayment(supabase, transactionId); }
        catch (e) { log("Announcement failed", { error: String(e) }); }
      }
      const { data: balanceData } = await supabase.rpc("get_tenant_balance", { p_tenant_id: invoice.tenant_id });
      const outstandingBalance = Number((Array.isArray(balanceData) ? balanceData[0] : balanceData)?.balance_due ?? 0);

      log("Bank payment recorded", { invoiceId, bankRef, outstandingBalance });
      return new Response(JSON.stringify({ success: true, invoiceId, bankRef, paidDate, outstandingBalance, transactionId, ...announced }),
        { headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } });
    }

    // Bulk auto-reconcile
    const { managerId } = body;
    if (!managerId || typeof managerId !== "string") {
      return errorResponse("managerId required", 400);
    }
    if (caller.userId) {
      if (managerId !== caller.userId) return errorResponse("You do not have access to this portfolio", 403);
      const access = await checkManagerAccess(caller.userId);
      if (!access.allowed) return errorResponse(access.error ?? "Manager access denied", 403);
    }
    const { data: bankTxs } = await supabase.from("bank_transactions")
      .select("*").eq("matched", false).eq("manager_id", managerId);

    // Open invoices are loaded once (not 50 per bank row) and include part-paid bills, matched on
    // what is still owed. A matched invoice is removed so two bank rows cannot claim it twice.
    const { data: openRows } = await supabase.from("invoices")
      .select("id, invoice_number, amount, balance_due, due_date, tenant_id, leases(unit)")
      .in("status", ["pending", "overdue", "partially_paid"]).eq("manager_id", managerId).limit(5000);
    const open: OpenInvoice[] = (openRows ?? []).map((r: any) => ({
      id: r.id, tenantId: r.tenant_id, invoiceNumber: r.invoice_number ?? null, unit: r.leases?.unit ?? null,
      balance: Number(r.balance_due ?? r.amount ?? 0), dueDate: r.due_date ?? null,
    }));

    let matched = 0, unmatched = 0;
    for (const tx of bankTxs || []) {
      const hit = matchBankTransaction(`${tx.reference ?? ""} ${tx.description ?? ""}`, Number(tx.amount), open);
      if (!hit) { unmatched++; continue; }

      const { data: payment, error: paymentError } = await supabase.rpc("reconcile_bank_transaction_atomic", {
        p_bank_transaction_id: tx.id,
        p_invoice_id: hit.invoice.id,
        p_manager_id: managerId,
        p_recorded_by: null,
      });
      if (paymentError || !(payment as any)?.success) {
        unmatched++;
        log("Atomic bank reconciliation failed", { bankTransactionId: tx.id, error: paymentError?.message ?? "unknown" });
        continue;
      }
      const idx = open.findIndex((i) => i.id === hit.invoice.id);
      if (idx >= 0) open.splice(idx, 1);
      const transactionId = (payment as any)?.transaction_id as string | undefined;
      if (transactionId) {
        try { await announcePayment(supabase, transactionId); } catch (e) { log("Announcement failed", { error: String(e) }); }
      }
      matched++;
    }

    return new Response(JSON.stringify({ success: true, matched, unmatched }),
      { headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } });

  } catch (error: any) {
    log("Error", { message: error.message });
    return new Response(JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } });
  }
});
