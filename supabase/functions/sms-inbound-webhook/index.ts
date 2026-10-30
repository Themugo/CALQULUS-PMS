/**
 * sms-inbound-webhook/index.ts
 *
 * Provider callback for inbound SMS. Processes STOP-type keywords (opt out of
 * non-essential SMS/WhatsApp) and START-type keywords (opt back in), persists
 * them via record_comms_opt_out / clear_comms_opt_out, and audits every request.
 * Repeated STOPs are idempotent.
 *
 * Authentication (no Supabase JWT; configure verify_jwt = false):
 *   - Twilio: X-Twilio-Signature verified with TWILIO_AUTH_TOKEN over
 *     SMS_INBOUND_PUBLIC_URL (the exact public URL configured at the provider).
 *   - Africa's Talking (no signature): SMS_INBOUND_SECRET must be supplied as
 *     ?secret=<value> (configure it in the provider callback URL).
 * Anything else is rejected with 401. Message bodies are never logged.
 *
 * REQUIRES operator configuration at the provider; see
 * docs/engineering/REGISTRATION_COMMS_EXTERNAL_CONFIGURATION.md.
 */
import { serve } from "std/http/server.ts";
import { createClient } from "supabase/supabase-js@2";
import { getEnv, requireEnv } from "../_shared/env.ts";
import { normaliseAddress, parseInboundKeyword } from "../_shared/commsPolicy.ts";
import { parseInbound, verifySharedSecret, verifyTwilioSignature } from "../_shared/inboundSms.ts";
import { tryFormatPhoneNumber } from "../_shared/phone.ts";

const text = (body: string, status = 200, type = "text/plain") =>
  new Response(body, { status, headers: { "Content-Type": type } });

serve(async (req: Request): Promise<Response> => {
  if (req.method !== "POST") return text("Method not allowed", 405);

  const raw = await req.text();
  const params: Record<string, string> = {};
  for (const [k, v] of new URLSearchParams(raw)) params[k] = v;

  const twilioSig = req.headers.get("x-twilio-signature");
  const authentic = twilioSig
    ? await verifyTwilioSignature(
      getEnv("TWILIO_AUTH_TOKEN", ""), getEnv("SMS_INBOUND_PUBLIC_URL", ""), params, twilioSig,
    )
    : verifySharedSecret(getEnv("SMS_INBOUND_SECRET", ""), new URL(req.url).searchParams.get("secret"));
  if (!authentic) return text("Unauthorized", 401);

  const msg = parseInbound(params);
  if (!msg) return text("Ignored");

  const command = parseInboundKeyword(msg.body);
  if (command === "none") return text("Ignored");

  const phone = tryFormatPhoneNumber(msg.from);
  const address = phone ? normaliseAddress("sms", phone) : null;
  if (!address) return text("Ignored");

  const admin = createClient(requireEnv("SUPABASE_URL"), requireEnv("SUPABASE_SERVICE_ROLE_KEY"));
  // A STOP to the SMS number applies to both SMS and WhatsApp for non-essential messages.
  const channels = ["sms", "whatsapp"] as const;
  for (const channel of channels) {
    const { error } = command === "stop"
      ? await admin.rpc("record_comms_opt_out", { p_channel: channel, p_address: address, p_source: "sms_stop" })
      : await admin.rpc("clear_comms_opt_out", { p_channel: channel, p_address: address, p_source: "sms_stop" });
    if (error) {
      console.error("[sms-inbound-webhook] persist failed", channel, error.code ?? "");
      // Non-2xx so the provider retries; the operation is idempotent.
      return text("Error", 500);
    }
  }
  console.log(`[sms-inbound-webhook] ${command} processed`);
  return text("OK");
});
