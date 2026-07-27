import { serve } from "std/http/server.ts";
import { getCorsHeaders, preflightResponse } from "../_shared/cors.ts";
import { createClient } from "supabase/supabase-js@2";
import { checkRateLimit, rateLimitResponse } from "../_shared/rateLimit.ts";

import { requireEnv } from "../_shared/env.ts";
serve(async (req) => {
  if (req.method === "OPTIONS") return preflightResponse(req);

  try {
    const supabase = createClient(
      requireEnv("SUPABASE_URL"),
      requireEnv("SUPABASE_SERVICE_ROLE_KEY")
    );

    // ── Caller authentication ─────────────────────────────────────────
    // Previously unauthenticated — any logged-in user could file a
    // dispute against any tenantId/invoiceId with a forged disputed
    // amount. Tenants may file about their own account; managers may
    // file on behalf of a tenant in their portfolio.
    const authHeader = req.headers.get("Authorization") ?? "";
    const { data: { user: caller }, error: authErr } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", "")
    );
    if (authErr || !caller) {
      return new Response(JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } });
    }

    const { data: roleRow } = await supabase.from("user_roles")
      .select("role").eq("user_id", caller.id).maybeSingle();
    const callerRole = (roleRow as any)?.role;
    if (!["tenant", "manager", "submanager", "webhost"].includes(callerRole)) {
      return new Response(JSON.stringify({ error: "Forbidden" }),
        { status: 403, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } });
    }

    const allowed = await checkRateLimit(supabase, caller.id, "create-dispute", 20, { failClosed: true });
    if (!allowed) return rateLimitResponse(req);

    const { tenantId, managerId, invoiceId, type, description, amount, evidence } = await req.json();

    if (!tenantId || !type || !description) {
      return new Response(JSON.stringify({ error: "tenantId, type, and description are required" }), {
        status: 400, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
      });
    }

    if (callerRole === "tenant" && tenantId !== caller.id) {
      return new Response(JSON.stringify({ error: "Forbidden: you can only file disputes on your own account" }), {
        status: 403, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
      });
    }

    let effectiveManagerId: string | null = managerId ?? null;
    if (["manager", "submanager"].includes(callerRole)) {
      effectiveManagerId = caller.id;
      if (callerRole === "submanager") {
        const { data: rel } = await supabase.from("manager_submanagers")
          .select("manager_id").eq("submanager_user_id", caller.id).maybeSingle();
        effectiveManagerId = (rel as any)?.manager_id ?? caller.id;
      }
      const { data: tenantOwner } = await supabase.from("tenants").select("manager_id").eq("id", tenantId).maybeSingle();
      if (!tenantOwner || (tenantOwner as any).manager_id !== effectiveManagerId) {
        return new Response(JSON.stringify({ error: "Forbidden: tenant is not in your managed portfolio" }), {
          status: 403, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
        });
      }
    } else if (callerRole === "tenant") {
      // Derive the manager server-side rather than trusting the client-supplied managerId.
      const { data: tenantRow } = await supabase.from("tenants").select("manager_id").eq("id", tenantId).maybeSingle();
      effectiveManagerId = (tenantRow as any)?.manager_id ?? null;
    }

    const { data: dispute, error } = await supabase
      .from("disputes")
      .insert({
        tenant_id: tenantId,
        manager_id: effectiveManagerId,
        invoice_id: invoiceId || null,
        dispute_type: type,
        description: description.trim(),
        disputed_amount: amount || null,
        evidence_urls: evidence || [],
        status: "open",
        opened_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;

    // Notify manager
    if (effectiveManagerId) {
      await supabase.functions.invoke("send-push-notification", {
        body: {
          userId: effectiveManagerId,
          title: "New dispute filed",
          body: `A tenant has filed a ${type} dispute. Please review.`,
        },
      }).catch(() => {});
    }

    return new Response(JSON.stringify({ success: true, dispute }), {
      headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
    });
  }
});
