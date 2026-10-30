import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

/**
 * Google sign-in carries no portal information, and the database no longer guesses
 * (migration 20260909000007). The portal the user started from is remembered across the
 * OAuth redirect and, if the account has no role yet, registered once via
 * complete_oauth_signup(). The server only accepts manager / agency (pending approval) and
 * tenant, and only for accounts without any role, so a tampered value gains nothing.
 */
export type OauthPortal = "manager" | "agency" | "tenant";
const KEY = "calqulus_oauth_portal_intent";

export function rememberOauthPortal(portal: OauthPortal): void {
  try { sessionStorage.setItem(KEY, portal); } catch { /* storage unavailable: user can retry from the portal */ }
}

export async function completeOauthSignupIfNeeded(user: User): Promise<void> {
  let portal: string | null;
  try { portal = sessionStorage.getItem(KEY); } catch { return; }
  if (portal !== "manager" && portal !== "agency" && portal !== "tenant") return;
  const { error } = await supabase.rpc("complete_oauth_signup" as never, { p_role: portal } as never);
  // Keep the intent after a transient failure; drop it once the server has answered.
  if (!error || /not available|Authentication/i.test(error.message)) {
    try { sessionStorage.removeItem(KEY); } catch { /* ignore */ }
  }
  void user;
}
