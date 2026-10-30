import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

/**
 * When email confirmation is enabled, signUp() returns no session, so the
 * authenticated `notify-new-manager-signup` call made at registration is
 * rejected and the platform admins are never told a manager/agency is waiting
 * for approval. On the first real sign-in of a still-pending manager/agency we
 * ask again. The server de-duplicates (one notification per user), so repeating
 * the call is harmless; localStorage only avoids needless requests.
 */
export function maybeNotifyPendingSignup(
  user: User,
  role: { role: string; approval_status?: string | null } | null,
): void {
  if (!role || (role.role !== "manager" && role.role !== "agency")) return;
  if (role.approval_status !== "pending") return;
  const key = `calqulus_signup_notified:${user.id}`;
  try {
    if (localStorage.getItem(key)) return;
  } catch { /* storage unavailable: server de-duplicates anyway */ }
  // Welcome email (server de-duplicates per user; needs a session, which exists now).
  void supabase.functions
    .invoke("send-welcome-email", {
      body: { email: user.email, fullName: user.user_metadata?.full_name ?? user.email, userType: role.role },
    })
    .catch(() => undefined);
  void supabase.functions
    .invoke("notify-new-manager-signup", {
      body: { managerName: user.user_metadata?.full_name ?? user.email, role: role.role },
    })
    .then(({ error }) => {
      if (error) return;
      try { localStorage.setItem(key, "1"); } catch { /* ignore */ }
    })
    .catch(() => undefined);
}
