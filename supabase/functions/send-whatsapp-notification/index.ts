import { requireEnv, getEnv } from "../_shared/env.ts";
/**
 * send-whatsapp-notification/index.ts
 *
 * FIX SUMMARY:
 * 1. Replaces the old "user-supplied webhookUrl" design (which was
 *    effectively a no-op for most users) with real provider SDKs:
 *    - PRIMARY: Twilio WhatsApp Business API
 *    - FALLBACK: Meta (Facebook) WhatsApp Cloud API
 *    - LAST RESORT: Africa's Talking SMS (already working)
 * 2. Accepts unit-aware payload from mpesa-callback:
 *    { phoneNumber, tenantName, unitNumber, propertyName,
 *      invoiceNumber, amount, mpesaReceiptNumber, type }
 * 3. Auth: accepts both service-role key (internal calls from callback)
 *    and user JWT (direct manager sends).
 * 4. Message templates are pre-approved WhatsApp template style
 *    (plain text fallback when no template ID configured).
 *
 * Required env vars (set in Supabase dashboard → Edge Functions → Secrets):
 *   TWILIO_ACCOUNT_SID          – e.g. ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
 *   TWILIO_AUTH_TOKEN           – Twilio auth token
 *   TWILIO_WHATSAPP_FROM        – e.g. whatsapp:+14155238886
 *   META_WHATSAPP_TOKEN         – Meta permanent access token
 *   META_PHONE_NUMBER_ID        – Meta phone number ID
 *   AFRICASTALKING_API_KEY      – fallback SMS
 *   AFRICASTALKING_USERNAME     – fallback SMS
 */

import { getCorsHeaders, preflightResponse } from "../_shared/cors.ts";
import { checkRateLimit, rateLimitResponse, RATE_LIMITS } from "../_shared/rateLimit.ts";
import { serve } from "std/http/server.ts";
import { createClient } from "supabase/supabase-js@2";
import { checkRoleAccess } from "../_shared/authorization.ts";
import { isServiceRoleRequest } from "../_shared/assertCaller.ts";
import { callerOwnsTenantContact } from "../_shared/notifyAuthz.ts";
import { tryFormatPhoneNumber } from "../_shared/phone.ts";
import { checkSendAllowed } from "../_shared/commsGate.ts";
import { sendSms } from "../_shared/sms.ts";

const log = (step: string, details?: Record<string, unknown>) => console.log(`[whatsapp] ${step}`, details ?? "");

interface WhatsAppRequest {
  phoneNumber: string;
  tenantName?: string;
  unitNumber?: string;
  propertyName?: string;
  invoiceNumber?: string;
  amount?: string | number;
  mpesaReceiptNumber?: string;
  dueDate?: string;
  type: "invoice" | "receipt" | "reminder" | "general";
  message?: string; // override message text
}

// ── Message templates ─────────────────────────────────────────────────────────

function buildReceiptMessage(req: WhatsAppRequest): string {
  return (
    `✅ *Payment Confirmed*\n\n` +
    `Hi ${req.tenantName ?? "Tenant"},\n\n` +
    `Your payment has been received!\n\n` +
    `📍 Unit: *${req.unitNumber ?? "N/A"}*\n` +
    `🏠 Property: ${req.propertyName ?? "N/A"}\n` +
    `📄 Invoice: ${req.invoiceNumber ?? "N/A"}\n` +
    `💰 Amount: *${req.amount ?? "N/A"}*\n` +
    `📱 M-Pesa Ref: *${req.mpesaReceiptNumber ?? "N/A"}*\n\n` +
    `Thank you for your payment. 🙏`
  );
}

function buildInvoiceMessage(req: WhatsAppRequest): string {
  return (
    `📋 *Invoice Due*\n\n` +
    `Hi ${req.tenantName ?? "Tenant"},\n\n` +
    `A new invoice has been generated for you:\n\n` +
    `📍 Unit: *${req.unitNumber ?? "N/A"}*\n` +
    `🏠 Property: ${req.propertyName ?? "N/A"}\n` +
    `📄 Invoice: ${req.invoiceNumber ?? "N/A"}\n` +
    `💰 Amount Due: *${req.amount ?? "N/A"}*\n` +
    `📅 Due Date: ${req.dueDate ?? "N/A"}\n\n` +
    `Please make payment via M-Pesa before the due date.`
  );
}

