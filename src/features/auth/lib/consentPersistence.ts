import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";

/**
 * Persists terms/privacy acceptance server-side (public.user_consents) once the
 * user has a session. The database records the authenticated user id and its
 * own timestamp; user_metadata is only the hint for WHICH version the person
 * accepted on the signup form and is not itself the consent record.
 * Best-effort and idempotent: failures never block sign-in.
 */
export async function persistSignupConsent(user: User | null): Promise<void> {
  const version = (user?.user_metadata as { terms_version?: unknown } | undefined)?.terms_version;
  if (!user || typeof version !== "string" || version.length === 0 || version.length > 64) return;

  const flag = `consent_recorded:${user.id}:${version}`;
  try {
    if (sessionStorage.getItem(flag)) return;
  } catch { /* storage unavailable: fall through, RPC is idempotent */ }

  try {
    const terms = await supabase.rpc("record_user_consent", { p_policy_type: "terms", p_policy_version: version, p_source: "signup" });
    const privacy = await supabase.rpc("record_user_consent", { p_policy_type: "privacy", p_policy_version: version, p_source: "signup" });
    if (!terms.error && !privacy.error) {
      try { sessionStorage.setItem(flag, "1"); } catch { /* ignore */ }
    }
  } catch { /* non-blocking */ }
}
