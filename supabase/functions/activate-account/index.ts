import { getCorsHeaders, preflightResponse } from "../_shared/cors.ts";
import { createClient } from "supabase/supabase-js@2";

import { requireEnv, getEnv } from "../_shared/env.ts";
import { checkRateLimit, rateLimitResponse } from "../_shared/rateLimit.ts";
interface ActivateAccountRequest {
  token: string;
  password: string;
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return preflightResponse(req);


  try {

    const { token, password }: ActivateAccountRequest = await req.json();

    if (!token || !password) {
      return new Response(
        JSON.stringify({ error: "Token and password are required" }),
        { status: 400, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
      );
    }

    // Validate password requirements
    if (typeof token !== "string" || typeof password !== "string" || password.length > 72) {
      return new Response(
        JSON.stringify({ error: "Invalid request" }),
        { status: 400, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
      );
    }
    if (password.length < 8) {
      return new Response(
        JSON.stringify({ error: "Password must be at least 8 characters long" }),
        { status: 400, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
      );
    }

    // Check for at least one uppercase, one lowercase, and one number
    const hasUppercase = /[A-Z]/.test(password);
    const hasLowercase = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);

    const hasSpecial = /[^A-Za-z0-9]/.test(password);

    if (!hasUppercase || !hasLowercase || !hasNumber || !hasSpecial) {
      return new Response(
        JSON.stringify({ 
          error: "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character" 
        }),
        { status: 400, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
      );
    }

    // Activation is intentionally unauthenticated, but token use is
    // a credential-bearing operation and must be rate limited.
    const rateLimitClient = createClient(
      requireEnv("SUPABASE_URL"),
      requireEnv("SUPABASE_ANON_KEY")
    );
    // Prefer headers set by the platform edge over the client-appendable
    // first x-forwarded-for hop.
    const clientKey =
      req.headers.get("cf-connecting-ip")?.trim() ||
      req.headers.get("x-real-ip")?.trim() ||
      req.headers.get("x-forwarded-for")?.split(",").pop()?.trim() ||
      "activation-anonymous";
    const allowed = await checkRateLimit(rateLimitClient, clientKey, "activate-account", 10, { failClosed: true });
    if (!allowed) return rateLimitResponse(req);

    // Use service role client to validate and use the token
    const supabaseAdmin = createClient(
      getEnv("SUPABASE_URL"),
      getEnv("SUPABASE_SERVICE_ROLE_KEY")
    );

    // Validate the activation token using the database function
    const { data: tokenData, error: validateError } = await supabaseAdmin
      .rpc("validate_activation_token", { token_value: token });

    if (validateError) {
      console.error("Error validating token:", validateError);
      return new Response(
        JSON.stringify({ error: "Failed to validate activation token" }),
        { status: 500, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
      );
    }

    if (!tokenData || tokenData.length === 0) {
      return new Response(
        JSON.stringify({ 
          error: "Invalid or expired activation link. Please contact your property manager for a new activation link." 
        }),
        { status: 400, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
      );
    }

    const { user_id, email } = tokenData[0];

    // Consume the token FIRST (single-use, atomic in the database). Setting the
    // password before consuming allowed two concurrent requests to both succeed.
    const { data: tokenUsed, error: useError } = await supabaseAdmin
      .rpc("use_activation_token", { token_value: token });

    if (useError || !tokenUsed) {
      if (useError) console.error("Error consuming activation token:", useError);
      return new Response(
        JSON.stringify({
          error: "Invalid or expired activation link. Please contact your property manager for a new activation link."
        }),
        { status: 400, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
      );
    }

    // Update the user's password
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      user_id,
      { password }
    );

    if (updateError) {
      console.error("Error updating password:", updateError);
      return new Response(
        JSON.stringify({ error: "Failed to set password. Please request a new activation link." }),
        { status: 500, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        email,
        message: "Your account has been activated. You can now log in with your email and password.",
      }),
      { status: 200, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error in activate-account:", error);
    return new Response(
      JSON.stringify({ error: "Activation failed. Please try again." }),
      { status: 500, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
    );
  }
});
