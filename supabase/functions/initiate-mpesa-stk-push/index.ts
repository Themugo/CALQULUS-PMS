/**
 * initiate-mpesa-stk-push/index.ts
 *
 * Initiates M-Pesa STK Push payment for rent/invoice payments.
 *
 * SECURITY FEATURES:
 * - Validates authenticated user is the tenant on the invoice
 * - Resolves M-Pesa settings via unit → property → manager chain
 * - Uses fail-closed rate limiting for money operations
 * - Stores full context for downstream receipts and notifications
 *
 * FIX SUMMARY:
 * 1. Resolves manager M-Pesa settings via unit → property → manager chain
 * 2. Uses unit_number as AccountReference for landlord reconciliation
 * 3. Stores unit_id, property_id, unit_number in payment_transactions
 * 4. Validates authenticated user is the tenant on the invoice
 */

import { serve } from "std/http/server.ts";
import { createClient } from "supabase/supabase-js@2";
import { requireEnv } from "../_shared/env.ts";
import { normalizeKenyanMsisdn } from "../_shared/mpesaPhone.ts";
import { stkChargeAmount } from "../_shared/mpesaAmount.ts";
import {
  withMiddleware,
  errorResponse,
  successResponse,
  AuthorizationError,
  isSensitive,
} from "../_shared/middleware.ts";

// Module-level env reads — fail fast at cold start, not mid-request.
const SUPABASE_URL = requireEnv("SUPABASE_URL");

// A part-paid bill is still payable: the tenant must be able to clear the remainder by STK.
const PAYABLE_INVOICE_STATUSES = ["pending", "overdue", "partially_paid"];

interface STKPushRequest {
  invoiceId?: string;
  invoiceIds?: string[];
  amount: number;
  phoneNumber: string;
  paymentType?: "paybill" | "till";
  payerPartyId?: string;
}

