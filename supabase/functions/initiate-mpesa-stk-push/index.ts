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
import {
  withMiddleware,
  errorResponse,
  successResponse,
  AuthorizationError,
  isSensitive,
} from "../_shared/middleware.ts";

// Module-level env reads — fail fast at cold start, not mid-request.
const SUPABASE_URL = requireEnv("SUPABASE_URL");

interface STKPushRequest {
  invoiceId?: string;
  invoiceIds?: string[];
  amount: number;
  phoneNumber: string;
  paymentType: "paybill" | "till";
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
        !phoneNumber ||
        !paymentType
      ) {
        throw errorResponse(
          "Missing or invalid required fields: invoiceId or invoiceIds, positive amount, phoneNumber, paymentType",
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
        .in("status", ["pending", "overdue"]);

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
      const managerId = lease?.properties?.manager_id ?? null;
      const unitNumber = lease?.units?.unit_number ?? "N/A";
      const propertyName = lease?.properties?.name ?? "Property";

      if (!managerId) {
        throw errorResponse(
          "Payment configuration error: this unit does not have an assigned manager. Please contact the property manager.",
          500
        );
      }

      // Resolve payment destination
      let paymentReceiverType: "manager" | "landlord" = "manager";
      let landlordId: string | null = null;

      if (propertyId) {
        const { data: pl } = await ctx.supabase
          .from("property_landlords")
          .select("landlord_user_id, payment_destination")
          .eq("property_id", propertyId)
          .maybeSingle();

        if (pl?.payment_destination === "landlord" && pl?.landlord_user_id) {
          paymentReceiverType = "landlord";
          landlordId = pl.landlord_user_id;
        }
      }

      // Load M-Pesa settings
      let mpesaSettings: Record<string, unknown>;

      if (paymentReceiverType === "landlord" && landlordId) {
        const { data: propSettings } = await ctx.supabase
          .from("landlord_mpesa_settings")
          .select("*")
          .eq("landlord_user_id", landlordId)
          .eq("property_id", propertyId)
          .maybeSingle();

        const { data: globalSettings } = propSettings
          ? { data: propSettings }
          : await ctx.supabase
              .from("landlord_mpesa_settings")
              .select("*")
              .eq("landlord_user_id", landlordId)
              .is("property_id", null)
              .maybeSingle();

        const settings = propSettings ?? globalSettings;
        if (!settings) {
          throw errorResponse(
            "The landlord hasn't configured M-Pesa payments yet. Please contact your property manager.",
            500
          );
        }
        mpesaSettings = settings as Record<string, unknown>;
      } else {
        const { data: propSettings } = await ctx.supabase
          .from("manager_mpesa_settings")
          .select("*")
          .eq("manager_user_id", managerId)
          .eq("property_id", propertyId)
          .maybeSingle();

        const { data: globalSettings } = propSettings
          ? { data: propSettings }
          : await ctx.supabase
              .from("manager_mpesa_settings")
              .select("*")
              .eq("manager_user_id", managerId)
              .is("property_id", null)
              .maybeSingle();

        const settings = propSettings ?? globalSettings;
        if (!settings) {
          throw errorResponse(
            "The property manager hasn't configured M-Pesa payments yet. Please contact your property manager.",
            500
          );
        }
        mpesaSettings = settings as Record<string, unknown>;
      }

      // Validate payment type is enabled
      if (paymentType === "paybill" && !mpesaSettings.paybill_enabled) {
        throw errorResponse("Paybill is not enabled for this property manager", 400);
      }
      if (paymentType === "till" && !mpesaSettings.till_enabled) {
        throw errorResponse("Till/Buy Goods is not enabled for this property manager", 400);
      }
      if (!mpesaSettings.consumer_key || !mpesaSettings.consumer_secret) {
        throw errorResponse("M-Pesa API credentials not configured", 500);
      }

      const shortcode =
        paymentType === "paybill"
          ? mpesaSettings.paybill_shortcode
          : mpesaSettings.till_shortcode;
      const passkey =
        paymentType === "paybill"
          ? mpesaSettings.paybill_passkey
          : mpesaSettings.till_passkey;

      if (!shortcode || !passkey) {
        throw errorResponse(
          `${paymentType === "paybill" ? "Paybill" : "Till"} shortcode or passkey not configured`,
          500
        );
      }

      // Use unit_number as AccountReference for reconciliation
      const useUnitRef = mpesaSettings.use_unit_as_account_ref !== false;
      const accountReference = useUnitRef
        ? unitNumber.slice(0, 12)
        : (mpesaSettings.paybill_account_reference as string)?.slice(0, 12) ??
          unitNumber.slice(0, 12);

      // Format phone number
      let formattedPhone = phoneNumber.replace(/\s+/g, "").replace(/^(\+?254|0)/, "254");
      if (!formattedPhone.startsWith("254")) {
        formattedPhone = "254" + formattedPhone;
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

      // Initiate STK Push
      const timestamp = new Date().toISOString().replace(/[-:T.Z]/g, "").slice(0, 14);
      const password = btoa(`${shortcode}${passkey}${timestamp}`);
      const callbackSecret = crypto.randomUUID();

      const stkPushPayload = {
        BusinessShortCode: shortcode,
        Password: password,
        Timestamp: timestamp,
        TransactionType:
          paymentType === "paybill" ? "CustomerPayBillOnline" : "CustomerBuyGoodsOnline",
        Amount: Math.round(amount),
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

      const stkResult = await stkResponse.json();

      if (stkResult.ResponseCode === "0") {
        const { CheckoutRequestID, MerchantRequestID } = stkResult;

        // Save transaction with full context
        const { data: transaction } = await ctx.supabase
          .from("payment_transactions")
          .insert({
            invoice_id: primaryInvoiceId,
            tenant_id: invoice.tenant_id ?? null,
            manager_id: managerId,
            landlord_id: landlordId,
            payment_receiver_type: paymentReceiverType,
            unit_id: unitId,
            property_id: propertyId,
            unit_number: unitNumber,
            amount,
            phone_number: formattedPhone,
            payment_type: paymentType,
            checkout_request_id: CheckoutRequestID,
            merchant_request_id: MerchantRequestID,
            status: "pending",
            initiated_at: new Date().toISOString(),
            callback_secret: callbackSecret,
            notes: allocationNote,
          })
          .select()
          .single();

        return {
          success: true,
          message: "M-Pesa payment prompt sent to your phone",
          checkoutRequestId: CheckoutRequestID,
          merchantRequestId: MerchantRequestID,
          transactionId: transaction?.id,
          invoiceId: primaryInvoiceId,
          invoiceIds: targetIds.length > 1 ? targetIds : undefined,
          unitNumber,
          accountReference,
        };
      } else {
        throw errorResponse(
          stkResult.errorMessage || stkResult.ResponseDescription || "STK Push failed",
          400
        );
      }
    }
  )
);
