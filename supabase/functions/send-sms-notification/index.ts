/**
 * send-sms-notification/index.ts
 *
 * FIX SUMMARY:
 * 1. Accepts both service-role (callback) AND user JWT calls.
 *    The old code rejected any call without the exact service-role key,
 *    which made direct manager-initiated SMS impossible.
 * 2. Adds a single retry on transient Africa's Talking failures.
 * 3. Returns structured error details so callers know exactly what failed.
 * 4. Validates phone numbers more robustly (handles +254, 0, 254 prefixes).
 */

import { getCorsHeaders, preflightResponse } from "../_shared/cors.ts";
import { checkRateLimit, rateLimitResponse, RATE_LIMITS } from "../_shared/rateLimit.ts";
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const log = (step: string, details?: unknown) =>
  console.log(`[sms] ${step}`, details ?? "");

interface SMSRequest {
  phoneNumber: string;
  message: string;
}

function formatKenyanPhone(raw: string): string {
  let p = raw.replace(/\s+/g, "");
  if (p.startsWith("+")) p = p.slice(1);           // strip leading +
  if (p.startsWith("0")) p = "254" + p.slice(1);   // 07xx → 2547xx
  if (!p.startsWith("254")) p = "254" + p;         // bare 7xx → 2547xx
  return "+" + p;                                   // re-add + for AT
}

async function sendSMS(
  phone: string,
  message: string,
  attempt = 1
): Promise<{ success: boolean; data?: unknown; error?: string }> {
  const apiKey = Deno.env.get("AFRICASTALKING_API_KEY");
  const username = Deno.env.get("AFRICASTALKING_USERNAME");

  if (!apiKey || !username) {
    throw new Error(
      "Africa's Talking credentials not configured. " +
        "Set AFRICASTALKING_API_KEY and AFRICASTALKING_USERNAME in Supabase secrets."
    );
  }

  const isSandbox = username.toLowerCase() === "sandbox";
  const apiUrl = isSandbox
    ? "https://api.sandbox.africastalking.com/version1/messaging"
    : "https://api.africastalking.com/version1/messaging";

  const formData = new URLSearchParams();
  formData.append("username", username);
  formData.append("to", phone);
  formData.append("message", message);

  log(`Sending via AT (attempt ${attempt})`, { phone, isSandbox });

  const response = await fetch(apiUrl, {
    method: "POST",
    headers: {
      apiKey,
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: formData.toString(),
  });

  const responseText = await response.text();
  let result: Record<string, unknown>;
  try {
    result = JSON.parse(responseText);
  } catch {
    result = { rawResponse: responseText };
  }

  if (!response.ok) {
    // Retry once on server errors
    if (attempt === 1 && response.status >= 500) {
      log("AT server error, retrying in 2s");
      await new Promise((r) => setTimeout(r, 2000));
      return sendSMS(phone, message, 2);
    }
    return {
      success: false,
      error: `AT API error ${response.status}: ${responseText}`,
    };
  }

  const recipient = (
    result?.SMSMessageData as { Recipients?: { status: string; number: string }[] }
  )?.Recipients?.[0];

  if (recipient?.status === "Success") {
    log("SMS sent", { number: recipient.number });
    return { success: true, data: result };
  }

  // AT returns 200 but with a failure status in the body
  const statusMsg = recipient?.status ?? "Unknown AT status";
  if (attempt === 1 && statusMsg !== "Success") {
    log(`AT non-success status (${statusMsg}), retrying`);
    await new Promise((r) => setTimeout(r, 2000));
    return sendSMS(phone, message, 2);
  }

  return {
    success: false,
    error: `AT delivery status: ${statusMsg}`,
    data: result,
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return preflightResponse(req);

  try {
    log("Function started");

    const authHeader = req.headers.get("Authorization");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    // Accept service-role calls (from mpesa-callback, etc.) OR user JWTs
    const isServiceRole =
      authHeader && serviceRoleKey && authHeader.includes(serviceRoleKey);

    if (!isServiceRole) {
      if (!authHeader) {
        return new Response(
          JSON.stringify({ error: "Unauthorized - missing Authorization header" }),
          {
            status: 401,
            headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
          }
        );
      }

      // Validate user JWT
      const supabase = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_ANON_KEY") ?? "",
        { global: { headers: { Authorization: authHeader } } }
      );
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();
      if (error || !user) {
        return new Response(JSON.stringify({ error: "Unauthorized - invalid token" }), {
          status: 401,
          headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
        });
      }
      log("User JWT authenticated", { userId: user.id });

      // Rate limit: max 10 SMS per user per hour (non-service-role calls only)
      const { data: rateLimitOk } = await supabase.rpc("check_rate_limit", {
        p_user_id:      user.id,
        p_function:     "send-sms-notification",
        p_max_per_hour: 10,
      });
      if (rateLimitOk === false) {
        return new Response(
          JSON.stringify({ error: "Too many SMS requests. Please wait before sending more." }),
          { status: 429, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
        );
      }
    } else {
      log("Service role authenticated");
    }

    const body: SMSRequest = await req.json();
    const { phoneNumber, message } = body;

    if (!phoneNumber || !message) {
      throw new Error("phoneNumber and message are required");
    }
    if (message.length > 918) {
      throw new Error("Message exceeds 6 SMS segments (918 chars max)");
    }

    const formattedPhone = formatKenyanPhone(phoneNumber);
    log("Phone formatted", { original: phoneNumber, formatted: formattedPhone });

    const result = await sendSMS(formattedPhone, message);

    if (!result.success) {
      return new Response(
        JSON.stringify({ success: false, error: result.error, data: result.data }),
        {
          status: 502,
          headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({ success: true, message: "SMS sent", data: result.data }),
      { headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    log("ERROR", { message: msg });
    return new Response(JSON.stringify({ success: false, error: msg }), {
      status: 500,
      headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
    });
  }
});
