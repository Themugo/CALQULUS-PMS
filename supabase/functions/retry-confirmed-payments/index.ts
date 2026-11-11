/**
 * retry-confirmed-payments — service-only job.
 *
 * Re-applies payments Safaricom confirmed but whose allocation failed (the transaction is still
 * pending with a provider receipt and no allocations). Calls process-payment exactly as the
 * callback does; allocation is idempotent, so running this twice is harmless.
 *
 * Schedule from Supabase cron every 5-10 minutes with the service-role key as the bearer.
 */
import { serve } from "std/http/server.ts";
import { createClient } from "supabase/supabase-js@2";
import { requireEnv } from "../_shared/env.ts";
import { invoiceIdsFromTransaction } from "../_shared/partyReceipts.ts";
import { recordWebhookFailure, timingSafeEqual } from "../_shared/webhookHelpers.ts";

const SUPABASE_URL = requireEnv("SUPABASE_URL");
const SERVICE_KEY = requireEnv("SUPABASE_SERVICE_ROLE_KEY");

serve(async (req) => {
  const auth = req.headers.get("Authorization") ?? "";
  if (!timingSafeEqual(auth, `Bearer ${SERVICE_KEY}`)) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } });
  }
  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
  const { data: rows, error } = await supabase.rpc("confirmed_unapplied_payments", { p_min_age_minutes: 5, p_limit: 50 });
  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { "Content-Type": "application/json" } });
  }

  let applied = 0;
  const failed: string[] = [];
  for (const row of (rows ?? []) as Array<{ transaction_id: string; receipt: string; amount: number }>) {
    const { data: tx } = await supabase.from("payment_transactions")
      .select("id, tenant_id, manager_id, invoice_id, notes, unit_id, property_id, unit_number, phone_number, payment_type")
      .eq("id", row.transaction_id).maybeSingle();
    if (!tx) continue;
    const ids = invoiceIdsFromTransaction(tx.notes, tx.invoice_id);
    try {
      const resp = await fetch(`${SUPABASE_URL}/functions/v1/process-payment`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${SERVICE_KEY}` },
        body: JSON.stringify({
          tenantId: tx.tenant_id, managerId: tx.manager_id, amount: Number(row.amount),
          paymentMethod: tx.payment_type === "till" ? "mpesa_till" : "mpesa_stk",
          paymentDate: new Date().toISOString().slice(0, 10), reference: row.receipt,
          invoiceId: ids.length === 1 ? ids[0] : undefined, invoiceIds: ids.length > 1 ? ids : undefined,
          unitId: tx.unit_id, propertyId: tx.property_id, unitNumber: tx.unit_number ?? "N/A",
          phone: tx.phone_number, notes: `M-Pesa receipt ${row.receipt} (retry)`, transactionId: tx.id,
        }),
      });
      if (!resp.ok) throw new Error(`process-payment returned ${resp.status}: ${(await resp.text()).slice(0, 300)}`);
      applied++;
    } catch (e) {
      failed.push(row.transaction_id);
      await recordWebhookFailure(supabase, "mpesa", row.receipt, { source: "retry-confirmed-payments", transactionId: row.transaction_id }, e);
    }
  }
  return new Response(JSON.stringify({ checked: rows?.length ?? 0, applied, failed }), { headers: { "Content-Type": "application/json" } });
});
