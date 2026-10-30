import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

/**
 * Invitation signup with email confirmation enabled: signUp() returns no
 * session, and `claim_tenant_invitation_atomic` requires an authenticated
 * caller, so the claim cannot run at signup. The token is remembered for this
 * browser (max 7 days, same as the invitation) and claimed on the first real
 * sign-in, which only happens after the email link is confirmed. The RPC
 * re-checks token, expiry and that the invitation email equals the account email,
 * so a stored token is useless to anyone else.
 */
const KEY = "calqulus_pending_invitation_claim";
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

export interface ManagerNotice { managerId: string; tenantName: string; propertyName?: string | null; unit?: string }
export type InvitationKind = "tenant" | "landlord";
interface Pending { kind?: InvitationKind; token: string; email: string; at: number; notice?: ManagerNotice }

export function rememberPendingInvitationClaim(token: string, email: string, notice?: ManagerNotice, kind: InvitationKind = "tenant"): void {
  try {
    const p: Pending = { kind, token, email: email.trim().toLowerCase(), at: Date.now(), notice };
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch { /* storage unavailable: the user can reopen the invitation link after signing in */ }
}

function read(): Pending | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as Partial<Pending>;
    if (typeof p.token !== "string" || typeof p.email !== "string" || typeof p.at !== "number") return null;
    if (Date.now() - p.at > MAX_AGE_MS) { localStorage.removeItem(KEY); return null; }
    return p as Pending;
  } catch { return null; }
}

/** Returns true when a pending invitation was claimed for this user. */
export async function claimPendingInvitationIfAny(user: User): Promise<boolean> {
  const p = read();
  if (!p || !user.email || p.email !== user.email.toLowerCase()) return false;
  const landlord = p.kind === "landlord";
  const { error } = landlord
    ? await supabase.rpc("accept_landlord_invitation" as never, { p_token: p.token } as never)
    : await supabase.rpc("claim_tenant_invitation_atomic" as never, { p_token: p.token } as never);
  // Spent / invalid / mismatched tokens are dropped; transient errors keep it for the next sign-in.
  const permanent = !error || /invalid|expired|does not match|already linked|already been accepted|not pending|not found|Authentication|signed in/i.test(error.message);
  if (permanent) { try { localStorage.removeItem(KEY); } catch { /* ignore */ } }
  if (!error && p.notice && !landlord) {
    // Tell the inviting manager now that the tenant is verified and linked (needs a session).
    void supabase.functions
      .invoke("notify-manager-tenant-signup", {
        body: {
          managerId: p.notice.managerId,
          tenantName: p.notice.tenantName,
          tenantEmail: user.email,
          propertyName: p.notice.propertyName ?? undefined,
          unit: p.notice.unit,
        },
      })
      .catch(() => undefined);
  }
  return !error;
}
