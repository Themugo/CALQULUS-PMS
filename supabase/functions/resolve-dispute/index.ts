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
    // Previously unauthenticated. This function can create a real
    // financial credit/debit adjustment (other_charges insert) from an
    // arbitrary adjustmentAmount — the most sensitive of the dispute
    // functions. Only the manager who owns the disputed tenant (or a
    // webhost admin) may resolve it.
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
    if (!["manager", "submanager", "webhost"].includes(callerRole)) {
      return new Response(JSON.stringify({ error: "Forbidden: only managers or platform admins may resolve disputes" }),
        { status: 403, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } });
    }

    const allowed = await checkRateLimit(supabase, caller.id, "resolve-dispute", 30, { failClosed: true });
    if (!allowed) return rateLimitResponse(req);

    const { disputeId, resolution, adjustmentAmount, notes } = await req.json();

    if (!disputeId || !resolution) {
      return new Response(JSON.stringify({ error: "disputeId and resolution required" }), {
        status: 400, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
      });
    }

    const { data: dispute, error: fetchError } = await supabase
      .from("disputes")
      .select("*, tenants(id, name, manager_id)")
      .eq("id", disputeId)
      .single();

    if (fetchError || !dispute) throw new Error("Dispute not found");

    if (callerRole !== "webhost") {
      let effectiveManagerId = caller.id;
      if (callerRole === "submanager") {
        const { data: rel } = await supabase.from("manager_submanagers")
          .select("manager_id").eq("submanager_user_id", caller.id).maybeSingle();
        effectiveManagerId = (rel as any)?.manager_id ?? caller.id;
      }
      const disputeTenant = (dispute as any).tenants;
      if (!disputeTenant || disputeTenant.manager_id !== effectiveManagerId) {
        return new Response(JSON.stringify({ error: "Forbidden: dispute is not in your managed portfolio" }), {
          status: 403, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
        });
      }
    }

    const { error } = await supabase
      .from("disputes")
      .update({
        status: "resolved",
        resolution,
        resolved_by: caller.id,
        adjustment_amount: adjustmentAmount || null,
        resolution_notes: notes || null,
        resolved_at: new Date().toISOString(),
      })
      .eq("id", disputeId);

    if (error) throw error;

    // If there's a credit/debit adjustment, create an other_charge record
    if (adjustmentAmount && dispute.invoice_id) {
      await supabase.from("other_charges").insert({
        tenant_id: dispute.tenant_id,
        invoice_id: dispute.invoice_id,
        description: `Dispute adjustment — ${resolution}`,
        amount: Math.abs(adjustmentAmount),
        charge_type: adjustmentAmount < 0 ? "credit" : "charge",
        status: "pending",
      });
    }

    // Notify tenant
    if (dispute.tenant_id) {
      await supabase.functions.invoke("send-push-notification", {
        body: {
          userId: dispute.tenant_id,
          title: "Dispute resolved",
          body: `Your dispute has been resolved: ${resolution}`,
        },
      }).catch(() => {});
    }

    return new Response(JSON.stringify({ success: true, disputeId, resolution }), {
      headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
    });
  }
});
