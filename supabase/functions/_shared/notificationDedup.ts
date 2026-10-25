/**
 * _shared/notificationDedup.ts
 *
 * Once-per-key claim for scheduled/bulk senders so a cron re-run (or a
 * manager clicking "send now" twice) does not message the same tenant twice.
 * Backed by public.notification_dedup (migration 20260908000002).
 *
 * Returns true if THIS call claimed the key (go ahead and send) and false if
 * it was already claimed. If the table is unavailable (e.g. migration not yet
 * applied) it fails open with a warning, so sending is not broken by a
 * missing migration.
 */
import type { SupabaseClient } from "supabase/supabase-js@2";

export function dedupKey(fn: string, invoiceId: string, date = new Date()): string {
  return `${fn}:${invoiceId}:${date.toISOString().slice(0, 10)}`;
}

export async function claimNotification(supabaseAdmin: SupabaseClient, key: string): Promise<boolean> {
  const { error } = await supabaseAdmin.from("notification_dedup").insert({ key });
  if (!error) return true;
  if ((error as { code?: string }).code === "23505") return false; // already claimed
  console.warn("[notification-dedup] unavailable, sending without dedup:", (error as { message?: string }).message);
  return true;
}

/** Release a claim after a failed send so the next run may retry. */
export async function releaseNotification(supabaseAdmin: SupabaseClient, key: string): Promise<void> {
  await supabaseAdmin.from("notification_dedup").delete().eq("key", key);
}
