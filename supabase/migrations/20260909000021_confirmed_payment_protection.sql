-- Protect money Safaricom has CONFIRMED from the stale-prompt sweeper, and make a confirmed
-- but not-yet-applied payment findable and retryable.
--
-- AUDIT FINDINGS
--  1. mpesa-callback delegates allocation to process-payment. If that call fails (a database
--     blip, a deploy), the transaction stays 'pending' with the money already taken and the
--     failure is only dead-lettered. expire_stale_payment_transactions_atomic (every 15 min,
--     pending older than 60 min) then marked it FAILED, so nothing in the ledger said money
--     had moved, and no further callback would ever arrive to revive it.
--  2. payment_transactions.mpesa_receipt_number was never written by any code path, so the
--     STK status poller returned a null receipt and the sweeper had no way to tell a
--     confirmed prompt from an abandoned one.
--
-- Fixes
--  * confirm_stk_receipt_atomic: callback/poller record the provider receipt and the amount
--    actually paid on the still-pending row BEFORE allocation is attempted.
--  * the sweeper never expires a row that carries a provider receipt.
--  * confirmed_unapplied_payments: lists confirmed-but-unallocated rows for the retry job.
--
-- NOT applied by Claude. Apply with the other Phase 2F migrations after Phase 2D.

BEGIN;

CREATE OR REPLACE FUNCTION public.confirm_stk_receipt_atomic(
  p_transaction_id uuid, p_receipt text, p_amount numeric
) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE n integer;
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'Only the payment engine may confirm a receipt' USING ERRCODE = '42501';
  END IF;
  IF coalesce(btrim(p_receipt), '') = '' OR p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'Receipt and positive amount are required' USING ERRCODE = '22023';
  END IF;
  UPDATE public.payment_transactions
  SET mpesa_receipt_number = p_receipt, amount = round(p_amount, 2), updated_at = now()
  WHERE id = p_transaction_id AND status = 'pending' AND mpesa_receipt_number IS NULL;
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n > 0;
END $$;
REVOKE ALL ON FUNCTION public.confirm_stk_receipt_atomic(uuid, text, numeric) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.confirm_stk_receipt_atomic(uuid, text, numeric) TO service_role;

CREATE OR REPLACE FUNCTION public.expire_stale_payment_transactions_atomic(p_age_minutes integer DEFAULT 60)
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_count integer := 0;
BEGIN
  IF auth.role() <> 'service_role' THEN RAISE EXCEPTION 'Only the payment service may expire stale transactions' USING ERRCODE='42501'; END IF;
  IF p_age_minutes < 15 OR p_age_minutes > 1440 THEN RAISE EXCEPTION 'Invalid stale transaction age'; END IF;
  UPDATE public.payment_transactions
  SET status='failed', failure_reason=COALESCE(failure_reason,'STK payment attempt expired without a completion callback'), updated_at=now()
  WHERE status IN ('pending','initiating')
    AND initiated_at < now() - make_interval(mins => p_age_minutes)
    AND completed_at IS NULL
    AND mpesa_receipt_number IS NULL;   -- a provider-confirmed payment is never "expired"
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END $$;
REVOKE ALL ON FUNCTION public.expire_stale_payment_transactions_atomic(integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.expire_stale_payment_transactions_atomic(integer) TO service_role;

CREATE OR REPLACE FUNCTION public.confirmed_unapplied_payments(p_min_age_minutes integer DEFAULT 5, p_limit integer DEFAULT 50)
RETURNS TABLE(transaction_id uuid, receipt text, amount numeric, initiated_at timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'Only the payment engine may list unapplied payments' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY
  SELECT pt.id, pt.mpesa_receipt_number, pt.amount, pt.initiated_at
  FROM public.payment_transactions pt
  WHERE pt.status = 'pending' AND pt.mpesa_receipt_number IS NOT NULL
    AND pt.updated_at < now() - make_interval(mins => greatest(p_min_age_minutes, 1))
    AND NOT EXISTS (SELECT 1 FROM public.payment_allocations pa WHERE pa.transaction_id = pt.id)
  ORDER BY pt.initiated_at
  LIMIT greatest(least(p_limit, 200), 1);
END $$;
REVOKE ALL ON FUNCTION public.confirmed_unapplied_payments(integer, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.confirmed_unapplied_payments(integer, integer) TO service_role;

COMMIT;
