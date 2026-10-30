/**
 * send-sms-notification/index.ts
 *
 * Central SMS sender for receipts, tenant invitations, registration, and
 * manager-triggered messages. Supports Twilio first, with Africa's Talking
 * retained as a configurable fallback.
 *
 * Uses unified middleware for authentication and rate limiting.
 */

import { serve } from "std/http/server.ts";
import { withMiddleware, errorResponse } from "../_shared/middleware.ts";
import { sendSms, tryFormatPhoneNumber } from "../_shared/sms.ts";
import { callerOwnsTenantContact } from "../_shared/notifyAuthz.ts";

interface SMSRequest {
  phoneNumber: string;
  message: string;
  category?: string;
}

// Only trusted function-to-function (service-role) callers may choose a category.
const SERVICE_CATEGORIES = new Set(["transactional", "reminder", "security"]);

serve(
  withMiddleware(
    {
      functionName: "send-sms-notification",
      requireAuth: true,
      allowedRoles: ["manager", "agency", "submanager"],
      rateLimit: { maxPerHour: 10, failClosed: true },
    },
    async (req, ctx) => {
      const { phoneNumber, message, category: requestedCategory }: SMSRequest = await req.json();

      if (!phoneNumber || !message) {
        throw errorResponse("phoneNumber and message are required", 400);
      }

      if (typeof phoneNumber !== "string" || typeof message !== "string" || message.length > 918) {
        throw errorResponse("Invalid phoneNumber or message", 400);
      }
      if (!tryFormatPhoneNumber(phoneNumber)) {
        throw errorResponse("Invalid phone number", 400);
      }

      // Recipient must be one of the caller's own tenants. Function-to-function
      // callers using the service role are trusted.
      if (ctx.user && ctx.user.id !== "service-role") {
        const allowed = await callerOwnsTenantContact(ctx.supabase, ctx.user.id, { phone: phoneNumber });
        if (!allowed) {
          throw errorResponse("Forbidden: recipient is not one of your tenants", 403);
        }
      }

      const isService = !ctx.user || ctx.user.id === "service-role";
      const category = isService && requestedCategory && SERVICE_CATEGORIES.has(requestedCategory)
        ? (requestedCategory as "transactional" | "reminder" | "security")
        : "transactional";
      const result = await sendSms(phoneNumber, message, { category });

      if (!result.success) {
        // blocked:<reason> means policy (opt-out / quiet hours / lookup failure), not a provider outage.
        const blocked = typeof result.error === "string" && result.error.startsWith("blocked:");
        throw errorResponse(result.error || "SMS sending failed", blocked ? 409 : 502);
      }

      return {
        ...result,
        message: "SMS sent",
      };
    }
  )
);
