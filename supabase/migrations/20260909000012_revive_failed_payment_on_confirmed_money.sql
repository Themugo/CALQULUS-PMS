-- Late-confirmed money on a transaction already marked failed.
--
-- AUDIT FINDING: an STK / Paystack prompt can be marked failed (customer
-- cancelled, 10-minute expiry, a status poll that read "failed") and then the
-- provider later confirms the money actually moved. Both webhooks short-circuited
-- with "already processed" for any non-pending transaction, and
-- process_payment_atomic_core refuses non-pending transactions, so a confirmed
-- payment was never allocated: the customer paid and the invoice stayed unpaid.
--
-- This service-only RPC moves a FAILED transaction (with no allocations) back to
-- pending so the normal allocation path can run. It never touches completed
-- transactions and is a no-op for anything but 'failed'.
--
-- NOT applied by Claude. Apply with the other Phase 2F migrations.

BEGIN;

CREATE OR REPLACE FUNCTION public.revive_failed_payment_transaction_atomic(p_transaction_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_tx record;
BEGIN
  IF auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'Unauthorized payment revival' USING ERRCODE = '42501';
  END IF;
  SELECT id, status INTO v_tx FROM public.payment_transactions WHERE id = p_transaction_id FOR UPDATE;
  IF v_tx.id IS NULL THEN
    RAISE EXCEPTION 'Payment transaction not found' USING ERRCODE = 'P0002';
  END IF;
  IF v_tx.status <> 'failed' THEN
    RETURN jsonb_build_object('success', true, 'revived', false, 'status', v_tx.status);
  END IF;
  IF EXISTS (SELECT 1 FROM public.payment_allocations WHERE transaction_id = v_tx.id) THEN
    RETURN jsonb_build_object('success', true, 'revived', false, 'status', v_tx.status);
  END IF;
  UPDATE public.payment_transactions
  SET status = 'pending', failure_reason = NULL, updated_at = now()
  WHERE id = v_tx.id;
  RETURN jsonb_build_object('success', true, 'revived', true, 'status', 'pending');
END; $$;

REVOKE ALL ON FUNCTION public.revive_failed_payment_transaction_atomic(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.revive_failed_payment_transaction_atomic(uuid) TO service_role;

COMMIT;
