/**
 * claim-tenant/index.ts — REQUEST a tenant-consented association.
 *
 * A manager can no longer take over a self-registered tenant by email. This
 * function only creates a consent request (via request_tenant_claim, which
 * re-checks manager approval and property/unit ownership inside the database)
 * and emails the tenant a single-use link. The association happens only when
 * the tenant, signed in, accepts it (accept_tenant_claim RPC).
 *
 * The response is identical whether or not an eligible tenant exists, so the
 * endpoint cannot be used to discover which email addresses have accounts.
 * The raw token travels only in the email link's URL fragment (never sent to
 * servers or Referer headers) and only its SHA-256 is stored.
 */
import { serve } from "std/http/server.ts";
import { withMiddleware, errorResponse } from "../_shared/middleware.ts";
import { getEnv } from "../_shared/env.ts";
import { escapeHtml } from "../_shared/html.ts";
import { sendEmail } from "../_shared/email.ts";
import { generateToken, sha256Hex } from "../_shared/tokens.ts";
import { normaliseEmail } from "../_shared/notifyAuthz.ts";

const CLAIM_TTL_MS = 3 * 24 * 60 * 60 * 1000; // 3 days

const GENERIC = {
  message: "If an eligible tenant account exists, a consent request has been sent to the tenant.",
};

serve(
  withMiddleware(
    {
      functionName: "claim-tenant",
      requireAuth: true,
      allowedRoles: ["manager"],
      rateLimit: { maxPerHour: 20, failClosed: true },
    },
    async (req, ctx) => {
      if (!ctx.user || ctx.user.id === "service-role") throw errorResponse("A manager session is required", 401);

      const body = await req.json().catch(() => ({})) as { email?: unknown; propertyId?: unknown; unitId?: unknown };
      const email = normaliseEmail(body.email);
      const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!email || typeof body.propertyId !== "string" || !uuid.test(body.propertyId)) {
        throw errorResponse("A valid email and propertyId are required", 400);
      }
      if (body.unitId !== undefined && body.unitId !== null && (typeof body.unitId !== "string" || !uuid.test(body.unitId))) {
        throw errorResponse("Invalid unitId", 400);
      }

      const token = generateToken();
      const tokenHash = await sha256Hex(token);
      const expiresAt = new Date(Date.now() + CLAIM_TTL_MS).toISOString();

      const { data, error } = await ctx.supabase.rpc("request_tenant_claim", {
        p_manager_id: ctx.user.id,
        p_email: email,
        p_property_id: body.propertyId,
        p_unit_id: body.unitId ?? null,
        p_token_hash: tokenHash,
        p_expires_at: expiresAt,
      });

      if (error) {
        // Ownership / approval failures are the caller's own problem, not an existence oracle.
        if (error.code === "42501") throw errorResponse("Forbidden: property or unit is not in your managed portfolio", 403);
        console.error("[claim-tenant] request failed", error.code ?? "");
        throw errorResponse("Could not create the consent request", 500);
      }

      const row = Array.isArray(data) ? data[0] : null;
      if (row) {
        const appUrl = getEnv("SITE_URL", "https://www.calqulus.site").replace(/\/$/, "");
        // Fragment, not query: not sent to the server, logs, analytics or Referer.
        const link = `${appUrl}/tenant/claim#t=${token}`;
        const html = `<p>Hello ${escapeHtml(String(row.tenant_name ?? ""))},</p>
<p>A property manager has asked to add you to <strong>${escapeHtml(String(row.property_name ?? "a property"))}</strong> on CALQULUS. Nothing changes unless you approve it.</p>
<p><a href="${escapeHtml(link)}">Review the request</a> (sign in with this email address). The link works once and expires in 3 days.</p>
<p>If you did not expect this, ignore this email.</p>`;
        const sent = await sendEmail({
          to: [String(row.tenant_email)],
          subject: "A manager has asked to add you to a property",
          html,
          displayName: "CALQULUS",
        });
        if (!sent.ok) console.error("[claim-tenant] email not sent", sent.kind);
      }

      return GENERIC;
    },
  ),
);
