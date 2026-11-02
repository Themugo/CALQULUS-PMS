/**
 * recall-credit/index.ts
 * Manager-initiated recall of a tenant's advance (overpayment) credit.
 * The ledger write is atomic in recall_tenant_credit_atomic, which also enforces
 * manager / submanager mandate using the caller's own JWT, so this function calls
 * it as the user (not service role). Money is returned out-of-band.
 */
import { serve } from "std/http/server.ts";
import { getCorsHeaders, preflightResponse } from "../_shared/cors.ts";
import { createClient } from "supabase/supabase-js@2";
import { requireEnv } from "../_shared/env.ts";
import { authenticateUser } from "../_shared/auth.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") return preflightResponse(req);
  const headers = { ...getCorsHeaders(req), "Content-Type": "application/json" };
  try {
    const caller = await authenticateUser(req);
    if (!caller.success) return caller.response;
    const body = await req.json();
    const tenantId = String(body.tenant_id ?? "");
    const amount = Number(body.amount);
    const reason = String(body.reason ?? "").trim();
    if (!tenantId || !Number.isFinite(amount) || amount <= 0 || !reason) {
      return new Response(JSON.stringify({ error: "tenant_id, a positive amount and a reason are required" }), { status: 400, headers });
    }
    const userClient = createClient(requireEnv("SUPABASE_URL"), requireEnv("SUPABASE_ANON_KEY"), {
      global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
      auth: { persistSession: false },
    });
    const { data, error } = await userClient.rpc("recall_tenant_credit_atomic", {
      p_tenant_id: tenantId, p_amount: amount, p_reason: reason,
    });
    if (error) {
      const forbidden = error.code === "42501";
      return new Response(JSON.stringify({ error: forbidden ? "Forbidden" : error.message }), { status: forbidden ? 403 : 400, headers });
    }
    return new Response(JSON.stringify(data), { status: 200, headers });
  } catch (error) {
    console.error("[recall-credit] error:", error);
    return new Response(JSON.stringify({ error: "Unable to recall credit" }), { status: 400, headers });
  }
});
