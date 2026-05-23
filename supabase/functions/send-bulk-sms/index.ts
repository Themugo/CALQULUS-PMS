import { getCorsHeaders, preflightResponse } from "../_shared/cors.ts";
import { checkRateLimit, rateLimitResponse, RATE_LIMITS } from "../_shared/rateLimit.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
};

interface SMSRecipient {
  phoneNumber: string;
  name?: string;
}

interface BulkSMSRequest {
  recipients: SMSRecipient[];
  message: string;
  customMessages?: { [phoneNumber: string]: string };
}

interface SMSResult {
  phoneNumber: string;
  name?: string;
  success: boolean;
  error?: string;
  messageId?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return preflightResponse(req);

  try {
    logStep("Function started");

    // Auth + rate limit
    const authHeader = req.headers.get("Authorization");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const isServiceCall = authHeader && serviceKey && authHeader.includes(serviceKey);
    if (!isServiceCall) {
      if (!authHeader) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
        });
      }
      const supabase = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_ANON_KEY") ?? "",
        { global: { headers: { Authorization: authHeader } } }
      );
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error || !user) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
        });
      }
      if (!await checkRateLimit(supabase, user.id, "send-bulk-sms", RATE_LIMITS["send-bulk-sms"])) {
        return rateLimitResponse(req);
      }
    }

    const apiKey = Deno.env.get("AFRICASTALKING_API_KEY");
    const username = Deno.env.get("AFRICASTALKING_USERNAME");

    if (!apiKey || !username) {
      throw new Error("Africa's Talking credentials are not configured");
    }
    logStep("Credentials verified");

    const body: BulkSMSRequest = await req.json();
    const { recipients, message, customMessages } = body;

    if (!recipients || recipients.length === 0) {
      throw new Error("At least one recipient is required");
    }

    if (!message && !customMessages) {
      throw new Error("Message is required");
    }

    logStep("Bulk SMS request received", { recipientCount: recipients.length });

    // Determine API URL based on username (sandbox vs live)
    const isSandbox = username.toLowerCase() === "sandbox";
    const apiUrl = isSandbox 
      ? "https://api.sandbox.africastalking.com/version1/messaging"
      : "https://api.africastalking.com/version1/messaging";

    logStep("Using API", { url: apiUrl, isSandbox });

    const results: SMSResult[] = [];
    let successCount = 0;
    let failCount = 0;

    // Process recipients in batches (Africa's Talking recommends max 100 per request)
    const batchSize = 100;
    
    for (let i = 0; i < recipients.length; i += batchSize) {
      const batch = recipients.slice(i, i + batchSize);
      
      // If using custom messages, send individually
      if (customMessages) {
        for (const recipient of batch) {
          const customMessage = customMessages[recipient.phoneNumber] || message;
          const result = await sendSingleSMS(
            recipient,
            customMessage,
            apiKey,
            username,
            apiUrl
          );
          results.push(result);
          if (result.success) successCount++;
          else failCount++;
        }
      } else {
        // Send batch SMS with same message
        const phoneNumbers = batch.map(r => formatPhoneNumber(r.phoneNumber));
        
        const formData = new URLSearchParams();
        formData.append("username", username);
        formData.append("to", phoneNumbers.join(","));
        formData.append("message", message);

        try {
          const response = await fetch(apiUrl, {
            method: "POST",
            headers: {
              "apiKey": apiKey,
              "Content-Type": "application/x-www-form-urlencoded",
              "Accept": "application/json",
            },
            body: formData.toString(),
          });

          const responseText = await response.text();
          logStep("Batch API response", { status: response.status, batchIndex: i / batchSize });

          let result;
          try {
            result = JSON.parse(responseText);
          } catch {
            result = { rawResponse: responseText };
          }

          // Process batch results
          const smsResponse = result.SMSMessageData;
          if (smsResponse?.Recipients) {
            for (const smsRecipient of smsResponse.Recipients) {
              const originalRecipient = batch.find(
                r => formatPhoneNumber(r.phoneNumber) === smsRecipient.number
              );
              
              const success = smsRecipient.status === "Success";
              results.push({
                phoneNumber: smsRecipient.number,
                name: originalRecipient?.name,
                success,
                messageId: smsRecipient.messageId,
                error: success ? undefined : smsRecipient.status,
              });
              
              if (success) successCount++;
              else failCount++;
            }
          }
        } catch (error) {
          // Mark all in batch as failed
          for (const recipient of batch) {
            results.push({
              phoneNumber: recipient.phoneNumber,
              name: recipient.name,
              success: false,
              error: error instanceof Error ? error.message : "Unknown error",
            });
            failCount++;
          }
        }
      }
    }

    logStep("Bulk SMS completed", { successCount, failCount, total: recipients.length });

    return new Response(
      JSON.stringify({
        success: true,
        message: `Sent ${successCount} of ${recipients.length} messages`,
        summary: {
          total: recipients.length,
          success: successCount,
          failed: failCount,
        },
        results,
      }),
      {
        headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
        status: 200,
      }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMessage 
      }),
      {
        headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});

function formatPhoneNumber(phoneNumber: string): string {
  let formatted = phoneNumber.replace(/\s+/g, '').replace(/^0/, '+254');
  if (!formatted.startsWith('+')) {
    formatted = '+' + formatted;
  }
  if (!formatted.startsWith('+254')) {
    formatted = '+254' + formatted.replace(/^\+/, '');
  }
  return formatted;
}

async function sendSingleSMS(
  recipient: SMSRecipient,
  message: string,
  apiKey: string,
  username: string,
  apiUrl: string
): Promise<SMSResult> {
  try {
    const formattedPhone = formatPhoneNumber(recipient.phoneNumber);
    
    const formData = new URLSearchParams();
    formData.append("username", username);
    formData.append("to", formattedPhone);
    formData.append("message", message);

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "apiKey": apiKey,
        "Content-Type": "application/x-www-form-urlencoded",
        "Accept": "application/json",
      },
      body: formData.toString(),
    });

    const responseText = await response.text();
    let result;
    try {
      result = JSON.parse(responseText);
    } catch {
      result = { rawResponse: responseText };
    }

    const smsResponse = result.SMSMessageData;
    if (smsResponse?.Recipients?.[0]?.status === "Success") {
      return {
        phoneNumber: formattedPhone,
        name: recipient.name,
        success: true,
        messageId: smsResponse.Recipients[0].messageId,
      };
    }

    return {
      phoneNumber: formattedPhone,
      name: recipient.name,
      success: false,
      error: smsResponse?.Recipients?.[0]?.status || "Failed to send",
    };
  } catch (error) {
    return {
      phoneNumber: recipient.phoneNumber,
      name: recipient.name,
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
