/**
 * accept-admin-invitation/index.ts
 *
 * Claims a CALQULUS ADMIN (webhost) invitation. The invitation TOKEN —
 * not the caller's role, and never a client-supplied role — is the
 * credential. Runs with the service role.
 *
 * Guarantees:
 *  - Token must be pending and unexpired (expired → 410, used → 410
 *    unless the same user already claimed, then idempotent success).
 *  - Password 10-72 characters with character classes, set only by the invitee (admins never
 *    see or send it).
 *  - The auth user created for the invitee is bound to the invited
 *    email; email_confirm: true (identity verified at creation).
 *  - The granted role is always 'webhost' — there is no role parameter.
 *  - The invitation is claimed atomically BEFORE any account change
 *    (pending -> used, with expiry check); failures revert the claim.
 *  - Rate limited per client; malformed tokens are rejected up front.
 *  - Every acceptance is audit-logged.
 */

import { serve } from "std/http/server.ts";
import { sha256Hex } from "../_shared/tokens.ts";
import { findAuthUserByEmail } from "../_shared/authUsers.ts";
import { createClient } from "supabase/supabase-js@2";
import { getEnv, requireEnv } from "../_shared/env.ts";
import { getCorsHeaders, preflightResponse } from "../_shared/cors.ts";
import { checkRateLimit, rateLimitResponse } from "../_shared/rateLimit.ts";
import { isWellFormedInviteToken } from "../_shared/tokens.ts";

interface AcceptAdminInviteRequest {
  token?: string;
  password?: string;
}

