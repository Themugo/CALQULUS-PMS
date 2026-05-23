import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { getCorsHeaders, preflightResponse } from "../_shared/cors.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { requireEnv } from "../_shared/env.ts";
import { checkRateLimit, rateLimitResponse } from "../_shared/rateLimit.ts";

const SUPABASE_URL = requireEnv("SUPABASE_URL");
const SERVICE_KEY = requireEnv("SUPABASE_SERVICE_ROLE_KEY");

serve(async (req) => {
  if (req.method === "OPTIONS") return preflightResponse(req);

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

  const authHeader = req.headers.get("Authorization") ?? "";
  const isServiceCall = authHeader === `Bearer ${SERVICE_KEY}`;

  let callerUserId: string | null = null;

  if (!isServiceCall) {
    const { data: { user: caller }, error: authErr } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", "")
    );
    if (authErr || !caller) {
      return new Response(JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } });
    }
    const { data: roleRow } = await supabase.from("user_roles")
      .select("role").eq("user_id", caller.id).maybeSingle();
    if (!["webhost", "manager", "submanager"].includes((roleRow as any)?.role)) {
      return new Response(JSON.stringify({ error: "Forbidden: only managers may send tenant invites" }),
        { status: 403, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } });
    }
    callerUserId = caller.id;

    const allowed = await checkRateLimit(
      supabase, caller.id, "send-tenant-invite", 10,
      { failClosed: true },
    );
    if (!allowed) return rateLimitResponse(req);
  }

  let email: string, phone: string, organizationId: string, propertyId: string, unitId: string;
  try {
    const body = await req.json();
    ({ email, phone, organizationId, propertyId, unitId } = body);
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }),
      { status: 400, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } });
  }

  if (!email) {
    return new Response(JSON.stringify({ error: "email is required" }),
      { status: 400, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } });
  }

  const token = crypto.randomUUID();

  const { error: insertErr } = await supabase.from("tenant_invites").insert({
    email,
    phone,
    organization_id: organizationId,
    property_id: propertyId,
    unit_id: unitId,
    invite_token: token,
  });

  if (insertErr) {
    return new Response(JSON.stringify({ error: "Failed to create invite", details: insertErr.message }),
      { status: 500, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } });
  }

  const inviteLink = `${Deno.env.get("APP_URL") || "https://rentflow.ink"}/accept-invite/${token}`;

  const emailResp = await fetch("https://api.sendgrid.com/v3/mail/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${Deno.env.get("SENDGRID_API_KEY")}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      personalizations: [{ to: [{ email }] }],
      from: { email: "noreply@rentflow.co.ke" },
      subject: "You've been invited to RentFlow",
      content: [{
        type: "text/plain",
        value: `Accept your invite: ${inviteLink}`
      }]
    })
  });

  if (!emailResp.ok) {
    console.error("[send-tenant-invite] Email send failed:", emailResp.status, await emailResp.text().catch(() => ""));
  }

  return new Response(JSON.stringify({ success: true, inviteToken: token }), {
    headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
  });
});
