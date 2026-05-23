import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { getCorsHeaders, preflightResponse } from "../_shared/cors.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  if (req.method === "OPTIONS") return preflightResponse(req);

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { token, userId, email, name, phone } = await req.json();

    if (!token || !userId) {
      return new Response(JSON.stringify({ error: "token and userId are required" }), {
        status: 400, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
      });
    }

    // Look up the invite
    const { data: invite, error: inviteError } = await supabase
      .from("tenant_invites")
      .select("*, units(id, unit_number, property_id, properties(name, address))")
      .eq("invite_token", token)
      .eq("status", "pending")
      .single();

    if (inviteError || !invite) {
      return new Response(JSON.stringify({ error: "Invalid or expired invite link" }), {
        status: 404, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
      });
    }

    // Check expiry
    if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
      await supabase.from("tenant_invites").update({ status: "expired" }).eq("id", invite.id);
      return new Response(JSON.stringify({ error: "This invite link has expired" }), {
        status: 410, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
      });
    }

    // Create tenant record
    const { data: tenant, error: tenantError } = await supabase
      .from("tenants")
      .insert({
        user_id: userId,
        unit_id: invite.unit_id,
        property_id: invite.unit?.property_id || null,
        name: name || invite.invited_name || email?.split("@")[0] || "Tenant",
        email: email || invite.email,
        phone: phone || null,
        unit: invite.unit?.unit_number || null,
        property: invite.unit?.properties?.name || null,
        manager_id: invite.manager_id,
        status: "active",
        move_in_date: invite.move_in_date || null,
        deposit: invite.deposit_amount || 0,
      })
      .select()
      .single();

    if (tenantError) throw tenantError;

    // Mark unit as occupied
    if (invite.unit_id) {
      await supabase
        .from("units")
        .update({ status: "occupied", tenant_id: tenant.id })
        .eq("id", invite.unit_id);
    }

    // Update invite status
    await supabase
      .from("tenant_invites")
      .update({ status: "accepted", accepted_at: new Date().toISOString(), accepted_by: userId })
      .eq("id", invite.id);

    // Assign tenant role in user_roles
    await supabase.from("user_roles").insert({
      user_id: userId,
      role: "tenant",
      tenant_id: tenant.id,
      approval_status: "approved",
    });

    // Notify manager
    await supabase.functions.invoke("notify-manager-tenant-signup", {
      body: { tenantId: tenant.id, managerId: invite.manager_id },
    }).catch(() => {});

    return new Response(JSON.stringify({ success: true, tenant, redirect: "/portal" }), {
      headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("accept-tenant-invite error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
    });
  }
});
