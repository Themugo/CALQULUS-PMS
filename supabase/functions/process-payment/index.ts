/**
 * process-payment/index.ts
 *
 * Central payment processing engine for CALQULUS RMS.
 * Handles ALL payment channels without holding money:
 *   - M-Pesa STK push (callback from mpesa-callback triggers this)
 *   - USSD / paybill (Safaricom C2B confirmation webhook)
 *   - Bank transfer (from bank-webhook or manual reconcile)
 *   - Receipt upload (manager confirms after reviewing)
 *
 * Payment types:
 *   - Full payment    → invoice marked paid, balance = 0
 *   - Partial payment → invoice stays open, paid_amount updated, balance_due reduced
 *   - Advance payment → excess over invoice stored in tenant_credit_ledger
 *   - Multi-invoice   → allocates across oldest-first by due_date
 *
 * Immediately after processing:
 *   - Sends email receipt (Resend)
 *   - Sends SMS receipt (Africa's Talking / TextSMS)
 *   - Notifies manager
 *   - Optionally sends WhatsApp (if manager enabled)
 */

import { getCorsHeaders, preflightResponse } from "../_shared/cors.ts";
import { serve } from "std/http/server.ts";
import { createClient } from "supabase/supabase-js@2";
import { requireEnv } from "../_shared/env.ts";
import { recordWebhookFailure } from "../_shared/webhookHelpers.ts";
import { checkRateLimit, rateLimitResponse } from "../_shared/rateLimit.ts";
import { isPositiveMoney, roundMoney } from "../_shared/money.ts";
import { checkApiVersion, withApiVersion, CURRENT_API_VERSION } from "../_shared/apiVersion.ts";
import { processPaymentAtomic } from "../_shared/atomicPaymentProcessing.ts";
import { buildReceiptLines, billsBalance, smsBillsText } from "../_shared/receiptSummary.ts";
import { needsPartyPath, invoiceIdsFromTransaction } from "../_shared/partyReceipts.ts";
import { announcePayment, buildFormatter, notify, METHOD_LABELS } from "../_shared/paymentAnnouncement.ts";

const SUPABASE_URL = requireEnv("SUPABASE_URL");
const SERVICE_KEY  = requireEnv("SUPABASE_SERVICE_ROLE_KEY");

const log = (step: string, d?: unknown) => console.log(`[payment] ${step}`, d ?? "");

/**
 * Finish a pending STK prompt that was started by a third-party payer or that settles bills of
 * several tenants. Allocation runs in complete_pending_stk_payment_atomic (invoice list read
 * from the pending row itself); announcePayment then sends the payer one receipt for every bill
 * and each tenant a receipt for only their own bills. Returns null when the standard
 * single-tenant path applies.
 */
async function processPartyStkPayment(
  supabase: any,
  input: { transactionId: string; amount: number; reference: string; paymentDate: string },
): Promise<Record<string, unknown> | null> {
  const { data: tx } = await supabase.from("payment_transactions")
    .select("id, invoice_id, notes, payer_party_id").eq("id", input.transactionId).maybeSingle();
  if (!tx) return null;
  const listedIds = invoiceIdsFromTransaction(tx.notes, tx.invoice_id);
  if (listedIds.length === 0) return null;
  const { data: listed } = await supabase.from("invoices").select("id, tenant_id").in("id", listedIds);
  if (!needsPartyPath(tx.payer_party_id, (listed ?? []).map((r: { tenant_id: string | null }) => r.tenant_id))) return null;

  const { data: done, error: doneErr } = await supabase.rpc("complete_pending_stk_payment_atomic", {
    p_transaction_id: tx.id, p_amount: input.amount, p_reference: input.reference, p_payment_date: input.paymentDate,
  });
  if (doneErr) throw new Error(`Atomic party payment failed: ${doneErr.message}`);
  const row = (Array.isArray(done) ? done[0] : done) as Record<string, any>;
  const announced = await announcePayment(supabase, tx.id);
  const allocs = (Array.isArray(row?.allocations) ? row.allocations : []) as Array<{ invoice_id: string; amount: number; closed: boolean }>;
  const surplus = roundMoney(Number(row?.advance_credit ?? 0));
  return {
    success: true, idempotent: Boolean(row?.idempotent), transactionId: tx.id,
    allocated: input.amount - surplus, advanceCredit: surplus,
    allocations: allocs.map((a) => ({ invoiceId: a.invoice_id, amount: a.amount, closed: a.closed })),
    ...announced,
  };
}

