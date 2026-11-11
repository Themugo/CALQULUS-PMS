/**
 * announce-payment — send the receipts and notifications for a payment that is already recorded.
 *
 * Callable by the service key, or by the manager / submanager who owns the transaction (used by
 * the bank-reconciliation screen and receipt-upload approval, which record the payment through
 * an RPC directly from the browser). Exactly-once: claim_payment_announcement_atomic.
 */
import { serve } from "std/http/server.ts";
import {
  withMiddleware,
  errorResponse,
  AuthorizationError,
} from "../_shared/middleware.ts";
import { announcePayment } from "../_shared/paymentAnnouncement.ts";

serve(
  withMiddleware(
    {
      functionName: "announce-payment",
      requireAuth: true,
      allowedRoles: ["manager", "submanager"],
      rateLimit: { maxPerHour: 200, failClosed: true },
    },
    async (req, ctx) => {
      const { transactionId } = await req.json();
      if (!transactionId || typeof transactionId !== "string") {
        throw errorResponse("transactionId required", 400);
      }
      const { data: tx } = await ctx.supabase
        .from("payment_transactions").select("id, manager_id, status").eq("id", transactionId).maybeSingle();
      if (!tx) throw errorResponse("Payment not found", 404);

      let allowed = ctx.user!.id === "service-role" || tx.manager_id === ctx.user!.id;
      if (!allowed && ctx.user!.role === "submanager") {
        const { data: rel } = await ctx.supabase.from("manager_submanagers")
          .select("manager_id").eq("submanager_user_id", ctx.user!.id).eq("manager_id", tx.manager_id).maybeSingle();
        allowed = !!rel;
      }
      if (!allowed) throw new AuthorizationError("This payment is outside your portfolio");
      if (tx.status !== "completed") throw errorResponse("Only completed payments can be announced", 409);

      return await announcePayment(ctx.supabase, transactionId);
    },
  ),
);
