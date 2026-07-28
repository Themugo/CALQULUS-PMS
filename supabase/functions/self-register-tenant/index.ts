/**
 * self-register-tenant/index.ts
 *
 * Allows users to self-register as tenants (no manager invite required).
 * Uses verified authenticated email for security.
 */

import { serve } from "std/http/server.ts";
import { withMiddleware, errorResponse, successResponse } from "../_shared/middleware.ts";
import { getEnv } from "../_shared/env.ts";

interface SelfRegisterRequest {
  name: string;
  phone?: string;
}

serve(
  withMiddleware(
    {
      functionName: "self-register-tenant",
      requireAuth: true,
    },
    async (req, ctx) => {
      const { name, phone }: SelfRegisterRequest = await req.json();

      if (!name) {
        throw errorResponse("Missing required field: name", 400);
      }

      // SECURITY: Use verified authenticated email, not client-supplied one
      // Tenants are matched by email elsewhere (e.g. claim-tenant), so trusting
      // an arbitrary value would let a user register under someone else's email
      const email = ctx.user!.email;
      if (!email) {
        throw errorResponse("Your account has no verified email on file", 400);
      }

      // Check if already registered as tenant
      const { data: existingRole } = await ctx.supabase
        .from("user_roles")
        .select("tenant_id, role")
        .eq("user_id", ctx.user!.id)
        .eq("role", "tenant")
        .maybeSingle();

      if (existingRole) {
        throw errorResponse("You are already registered as a tenant", 409);
      }

      // Create the orphan tenant record
      const { data: tenant, error: tenantError } = await ctx.supabase
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
        throw errorResponse(`Failed to create tenant record: ${tenantError?.message}`, 500);
      }

      // Link auth user to tenant record
      const { error: roleError } = await ctx.supabase
        .from("user_roles")
        .insert({
          user_id: ctx.user!.id,
          tenant_id: tenant.id,
          role: "tenant",
          approval_status: "approved",
        });

      if (roleError) {
        // Cleanup tenant record if role insert fails
        await ctx.supabase.from("tenants").delete().eq("id", tenant.id);
        throw errorResponse(`Failed to link user to tenant: ${roleError.message}`, 500);
      }

      // Ensure profile exists
      const { data: existingProfile } = await ctx.supabase
        .from("profiles")
        .select("id")
        .eq("id", ctx.user!.id)
        .maybeSingle();

      if (!existingProfile) {
        await ctx.supabase.from("profiles").insert({
          id: ctx.user!.id,
          email,
          full_name: name,
          phone: phone ?? null,
        });
      }

      // Log the transfer
      await ctx.supabase.from("tenant_transfer_log").insert({
        tenant_id: tenant.id,
        from_manager_id: null,
        to_manager_id: null,
        transfer_type: "self_register",
        transferred_by: ctx.user!.id,
        notes: "Self-registered via tenant portal",
      });

      // Send welcome SMS
      if (phone) {
        const supabaseUrl = getEnv("SUPABASE_URL");
        const serviceKey = getEnv("SUPABASE_SERVICE_ROLE_KEY");

        fetch(`${supabaseUrl}/functions/v1/send-sms-notification`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${serviceKey}`,
          },
          body: JSON.stringify({
            phoneNumber: phone,
            message: `Welcome to CALQULUS RMS, ${name}. Your tenant account is active. You can now track rent, receipts, and property records from your portal.`,
          }),
        }).catch(() => {
          // Non-critical, don't fail the request
        });
      }

      return { tenant: { id: tenant.id, name, email } };
    }
  )
);
