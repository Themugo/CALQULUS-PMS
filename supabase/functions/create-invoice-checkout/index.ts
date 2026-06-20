/**
 * create-invoice-checkout/index.ts
 *
 * Creates a Stripe Checkout session for a specific invoice.
 * Uses the manager's configured currency (defaults to KES).
 */
import { serve } from "std/http/server.ts";
import { getCorsHeaders, preflightResponse } from "../_shared/cors.ts";
import Stripe from "stripe/stripe@18.5.0";
import { createClient } from "supabase/supabase-js@2";
import { requireEnv } from "../_shared/env.ts";
import { checkRateLimit, rateLimitResponse } from "../_shared/rateLimit.ts";
import { checkApiVersion, withApiVersion, CURRENT_API_VERSION } from "../_shared/apiVersion.ts";
import { createLogger } from "../_shared/logger.ts";
import { validateRequired, validatePositiveNumber } from "../_shared/validation.ts";
import { errorResponse, successResponse } from "../_shared/errors.ts";
import { checkRoleAccess } from "../_shared/authorization.ts";
import { logPaymentEvent } from "../_shared/audit.ts";

const SUPABASE_URL = requireEnv("SUPABASE_URL");
const SERVICE_KEY = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
const STRIPE_SECRET_KEY = requireEnv("STRIPE_SECRET_KEY");
const logger = createLogger("create-invoice-checkout");

serve(async (req) => {
  if (req.method === "OPTIONS") return preflightResponse(req);

  const versionCheck = checkApiVersion(req, CURRENT_API_VERSION);
  if (versionCheck) return versionCheck;

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

  try {
    logger.info("Checkout session creation started");

    // ── Authentication ─────────────────────────────────────────────────
    const authHeader = req.headers.get("Authorization") ?? "";

    const { data: { user: caller }, error: authErr } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", "")
    );
    if (authErr || !caller) {
      return errorResponse("Unauthorized", 401);
    }

    logger.info("User authenticated", { userId: caller.id });

    const roleCheck = await checkRoleAccess(caller.id, ["webhost", "manager", "submanager", "tenant"]);
    if (!roleCheck.allowed) {
      logger.warn("Unauthorized role access attempt", { userId: caller.id });
      return errorResponse("Forbidden - insufficient permissions", 403);
    }

    const allowed = await checkRateLimit(
      supabase, caller.id, "create-invoice-checkout", 10,
      { failClosed: true },
    );
    if (!allowed) {
      logger.warn("Rate limit exceeded", { userId: caller.id });
      return rateLimitResponse(req);
    }

    // ── Request parsing ────────────────────────────────────────────────
    let invoiceId: string;
    let amount: number;
    try {
      const body = await req.json();
      invoiceId = body.invoiceId;
      amount = body.amount;
    } catch {
      return withApiVersion(errorResponse("Invalid JSON body", 400));
    }

    const invoiceIdValidation = validateRequired(invoiceId, "Invoice ID");
    if (!invoiceIdValidation.valid) {
      return withApiVersion(errorResponse(invoiceIdValidation.error, 400));
    }

    const amountValidation = validatePositiveNumber(amount, "Amount");
    if (!amountValidation.valid) {
      return withApiVersion(errorResponse(amountValidation.error, 400));
    }

    logger.info("Request validated", { invoiceId, amount: amountValidation.value });

    // ── Verify invoice ownership ───────────────────────────────────────
    const { data: invoice, error: invErr } = await supabase
      .from("invoices")
      .select("id, invoice_number, amount, original_amount, paid_amount, balance_due, description, tenant_id, manager_id, status")
      .eq("id", invoiceId)
      .maybeSingle();

    if (invErr || !invoice) {
      logger.error("Invoice not found", { invoiceId });
      return errorResponse("Invoice not found", 404);
    }

    // Tenants can only pay their own invoices; managers can pay any in their org
    const { data: roleRow } = await supabase.from("user_roles")
      .select("role").eq("user_id", caller.id).maybeSingle();
    const callerRole = (roleRow as any)?.role;
    
    if (callerRole === "tenant" && invoice.tenant_id !== caller.id) {
      logger.warn("Tenant attempting to pay another's invoice", { tenantId: caller.id, invoiceTenantId: invoice.tenant_id });
      return errorResponse("Forbidden: you can only pay your own invoices", 403);
    }

    if (invoice.status === "paid") {
      logger.warn("Attempt to pay already paid invoice", { invoiceId });
      return errorResponse("Invoice is already paid", 400);
    }

    const outstanding = Number(
      (invoice as any).balance_due ??
        (Number((invoice as any).original_amount ?? invoice.amount) - Number((invoice as any).paid_amount ?? 0))
    );
    if (Math.abs(Math.round(amountValidation.value) - Math.round(outstanding)) > 1) {
      logger.warn("Amount mismatch", { expected: outstanding, received: amountValidation.value });
      return errorResponse(
        `Amount mismatch: expected ${Math.round(outstanding)}, received ${Math.round(amountValidation.value)}`,
        400
      );
    }

    // ── Get currency from company settings ─────────────────────────────
    const { data: companySettings } = await supabase
      .from("company_settings")
      .select("currency")
      .eq("manager_user_id", invoice.manager_id)
      .maybeSingle();

    const rawCurrency = (companySettings as any)?.currency ?? "KES";
    // Stripe requires lowercase 3-letter ISO 4217 currency codes
    const currency = rawCurrency.toLowerCase();

    // Zero-decimal currencies: Stripe expects the full amount, not cents
    const zeroDecimalCurrencies = new Set(["jpy", "krw", "vnd", "clp", "pyg", "gnf", "kmf", "djf", "xaf", "xof", "xpf", "bif", "isk"]);
    const stripeAmount = zeroDecimalCurrencies.has(currency)
      ? Math.round(amountValidation.value)
      : Math.round(amountValidation.value * 100);

    logger.info("Currency resolved", { currency, stripeAmount, originalAmount: amountValidation.value });

    // ── Create Stripe Checkout session ─────────────────────────────────
    const stripe = new Stripe(STRIPE_SECRET_KEY, {
      apiVersion: "2025-08-27.basil" as any,
    });

    const customerEmail = caller.email;
    const customers = await stripe.customers.list({ email: customerEmail, limit: 1 });
    const customerId = customers.data.length > 0 ? customers.data[0].id : undefined;

    const origin = req.headers.get("origin") || "https://www.calqulus.site";
    const reference = `STRIPE-INV-${crypto.randomUUID()}`;

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : customerEmail,
      line_items: [
        {
          price_data: {
            currency,
            product_data: {
              name: `Invoice ${invoice.invoice_number}`,
              description: invoice.description || "Rent Payment",
            },
            unit_amount: stripeAmount,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${origin}/portal?payment=success&invoice=${invoiceId}`,
      cancel_url: `${origin}/portal?payment=cancelled`,
      metadata: {
        invoice_id: invoiceId,
        invoice_number: invoice.invoice_number,
        tenant_id: invoice.tenant_id ?? "",
        manager_id: invoice.manager_id ?? "",
        reference,
        payment_kind: "tenant_invoice",
      },
    });

    logger.info("Checkout session created", { sessionId: session.id, url: session.url });
    
    await logPaymentEvent(caller.id, "payment_initiated", { 
      invoiceId, 
      amount: amountValidation.value, 
      reference,
      method: "stripe" 
    });

    return withApiVersion(successResponse({ url: session.url, sessionId: session.id }));

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error("Checkout session creation failed", { error: errorMessage });
    return errorResponse(errorMessage, 500);
  }
});
