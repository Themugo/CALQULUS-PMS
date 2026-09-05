/**
 * @deprecated Alias of initiate-manager-paystack-payment.
 * This is Paystack mobile_money, not Safaricom Daraja.
 */
import { serve } from "std/http/server.ts";
import { getCorsHeaders, preflightResponse } from "../_shared/cors.ts";
import { createClient } from "supabase/supabase-js@2";
import { getEnv } from "../_shared/env.ts";
import { chargePaystackMpesa } from "../_shared/paystackMobileMoney.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") return preflightResponse(req);

  try {
    const supabaseClient = createClient(getEnv("SUPABASE_URL"), getEnv("SUPABASE_ANON_KEY"));
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(authHeader.replace("Bearer ", ""));
    if (userError || !userData.user?.email) throw new Error("User not authenticated or email not available");
    const user = userData.user;
    const { invoiceId, amount, phoneNumber, description } = await req.json();
    if (!invoiceId || typeof amount !== "number" || !isFinite(amount) || amount <= 0 || !phoneNumber) {
      throw new Error("Invoice ID, amount, and phone number are required");
    }
    const { ok, payload } = await chargePaystackMpesa({
      email: user.email,
      amountKes: amount,
      phoneNumber,
      metadata: {
        invoice_id: invoiceId,
        manager_user_id: user.id,
        description: description || "Manager Platform Fee",
      },
    });
    if (!ok) throw new Error((payload.message as string) || "Failed to initiate Paystack M-Pesa charge");
    const data = payload.data as { reference?: string; display_text?: string } | undefined;
    return new Response(JSON.stringify({
      success: true,
      message: "Paystack sent an M-Pesa STK prompt. Check your phone.",
      reference: data?.reference,
      display_text: data?.display_text,
    }), { headers: { ...getCorsHeaders(req), "Content-Type": "application/json" }, status: 200 });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
      status: 500,
    });
  }
});