const json = (req: Request, body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
  });

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return preflightResponse(req);
  if (req.method !== "POST") return json(req, { error: "Method not allowed" }, 405);

  try {
    const { token, password }: AcceptAdminInviteRequest = await req.json();
    const invitationToken = token?.trim() || null;

    // Unauthenticated, token-bearing, grants a platform-admin role: rate limit first (fail closed).
    const clientKey =
      req.headers.get("cf-connecting-ip")?.trim() ||
      req.headers.get("x-real-ip")?.trim() ||
      req.headers.get("x-forwarded-for")?.split(",").pop()?.trim() ||
      "admin-invite-anonymous";
    const allowed = await checkRateLimit(
      createClient(requireEnv("SUPABASE_URL"), requireEnv("SUPABASE_ANON_KEY")),
      clientKey, "accept-admin-invitation", 10, { failClosed: true },
    );
    if (!allowed) return rateLimitResponse(req);

    if (!invitationToken || !isWellFormedInviteToken(invitationToken)) {
      return json(req, { error: "Invitation not found", code: "invitation_invalid" }, 404);
    }
    if (
      typeof password !== "string" || password.length < 10 || password.length > 72 ||
      !/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password) || !/[^A-Za-z0-9]/.test(password)
    ) {
      return json(req, {
        error: "Password must be 10-72 characters with an uppercase letter, a lowercase letter, a number and a special character",
      }, 400);
    }

    const supabaseAdmin = createClient(
      requireEnv("SUPABASE_URL"),
      requireEnv("SUPABASE_SERVICE_ROLE_KEY"),
      { auth: { persistSession: false } },
    );

    // ── Resolve the invitation server-side ────────────────────────────
    // Lookup by hash; legacy rows (raw token, no hash yet) remain valid during the transition.
    const presentedHash = await sha256Hex(invitationToken);
    const { data: inviteRows } = await supabaseAdmin
      .from("admin_invitations")
      .select("id, email, display_name, admin_type, status, expires_at, invited_by")
      .or(`token_hash.eq.${presentedHash},and(token_hash.is.null,token.eq.${invitationToken.replace(/[^A-Za-z0-9-]/g, "")})`)
      .limit(1);

    const invite = inviteRows?.[0];
    if (!invite) {
      return json(req, { error: "Invitation not found", code: "invitation_invalid" }, 404);
    }

    if (invite.status === "pending" && new Date(invite.expires_at) <= new Date()) {
      return json(req, { error: "This invitation has expired", code: "invitation_expired" }, 410);
    }

    // ── Find or create the auth user bound to the invited email ───────
    const existingUser = await findAuthUserByEmail(supabaseAdmin, invite.email);

    if (invite.status !== "pending") {
      // Refresh / back-navigation after a successful claim: if this user
      // already holds the webhost role, return success instead of failing.
      if (existingUser) {
        const { data: roles } = await supabaseAdmin
          .from("user_roles")
          .select("role")
          .eq("user_id", existingUser.id);
        if (roles?.some((r) => r.role === "webhost")) {
          return json(req, {
            success: true,
            alreadyClaimed: true,
            email: invite.email,
            message: "Invitation already claimed",
          });
        }
      }
      return json(req, { error: "This invitation has already been used", code: "invitation_used" }, 410);
    }

    // ── Claim the invitation FIRST, atomically. Only one concurrent request can
    // flip pending -> used; everything after this runs for the winner only. If a
    // later step fails the claim is reverted so the invitee can retry.
    const { data: claimedRows, error: claimError } = await supabaseAdmin
      .from("admin_invitations")
      .update({ status: "used", used_at: new Date().toISOString() })
      .eq("id", invite.id)
      .eq("status", "pending")
      .gt("expires_at", new Date().toISOString())
      .select("id");
    if (claimError) {
      console.error("accept-admin-invitation: claim failed", claimError.code ?? "");
      return json(req, { error: "Unable to accept invitation" }, 500);
    }
    if (!claimedRows || claimedRows.length !== 1) {
      return json(req, { error: "This invitation has already been used", code: "invitation_used" }, 410);
    }
    const revertClaim = async () => {
      await supabaseAdmin
        .from("admin_invitations")
        .update({ status: "pending", used_at: null })
        .eq("id", invite.id)
        .eq("status", "used");
    };
    const fail = async (stage: string) => {
      console.error("accept-admin-invitation: failed at", stage);
      await revertClaim();
      return json(req, { error: "Unable to accept invitation" }, 500);
    };

    let userId: string;
    let createdNewUser = false;
    if (existingUser) {
      // Identity verification: the invitee proves ownership of the invited
      // email by setting the password through this token-gated path.
      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(existingUser.id, {
        password,
        email_confirm: true,
        user_metadata: { full_name: invite.display_name },
      });
      if (updateError) {
        return await fail("set_credentials");
      }
      userId = existingUser.id;
    } else {
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: invite.email,
        password,
        email_confirm: true,
        user_metadata: { full_name: invite.display_name },
      });
      if (createError || !newUser.user) {
        return await fail("create_user");
      }
      userId = newUser.user.id;
      createdNewUser = true;
    }

    // ── Grant the role server-side. Always 'webhost' — the client never
    // chooses a role. protect_user_roles_changes() bypasses service_role.
    const { error: roleError } = await supabaseAdmin
      .from("user_roles")
      .upsert(
        { user_id: userId, role: "webhost", approval_status: "approved" },
        { onConflict: "user_id,role" },
      );
    if (roleError) {
      return await fail("grant_role");
    }

    // The signup trigger gives every account without a role in metadata a pending
    // 'manager' row. A freshly created operator account must not keep it (it would
    // sit next to 'webhost' and confuse role resolution).
    if (createdNewUser) {
      const { error: strayError } = await supabaseAdmin
        .from("user_roles")
        .delete()
        .eq("user_id", userId)
        .eq("role", "manager")
        .eq("approval_status", "pending");
      if (strayError) return await fail("remove_default_role");
    }

    // ── Seed the operator tier server-side (Phase 9) ──────────────────
    // The platform_admins row is what makes this a full operator. The tier
    // comes from the invitation (chosen by the inviter), never the client,
    // and can never be 'owner' — the DB CHECK enforces business|admin.
    const operatorTier = invite.admin_type === "business" ? "business" : "admin";
    const { error: paError } = await supabaseAdmin
      .from("platform_admins")
      .upsert(
        {
          user_id: userId,
          admin_type: operatorTier,
          display_name: invite.display_name,
          email: invite.email,
          can_create_admins: operatorTier === "business",
          can_manage_managers: true,
          can_manage_agencies: true,
          can_manage_organizations: false,
          can_manage_billing: operatorTier === "business",
          can_manage_properties: true,
          can_manage_landlords: true,
          can_view_activity_logs: true,
          can_manage_platform_settings: operatorTier === "business",
          can_read_unattached_tenants: true,
          can_resolve_unattached_tenants: operatorTier === "business",
          is_immutable: false,
          suspended: false,
          created_by: invite.invited_by,
        },
        { onConflict: "user_id" },
      );
    if (paError) return await fail("platform_admins");

    // Baseline admin permissions, aligned to the operator tier. 'business'
    // operators can manage billing and create further admins; 'admin'
    // operators start limited until an owner/business elevates them.
    const { error: apError } = await supabaseAdmin
      .from("admin_permissions")
      .upsert(
        {
          user_id: userId,
          admin_level: operatorTier === "business" ? "admin" : "limited_admin",
          can_create_webhosts: operatorTier === "business",
          can_manage_managers: true,
          can_manage_agencies: true,
          can_manage_organizations: false,
          can_manage_billing: operatorTier === "business",
          can_manage_properties: true,
          can_manage_tenants: false,
          can_read_unattached_tenants: true,
          can_resolve_unattached_tenants: operatorTier === "business",
          can_view_activity_logs: true,
        },
        { onConflict: "user_id" },
      );
    if (apError) return await fail("admin_permissions");

    // (invitation already marked used by the atomic claim above)
    // ── legacy marker removed ─────────────────
    // ── Audit the acceptance ──────────────────────────────────────────
    await supabaseAdmin.from("activity_logs").insert({
      actor_id: userId,
      actor_role: "webhost",
      actor_email: invite.email,
      action: "admin_invitation_accepted",
      entity_type: "admin_invitations",
      entity_id: invite.id,
      metadata: { invited_by: invite.invited_by, email: invite.email, admin_type: operatorTier },
    }).then(() => undefined, () => undefined);

    return json(req, {
      success: true,
      email: invite.email,
      message: "Admin role accepted. Sign in to the CALQULUS ADMIN console.",
    });
  } catch (error: unknown) {
    console.error("accept-admin-invitation error:", error instanceof Error ? error.name : "error");
    return json(req, { error: "Internal server error" }, 500);
  }
});
