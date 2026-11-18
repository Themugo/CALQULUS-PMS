import { serve } from "std/http/server.ts";
import { getCorsHeaders, preflightResponse } from "../_shared/cors.ts";
import { authenticateUser } from "../_shared/auth.ts";
import { checkRoleAccess } from "../_shared/authorization.ts";
import { checkRateLimit, rateLimitResponse } from "../_shared/rateLimit.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") return preflightResponse(req);

  const auth = await authenticateUser(req, { allowServiceRole: true });
  if (!auth.success) return auth.response;

  const supabase = auth.supabaseAdmin;
  const callerUserId = auth.user.id === "service-role" ? null : auth.user.id;

  // ── Authorization ──────────────────────────────────────────────────
  // Only a webhost (or the cron/service-role caller) may sweep overdue
  // invoices platform-wide. A "manager" caller is scoped to their own
  // portfolio below — checkRoleAccess only confirms the caller HAS a
  // manager/webhost role somewhere, it doesn't scope the query, so
  // without that scoping any manager could previously trigger penalty
  // invoices against every OTHER manager's overdue tenants too.
  let scopeToManagerId: string | null = null;
  if (callerUserId) {
    const roleCheck = await checkRoleAccess(callerUserId, ["webhost", "manager"]);
    if (!roleCheck.allowed) {
      return new Response(JSON.stringify({ error: roleCheck.error ?? "Forbidden" }),
        { status: 403, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } });
    }

    const { data: webhostRole } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", callerUserId)
      .eq("role", "webhost")
      .maybeSingle();
    if (!webhostRole) {
      scopeToManagerId = callerUserId;
    }

    const allowed = await checkRateLimit(
      supabase, callerUserId, "apply-penalties", 3,
      { failClosed: true },
    );
    if (!allowed) return rateLimitResponse(req);
  }

  try {
    const today = new Date().toISOString().slice(0, 10);

    let overdueQuery = supabase
      .from("invoices")
      .select("id, amount, balance_due, invoice_type, unit_id, tenant_id, invoice_number, manager_id, property_id, due_date")
      .eq("status", "overdue")
      // A penalty invoice never attracts a further penalty (no penalty-on-penalty).
      .neq("invoice_type", "penalty")
      .lt("due_date", today);
    if (scopeToManagerId) {
      overdueQuery = overdueQuery.eq("manager_id", scopeToManagerId);
    }
    const { data: overdueInvoices, error } = await overdueQuery;

    if (error) throw error;

    type Policy = { enabled?: boolean; type?: string; pct?: number; amount?: number; grace_days?: number; max_amount?: number | null };
    const policyCache = new Map<string, Policy>();
    let penaltiesApplied = 0;

    for (const invoice of overdueInvoices || []) {
      // Penalties are a business decision: resolved per property from the
      // operator's / landlord's configured policy. Nothing configured => no penalty.
      let policy = policyCache.get(invoice.property_id);
      if (!policy) {
        const { data: resolved, error: policyError } = await supabase.rpc(
          "resolve_late_penalty_policy", { p_property_id: invoice.property_id },
        );
        if (policyError) throw policyError;
        policy = resolved as Policy;
        policyCache.set(invoice.property_id, policy);
      }
      const enabled     = policy?.enabled === true;
      const penaltyType = policy?.type ?? "fixed";
      const penaltyPct  = Number(policy?.pct ?? 0);
      const penaltyAmt  = Number(policy?.amount ?? 0);
      const graceDays   = Number(policy?.grace_days ?? 0);
      const maxAmount   = policy?.max_amount == null ? null : Number(policy.max_amount);

      if (!enabled) continue;

      const daysOverdue = Math.floor((Date.now() - new Date(invoice.due_date).getTime()) / 86_400_000);
      if (daysOverdue < graceDays) continue;

      // Charge on what is still owed, not the original face value: a tenant who
      // has paid most of an invoice must not be penalised on the paid part.
      const outstanding = Number(invoice.balance_due ?? invoice.amount);
      if (!(outstanding > 0)) continue;
      const raw = penaltyType === "percentage"
        ? (outstanding * penaltyPct) / 100
        : Math.min(penaltyAmt, outstanding);
      const penaltyAmount = Math.round((maxAmount != null ? Math.min(raw, maxAmount) : raw) * 100) / 100;

      if (penaltyAmount > 0) {
        // ONE penalty per overdue invoice, ever. The key must not contain the
        // date: with a per-day key this sweep re-penalised every overdue invoice
        // on every run (the old invoice_number lookup never matched because
        // invoice numbers are assigned by a trigger).
        const { error: penaltyError } = await supabase.rpc("create_invoice_atomic_v2", {
          p_generation_key: `penalty:${invoice.id}`, p_lease_id: null, p_tenant_id: invoice.tenant_id,
          p_property_id: invoice.property_id ?? null, p_unit_id: invoice.unit_id ?? null, p_manager_id: invoice.manager_id,
          p_amount: penaltyAmount, p_description: `Late payment penalty — ${invoice.invoice_number} (${daysOverdue} days overdue)`,
          p_due_date: today, p_invoice_type: "penalty", p_line_items: [],
        });
        if (penaltyError) throw penaltyError;
        penaltiesApplied++;
      }
    }

    return new Response(JSON.stringify({ penaltiesApplied, overdueCount: (overdueInvoices || []).length }), {
      headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
    });
  }
});
