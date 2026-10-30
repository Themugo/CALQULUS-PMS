import { getCorsHeaders, preflightResponse } from "../_shared/cors.ts";
import { createClient } from "supabase/supabase-js@2";

import { requireEnv, getEnv } from "../_shared/env.ts";
import { checkRateLimit, rateLimitResponse } from "../_shared/rateLimit.ts";
import { isWellFormedToken } from "../_shared/tokens.ts";

/**
 * activate-account — unauthenticated, token-bearing, so every request is rate
 * limited first and the token is handled only as an opaque secret:
 *   { token, validateOnly: true }  -> { valid, maskedEmail }   (no state change)
 *   { token, password }            -> consumes the token atomically and sets the
 *                                     password of the account the token belongs to.
 * Tokens are stored hashed (migration 20260909000004); the raw value is never
 * logged or echoed.
 */
interface ActivateAccountRequest {
  token: string;
  password?: string;
  validateOnly?: boolean;
}

function maskEmail(email: string): string {
  const [local = "", domain = ""] = String(email).split("@");
  return `${local.slice(0, 1)}***@${domain}`;
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return preflightResponse(req);

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
    });

  try {
    const body = (await req.json().catch(() => ({}))) as Partial<ActivateAccountRequest>;
    const { token, password, validateOnly } = body;

    // Activation is intentionally unauthenticated, but token use is a
    // credential-bearing operation and must be rate limited. Prefer headers
    // set by the platform edge over the client-appendable first x-forwarded-for hop.
    const rateLimitClient = createClient(requireEnv("SUPABASE_URL"), requireEnv("SUPABASE_ANON_KEY"));
    const clientKey =
      req.headers.get("cf-connecting-ip")?.trim() ||
      req.headers.get("x-real-ip")?.trim() ||
      req.headers.get("x-forwarded-for")?.split(",").pop()?.trim() ||
      "activation-anonymous";
    const allowed = await checkRateLimit(
      rateLimitClient, clientKey, validateOnly ? "activate-account-validate" : "activate-account", 10, { failClosed: true },
    );
    if (!allowed) return rateLimitResponse(req);

    if (!isWellFormedToken(token)) {
      // Same answer for malformed and unknown tokens.
      return json({ error: "Invalid or expired activation link. Please contact your property manager for a new activation link." }, 400);
    }

    const supabaseAdmin = createClient(getEnv("SUPABASE_URL"), getEnv("SUPABASE_SERVICE_ROLE_KEY"));

    if (validateOnly === true) {
      const { data, error } = await supabaseAdmin.rpc("validate_activation_token", { token_value: token });
      if (error) {
        console.error("[activate-account] validate failed", error.code ?? "");
        return json({ valid: false }, 500);
      }
      const row = Array.isArray(data) ? data[0] : null;
      return json(row ? { valid: true, maskedEmail: maskEmail(row.email) } : { valid: false });
    }

    if (typeof password !== "string") return json({ error: "Token and password are required" }, 400);
    if (password.length > 72) return json({ error: "Invalid request" }, 400);
    if (password.length < 8) return json({ error: "Password must be at least 8 characters long" }, 400);
    if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password) || !/[^A-Za-z0-9]/.test(password)) {
      return json({
        error: "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character",
      }, 400);
    }

    // Consume FIRST and atomically: the same statement that burns the token
    // returns the account it belongs to, so the password can only be set on
    // that account, and two concurrent requests cannot both succeed.
    const { data: consumed, error: consumeError } = await supabaseAdmin
      .rpc("consume_activation_token", { token_value: token });
    if (consumeError) {
      console.error("[activate-account] consume failed", consumeError.code ?? "");
      return json({ error: "Activation failed. Please try again." }, 500);
    }
    const row = Array.isArray(consumed) ? consumed[0] : null;
    if (!row) {
      return json({ error: "Invalid or expired activation link. Please contact your property manager for a new activation link." }, 400);
    }

    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(row.user_id, { password });
    if (updateError) {
      console.error("[activate-account] password update failed", updateError.status ?? "");
      return json({ error: "Failed to set password. Please request a new activation link." }, 500);
    }

    return json({
      success: true,
      email: row.email,
      message: "Your account has been activated. You can now log in with your email and password.",
    });
  } catch (error: unknown) {
    console.error("[activate-account] unexpected error", error instanceof Error ? error.name : "error");
    return json({ error: "Activation failed. Please try again." }, 500);
  }
});
