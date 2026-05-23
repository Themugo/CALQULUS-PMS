/**
 * bootstrap-webhost/index.ts
 *
 * ONE-TIME USE: Creates the first webhost administrator account.
 * Can only be called when ZERO webhost accounts exist on the platform.
 * Once a webhost exists, this function permanently refuses to run.
 *
 * Call via Supabase Dashboard → Edge Functions → Test, or:
 *   curl -X POST https://<project-ref>.supabase.co/functions/v1/bootstrap-webhost \
 *     -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
 *     -H "Content-Type: application/json" \
 *     -d '{"email":"admin@yourplatform.com","password":"StrongPassword123!","fullName":"Platform Admin","bootstrapSecret":"your-secret"}'
 *
 * BOOTSTRAP_SECRET env var must be set in Supabase before calling.
 * After calling: delete or disable this function — it's not needed again.
 */
import { getCorsHeaders, preflightResponse } from "../_shared/cors.ts";
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  if (req.method === "OPTIONS") return preflightResponse(req);

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_KEY  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const BOOTSTRAP_SECRET = Deno.env.get("BOOTSTRAP_SECRET");

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false },
  });

  try {
    const { email, password, fullName, bootstrapSecret } = await req.json();

    // ── 1. Validate bootstrap secret ──────────────────────────────────
    if (!BOOTSTRAP_SECRET) {
      return Response.json(
        { error: "BOOTSTRAP_SECRET env var not set. Set it in Supabase Edge Function secrets first." },
        { status: 500, headers: getCorsHeaders(req) }
      );
    }
    if (bootstrapSecret !== BOOTSTRAP_SECRET) {
      return Response.json({ error: "Invalid bootstrap secret" }, { status: 403, headers: getCorsHeaders(req) });
    }

    // ── 2. Validate inputs ─────────────────────────────────────────────
    if (!email || !password || !fullName) {
      return Response.json({ error: "email, password, and fullName are required" }, { status: 400, headers: getCorsHeaders(req) });
    }
    if (password.length < 10) {
      return Response.json({ error: "Password must be at least 10 characters for the platform admin" }, { status: 400, headers: getCorsHeaders(req) });
    }

    // ── 3. GUARD: refuse if any webhost already exists ─────────────────
    const { count: existingWebhosts } = await supabase
      .from("user_roles")
      .select("*", { count: "exact", head: true })
      .eq("role", "webhost");

    if ((existingWebhosts ?? 0) > 0) {
      return Response.json(
        { error: "Bootstrap refused: a webhost admin already exists. This function can only run once." },
        { status: 409, headers: getCorsHeaders(req) }
      );
    }

    // ── 4. Create auth user ────────────────────────────────────────────
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email:          email.toLowerCase().trim(),
      password,
      email_confirm:  true,
      user_metadata:  { full_name: fullName },
    });
    if (authError) throw authError;
    const userId = authData.user.id;

    // ── 5. Create profile ──────────────────────────────────────────────
    await supabase.from("profiles").upsert({
      id:        userId,
      full_name: fullName,
      email:     email.toLowerCase().trim(),
    });

    // ── 6. Create webhost role (super_admin) ───────────────────────────
    const { error: roleError } = await supabase.from("user_roles").insert({
      user_id:         userId,
      role:            "webhost",
      approval_status: "approved",
    });
    if (roleError) throw roleError;

    // ── 7. Create admin_permissions row ───────────────────────────────
    await supabase.from("admin_permissions").upsert({
      user_id:     userId,
      admin_level: "super_admin",
    }, { onConflict: "user_id" });

    // ── 8. Log in security audit ───────────────────────────────────────
    await supabase.from("security_audit_log").insert({
      user_id:       userId,
      event_type:    "bootstrap_webhost_created",
      resource_type: "user_roles",
      resource_id:   userId,
      details:       { email, full_name: fullName, admin_level: "super_admin" },
      severity:      "critical",
    });

    return Response.json({
      success:  true,
      userId,
      email:    email.toLowerCase().trim(),
      message:  "Webhost admin created. Log in at /webhost/login. IMPORTANT: delete or disable this edge function now — it is no longer needed.",
      loginUrl: "/webhost/login",
    }, { headers: getCorsHeaders(req) });

  } catch (err: any) {
    console.error("[BOOTSTRAP] Error:", err);
    return Response.json({ error: err.message }, { status: 500, headers: getCorsHeaders(req) });
  }
});
