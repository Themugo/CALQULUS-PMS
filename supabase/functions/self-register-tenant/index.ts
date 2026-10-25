/**
 * self-register-tenant/index.ts
 *
 * Allows users to self-register as tenants (no manager invite required).
 * Uses verified authenticated email for security.
 */

import { serve } from "std/http/server.ts";
import { withMiddleware, errorResponse, successResponse } from "../_shared/middleware.ts";

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

      if (typeof name !== "string" || !name.trim() || name.length > 120) {
        throw errorResponse("A valid name (max 120 characters) is required", 400);
      }
      if (phone !== undefined && phone !== null && (typeof phone !== "string" || phone.length > 20)) {
        throw errorResponse("Invalid phone number", 400);
      }

      // SECURITY: Use verified authenticated email, not client-supplied one
      // Tenants are matched by email elsewhere (e.g. claim-tenant), so trusting
      // an arbitrary value would let a user register under someone else's email
      const email = ctx.user!.email;
      if (!email) {
        throw errorResponse("Your account has no verified email on file", 400);
      }

      // Core registration is one server-side transaction. The RPC derives the
      // authenticated email and tenant/user-role relationship from auth.uid(),
      // preventing partial tenant + role + profile creation.
      const { data: tenantId, error: registrationError } = await ctx.supabase.rpc(
        "self_register_tenant_atomic",
        { p_name: name, p_phone: phone ?? null },
      );

      if (registrationError || !tenantId) {
        throw errorResponse(registrationError?.message ?? "Failed to register tenant", 400);
      }

      // No welcome SMS: the phone number is user-supplied and unverified, so
      // sending to it would let anyone trigger SMS to arbitrary numbers.

      return { tenant: { id: tenantId, name, email } };
    }
  )
);
