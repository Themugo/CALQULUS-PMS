import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { getCorsHeaders, preflightResponse } from "../_shared/cors.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  if (req.method === "OPTIONS") return preflightResponse(req);

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { tenantId, managerId, invoiceId, type, description, amount, evidence } = await req.json();

    if (!tenantId || !type || !description) {
      return new Response(JSON.stringify({ error: "tenantId, type, and description are required" }), {
        status: 400, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
      });
    }

    const { data: dispute, error } = await supabase
      .from("disputes")
      .insert({
        tenant_id: tenantId,
        manager_id: managerId || null,
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
    if (managerId) {
      await supabase.functions.invoke("send-push-notification", {
        body: {
          userId: managerId,
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