interface ProcessPaymentRequest {
  // Core payment info
  tenantId:    string;
  managerId:   string;
  amount:      number;             // actual amount received
  paymentMethod: string;           // mpesa_stk | mpesa_ussd | mpesa_till | bank_transfer | bank_direct_debit | receipt_upload
  paymentDate: string;             // YYYY-MM-DD
  reference:   string;             // M-Pesa receipt / bank ref / upload ID

  // Optional targeting
  invoiceId?:  string;             // if paying specific invoice
  invoiceIds?: string[];           // combined payment across selected bills
  unitId?:     string;
  propertyId?: string;
  unitNumber?: string;
  phone?:      string;
  recordedBy?: string;             // manager/submanager user ID (null = self-service)
  notes?:      string;

  // Already-created transaction ID (if mpesa-callback created the record)
  transactionId?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return preflightResponse(req);

  const versionCheck = checkApiVersion(req, CURRENT_API_VERSION);
  if (versionCheck) return versionCheck;

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
  let requestBody: Partial<ProcessPaymentRequest> | null = null;

  try {
    // ── Caller authentication ─────────────────────────────────────────
    // process-payment may be called from:
    //   (a) mpesa-callback (server → server, carries service-role key)
    //   (b) bank-webhook (server → server, carries service-role key)
    //   (c) Manager UI via RecordPaymentDialog (user JWT)
    // We accept both paths but validate accordingly.
    const authHeader = req.headers.get("Authorization") ?? "";
    const isServiceCall = authHeader === `Bearer ${SERVICE_KEY}`;

    let callerUserId: string | null = null;

    if (!isServiceCall) {
      // JWT path — validate caller is a manager or submanager
      const { data: { user: caller }, error: authErr } = await supabase.auth.getUser(
        authHeader.replace("Bearer ", "")
      );
      if (authErr || !caller) {
        return new Response(JSON.stringify({ error: "Unauthorized" }),
          { status: 401, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } });
      }
      const { data: roleRow } = await supabase.from("user_roles")
        .select("role").eq("user_id", caller.id).maybeSingle();
      if (!["manager", "submanager"].includes((roleRow as any)?.role)) {
        return new Response(JSON.stringify({ error: "Forbidden: only managers may record payments" }),
          { status: 403, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } });
      }
      callerUserId = caller.id;

