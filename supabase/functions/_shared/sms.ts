import { getEnv } from "./env.ts";
import { createClient } from "supabase/supabase-js@2";
import { checkSendAllowed } from "./commsGate.ts";
import type { Category } from "./commsPolicy.ts";

export interface SmsSendResult {
  success: boolean;
  provider: "twilio" | "africastalking";
  to: string;
  messageId?: string;
  data?: unknown;
  error?: string;
}

export interface SmsRecipient {
  phoneNumber: string;
  name?: string;
}

import { tryFormatPhoneNumber, formatPhoneNumber } from "./phone.ts";
export { tryFormatPhoneNumber, formatPhoneNumber };

function selectedProvider(): "twilio" | "africastalking" {
  const configured = getEnv("SMS_PROVIDER").toLowerCase();
  if (configured === "africastalking" || configured === "africas_talking") {
    return "africastalking";
  }
  if (configured === "twilio") return "twilio";

  const hasTwilio =
    getEnv("TWILIO_ACCOUNT_SID") &&
    getEnv("TWILIO_AUTH_TOKEN") &&
    (getEnv("TWILIO_FROM_NUMBER") ||
      getEnv("TWILIO_PHONE_NUMBER") ||
      getEnv("TWILIO_MESSAGING_SERVICE_SID"));

  return hasTwilio ? "twilio" : "africastalking";
}

async function sendViaTwilio(to: string, message: string): Promise<SmsSendResult> {
  const accountSid = getEnv("TWILIO_ACCOUNT_SID");
  const authToken = getEnv("TWILIO_AUTH_TOKEN");
  const from = getEnv("TWILIO_FROM_NUMBER", getEnv("TWILIO_PHONE_NUMBER"));
  const messagingServiceSid = getEnv("TWILIO_MESSAGING_SERVICE_SID");

  if (!accountSid || !authToken || (!from && !messagingServiceSid)) {
    throw new Error(
      "Twilio SMS credentials not configured. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_FROM_NUMBER or TWILIO_MESSAGING_SERVICE_SID.",
    );
  }

  const body = new URLSearchParams();
  body.append("To", to);
  body.append("Body", message);
  if (messagingServiceSid) body.append("MessagingServiceSid", messagingServiceSid);
  else body.append("From", from);

  const response = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${btoa(`${accountSid}:${authToken}`)}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: body.toString(),
    },
  );

  const responseText = await response.text();
  let data: Record<string, unknown>;
  try {
    data = JSON.parse(responseText);
  } catch {
    data = { rawResponse: responseText };
  }

  if (!response.ok) {
    return {
      success: false,
      provider: "twilio",
      to,
      data,
      error: String(data.message ?? response.statusText ?? "Twilio SMS failed"),
    };
  }

  return {
    success: true,
    provider: "twilio",
    to,
    messageId: typeof data.sid === "string" ? data.sid : undefined,
    data,
  };
}

async function sendViaAfricasTalking(to: string, message: string): Promise<SmsSendResult> {
  const apiKey = getEnv("AFRICASTALKING_API_KEY", getEnv("AT_API_KEY"));
  const username = getEnv("AFRICASTALKING_USERNAME", getEnv("AT_USERNAME"));

  if (!apiKey || !username) {
    throw new Error(
      "SMS credentials not configured. Set Twilio secrets or AFRICASTALKING_API_KEY and AFRICASTALKING_USERNAME.",
    );
  }

  const apiUrl = username.toLowerCase() === "sandbox"
    ? "https://api.sandbox.africastalking.com/version1/messaging"
    : "https://api.africastalking.com/version1/messaging";

  const body = new URLSearchParams();
  body.append("username", username);
  body.append("to", to);
  body.append("message", message);

  const response = await fetch(apiUrl, {
    method: "POST",
    headers: {
      apiKey,
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: body.toString(),
  });

  const responseText = await response.text();
  let data: Record<string, unknown>;
  try {
    data = JSON.parse(responseText);
  } catch {
    data = { rawResponse: responseText };
  }

  if (!response.ok) {
    return {
      success: false,
      provider: "africastalking",
      to,
      data,
      error: String(data.message ?? response.statusText ?? "Africa's Talking SMS failed"),
    };
  }

  const recipient = (
    data.SMSMessageData as { Recipients?: { status: string; number: string; messageId?: string }[] }
  )?.Recipients?.[0];

  if (recipient?.status !== "Success") {
    return {
      success: false,
      provider: "africastalking",
      to,
      data,
      error: recipient?.status ?? "Africa's Talking did not return a successful delivery status",
    };
  }

  return {
    success: true,
    provider: "africastalking",
    to: recipient.number,
    messageId: recipient.messageId,
    data,
  };
}

export interface SendSmsOptions {
  /** Defaults to "transactional" (honours an explicit STOP; no quiet hours). */
  category?: Category;
}

export async function sendSms(phoneNumber: string, message: string, options: SendSmsOptions = {}): Promise<SmsSendResult> {
  if (!phoneNumber || !message) throw new Error("phoneNumber and message are required");
  if (message.length > 918) throw new Error("Message exceeds 6 SMS segments (918 chars max)");

  // Central enforcement: every SMS goes through the opt-out / quiet-hours gate
  // immediately before sending. Fails closed for non-security messages.
  const category = options.category ?? "transactional";
  if (category !== "security") {
    const normalised = tryFormatPhoneNumber(phoneNumber);
    const admin = createClient(getEnv("SUPABASE_URL"), getEnv("SUPABASE_SERVICE_ROLE_KEY"));
    const decision = await checkSendAllowed(admin, { channel: "sms", category, address: normalised ?? phoneNumber });
    if (!decision.allow) {
      return { success: false, provider: selectedProvider(), to: normalised ?? "", error: `blocked:${decision.reason}` };
    }
  }

  // Reminder-class SMS must tell the recipient how to opt out.
  if (category === "reminder" && !/\bSTOP\b/i.test(message)) {
    message = `${message} Reply STOP to opt out.`;
    if (message.length > 918) throw new Error("Message exceeds 6 SMS segments (918 chars max)");
  }

  const to = formatPhoneNumber(phoneNumber);
  const provider = selectedProvider();
  const result = provider === "twilio"
    ? await sendViaTwilio(to, message)
    : await sendViaAfricasTalking(to, message);

  if (!result.success && provider === "twilio" && getEnv("SMS_FALLBACK_PROVIDER") === "africastalking") {
    return sendViaAfricasTalking(to, message);
  }

  return result;
}
