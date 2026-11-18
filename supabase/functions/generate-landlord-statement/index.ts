import { serve } from "std/http/server.ts";
import { getCorsHeaders, preflightResponse } from "../_shared/cors.ts";
import { createClient } from "supabase/supabase-js@2";

import { requireEnv } from "../_shared/env.ts";
import { identifyUserServiceOrCron } from "../_shared/assertCaller.ts";
serve(async (req) => {
  if (req.method === "OPTIONS") return preflightResponse(req);
  const gate = await identifyUserServiceOrCron(req);
  if (!gate.ok) return gate.response;

  try {
    const supabase = createClient(
      requireEnv("SUPABASE_URL"),
      requireEnv("SUPABASE_SERVICE_ROLE_KEY")
    );

    const { landlordId, month, propertyId } = await req.json();
    if (!landlordId || !month) {
      return new Response(JSON.stringify({ error: "landlordId and month required" }), {
        status: 400, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
      });
    }

    if (gate.userId && gate.userId !== landlordId) {
      const { data: link } = await supabase
        .from("property_landlords")
        .select("id")
        .eq("landlord_user_id", landlordId)
        .eq("manager_id", gate.userId)
        .limit(1);
      if (!link?.length) {
        return new Response(JSON.stringify({ error: "Forbidden" }), {
          status: 403, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
        });
      }
    }

    const start = `${month}-01`;
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(String(month))) {
      return new Response(JSON.stringify({ error: "month must be YYYY-MM" }), {
        status: 400, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
      });
    }
    const [yy, mm] = String(month).split("-").map(Number);
    // Exclusive upper bound (first instant of next month) so nothing on the last day is lost.
    const nextStart = new Date(Date.UTC(yy, mm, 1)).toISOString().slice(0, 10);
    const end = new Date(Date.UTC(yy, mm, 0)).toISOString().slice(0, 10);

    // Properties this landlord owns: the property_landlords link (supports
    // co-owners, with revenue_share_pct) plus the legacy properties.landlord_id.
    const { data: links } = await supabase
      .from("property_landlords")
      .select("property_id, revenue_share_pct")
      .eq("landlord_user_id", landlordId);
    const shareByProperty = new Map<string, number>();
    for (const l of links || []) shareByProperty.set(l.property_id, Number(l.revenue_share_pct ?? 100));
    const { data: legacyProps } = await supabase.from("properties").select("id").eq("landlord_id", landlordId);
    for (const p of legacyProps || []) if (!shareByProperty.has(p.id)) shareByProperty.set(p.id, 100);

    let propIds = [...shareByProperty.keys()];
    if (propertyId) {
      // The supplied property must really belong to this landlord, otherwise a
      // caller could pull another landlord's income statement.
      if (!shareByProperty.has(propertyId)) {
        return new Response(JSON.stringify({ error: "Forbidden" }), {
          status: 403, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
        });
      }
      propIds = [propertyId];
    }
    // No properties => empty statement. (Never fall through to an unscoped query:
    // that would sum every payment on the platform.)
    if (propIds.length === 0) {
      return new Response(JSON.stringify({
        month, landlordId, payments: [], deductions: [],
        summary: { totalIncome: 0, totalDeductions: 0, net: 0 },
      }), { headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } });
    }

    // Completed payments only, dated by completion (falling back to creation).
    const paymentsQuery = supabase
      .from("payments")
      .select("*, invoices(invoice_number, due_date, tenants(name, unit))")
      .eq("status", "completed")
      .in("property_id", propIds)
      .or(`and(completed_at.gte.${start},completed_at.lt.${nextStart}),and(completed_at.is.null,created_at.gte.${start},created_at.lt.${nextStart})`);

    const { data: payments, error: paymentsError } = await paymentsQuery;
    if (paymentsError) throw paymentsError;

    // Fetch deductions (commissions, expenses) for the period
    const { data: deductions } = await supabase
      .from("property_deductions")
      .select("*")
      .eq("landlord_id", landlordId)
      .or(`is_recurring.eq.true,and(effective_date.gte.${start},effective_date.lte.${end})`);

    // Landlord's share of each payment (co-owners split by revenue_share_pct).
    const round2 = (n: number) => Math.round(n * 100) / 100;
    const totalIncome = round2((payments || []).reduce((s: number, p: any) =>
      s + Number(p.amount) * (shareByProperty.get(p.property_id) ?? 100) / 100, 0));

    // Calculate deductions
    let totalDeductions = 0;
    const deductionItems: any[] = [];
    for (const d of deductions || []) {
      const amount = d.deduction_type === "percentage"
        ? (totalIncome * Number(d.amount)) / 100
        : Number(d.amount);
      totalDeductions += amount;
      deductionItems.push({ name: d.name, type: d.deduction_type, raw: d.amount, computed: amount });
    }

    totalDeductions = round2(totalDeductions);
    const net = round2(totalIncome - totalDeductions);

    return new Response(JSON.stringify({
      month,
      landlordId,
      payments: payments || [],
      deductions: deductionItems,
      summary: { totalIncome, totalDeductions, net },
    }), { headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
    });
  }
});