      // Rate-limit only the JWT path. Server-to-server calls from
      // mpesa-callback and bank-webhook are already gated by the M-Pesa
      // STK init rate limit (5/hr) and bank-webhook's own integration
      // throttling. Limit user-driven recording to 60/hr — enough for a
      // busy manager during month-end collections, low enough to flag
      // a compromised account.
      const allowed = await checkRateLimit(
        supabase, caller.id, "process-payment", 60,
        { failClosed: true }, // money path — never allow on infra error
      );
      if (!allowed) return rateLimitResponse(req);
    }

    const body: ProcessPaymentRequest = await req.json();
    requestBody = body;
    const {
      tenantId, paymentMethod, paymentDate, reference,
      invoiceId, invoiceIds, unitId, propertyId, unitNumber, phone, recordedBy, notes, transactionId,
    } = body;
    let managerId = body.managerId;
    const amount = roundMoney(Number(body.amount));
    if (!tenantId || !isPositiveMoney(amount) || !paymentMethod || !paymentDate || !reference) {
      return new Response(JSON.stringify({ error: "Missing or invalid required fields" }),
        { status: 400, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } });
    }
    if (isServiceCall && !managerId) {
      return new Response(JSON.stringify({ error: "Missing or invalid required fields" }),
        { status: 400, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } });
    }

    if (!isServiceCall && callerUserId) {
      // Resolve the caller's own manager scope rather than trusting the
      // managerId supplied in the request body, and verify the target
      // tenant is actually inside that scope.
      const { data: callerRoleRow } = await supabase.from("user_roles")
        .select("role").eq("user_id", callerUserId).maybeSingle();
      let effectiveManagerId = callerUserId;
      if ((callerRoleRow as any)?.role === "submanager") {
        const { data: rel } = await supabase.from("manager_submanagers")
          .select("manager_id").eq("submanager_user_id", callerUserId).maybeSingle();
        effectiveManagerId = (rel as any)?.manager_id ?? callerUserId;
      }
      const { data: tenantOwner, error: tenantOwnerErr } = await supabase
        .from("tenants").select("manager_id, property_id").eq("id", tenantId).maybeSingle();
      if (tenantOwnerErr || !tenantOwner || (tenantOwner as any).manager_id !== effectiveManagerId) {
        return new Response(JSON.stringify({ error: "Forbidden: tenant is not in your managed portfolio" }),
          { status: 403, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } });
      }
      if ((callerRoleRow as any)?.role === "submanager") {
        const { data: perms } = await supabase.from("submanager_permissions")
          .select("restrict_to_assigned_properties")
          .eq("submanager_user_id", callerUserId)
          .maybeSingle();
        if ((perms as any)?.restrict_to_assigned_properties) {
          const { data: assigned } = await supabase.from("submanager_property_assignments")
            .select("property_id")
            .eq("submanager_user_id", callerUserId);
          const allowed = new Set((assigned ?? []).map((row: { property_id: string }) => row.property_id));
          const tenantPropertyId = (tenantOwner as any).property_id as string | null;
          if (!tenantPropertyId || !allowed.has(tenantPropertyId)) {
            return new Response(JSON.stringify({ error: "Forbidden: tenant is outside your assigned properties" }),
              { status: 403, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } });
          }
        }
      }
      // Never persist a caller-supplied managerId on the JWT path.
      managerId = effectiveManagerId;
    }

    // Third-party payer / multi-tenant STK prompts finish through their own atomic path.
    if (isServiceCall && transactionId) {
      const partyResult = await processPartyStkPayment(supabase, {
        transactionId, amount, reference, paymentDate,
      });
      if (partyResult) {
        return withApiVersion(new Response(JSON.stringify(partyResult),
          { headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }));
      }
    }

    log("Processing payment", { tenantId, amount, paymentMethod, reference });

    // ── 1. Fetch tenant profile + company settings ─────────────────────
    const [tenantRes, companyRes] = await Promise.all([
      supabase.from("tenants").select("name, email, phone").eq("id", tenantId).maybeSingle(),
      supabase.from("company_settings").select("company_name, logo_url, currency").maybeSingle(),
    ]);
    const tenant = tenantRes.data as { name: string; email: string; phone: string | null } | null;
    const company = companyRes.data as { company_name: string; logo_url: string; currency: string | null } | null;
    const companyName = company?.company_name ?? "Property Management";
    const currency    = company?.currency ?? "KES";
    const fmt         = buildFormatter(currency);
    const tenantName  = tenant?.name ?? "Tenant";
    const tenantEmail = tenant?.email ?? null;
    const tenantPhone = tenant?.phone ?? phone ?? null;

    // ── 2. Idempotency is now enforced by a UNIQUE INDEX on
    //      (tenant_id, bank_reference) created in migration
    //      20260520000000. We INSERT optimistically and catch the
    //      duplicate-key error below — that path is race-free where the
    //      old SELECT-then-INSERT pattern had a (small) window where two
    //      concurrent calls both saw "no existing tx" and both inserted.

    // ── 3. Get target invoices (oldest unpaid first) ───────────────────
    let invoices: any[] = [];
    if (invoiceIds?.length) {
      const { data } = await supabase.from("invoices")
        .select("id, invoice_number, amount, original_amount, paid_amount, balance_due, due_date, status, installment_plan")
        .in("id", invoiceIds)
        .eq("tenant_id", tenantId)
        .in("status", ["pending", "overdue", "partially_paid"])
        .order("due_date", { ascending: true });
      invoices = data ?? [];
      if (invoices.length !== invoiceIds.length) {
        return new Response(JSON.stringify({ error: "One or more selected bills are not payable" }),
          { status: 400, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } });
      }
    } else if (invoiceId) {
      const { data } = await supabase.from("invoices")
        .select("id, invoice_number, amount, original_amount, paid_amount, balance_due, due_date, status, installment_plan")
        .eq("id", invoiceId)
        .eq("tenant_id", tenantId)
        .in("status", ["pending", "overdue", "partially_paid"])
        .maybeSingle();
      if (!data) {
        return new Response(JSON.stringify({ error: "Selected bill is not payable" }),
          { status: 400, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } });
      }
      invoices = [data];
    } else {
      // Auto-allocate to oldest unpaid invoices for this tenant
      const { data } = await supabase.from("invoices")
        .select("id, invoice_number, amount, original_amount, paid_amount, balance_due, due_date, status, installment_plan")
        .eq("tenant_id", tenantId)
        .in("status", ["pending", "overdue", "partially_paid"])
        .order("due_date", { ascending: true });
      invoices = data ?? [];
    }

    let txId = transactionId;
    let remaining = 0;
    let creditBalance = 0;
    const allocations: { invoiceId: string; alloc: number; closes: boolean }[] = [];
    const closedInvoiceNumbers: string[] = [];

    // Payment persistence is intentionally atomic. The database RPC owns the
    // transaction row, invoice allocation, overpayment credit, and final
    // payment flags inside one database transaction. Do not fall back to a
    // compensating PostgREST sequence: a partial payment can otherwise leave
    // invoices, allocations, and credit ledger out of sync.
    const atomic = await processPaymentAtomic(supabase, {
      tenantId,
      managerId,
      amount,
      paymentMethod,
      paymentDate,
      reference,
      invoiceId,
      invoiceIds,
      unitId,
      propertyId,
      unitNumber,
      phone: tenantPhone ?? undefined,
      recordedBy,
      notes,
      transactionId,
    });

    if (!atomic.success) {
      log("process_payment_atomic failed — refusing non-atomic fallback", { error: atomic.error });
      throw new Error(`Atomic payment processing unavailable: ${atomic.error ?? "unknown error"}`);
    }

    txId = atomic.transactionId ?? null;

    // Preserve the payer attribution on every allocation when a third-party payer
    // initiated the transaction. This keeps bulk and individual reconciliation unit-first.
    if (txId) {
      await supabase.rpc("backfill_payment_allocation_payer_atomic", { p_transaction_id: txId });
    }
    remaining = roundMoney(Number(atomic.advanceCredit ?? 0));
    creditBalance = roundMoney(Number(atomic.creditBalance ?? 0));
    for (const alloc of atomic.allocations ?? []) {
      allocations.push({ invoiceId: alloc.invoiceId, alloc: alloc.amount, closes: alloc.closed });
      if (alloc.closed) {
        const inv = invoices.find((i) => i.id === alloc.invoiceId);
        if (inv?.invoice_number) closedInvoiceNumbers.push(inv.invoice_number);
      }
    }

    if (!txId) {
      throw new Error("Atomic payment processing returned no transaction id");
    }

    // Every completed payment gets one canonical issued receipt, regardless of
    // whether it was a single invoice, a multi-unit bulk payment, STK, bank,
    // or a manager-recorded payment. The receipt RPC is idempotent.
    const { data: issuedReceipt, error: issuedReceiptError } = await supabase.rpc(
      "issue_payment_receipt_atomic",
      { p_transaction_id: txId },
    );
    if (issuedReceiptError) {
      log("Issued receipt creation failed", { transactionId: txId, error: issuedReceiptError.message });
      // Do not roll back a successful payment because receipt delivery is a
      // secondary artifact; the receipt RPC can be replayed safely.
    } else {
      log("Issued payment receipt ready", { transactionId: txId, receipt: issuedReceipt });
    }

    // This function's own notification block below is the announcement for this payment; mark it
    // so later announcers (manual retry, reconcile) do not send the same receipts again.
    if (!atomic.idempotent) {
      await supabase.rpc("claim_payment_announcement_atomic", { p_transaction_id: txId });
    }

    if (atomic.idempotent) {
      log("Idempotent replay via process_payment_atomic", { reference, txId });
      return withApiVersion(new Response(JSON.stringify({
        success: true,
        idempotent: true,
        transactionId: txId,
        message: "Payment already recorded with this reference",
      }), { headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }));
    }

    log("Allocated via process_payment_atomic", { txId, remaining, allocations: allocations.length });

    // ── 3b. Determine payment receiver (manager or landlord) ─────────────
    let paymentReceiverType: string | null = null;
    let landlordIdForNotify: string | null = null;

    // Record WHICH account this payment belongs to when the provider flow did not already
    // (manual, bank and C2B payments). Best-effort: a receipt never blocks on it.
    try {
      await supabase.rpc("snapshot_payment_destination_atomic", { p_transaction_id: txId });
    } catch (e) {
      log("Destination snapshot skipped", { error: String(e) });
    }

    const { data: txRecord } = await supabase.from("payment_transactions")
      .select("payment_receiver_type, landlord_id, destination_label")
      .eq("id", txId)
      .maybeSingle();

    const destinationLabel: string | null = (txRecord as { destination_label?: string | null } | null)?.destination_label ?? null;
    if (txRecord?.payment_receiver_type) {
      paymentReceiverType = txRecord.payment_receiver_type;
      landlordIdForNotify = txRecord.landlord_id;
    } else if (propertyId) {
      const { data: pl } = await supabase.from("property_landlords")
        .select("landlord_user_id, payment_destination")
        .eq("property_id", propertyId).maybeSingle();
      if (pl?.payment_destination === "landlord") {
        paymentReceiverType = "landlord";
        landlordIdForNotify = pl.landlord_user_id;
      }
    }

    log("Payment receiver", { paymentReceiverType, landlordIdForNotify });

    // ── 6. Compute final outstanding balance ───────────────────────────
    // Note: if the RPC fails (table missing, network blip) we can't tell
    // "balance is zero" from "balance unknown". Mark as null in that case
    // so downstream messaging can say "Account updated" instead of falsely
    // saying "Fully paid up".
    const { data: balanceData, error: balErr } = await supabase.rpc("get_tenant_balance", { p_tenant_id: tenantId });
    const balanceKnown = !balErr && Array.isArray(balanceData) && balanceData.length > 0;
    const finalBalance = balanceKnown ? Number((balanceData?.[0] as any)?.balance_due ?? 0) : 0;
    const inArrears    = balanceKnown ? ((balanceData?.[0] as any)?.is_in_arrears ?? false) : false;
    if (!balanceKnown) {
      log("Warning: get_tenant_balance unavailable — receipts will omit balance", { tenantId, err: balErr?.message });
    }

    // ── 7. Determine property/unit for receipt ─────────────────────────
    const displayUnit = unitNumber ?? "—";
    let displayProperty = "Property";
    if (propertyId) {
      const { data: prop } = await supabase.from("properties").select("name").eq("id", propertyId).maybeSingle();
      displayProperty = (prop as any)?.name ?? displayProperty;
    }

    // Every invoice this payment settled, with each one's own remaining balance.
    const allocIds = allocations.map((a) => a.invoiceId);
    const { data: allocInvoiceRows } = allocIds.length
      ? await supabase.from("invoices").select("id, invoice_number, balance_due, units(unit_number)").in("id", allocIds)
      : { data: [] as any[] };
    const receiptLines = buildReceiptLines(
      allocations.map((a) => ({ invoiceId: a.invoiceId, alloc: a.alloc })),
      (allocInvoiceRows ?? []) as any[],
    );
    const billsRemaining = billsBalance(receiptLines);

    // Primary invoice for receipt (first closed, or first allocated)
    const primaryInvId = allocations.find(a => a.closes)?.invoiceId ?? allocations[0]?.invoiceId;
    const primaryInv = invoices.find(i => i.id === primaryInvId);
    const invoiceNumber = primaryInv?.invoice_number ?? reference.slice(0, 12);

    // ── 8. Payment method label for receipt ───────────────────────────
    const methodLabel = METHOD_LABELS[paymentMethod] ?? paymentMethod;

    // ── 9. Fetch receipt settings for manager ─────────────────────────
    const { data: rs } = await supabase.from("receipt_settings")
      .select("*").eq("manager_user_id", managerId).maybeSingle();
    const { data: notifPrefs } = await supabase.from("manager_notification_settings")
      .select("notify_email, notify_sms, notify_whatsapp").eq("manager_user_id", managerId).maybeSingle();

    const sendEmail    = (rs as any)?.auto_send_receipts !== false;
    const sendSms      = (rs as any)?.send_sms_receipt !== false;
    const sendWA       = (notifPrefs as any)?.notify_whatsapp === true;
    const notifyMgr    = (notifPrefs as any)?.notify_email !== false;

    // ── 10. Parallel notifications ─────────────────────────────────────
    const jobs: Promise<void>[] = [];

    // Email receipt
    if (sendEmail && tenantEmail) {
      const balanceMsg = remaining > 0
        ? `Advance credit of ${fmt(remaining)} held for your account.`
        : finalBalance > 0 ? `Outstanding balance: ${fmt(finalBalance)}.` : "Account fully paid up.";

      jobs.push(notify(supabase, "email", "send-receipt-email", {
        tenantEmail,
        tenantName,
        invoiceNumber,
        amount,
        paidDate: paymentDate,
        dueDate:  primaryInv?.due_date ?? null,
        property: displayProperty,
        unit:     displayUnit,
        companyName,
        logoUrl:  (company as any)?.logo_url ?? null,
        mpesaReceipt: paymentMethod.startsWith("mpesa") ? reference : undefined,
        bankRef:  paymentMethod.startsWith("bank") ? reference : undefined,
        paymentMethod: methodLabel,
        destination: destinationLabel ?? undefined,
        lines: receiptLines.length > 1 ? receiptLines : undefined,
        billsBalance: receiptLines.length > 0 ? billsRemaining : undefined,
        outstandingBalance: finalBalance,
        advanceCredit: remaining > 0 ? remaining : undefined,
        primaryColor:   (rs as any)?.primary_color ?? "#2F6FED",
        secondaryColor: (rs as any)?.secondary_color ?? "#1e293b",
        footerMessage:  (rs as any)?.footer_message ?? "Thank you for your payment!",
      }, { transactionId: txId, tenantId, managerId }));
    }

    // SMS receipt
    if (sendSms && tenantPhone) {
      const balStr = remaining > 0
        ? ` Credit: ${fmt(remaining)}.`
        : finalBalance > 0 ? ` Bal: ${fmt(finalBalance)}.` : " A/C paid up.";
      jobs.push(notify(supabase, "sms", "send-sms-notification", {
        phoneNumber: tenantPhone,
        message: receiptLines.length > 1
          ? `${companyName}: ${fmt(amount)} rcvd for ${smsBillsText(receiptLines, fmt)}. Ref: ${reference}. ${paymentDate}. Bal on these: ${fmt(billsRemaining)}.${balStr}`
          : `${companyName}: ${fmt(amount)} rcvd - Unit ${displayUnit} (${invoiceNumber}). Ref: ${reference}. ${paymentDate}.${balStr}`,
      }, { transactionId: txId, tenantId, managerId }));
    }

    // WhatsApp receipt
    if (sendWA && tenantPhone) {
      jobs.push(notify(supabase, "whatsapp", "send-whatsapp-notification", {
        phoneNumber: tenantPhone,
        tenantName,
        companyName,
        invoiceNumber,
        amount: fmt(amount),
        paymentDate,
        reference,
        paymentMethod: methodLabel,
        outstandingBalance: finalBalance,
        unit: displayUnit,
        property: displayProperty,
      }, { transactionId: txId, tenantId, managerId }));
    }

    // Manager notification
    if (notifyMgr) {
      jobs.push(notify(supabase, "manager_notify", "notify-manager-payment", {
        managerId,
        tenantName,
        tenantEmail:      tenantEmail ?? "",
        amount,
        invoiceNumber,
        paymentDate,
        propertyName:     displayProperty,
        unit:             displayUnit,
        mpesaReceiptNumber: paymentMethod.startsWith("mpesa") ? reference : undefined,
        bankRef:          paymentMethod.startsWith("bank") ? reference : undefined,
        paymentMethod:    methodLabel,
        isPartial:        allocations.some(a => !a.closes) && remaining <= 0,
        isAdvance:        remaining > 0,
        outstandingBalance: finalBalance,
      }, { transactionId: txId, tenantId, managerId }));
    }

    // Landlord notification (when payment goes to landlord)
    if (paymentReceiverType === "landlord" && landlordIdForNotify) {
      jobs.push(notify(supabase, "landlord_notify", "notify-manager-payment", {
        managerId: landlordIdForNotify,
        tenantName,
        tenantEmail:      tenantEmail ?? "",
        amount,
        invoiceNumber,
        paymentDate,
        propertyName:     displayProperty,
        unit:             displayUnit,
        mpesaReceiptNumber: paymentMethod.startsWith("mpesa") ? reference : undefined,
        bankRef:          paymentMethod.startsWith("bank") ? reference : undefined,
        paymentMethod:    methodLabel,
        isPartial:        allocations.some(a => !a.closes) && remaining <= 0,
        isAdvance:        remaining > 0,
        outstandingBalance: finalBalance,
      }, { transactionId: txId, tenantId, managerId: landlordIdForNotify }));
    }

    await Promise.allSettled(jobs);
    log("All notifications dispatched");

    return withApiVersion(new Response(JSON.stringify({
      success: true,
      transactionId:   txId,
      allocated:       amount - remaining,
      advanceCredit:   remaining > 0 ? remaining : 0,
      creditBalance,
      finalBalance,
      inArrears,
      closedInvoices:  closedInvoiceNumbers,
      allocations:     allocations.map(a => ({ invoiceId: a.invoiceId, amount: a.alloc, closed: a.closes })),
    }), { headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }));

  } catch (error: any) {
    const errMsg = error?.message ?? String(error);
    log("Error", { message: errMsg });
    // Failure AFTER payment may have already moved money or recorded an
    // incomplete transaction. Persist to dead-letter for manual triage.
    // Reference is the strongest correlation key we have.
    try {
      await recordWebhookFailure(
        supabase,
        // process-payment isn't strictly a webhook but the dead-letter table
        // accepts all three sources. We tag it under 'mpesa' when the input
        // smells like an STK callback, otherwise 'bank' as a safe default —
        // operators filter on `error` text rather than source for this case.
        "bank",
        requestBody?.reference ?? null,
        { url: req.url, error: errMsg, requestBody },
        error,
      );
    } catch { /* never throw from a catch */ }
    return withApiVersion(new Response(JSON.stringify({ error: errMsg }),
      { status: 500, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }));
  }
});
