import { getCorsHeaders, preflightResponse } from "../_shared/cors.ts";
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const logStep = (step: string, details?: Record<string, unknown>) => {
  console.log(`[self-register-tenant] ${step}`, details ?? "");
};

interface SelfRegisterRequest {
  name: string;
  email: string;
  phone?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return preflightResponse(req);

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization header");

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", "")
    );
    if (authError || !user) throw new Error("Authentication failed");

    const { name, email, phone }: SelfRegisterRequest = await req.json();
    if (!name || !email) throw new Error("Missing required fields: name, email");

    // Check if already registered as tenant
    const { data: existingRole } = await supabase
      .from("user_roles")
      .select("tenant_id, role")
      .eq("user_id", user.id)
      .eq("role", "tenant")
      .maybeSingle();
    if (existingRole) {
      throw new Error("You are already registered as a tenant");
    }

    // Create the orphan tenant record
    const { data: tenant, error: tenantError } = await supabase
      .from("tenants")
      .insert({
        name,
        email,
        phone: phone ?? null,
        manager_id: null,
        status: "active",
        source: "self_registered",
      })
      .select()
      .single();
    if (tenantError || !tenant) {
      throw new Error(`Failed to create tenant record: ${tenantError?.message}`);
    }

    // Link auth user to tenant record
    const { error: roleError } = await supabase
      .from("user_roles")
      .insert({
        user_id: user.id,
        tenant_id: tenant.id,
        role: "tenant",
        approval_status: "approved",
      });
    if (roleError) {
      // Cleanup tenant record if role insert fails
      await supabase.from("tenants").delete().eq("id", tenant.id);
      throw new Error(`Failed to link user to tenant: ${roleError.message}`);
    }

    // Ensure profile exists
    const { data: existingProfile } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", user.id)
      .maybeSingle();
    if (!existingProfile) {
      await supabase.from("profiles").insert({
        id: user.id,
        email,
        full_name: name,
        phone: phone ?? null,
      });
    }

    // Log the transfer
    await supabase.from("tenant_transfer_log").insert({
      tenant_id: tenant.id,
      from_manager_id: null,
      to_manager_id: null,
      transfer_type: "self_register",
      transferred_by: user.id,
      notes: "Self-registered via tenant portal",
    });

    logStep("Tenant self-registered", { tenantId: tenant.id });

    return new Response(
      JSON.stringify({ success: true, tenant: { id: tenant.id, name, email } }),
      { status: 200, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logStep("Error", { message });
    return new Response(
      JSON.stringify({ success: false, error: message }),
      { status: 400, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
    );
  }
});
