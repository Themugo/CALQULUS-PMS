import { serve } from "std/http/server.ts";
import { getCorsHeaders, preflightResponse } from "../_shared/cors.ts";
import { createClient } from "supabase/supabase-js@2";
import { checkRateLimit, rateLimitResponse } from "../_shared/rateLimit.ts";
import { requireEnv } from "../_shared/env.ts";

const SUPABASE_URL = requireEnv("SUPABASE_URL");
const SERVICE_KEY  = requireEnv("SUPABASE_SERVICE_ROLE_KEY");

serve(async (req) => {
  if (req.method === "OPTIONS") return preflightResponse(req);

  try {
    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

    // ── Caller authentication ─────────────────────────────────────────
    // CRITICAL, and also factually broken: previously unauthenticated,
    // AND it called `initiate-mpesa-payment` with a payout-shaped body
    // (phone/amount/reference) — but that function is actually a
    // Paystack invoice-COLLECTION endpoint expecting invoiceId/
    // invoiceNumber/email (collecting rent FROM a tenant), not a
    // disbursement mechanism. There is no real "send money to a
    // landlord" integration anywhere in this codebase — no B2C M-Pesa,
    // no bank transfer API. This function is rebuilt to do only what
    // the real payout_requests schema supports: mark a request
    // "approved" by a platform admin. Actually paying the landlord
    // (bank transfer / M-Pesa) happens manually outside the system;
    // a separate action should then call mark-payout-paid (or similar)
    // to record paid_at once that manual transfer is confirmed.
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
    if ((roleRow as any)?.role !== "webhost") {
      return new Response(JSON.stringify({ error: "Forbidden: only platform admins may approve payout requests" }),
        { status: 403, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } });
    }

    const allowed = await checkRateLimit(supabase, caller.id, "execute-payout", 20, { failClosed: true });
    if (!allowed) return rateLimitResponse(req);

    const { payoutId } = await req.json();
    if (!payoutId) {
      return new Response(JSON.stringify({ error: "payoutId required" }), {
        status: 400, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
      });
    }

    // Atomically claim the request: only proceed if it's still "pending",
    // so two concurrent approvals can't both succeed.
    const { data: approved, error: claimErr } = await supabase
      .from("payout_requests")
      .update({ status: "approved", approved_at: new Date().toISOString(), approved_by: caller.id })
      .eq("id", payoutId)
      .eq("status", "pending")
      .select("*")
      .maybeSingle();

    if (claimErr || !approved) {
      return new Response(JSON.stringify({ error: "Payout request not found or not in pending status" }), {
        status: 400, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
      });
    }

    // Notify the landlord that their request was approved (actual funds
    // transfer happens manually outside this system).
    await supabase.functions.invoke("send-push-notification", {
      body: {
        userId: approved.landlord_user_id,
        title: "Payout approved",
        body: `Your payout request of KES ${Number(approved.amount).toLocaleString()} has been approved.`,
      },
    }).catch(() => {});

    return new Response(JSON.stringify({ success: true, payoutId, status: "approved" }), {
      headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
    });
  }
});
