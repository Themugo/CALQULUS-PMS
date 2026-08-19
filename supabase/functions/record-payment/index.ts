/**
 * record-payment/index.ts
 *
 * Manager/submanager manually records a payment for any channel.
 * Supports: M-Pesa code entry, bank ref entry, receipt confirmation.
 *
 * This is the "admin entry point" — when the manager knows money
 * arrived but it wasn't auto-captured by STK or bank webhook.
 *
 * Uses unified middleware for authentication and rate limiting.
 * SECURITY: Fail-closed rate limiting for financial operations.
 */

import { serve } from "std/http/server.ts";
import { requireEnv } from "../_shared/env.ts";
import {
  withMiddleware,
  errorResponse,
  AuthorizationError,
} from "../_shared/middleware.ts";

const SUPABASE_URL = requireEnv("SUPABASE_URL");
const SERVICE_KEY = requireEnv("SUPABASE_SERVICE_ROLE_KEY");

serve(
  withMiddleware(
    {
      functionName: "record-payment",
      requireAuth: true,
      allowedRoles: ["manager", "submanager"],
      rateLimit: { maxPerHour: 100, failClosed: true },
    },
    async (req, ctx) => {
      const body = await req.json();
      const {
        tenantId,
        invoiceId,
        amount,
        paymentMethod = "mpesa_ussd",
        reference,
        paymentDate,
        notes,
        isInstallment = false,
        instalmentCount,
      } = body;

      if (!tenantId || typeof amount !== "number" || !isFinite(amount) || amount <= 0 || !reference) {
        throw errorResponse("tenantId, positive amount, and reference required", 400);
      }

      let effectiveManagerId = ctx.user!.id;
      if (ctx.user!.role === "submanager") {
        const { data: rel } = await ctx.supabase
          .from("manager_submanagers")
          .select("manager_id")
          .eq("submanager_user_id", ctx.user!.id)
          .maybeSingle();
        effectiveManagerId = rel?.manager_id ?? ctx.user!.id;
      }

      const { data: tenantOwner } = await ctx.supabase
        .from("tenants")
        .select("manager_id, property_id")
        .eq("id", tenantId)
        .maybeSingle();

      if (!tenantOwner || tenantOwner.manager_id !== effectiveManagerId) {
        throw new AuthorizationError("Tenant is not in your managed portfolio");
      }

      if (ctx.user!.role === "submanager") {
        const { data: perms } = await ctx.supabase
          .from("submanager_permissions")
          .select("restrict_to_assigned_properties")
          .eq("submanager_user_id", ctx.user!.id)
          .maybeSingle();
        if (perms?.restrict_to_assigned_properties) {
          const { data: assigned } = await ctx.supabase
            .from("submanager_property_assignments")
            .select("property_id")
            .eq("submanager_user_id", ctx.user!.id);
          const allowed = new Set((assigned ?? []).map((row: { property_id: string }) => row.property_id));
          if (!tenantOwner.property_id || !allowed.has(tenantOwner.property_id)) {
            throw new AuthorizationError("Tenant is outside your assigned properties");
          }
        }
      }

      if (isInstallment && instalmentCount && instalmentCount > 1) {
        const { data: unpaidInvoices } = await ctx.supabase
          .from("invoices")
          .select("id, amount, balance_due, original_amount")
          .eq("tenant_id", tenantId)
          .in("status", ["pending", "overdue"])
          .order("due_date", { ascending: true });

        const totalOwed = (unpaidInvoices ?? []).reduce(
          (s, i: any) => s + Number(i.balance_due ?? i.amount), 0
        );
        const instalmentAmount = Math.ceil(totalOwed / instalmentCount);

        await ctx.supabase.from("arrears_schedule").insert({
          tenant_id: tenantId,
          manager_id: effectiveManagerId,
          invoice_id: invoiceId ?? null,
          total_owed: totalOwed,
          instalment_count: instalmentCount,
          instalment_amount: instalmentAmount,
          status: "active",
          start_date: paymentDate ?? new Date().toISOString().slice(0, 10),
          next_due_date: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
          notes: notes ?? `Installment plan: ${instalmentCount} payments of ${instalmentAmount}`,
        });

        if (invoiceId) {
          await ctx.supabase
            .from("invoices")
            .update({ installment_plan: true })
            .eq("id", invoiceId);
        }
      }

      try {
        const processRes = await fetch(`${SUPABASE_URL}/functions/v1/process-payment`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${SERVICE_KEY}`,
          },
          body: JSON.stringify({
            tenantId,
            managerId: effectiveManagerId,
            amount: Number(amount),
            paymentMethod,
            paymentDate: paymentDate ?? new Date().toISOString().slice(0, 10),
            reference,
            invoiceId: invoiceId ?? undefined,
            recordedBy: ctx.user!.id,
            notes,
          }),
        });

        const result = await processRes.json().catch(() => ({ error: "Invalid response from payment service" }));

        if (!processRes.ok) {
          throw errorResponse(result.error || "Payment processing failed", processRes.status);
        }

        return result;
      } catch (err) {
        if (err instanceof Response) throw err;
        throw errorResponse("Payment service unreachable. Please retry.", 502);
      }
    }
  )
);
