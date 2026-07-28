/**
 * accept-tenant-invite/index.ts
 *
 * Accepts a tenant invitation and creates the tenant record.
 * Uses unified middleware for consistent error handling.
 */

import { serve } from "std/http/server.ts";
import { withMiddleware, errorResponse } from "../_shared/middleware.ts";
import { getEnv } from "../_shared/env.ts";

interface AcceptInviteRequest {
  token: string;
  userId: string;
  email?: string;
  name?: string;
  phone?: string;
}

serve(
  withMiddleware(
    {
      functionName: "accept-tenant-invite",
      requireAuth: false, // Can be called without auth (invite link flow)
    },
    async (req, ctx) => {
      const { token, userId, email, name, phone }: AcceptInviteRequest = await req.json();

      if (!token || !userId) {
        throw errorResponse("token and userId are required", 400);
      }

      // Look up the invite
      const { data: invite, error: inviteError } = await ctx.supabase
        .from("tenant_invites")
        .select("*, units(id, unit_number, property_id, properties(name, address))")
        .eq("invite_token", token)
        .eq("status", "pending")
        .single();

      if (inviteError || !invite) {
        throw errorResponse("Invalid or expired invite link", 404);
      }

      // Check expiry
      if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
        await ctx.supabase
          .from("tenant_invites")
          .update({ status: "expired" })
          .eq("id", invite.id);
        throw errorResponse("This invite link has expired", 410);
      }

      const unit = Array.isArray(invite.units) ? invite.units[0] : invite.units;
      const property = Array.isArray(unit?.properties)
        ? unit.properties[0]
        : unit?.properties;

      // Create tenant record
      const { data: tenant, error: tenantError } = await ctx.supabase
        .from("tenants")
        .insert({
          user_id: userId,
          unit_id: invite.unit_id,
          property_id: unit?.property_id || invite.property_id || null,
          name: name || invite.invited_name || email?.split("@")[0] || "Tenant",
          email: email || invite.email,
          phone: phone || invite.phone || null,
          unit: unit?.unit_number || null,
          property: property?.name || null,
          manager_id: invite.manager_id,
          status: "active",
          move_in_date: invite.move_in_date || null,
          deposit: invite.deposit_amount || 0,
        })
        .select()
        .single();

      if (tenantError) {
        throw errorResponse(`Failed to create tenant: ${tenantError.message}`, 500);
      }

      // Mark unit as occupied
      if (invite.unit_id) {
        await ctx.supabase
          .from("units")
          .update({ status: "occupied", tenant_id: tenant.id })
          .eq("id", invite.unit_id);
      }

      // Update invite status
      await ctx.supabase
        .from("tenant_invites")
        .update({
          status: "accepted",
          accepted_at: new Date().toISOString(),
          accepted_by: userId,
        })
        .eq("id", invite.id);

      // Assign tenant role
      await ctx.supabase.from("user_roles").insert({
        user_id: userId,
        role: "tenant",
        tenant_id: tenant.id,
        approval_status: "approved",
      });

      // Notify manager asynchronously
      if (invite.manager_id && property?.name) {
        const supabaseUrl = getEnv("SUPABASE_URL");
        const serviceKey = getEnv("SUPABASE_SERVICE_ROLE_KEY");

        fetch(`${supabaseUrl}/functions/v1/notify-manager-tenant-signup`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${serviceKey}`,
          },
          body: JSON.stringify({
            managerId: invite.manager_id,
            tenantName: tenant.name,
            tenantEmail: tenant.email,
            propertyName: property.name,
            unit: unit?.unit_number,
          }),
        }).catch(() => {}); // Non-critical
      }

      // Send welcome SMS
      const tenantPhone = phone || invite.phone;
      if (tenantPhone) {
        const supabaseUrl = getEnv("SUPABASE_URL");
        const serviceKey = getEnv("SUPABASE_SERVICE_ROLE_KEY");

        fetch(`${supabaseUrl}/functions/v1/send-sms-notification`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${serviceKey}`,
          },
          body: JSON.stringify({
            phoneNumber: tenantPhone,
            message: `Welcome to CALQULUS RMS, ${tenant.name}. Your tenant portal is active${property?.name ? ` for ${property.name}` : ""}.`,
          }),
        }).catch(() => {}); // Non-critical
      }

      return { success: true, tenant, redirect: "/portal" };
    }
  )
);
