// Emails the landlord invitation link. create_landlord_invitation_atomic only
// inserts the row; before this function existed the UI said "Invitation sent"
// but nothing was ever delivered, so landlords could never accept.
import { createClient } from "supabase/supabase-js@2";
import { getCorsHeaders, preflightResponse } from "../_shared/cors.ts";
import { requireEnv, getEnv } from "../_shared/env.ts";
import { sendEmail } from "../_shared/email.ts";
import { escapeHtml } from "../_shared/html.ts";
import { checkRateLimit, rateLimitResponse } from "../_shared/rateLimit.ts";

const json = (req: Request, body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
  });

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return preflightResponse(req);
  if (req.method !== "POST") return json(req, { error: "Method not allowed" }, 405);
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json(req, { error: "Unauthorized" }, 401);
    const userClient = createClient(requireEnv("SUPABASE_URL"), requireEnv("SUPABASE_ANON_KEY"), {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) return json(req, { error: "Unauthorized" }, 401);

    const { invitationId } = await req.json().catch(() => ({}));
    if (!invitationId || !/^[0-9a-f-]{36}$/i.test(String(invitationId))) {
      return json(req, { error: "invitationId is required" }, 400);
    }

    const ok = await checkRateLimit(userClient, user.id, "send-landlord-invitation", 20, { failClosed: true });
    if (!ok) return rateLimitResponse(req);

    const admin = createClient(requireEnv("SUPABASE_URL"), requireEnv("SUPABASE_SERVICE_ROLE_KEY"));
    const { data: inv } = await admin
      .from("landlord_invitations")
      .select("id, email, token, status, expires_at, manager_id, property_id")
      .eq("id", invitationId)
      .maybeSingle();
    // Only the manager who created the invitation may trigger delivery.
    if (!inv || inv.manager_id !== user.id) return json(req, { error: "Invitation not found" }, 404);
    if (inv.status !== "pending" || new Date(inv.expires_at).getTime() <= Date.now()) {
      return json(req, { error: "Invitation is no longer active" }, 409);
    }

    const { data: prop } = await admin.from("properties").select("name").eq("id", inv.property_id).maybeSingle();
    const { data: mgr } = await admin.from("profiles").select("full_name").eq("id", user.id).maybeSingle();
    const appUrl = getEnv("APP_URL", "https://calqulus.site").replace(/\/$/, "");
    const link = `${appUrl}/landlord/invitation?token=${encodeURIComponent(String(inv.token))}`;
    const propertyName = escapeHtml(String(prop?.name ?? "a property"));
    const managerName = escapeHtml(String(mgr?.full_name ?? "Your property manager"));

    const res = await sendEmail({
      to: [String(inv.email)],
      subject: `You have been invited to view ${String(prop?.name ?? "your property").slice(0, 80)} on CALQULUS`,
      displayName: "CALQULUS RMS",
      html: `<div style="font-family:system-ui,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#1a1a2e">
        <h2>Landlord invitation</h2>
        <p>${managerName} has invited you to follow income, statements and payouts for <strong>${propertyName}</strong> on CALQULUS.</p>
        <p><a href="${escapeHtml(link)}" style="display:inline-block;background:#0f766e;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none">Accept invitation</a></p>
        <p style="color:#64748b;font-size:13px">This link expires on ${new Date(inv.expires_at).toISOString().slice(0, 10)}. If you were not expecting it, you can ignore this email.</p>
      </div>`,
    });
    if (!res.ok) {
      console.error("send-landlord-invitation: email failed", res.kind);
      return json(req, { success: false, sent: false, error: "Email could not be delivered" }, 502);
    }
    return json(req, { success: true, sent: true });
  } catch (e) {
    console.error("send-landlord-invitation error", e);
    return json(req, { error: "Internal error" }, 500);
  }
});
