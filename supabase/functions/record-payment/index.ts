/**
 * record-payment/index.ts
 *
 * Manager/submanager manually records a payment for any channel.
 * Supports: M-Pesa code entry, bank ref entry, receipt confirmation.
 *
 * This is the "admin entry point" — when the manager knows money
 * arrived but it wasn't auto-captured by STK or bank webhook.
 */

import { getCorsHeaders, preflightResponse } from "../_shared/cors.ts";
import { serve } from "std/http/server.ts";
import { createClient } from "supabase/supabase-js@2";
import { requireEnv } from "../_shared/env.ts";
import { checkRateLimit, rateLimitResponse } from "../_shared/rateLimit.ts";
import { createLogger } from "../_shared/logger.ts";
import { validateRequired, validatePositiveNumber } from "../_shared/validation.ts";
import { errorResponse, successResponse } from "../_shared/errors.ts";
import { checkRoleAccess } from "../_shared/authorization.ts";
import { logPaymentEvent } from "../_shared/audit.ts";

const SUPABASE_URL = requireEnv("SUPABASE_URL");
const SERVICE_KEY  = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
const logger = createLogger("record-payment");

serve(async (req) => {
  if (req.method === "OPTIONS") return preflightResponse(req);

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

  try {
    logger.info("Payment recording started");

    // Authenticate the manager/submanager
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return errorResponse("Unauthorized", 401);
    }

    const { data: { user }, error: authErr } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", "")
    );
    if (authErr || !user) {
      return errorResponse("Authentication failed", 401);
    }

    logger.info("User authenticated", { userId: user.id });

    // Check role — must be manager or submanager
    const roleCheck = await checkRoleAccess(user.id, ["manager", "submanager"]);
    if (!roleCheck.allowed) {
      logger.warn("Unauthorized role access attempt", { userId: user.id });
      return errorResponse("Forbidden - manager or submanager role required", 403);
    }

    // Rate-limit manual payment recording. Generous limit for legitimate
    // month-end collection sprints; tight enough to catch a compromised
    // submanager from rapidly faking many payments.
    const allowed = await checkRateLimit(
      supabase, user.id, "record-payment", 100,
      { failClosed: true },
    );
    if (!allowed) {
      logger.warn("Rate limit exceeded", { userId: user.id });
      return rateLimitResponse(req);
    }

    const body = await req.json();
    const {
      tenantId,
      invoiceId,
      amount,
      paymentMethod = "mpesa_ussd",
      reference,
      paymentDate,
      notes,
      // Installment plan fields
      isInstallment = false,
      instalmentCount,
    } = body;

    // Validate required fields
    const tenantIdValidation = validateRequired(tenantId, "Tenant ID");
    if (!tenantIdValidation.valid) {
      return errorResponse(tenantIdValidation.error, 400);
    }

    const amountValidation = validatePositiveNumber(amount, "Amount");
    if (!amountValidation.valid) {
      return errorResponse(amountValidation.error, 400);
    }

    const referenceValidation = validateRequired(reference, "Reference");
    if (!referenceValidation.valid) {
      return errorResponse(referenceValidation.error, 400);
    }

    logger.info("Payment data validated", { tenantId, amount: amountValidation.value, reference });

    // Get the manager_id — for submanager, get their manager
    let effectiveManagerId = user.id;
    const { data: role } = await supabase.from("user_roles")
      .select("role").eq("user_id", user.id).maybeSingle();
    
    if ((role as any)?.role === "submanager") {
      const { data: rel } = await supabase.from("manager_submanagers")
        .select("manager_id").eq("submanager_user_id", user.id).maybeSingle();
      effectiveManagerId = (rel as any)?.manager_id ?? user.id;
      logger.info("Submanager resolved to manager", { submanagerId: user.id, managerId: effectiveManagerId });
    }

    // If creating an installment plan, set that up first
    if (isInstallment && instalmentCount && instalmentCount > 1) {
      logger.info("Creating installment plan", { instalmentCount });

      const { data: unpaidInvoices } = await supabase.from("invoices")
        .select("id, amount, balance_due, original_amount")
        .eq("tenant_id", tenantId)
        .in("status", ["pending", "overdue"])
        .order("due_date", { ascending: true });

      const totalOwed = (unpaidInvoices ?? []).reduce(
        (s, i: any) => s + Number(i.balance_due ?? i.amount), 0
      );
      const instalmentAmount = Math.ceil(totalOwed / instalmentCount);

      await supabase.from("arrears_schedule").insert({
        tenant_id:         tenantId,
        manager_id:        effectiveManagerId,
        invoice_id:        invoiceId ?? null,
        total_owed:        totalOwed,
        instalment_count:  instalmentCount,
        instalment_amount: instalmentAmount,
        status:            "active",
        start_date:        paymentDate ?? new Date().toISOString().slice(0, 10),
        next_due_date:     new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
        notes: notes ?? `Installment plan: ${instalmentCount} payments of ${instalmentAmount}`,
      });

      // Mark the invoice(s) as installment_plan = true
      if (invoiceId) {
        await supabase.from("invoices").update({ installment_plan: true }).eq("id", invoiceId);
      }

      logger.info("Installment plan created", { totalOwed, instalmentAmount });
    }

    // Delegate to process-payment for the actual payment recording.
    // We forward whatever status process-payment returned so the caller
    // sees a proper 4xx/5xx for a real failure rather than a 200 with an
    // error body — the previous code unwrapped JSON unconditionally.
    let processRes: Response;
    try {
      processRes = await fetch(`${SUPABASE_URL}/functions/v1/process-payment`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${SERVICE_KEY}` },
        body: JSON.stringify({
          tenantId,
          managerId:     effectiveManagerId,
          amount:        Number(amountValidation.value),
          paymentMethod,
          paymentDate:   paymentDate ?? new Date().toISOString().slice(0, 10),
          reference,
          invoiceId:     invoiceId ?? undefined,
          recordedBy:    user.id,
          notes,
        }),
      });
    } catch (fetchErr: any) {
      // Network failure calling process-payment — surface as 502 Bad Gateway
      // so the manager UI can show a clear retry prompt.
      logger.error("process-payment fetch error", { error: fetchErr?.message ?? fetchErr });
      return errorResponse("Payment service unreachable. Please retry.", 502);
    }

    const result = await processRes.json().catch(() => ({ error: "Invalid response from payment service" }));
    
    // Log the payment event
    if (processRes.ok) {
      await logPaymentEvent(user.id, "payment_completed", { 
        tenantId, 
        amount: amountValidation.value, 
        reference,
        recordedBy: user.id 
      });
    } else {
      await logPaymentEvent(user.id, "payment_failed", { 
        tenantId, 
        amount: amountValidation.value, 
        reference,
        error: result.error 
      });
    }

    logger.info("Payment recording completed", { status: processRes.status });
    return new Response(JSON.stringify(result),
      { status: processRes.status, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } });

  } catch (error: any) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error("Payment recording error", { error: errorMessage });
    return errorResponse(errorMessage, 500);
  }
});
