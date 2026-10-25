/**
 * _shared/landlordPreferences.ts
 *
 * Read helper for public.landlord_notification_preferences so any sender that
 * messages a landlord can honour the choices made in the landlord portal.
 * Security alerts (e.g. bank-detail changes) must NOT be gated by this.
 * Missing row = defaults (email on, SMS on, WhatsApp off), matching the table.
 */
import type { SupabaseClient } from "supabase/supabase-js@2";

export type LandlordChannel = "email" | "sms" | "whatsapp";
export type LandlordEvent =
  | "payout_approved" | "payout_paid" | "monthly_statement" | "new_tenant_moved_in"
  | "tenant_moved_out" | "maintenance_completed" | "vacancy_alert" | "arrears_alert";

const CHANNEL_COLUMN: Record<LandlordChannel, string> = {
  email: "email_enabled", sms: "sms_enabled", whatsapp: "whatsapp_enabled",
};
const CHANNEL_DEFAULT: Record<LandlordChannel, boolean> = { email: true, sms: true, whatsapp: false };

export async function landlordAllows(
  supabaseAdmin: SupabaseClient,
  landlordUserId: string,
  channel: LandlordChannel,
  event?: LandlordEvent,
): Promise<boolean> {
  const { data, error } = await supabaseAdmin
    .from("landlord_notification_preferences")
    .select("*")
    .eq("landlord_user_id", landlordUserId)
    .limit(1)
    .maybeSingle();
  if (error || !data) return CHANNEL_DEFAULT[channel];
  const row = data as Record<string, unknown>;
  const channelOn = row[CHANNEL_COLUMN[channel]];
  if (channelOn === false) return false;
  if (event && row[event] === false) return false;
  return true;
}
