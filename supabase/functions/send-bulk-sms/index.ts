import { serve } from "std/http/server.ts";
import { withMiddleware, errorResponse } from "../_shared/middleware.ts";
import { sendSms, type SmsRecipient } from "../_shared/sms.ts";
import { planIncludes } from "../_shared/planFeatures.ts";

interface BulkSMSRequest {
  recipients: SmsRecipient[];
  message: string;
  customMessages?: Record<string, string>;
}

interface SMSResult {
  phoneNumber: string;
  name?: string;
  success: boolean;
  provider?: string;
  error?: string;
  messageId?: string;
}

const MISSING_RECIPIENT_STATUSES_ERROR = "Provider did not return recipient delivery statuses.";
const MISSING_SINGLE_STATUS_ERROR = "Provider did not return a status for this recipient.";

serve(
  withMiddleware(
    {
      functionName: "send-bulk-sms",
      requireAuth: true,
      allowedRoles: ["manager", "agency", "submanager"],
      rateLimit: { maxPerHour: 2, failClosed: true },
    },
    async (req, ctx) => {
      if (!ctx.user) throw errorResponse("Unauthorized", 401);

      if (ctx.user.id !== "service-role") {
        const { data: subscription } = await ctx.supabase
          .from("manager_subscriptions")
          .select("plan, status")
          .eq("manager_id", ctx.user.id)
          .eq("status", "active")
          .maybeSingle();
        if (!planIncludes(subscription?.plan, "bulk_sms")) {
          throw errorResponse("Bulk SMS is not on your current plan", 403);
        }
      }

      const { recipients, message, customMessages }: BulkSMSRequest = await req.json();

      if (!recipients?.length) throw errorResponse("At least one recipient is required", 400);
      if (!message && !customMessages) throw errorResponse("Message is required", 400);
      if (recipients.length > 500) throw errorResponse("Bulk SMS is limited to 500 recipients per request", 400);

      const results: SMSResult[] = [];
      for (const recipient of recipients) {
        const body = customMessages?.[recipient.phoneNumber] ?? message;
        try {
          const result = await sendSms(recipient.phoneNumber, body);
          const hasBooleanStatus = typeof result.success === "boolean";
          results.push({
            phoneNumber: result.to,
            name: recipient.name,
            success: hasBooleanStatus ? result.success : false,
            provider: result.provider,
            messageId: result.messageId,
            error: hasBooleanStatus ? result.error : MISSING_SINGLE_STATUS_ERROR,
          });
        } catch (error) {
          results.push({
            phoneNumber: recipient.phoneNumber,
            name: recipient.name,
            success: false,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }

      const successCount = results.filter((result) => result.success).length;
      const hasProviderStatuses = results.some((result) => result.success || !!result.error);

      return {
        success: true,
        message: `Sent ${successCount} of ${recipients.length} messages`,
        warning: hasProviderStatuses ? undefined : MISSING_RECIPIENT_STATUSES_ERROR,
        summary: {
          total: recipients.length,
          success: successCount,
          failed: recipients.length - successCount,
        },
        results,
      };
    },
  ),
);
