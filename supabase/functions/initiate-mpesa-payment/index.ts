import { serve } from "std/http/server.ts";
import { getCorsHeaders, preflightResponse } from "../_shared/cors.ts";
import { checkRateLimit, rateLimitResponse, RATE_LIMITS } from "../_shared/rateLimit.ts";
import { createClient } from "supabase/supabase-js@2";
import { requireEnv, getEnv } from "../_shared/env.ts";
import { createLogger } from "../_shared/logger.ts";
import { validatePhone, validatePositiveNumber, validateRequired } from "../_shared/validation.ts";
import { errorResponse, successResponse } from "../_shared/errors.ts";
import { extractIpAddress, logPaymentEvent } from "../_shared/audit.ts";

const logger = createLogger("initiate-mpesa-payment");

interface PaymentRequest {
  invoiceId: string;
  invoiceNumber: string;
  amount: number;
  phoneNumber: string;
  email: string;
  description?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return preflightResponse(req);

  try {
    logger.info("Function started");

    const paystackKey = getEnv("PAYSTACK_SECRET_KEY");
    if (!paystackKey) {
      throw new Error("PAYSTACK_SECRET_KEY is not set");
    }
    logger.info("Paystack key verified");

    // Authenticate user
    const supabaseClient = createClient(
      getEnv("SUPABASE_URL"),
      getEnv("SUPABASE_ANON_KEY")
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header provided");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) {
      throw new Error(`Authentication error: ${userError.message}`);
    }
    const user = userData.user;
    if (!user?.email) {
      throw new Error("User not authenticated or email not available");
    }
    logger.info("User authenticated", { userId: user.id, email: user.email });

    // Rate limit: 5 payment initiations per user per hour
    if (!await checkRateLimit(supabaseClient, user.id, "initiate-mpesa-payment", RATE_LIMITS["initiate-mpesa-payment"])) {
      return rateLimitResponse(req);
    }

    const body: PaymentRequest = await req.json();
    const { invoiceId, invoiceNumber, amount, phoneNumber, email, description } = body;

    logger.info("Payment request received", { invoiceId, amount, phoneNumber });

    // Validate inputs using shared validation
    const invoiceIdValidation = validateRequired(invoiceId, "Invoice ID");
    if (!invoiceIdValidation.valid) {
      return errorResponse(invoiceIdValidation.error, 400);
    }

    const amountValidation = validatePositiveNumber(amount, "Amount");
    if (!amountValidation.valid) {
      return errorResponse(amountValidation.error, 400);
    }

    const phoneValidation = validatePhone(phoneNumber);
    if (!phoneValidation.valid) {
      return errorResponse(phoneValidation.error, 400);
    }

    const formattedPhone = phoneValidation.value;
    logger.info("Phone number formatted", { original: phoneNumber, formatted: formattedPhone });

    // Convert amount to smallest currency unit (cents/kobo for Paystack)
    const amountInCents = Math.round(amountValidation.value * 100);

    // Create Paystack charge for mobile money
    const paystackResponse = await fetch("https://api.paystack.co/charge", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${paystackKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: email || user.email,
        amount: amountInCents,
        currency: "KES",
        mobile_money: {
          phone: formattedPhone,
          provider: "mpesa",
        },
        metadata: {
          invoice_id: invoiceId,
          invoice_number: invoiceNumber,
          custom_fields: [
            {
              display_name: "Invoice Number",
              variable_name: "invoice_number",
              value: invoiceNumber,
            },
            {
              display_name: "Description",
              variable_name: "description",
              value: description || "Rent Payment",
            },
          ],
        },
      }),
    });

    const paystackData = await paystackResponse.json();
    logger.info("Paystack response", paystackData);

    if (!paystackResponse.ok || !paystackData.status) {
      const errorMsg = paystackData.message || "Failed to initiate M-Pesa payment";
      logger.error("Paystack error", { error: errorMsg, paystackData });
      await logPaymentEvent(user.id, "payment_failed", { invoiceId, error: errorMsg });
      throw new Error(errorMsg);
    }

    // Check if STK push was sent successfully
    if (paystackData.data?.status === "send_otp" || paystackData.data?.status === "pending") {
      logger.info("STK push initiated successfully", { reference: paystackData.data?.reference });
      await logPaymentEvent(user.id, "payment_initiated", { invoiceId, reference: paystackData.data?.reference, amount: amountValidation.value });
      
      return successResponse({
        message: "M-Pesa payment request sent. Please check your phone and enter your PIN.",
        reference: paystackData.data?.reference,
        status: paystackData.data?.status,
      });
    }

    // If payment is already successful
    if (paystackData.data?.status === "success") {
      logger.info("Payment completed immediately");
      await logPaymentEvent(user.id, "payment_completed", { invoiceId, reference: paystackData.data?.reference, amount: amountValidation.value });
      return successResponse({
        message: "Payment completed successfully!",
        reference: paystackData.data?.reference,
        status: "success",
      });
    }

    // Return the response for other statuses
    return successResponse({
      message: paystackData.data?.display_text || "Payment initiated",
      reference: paystackData.data?.reference,
      status: paystackData.data?.status,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error("Payment initiation failed", { error: errorMessage });
    
    return errorResponse(errorMessage, 500);
  }
});