serve(
  withMiddleware(
    {
      functionName: "initiate-mpesa-stk-push",
      requireAuth: true,
      rateLimit: { maxPerHour: 5, failClosed: true }, // Fail-closed for money operations
    },
    async (req, ctx) => {
      const { invoiceId, invoiceIds, amount, phoneNumber, paymentType, payerPartyId }: STKPushRequest =
        await req.json();

      // Validate required fields
      const targetIds: string[] = (
        invoiceIds?.length
          ? invoiceIds
          : invoiceId
            ? [invoiceId]
            : []
      ).filter(Boolean);

      if (
        !targetIds.length ||
        typeof amount !== "number" ||
        !isFinite(amount) ||
        amount <= 0 ||
        !phoneNumber
      ) {
        throw errorResponse(
          "Missing or invalid required fields: invoiceId or invoiceIds, positive amount, phoneNumber",
          400
        );
      }

      if (targetIds.length > 20) {
        throw errorResponse("Too many invoices in one payment (max 20)", 400);
      }

      // A payment may be initiated by the tenant or by an explicitly linked third-party payer.
      const { data: roleRow } = await ctx.supabase
        .from("user_roles")
        .select("tenant_id")
        .eq("user_id", ctx.user!.id)
        .eq("role", "tenant")
        .maybeSingle();
      const callerTenantId = roleRow?.tenant_id ?? null;
      let payerParty: { id: string; user_id: string | null } | null = null;
      if (payerPartyId) {
        const { data: pp } = await ctx.supabase.from("payment_parties").select("id,user_id").eq("id", payerPartyId).maybeSingle();
        if (!pp || pp.user_id !== ctx.user!.id) throw new AuthorizationError("Payer account is not linked to this user");
        payerParty = pp;
      } else if (!callerTenantId) {
        throw new AuthorizationError("Tenant or linked payer account is required");
      }

      // Fetch invoices
      const invoiceSelect = `
        id,
        tenant_id,
        lease_id,
        unit_id,
        property_id,
        manager_id,
        amount,
        balance_due,
        paid_amount,
        invoice_number,
        status,
        leases (
          unit_id,
          property_id,
          units ( id, unit_number, property_id ),
          properties!leases_property_id_fkey ( id, manager_id, name )
        )
      `;

      const { data: invoiceRows, error: invoicesError } = await ctx.supabase
        .from("invoices")
        .select(invoiceSelect)
        .in("id", targetIds)
        .in("status", PAYABLE_INVOICE_STATUSES);

      if (invoicesError || !invoiceRows?.length) {
        throw errorResponse("One or more invoices not found or already paid", 404);
      }

      if (invoiceRows.length !== targetIds.length) {
        throw errorResponse("Some selected bills are no longer payable", 400);
      }

      // Verify every selected invoice belongs to the tenant, or to a unit explicitly linked to the payer.
      for (const row of invoiceRows) {
        if (callerTenantId && row.tenant_id === callerTenantId && !payerPartyId) continue;
        if (!payerPartyId) throw new AuthorizationError("Only the tenant can initiate payment for their own bills");
        const unitIdForInvoice = row.unit_id ?? (row.leases as { unit_id?: string | null } | null)?.unit_id ?? null;
        const { data: link } = await ctx.supabase.from("payer_unit_links").select("id").eq("payer_party_id", payerPartyId).eq("unit_id", unitIdForInvoice).eq("is_active", true).maybeSingle();
        if (!link) throw new AuthorizationError("Payer is not linked to every selected unit");
      }

      // Verify amount matches
      const expectedTotal = invoiceRows.reduce((sum, inv) => {
        const owed = Number(
          inv.balance_due ?? Number(inv.amount) - Number(inv.paid_amount ?? 0)
        );
        return sum + Math.max(0, owed);
      }, 0);

      // Charge the server-computed balance rounded UP to a whole shilling. The client figure
      // is only sanity-checked; it never decides how much is requested from the customer.
      const chargeAmount = stkChargeAmount(expectedTotal);
      if (chargeAmount <= 0) {
        throw errorResponse("These bills have no outstanding balance.", 400);
      }
      if (Math.abs(Math.round(amount) - Math.round(expectedTotal)) > 1) {
        throw errorResponse(
          `Amount mismatch: expected KES ${Math.round(expectedTotal)}, received KES ${Math.round(amount)}`,
          400
        );
      }

      // Primary invoice drives unit → manager chain
      const invoice = invoiceRows[0];
      const primaryInvoiceId = invoice.id;
      const allocationNote =
        targetIds.length > 1 ? JSON.stringify({ invoice_ids: targetIds }) : null;

      const lease = invoice.leases as {
        unit_id: string | null;
        property_id: string | null;
        units: { id: string; unit_number: string; property_id: string } | null;
        properties: { id: string; manager_id: string | null; name: string } | null;
      } | null;

      const unitId = invoice.unit_id ?? lease?.unit_id ?? lease?.units?.id ?? null;
      const propertyId =
        invoice.property_id ?? lease?.property_id ?? lease?.units?.property_id ?? null;
      // An invoice raised without a lease (one-off charge, utility, penalty) still has its own
      // unit/property/manager columns; fall back to them instead of refusing a payable bill.
      let managerId = lease?.properties?.manager_id ?? (invoice as { manager_id?: string | null }).manager_id ?? null;
      let unitNumber = lease?.units?.unit_number ?? null;
      let propertyName = lease?.properties?.name ?? null;
      if ((!managerId || !propertyName) && propertyId) {
        const { data: propRow } = await ctx.supabase.from("properties").select("manager_id, name").eq("id", propertyId).maybeSingle();
        managerId = managerId ?? (propRow as { manager_id?: string | null } | null)?.manager_id ?? null;
        propertyName = propertyName ?? (propRow as { name?: string | null } | null)?.name ?? null;
      }
      if (!unitNumber && unitId) {
        const { data: unitRow } = await ctx.supabase.from("units").select("unit_number").eq("id", unitId).maybeSingle();
        unitNumber = (unitRow as { unit_number?: string | null } | null)?.unit_number ?? null;
      }
      unitNumber = unitNumber ?? "N/A";
      propertyName = propertyName ?? "Property";

      if (!managerId) {
        throw errorResponse(
          "Payment configuration error: this unit does not have an assigned manager. Please contact the property manager.",
          500
        );
      }

      // Resolve the canonical payment destination for every selected invoice. A single
      // STK transaction may span many units, but only when all invoices converge on the
      // same configured collection account. This prevents money being sent to one route
      // while the allocation belongs to another route.
      const resolvedRoutes: Record<string, any>[] = [];
      for (const selectedInvoice of invoiceRows) {
        const { data: selectedRoute, error: selectedRouteError } = await ctx.supabase.rpc("get_effective_payment_collection_account", { p_invoice_id: selectedInvoice.id });
        if (selectedRouteError || !selectedRoute?.id) {
          throw errorResponse("No payment destination has been configured for one of the selected units. Please contact the property manager.", 500);
        }
        resolvedRoutes.push(selectedRoute as Record<string, any>);
      }
      const route = resolvedRoutes[0];
      const routeKey = (r: Record<string, any>) => [r.id, r.payment_method, r.paybill_number ?? "", r.till_number ?? ""].join("|");
      if (resolvedRoutes.some((r) => routeKey(r) !== routeKey(route))) {
        throw errorResponse("The selected bills use different payment destinations. Please pay them separately so each unit is credited to the correct account.", 409);
      }

      if (!route) {
        throw errorResponse("No payment destination has been configured for this unit/property. Please contact the property manager.", 500);
      }

      const routeMethod = String(route.payment_method || "");
      const resolvedPaymentType = routeMethod === "mpesa_till" ? "till" : routeMethod === "mpesa_paybill" ? "paybill" : null;
      if (!resolvedPaymentType) {
        throw errorResponse("This bill is configured for a non-M-Pesa payment method. Use the payment instructions shown in the portal.", 400);
      }
      if (paymentType && paymentType !== resolvedPaymentType) {
        throw errorResponse(`This bill is configured for M-Pesa ${resolvedPaymentType}.`, 409);
      }

      const paymentReceiverType: "manager" | "landlord" = route.landlord_user_id ? "landlord" : "manager";
      const landlordId: string | null = route.landlord_user_id ?? null;

      let mpesaSettings: Record<string, unknown> | null;
      if (paymentReceiverType === "landlord" && landlordId) {
        const { data } = await ctx.supabase.from("landlord_mpesa_settings").select("*").eq("landlord_user_id", landlordId).eq("property_id", propertyId).maybeSingle();
        const { data: globalData } = data ? { data } : await ctx.supabase.from("landlord_mpesa_settings").select("*").eq("landlord_user_id", landlordId).is("property_id", null).maybeSingle();
        mpesaSettings = (data ?? globalData) as Record<string, unknown> | null;
      } else {
        const { data } = await ctx.supabase.from("manager_mpesa_settings").select("*").eq("manager_user_id", managerId).eq("property_id", propertyId).maybeSingle();
        const { data: globalData } = data ? { data } : await ctx.supabase.from("manager_mpesa_settings").select("*").eq("manager_user_id", managerId).is("property_id", null).maybeSingle();
        mpesaSettings = (data ?? globalData) as Record<string, unknown> | null;
      }
      if (!mpesaSettings) throw errorResponse("M-Pesa API credentials are not configured for the configured payment destination.", 500);
      // Credentials come from the responsible manager/landlord account; the
      // shortcode/passkey always come from the canonical collection record.
      if (!mpesaSettings.consumer_key || !mpesaSettings.consumer_secret) {
        throw errorResponse("M-Pesa API credentials not configured", 500);
      }
      const shortcode = resolvedPaymentType === "paybill" ? route.paybill_number : route.till_number;
      const passkey = resolvedPaymentType === "paybill" ? (mpesaSettings.paybill_passkey ?? mpesaSettings.passkey) : (mpesaSettings.till_passkey ?? mpesaSettings.passkey);
      if (!shortcode || !passkey) throw errorResponse("The configured M-Pesa route is incomplete. Please contact the property manager.", 500);

      // Never send a malformed number to Safaricom (the old code prefixed 254 to anything).
      const formattedPhone = normalizeKenyanMsisdn(phoneNumber);
      if (!formattedPhone) {
        throw errorResponse("Enter a valid Kenyan M-Pesa number, for example 0712 345 678.", 400);
      }

      // Guard against double prompts: a second tap, a second device, or "Try again" after a
      // slow PIN entry would otherwise charge the same bill twice. A prompt stays valid for
      // up to ~3 minutes, so refuse a new one while an earlier one is still open.
      const openSince = new Date(Date.now() - 3 * 60 * 1000).toISOString();
      const { data: openPrompts, error: openPromptsError } = await ctx.supabase
        .from("payment_transactions")
        .select("id")
        .in("invoice_id", targetIds)
        .eq("status", "pending")
        .gte("initiated_at", openSince)
        .limit(1);
      if (openPromptsError) {
        throw errorResponse("Could not check for an open payment request. Please try again.", 500);
      }
      if (openPrompts?.length) {
        throw errorResponse(
          "A payment request for these bills is already waiting. Check your phone, or wait up to 3 minutes before trying again.",
          409
        );
      }

      // Get M-Pesa OAuth token
      const apiBaseUrl = mpesaSettings.is_live
        ? "https://api.safaricom.co.ke"
        : "https://sandbox.safaricom.co.ke";

      const credentials = btoa(
        `${mpesaSettings.consumer_key}:${mpesaSettings.consumer_secret}`
      );
      const tokenResponse = await fetch(
        `${apiBaseUrl}/oauth/v1/generate?grant_type=client_credentials`,
        {
          method: "GET",
          headers: { Authorization: `Basic ${credentials}` },
        }
      );

      if (!tokenResponse.ok) {
        throw errorResponse("Failed to get M-Pesa access token", 502);
      }

      const { access_token: accessToken } = await tokenResponse.json();

      // Create the pending transaction BEFORE contacting Safaricom. Money must never be
      // requested unless our system already has a durable reconciliation record.
      const timestamp = new Date().toISOString().replace(/[-:T.Z]/g, "").slice(0, 14);
      const password = btoa(`${shortcode}${passkey}${timestamp}`);
      const callbackSecret = crypto.randomUUID();

      const accountReference = String(route.account_reference || unitNumber || route.account_label || 'RENT').slice(0, 12);

      // Snapshot WHERE this money is going (public numbers only) so a receipt can state the
      // destination account even after the collection configuration changes.
      const destinationLabel = (resolvedPaymentType === "paybill"
        ? `M-Pesa Paybill ${shortcode}${accountReference ? ` · Acc ${accountReference}` : ""}`
        : `M-Pesa Till ${shortcode}`).slice(0, 120);

      const { data: pendingTransaction, error: pendingTransactionError } = await ctx.supabase
        .from("payment_transactions")
        .insert({
          invoice_id: primaryInvoiceId, tenant_id: invoice.tenant_id ?? null, manager_id: managerId,
          landlord_id: landlordId, payment_receiver_type: paymentReceiverType, unit_id: unitId,
          property_id: propertyId, unit_number: unitNumber, amount: chargeAmount,
          phone_number: formattedPhone, payment_type: resolvedPaymentType, status: "pending",
          initiated_at: new Date().toISOString(), callback_secret: callbackSecret,
          notes: allocationNote, payer_party_id: payerParty?.id ?? null,
          collection_account_id: route.id ?? null, destination_label: destinationLabel,
        })
        .select("id")
        .single();

      if (pendingTransactionError || !pendingTransaction?.id) {
        throw errorResponse("Could not create the payment reconciliation record. Please try again.", 500);
      }

      const stkPushPayload = {
        BusinessShortCode: shortcode,
        Password: password,
        Timestamp: timestamp,
        TransactionType:
          resolvedPaymentType === "paybill" ? "CustomerPayBillOnline" : "CustomerBuyGoodsOnline",
        Amount: chargeAmount,
        PartyA: formattedPhone,
        PartyB: shortcode,
        PhoneNumber: formattedPhone,
        CallBackURL: `${SUPABASE_URL}/functions/v1/mpesa-callback?secret=${callbackSecret}`,
        AccountReference: accountReference,
        TransactionDesc:
          targetIds.length > 1
            ? `Bills x${targetIds.length} - ${unitNumber}`
            : `Rent - ${unitNumber} - ${invoice.invoice_number ?? primaryInvoiceId.slice(0, 8)}`,
      };

      let stkResult: Record<string, any>;
      try {
        const stkResponse = await fetch(
          `${apiBaseUrl}/mpesa/stkpush/v1/processrequest`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(stkPushPayload),
          }
        );
        stkResult = await stkResponse.json();
      } catch (stkError) {
        // Network/parse failure: close the pending record so it cannot block a retry.
        await ctx.supabase.rpc("mark_payment_transaction_failed_atomic", {
          p_transaction_id: pendingTransaction.id,
          p_failure_reason: "Could not reach M-Pesa",
        });
        console.error("[initiate-mpesa-stk-push] STK request failed", stkError instanceof Error ? stkError.message : "unknown");
        throw errorResponse("Could not reach M-Pesa. No money was taken. Please try again.", 502);
      }

      if (stkResult.ResponseCode === "0") {
        const { CheckoutRequestID, MerchantRequestID } = stkResult;
        const { error: transactionUpdateError } = await ctx.supabase
          .from("payment_transactions")
          .update({ checkout_request_id: CheckoutRequestID, merchant_request_id: MerchantRequestID, updated_at: new Date().toISOString() })
          .eq("id", pendingTransaction.id);
        if (transactionUpdateError) {
          console.error("[initiate-mpesa-stk-push] failed to attach Safaricom IDs", { transactionId: pendingTransaction.id, error: transactionUpdateError.message });
        }
        return {
          success: true, message: "M-Pesa payment prompt sent to your phone",
          checkoutRequestId: CheckoutRequestID, merchantRequestId: MerchantRequestID,
          transactionId: pendingTransaction.id, invoiceId: primaryInvoiceId,
          invoiceIds: targetIds.length > 1 ? targetIds : undefined, unitNumber, accountReference,
        };
      } else {
        await ctx.supabase.rpc("mark_payment_transaction_failed_atomic", {
          p_transaction_id: pendingTransaction.id,
          p_failure_reason: stkResult.errorMessage || stkResult.ResponseDescription || "STK Push failed",
        });
        throw errorResponse(stkResult.errorMessage || stkResult.ResponseDescription || "STK Push failed", 400);
      }
    }
  )
);