function buildReminderMessage(req: WhatsAppRequest): string {
  return (
    `⚠️ *Payment Reminder*\n\n` +
    `Hi ${req.tenantName ?? "Tenant"},\n\n` +
    `This is a gentle reminder that your rent is due:\n\n` +
    `📍 Unit: *${req.unitNumber ?? "N/A"}*\n` +
    `💰 Amount: *${req.amount ?? "N/A"}*\n` +
    `📅 Due Date: ${req.dueDate ?? "N/A"}\n\n` +
    `Please pay via M-Pesa at your earliest convenience.`
  );
}

function buildMessage(req: WhatsAppRequest): string {
  if (req.message) return req.message;
  switch (req.type) {
    case "receipt":  return buildReceiptMessage(req);
    case "invoice":  return buildInvoiceMessage(req);
    case "reminder": return buildReminderMessage(req);
    case "general":  return `Hi ${req.tenantName ?? "Tenant"},\n\n${req.message ?? ""}`.trim();
    default:         return req.message ?? "";
  }
}

// ── Provider: Twilio WhatsApp ─────────────────────────────────────────────────

async function sendViaTwilio(
  to: string,
  body: string
): Promise<{ success: boolean; error?: string }> {
  const accountSid = getEnv("TWILIO_ACCOUNT_SID");
  const authToken = getEnv("TWILIO_AUTH_TOKEN");
  const from = getEnv("TWILIO_WHATSAPP_FROM"); // e.g. "whatsapp:+14155238886"

  if (!accountSid || !authToken || !from) {
    return { success: false, error: "Twilio credentials not configured" };
  }

  // Normalise to whatsapp:+254... format
  const toFormatted = to.startsWith("whatsapp:") ? to : `whatsapp:${to}`;

  const formData = new URLSearchParams();
  formData.append("From", from);
  formData.append("To", toFormatted);
  formData.append("Body", body);

  const response = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${btoa(`${accountSid}:${authToken}`)}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formData.toString(),
    }
  );

  const result = await response.json();
  if (!response.ok || result.error_code) {
    return {
      success: false,
      error: result.message ?? `Twilio error ${response.status}`,
    };
  }

  log("Twilio WhatsApp sent", { sid: result.sid });
  return { success: true };
}

// ── Provider: Meta WhatsApp Cloud API ────────────────────────────────────────

