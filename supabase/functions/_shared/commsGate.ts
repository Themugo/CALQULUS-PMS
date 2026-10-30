/**
 * _shared/commsGate.ts — Deno/Supabase adapter for commsPolicy.ts.
 *
 * Re-checks opt-outs and quiet hours IMMEDIATELY before a send. Fails closed:
 * if the opt-out lookup errors, non-security messages are not sent.
 */
import type { SupabaseClient } from "supabase/supabase-js@2";
import { getEnv } from "./env.ts";
import {
  evaluateSendPolicy, normaliseAddress, parseQuietHours,
  type Category, type Channel, type PolicyDecision,
} from "./commsPolicy.ts";

export function quietHoursFromEnv() {
  return parseQuietHours({
    COMMS_TIMEZONE: getEnv("COMMS_TIMEZONE", ""),
    COMMS_QUIET_START: getEnv("COMMS_QUIET_START", ""),
    COMMS_QUIET_END: getEnv("COMMS_QUIET_END", ""),
  });
}

export async function checkSendAllowed(
  supabaseAdmin: SupabaseClient,
  input: { channel: Channel; category: Category; address: string; now?: Date },
): Promise<PolicyDecision> {
  const { channel, category } = input;
  if (category === "security") return { allow: true, reason: "ok" };

  let optedOut = false;
  let lookupFailed = false;
  // Push has no address-level opt-out table; only quiet hours apply.
  if (channel !== "push") {
    const address = normaliseAddress(channel, input.address);
    if (!address) {
      // An unparseable address cannot be checked; do not send optional messages to it.
      lookupFailed = true;
    } else {
      try {
        const { data, error } = await supabaseAdmin.rpc("is_comms_opted_out", { p_channel: channel, p_address: address });
        if (error) lookupFailed = true;
        else optedOut = data === true;
      } catch {
        lookupFailed = true;
      }
    }
  }
  return evaluateSendPolicy({
    channel, category, optedOut, lookupFailed, now: input.now, quietHours: quietHoursFromEnv(),
  });
}
