/**
 * _shared/channelSend.ts — policy gate + dedup claim around ONE channel send.
 *
 * Order matters: (1) re-check opt-out / quiet hours immediately before
 * sending, (2) claim the dedup key, (3) send, (4) complete or release.
 * Policy "skips" never claim a key, so a quiet-hours skip can be retried by a
 * later run inside the same window.
 */
import type { SupabaseClient } from "supabase/supabase-js@2";
import { checkSendAllowed } from "./commsGate.ts";
import type { Category, Channel } from "./commsPolicy.ts";
import { sendOnce, type SendOutcome } from "./notificationDedup.ts";

export type ChannelResult =
  | { status: "sent" | "rejected" | "unknown" }
  | { status: "skipped"; reason: string };

export async function sendChannelOnce(opts: {
  client: SupabaseClient;
  channel: Channel;
  category: Category;
  address: string;
  key: string;
  send: () => Promise<SendOutcome>;
}): Promise<ChannelResult> {
  const decision = await checkSendAllowed(opts.client, {
    channel: opts.channel, category: opts.category, address: opts.address,
  });
  if (!decision.allow) return { status: "skipped", reason: decision.reason };

  const guarded = await sendOnce(opts.client, opts.key, opts.send);
  if (!guarded.ran) return { status: "skipped", reason: guarded.reason ?? guarded.skipped };
  return { status: guarded.outcome };
}