async function sendViaMeta(
  to: string,
  body: string
): Promise<{ success: boolean; error?: string }> {
  const token = getEnv("META_WHATSAPP_TOKEN");
  const phoneNumberId = getEnv("META_PHONE_NUMBER_ID");

  if (!token || !phoneNumberId) {
    return { success: false, error: "Meta WhatsApp credentials not configured" };
  }

  // Strip leading + for Meta API
  const toFormatted = to.replace(/^\+/, "").replace(/^whatsapp:/, "");

  const response = await fetch(
    `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: toFormatted,
        type: "text",
        text: { body },
      }),
    }
  );

  const result = await response.json();
  if (!response.ok || result.error) {
    return {
      success: false,
      error: result.error?.message ?? `Meta error ${response.status}`,
    };
  }

  log("Meta WhatsApp sent", { messageId: result.messages?.[0]?.id });
  return { success: true };
}

// ── Provider: Africa's Talking SMS (fallback) ─────────────────────────────────

serve(async (req) => {
  if (req.method === "OPTIONS") return preflightResponse(req);


  try {
    log("Function started");

    // Accept both service-role (internal callback) and user JWT
    const authHeader = req.headers.get("Authorization");
    const serviceRoleKey = getEnv("SUPABASE_SERVICE_ROLE_KEY");
    // Exact, constant-time match (previously a substring `includes` check).
    const isServiceRole = Boolean(authHeader && serviceRoleKey && isServiceRoleRequest(req));
    let callerUserId: string | null = null;

    if (!isServiceRole) {
      // User JWT path – verify via Supabase auth
      if (!authHeader) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
        });
      }
      const supabase = createClient(
        getEnv("SUPABASE_URL"),
        getEnv("SUPABASE_ANON_KEY"),
        { global: { headers: { Authorization: authHeader } } }
      );
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();
      if (error || !user) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
        });
      }

      // Previously ANY authenticated user (any role, including tenant) could
      // send an arbitrary WhatsApp/SMS message to any phone number with
      // fully attacker-controlled content via the `message` override — a
      // spam/phishing vector. No entity ID is available to verify a precise
      // relationship (raw phoneNumber), so require the caller be a
      // manager/submanager/webhost — the roles that legitimately trigger
      // this from the UI — as the minimum viable fix.
      const access = await checkRoleAccess(user.id, ["manager", "submanager", "webhost"]);
      if (!access.allowed) {
        return new Response(JSON.stringify({ error: access.error ?? "Forbidden" }), {
          status: 403,
          headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
        });
      }

      callerUserId = user.id;

      // Rate limit: 10 WhatsApp messages per user per hour
      const allowed = await checkRateLimit(supabase, user.id, "send-whatsapp-notification", RATE_LIMITS["send-whatsapp-notification"]);
      if (!allowed) return rateLimitResponse(req);
    }

    const requestBody: WhatsAppRequest = await req.json();
    const { phoneNumber } = requestBody;

    if (!phoneNumber) {
      throw new Error("phoneNumber is required");
    }

    // Strict normalisation (rejects junk instead of guessing).
    const formattedPhone = typeof phoneNumber === "string" ? tryFormatPhoneNumber(phoneNumber) : null;
    if (!formattedPhone) {
      return new Response(JSON.stringify({ error: "Invalid phone number" }), {
        status: 400, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
      });
    }
    if (typeof requestBody.message === "string" && requestBody.message.length > 1000) {
      return new Response(JSON.stringify({ error: "Message too long" }), {
        status: 400, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(getEnv("SUPABASE_URL"), serviceRoleKey);

    // User-triggered sends may only target the caller's own tenants (free-form
    // recipients and message text were a spam/phishing vector).
    if (!isServiceRole && callerUserId) {
      const owns = await callerOwnsTenantContact(supabaseAdmin, callerUserId, { phone: formattedPhone });
      if (!owns) {
        return new Response(JSON.stringify({ error: "Forbidden: recipient is not one of your tenants" }), {
          status: 403, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
        });
      }
    }

    // Re-check opt-out / quiet hours immediately before sending (fails closed).
    const category = requestBody.type === "reminder" ? "reminder" : "transactional";
    const waPolicy = await checkSendAllowed(supabaseAdmin, { channel: "whatsapp", category, address: formattedPhone });
    if (!waPolicy.allow) {
      return new Response(JSON.stringify({ success: false, error: `blocked:${waPolicy.reason}` }), {
        status: 409, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
      });
    }

    const messageBody = buildMessage(requestBody);
    log("Sending WhatsApp", { type: requestBody.type });

    // Try providers in order: Twilio → Meta → SMS fallback
    const twilioResult = await sendViaTwilio(formattedPhone, messageBody);
    if (twilioResult.success) {
      return new Response(
        JSON.stringify({ success: true, provider: "twilio", message: "WhatsApp sent" }),
        { headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
      );
    }
    log("Twilio failed, trying Meta", { error: twilioResult.error });

    const metaResult = await sendViaMeta(formattedPhone, messageBody);
    if (metaResult.success) {
      return new Response(
        JSON.stringify({ success: true, provider: "meta", message: "WhatsApp sent" }),
        { headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
      );
    }
    log("Meta failed", { error: metaResult.error });

    // SMS fallback costs money and uses a different channel's consent, so it is
    // OFF unless the operator enables it. When enabled it still passes the SMS
    // opt-out / quiet-hours gate inside sendSms.
    if (getEnv("WHATSAPP_SMS_FALLBACK", "") !== "true") {
      return new Response(
        JSON.stringify({ success: false, error: "WhatsApp delivery failed", }),
        { status: 502, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
      );
    }
    const fb = await sendSms(formattedPhone, messageBody.slice(0, 900), { category });
    const smsResult = { success: fb.success, error: fb.error };
    if (smsResult.success) {
      return new Response(
        JSON.stringify({
          success: true,
          provider: "sms_fallback",
          message: "WhatsApp unavailable – SMS sent instead",
        }),
        { headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
      );
    }

    // All providers exhausted
    log("All providers failed", {
      twilio: twilioResult.error,
      meta: metaResult.error,
      sms: smsResult.error,
    });
    return new Response(
      JSON.stringify({
        success: false,
        error: "No notification provider configured. Add TWILIO_ or META_WHATSAPP_ secrets.",
        details: {
          twilio: twilioResult.error,
          meta: metaResult.error,
          sms: smsResult.error,
        },
      }),
      { status: 502, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    log("ERROR", { message: msg });
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
    });
  }
});
