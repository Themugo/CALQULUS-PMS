/**
 * initiate-paystack-payment
 *
 * Charges Kenya M-Pesa through Paystack mobile_money.
 * For Safaricom Daraja STK use initiate-mpesa-stk-push.
 */
import { serve } from "std/http/server.ts";
import { getCorsHeaders, preflightResponse } from "../_shared/cors.ts";
import { checkRateLimit, rateLimitResponse, RATE_LIMITS } from "../_shared/rateLimit.ts";
import { createClient } from "supabase/supabase-js@2";
import { getEnv } from "../_shared/env.ts";
import { chargePaystackMpesa } from "../_shared/paystackMobileMoney.ts";

const logStep = (step: string, details?: unknown) => {
  console.log(`[initiate-paystack-payment] ${step}`, details ?? "");
};

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
    const supabaseClient = createClient(getEnv("SUPABASE_URL"), getEnv("SUPABASE_ANON_KEY"));
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");

    if (!await checkRateLimit(supabaseClient, user.id, "initiate-paystack-payment", RATE_LIMITS["initiate-paystack-payment"] ?? RATE_LIMITS["initiate-mpesa-payment"])) {
      return rateLimitResponse(req);
    }

    const body: PaymentRequest = await req.json();
    const { invoiceId, invoiceNumber, amount, phoneNumber, email, description } = body;

    const { ok, payload } = await chargePaystackMpesa({
      email: email || user.email,
      amountKes: amount,
      phoneNumber,
      metadata: {
        invoice_id: invoiceId,
        invoice_number: invoiceNumber,
        custom_fields: [
          { display_name: "Invoice Number", variable_name: "invoice_number", value: invoiceNumber },
          { display_name: "Description", variable_name: "description", value: description || "Rent Payment" },
        ],
      },
    });

    logStep("Paystack response", payload);
    if (!ok) throw new Error((payload.message as string) || "Failed to initiate Paystack M-Pesa charge");

    const status = (payload.data as { status?: string; reference?: string; display_text?: string } | undefined);
    return new Response(JSON.stringify({
      success: true,
      message: status?.status === "success"
        ? "Payment completed successfully!"
        : "Paystack sent an M-Pesa prompt. Enter your PIN on the phone.",
      reference: status?.reference,
      status: status?.status,
      display_text: status?.display_text,
    }), {
      headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ success: false, error: errorMessage }), {
      headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
      status: 500,
    });
  }
});
