-- Complete a pending STK payment that covers invoices of MORE THAN ONE tenant, or that was
-- started by a third-party payer (a parent paying for several students' units, an employer,
-- a sponsor).
--
-- AUDIT FINDING: the STK callback finalised every prompt through process_payment_atomic
-- with the transaction's single tenant_id. process-payment then filtered the selected
-- invoices by that tenant, so a prompt spanning two tenants was rejected ("One or more
-- selected bills are not payable"), the callback dead-lettered it, and the payer had been
-- charged with nothing allocated. A payer who paid for one tenant's unit was allocated
-- correctly but the payer received no receipt of their own.
--
-- This RPC is service-role only (the callback / status poller run as service). It reads the
-- invoice list from the pending transaction's own notes (never from the caller), allocates
-- oldest-first across every listed invoice whatever its tenant, and credits any sub-shilling
-- surplus to the first invoice's tenant. It is idempotent on the transaction and on the
-- provider receipt number.
--
-- NOT applied by Claude. Apply with the other Phase 2F migrations after Phase 2D.

BEGIN;

CREATE OR REPLACE FUNCTION public.complete_pending_stk_payment_atomic(
  p_transaction_id uuid,
  p_amount         numeric,
  p_reference      text,
  p_payment_date   date DEFAULT CURRENT_DATE
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  tx            public.payment_transactions%ROWTYPE;
  v_ids         uuid[];
  v_notes       jsonb;
  v_remaining   numeric := round(coalesce(p_amount, 0), 2);
  v_alloc       numeric;
  v_inv         record;
  v_allocs      jsonb := '[]'::jsonb;
  v_dup         uuid;
  v_credit_to   uuid;
  v_credit_mgr  uuid;
  v_credit_prop uuid;
  v_credit_bal  numeric := 0;
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'Only the payment engine may complete a pending payment' USING ERRCODE = '42501';
  END IF;
  IF v_remaining <= 0 THEN
    RAISE EXCEPTION 'Invalid payment amount: must be greater than zero' USING ERRCODE = '22003';
  END IF;
  IF coalesce(btrim(p_reference), '') = '' THEN
    RAISE EXCEPTION 'A provider reference is required' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO tx FROM public.payment_transactions WHERE id = p_transaction_id FOR UPDATE;
  IF tx.id IS NULL THEN
    RAISE EXCEPTION 'Payment transaction not found' USING ERRCODE = 'P0002';
  END IF;

  -- Replay of an already-applied transaction.
  IF tx.status = 'completed' OR EXISTS (SELECT 1 FROM public.payment_allocations WHERE transaction_id = tx.id) THEN
    RETURN jsonb_build_object('success', true, 'idempotent', true, 'transaction_id', tx.id,
      'allocations', '[]'::jsonb, 'advance_credit', 0, 'total_allocated', 0);
  END IF;
  IF tx.status <> 'pending' THEN
    RAISE EXCEPTION 'Payment transaction is not pending' USING ERRCODE = '55000';
  END IF;

  -- The same provider receipt must never be applied twice (callback + poller race).
  IF tx.tenant_id IS NOT NULL THEN
    SELECT id INTO v_dup FROM public.payment_transactions
    WHERE tenant_id = tx.tenant_id AND bank_reference = p_reference AND status = 'completed' AND id <> tx.id;
    IF v_dup IS NOT NULL THEN
      RETURN jsonb_build_object('success', true, 'idempotent', true, 'transaction_id', v_dup,
        'allocations', '[]'::jsonb, 'advance_credit', 0, 'total_allocated', 0);
    END IF;
  END IF;

  -- Invoice list comes from the prompt that was actually sent to the customer.
  IF tx.notes IS NOT NULL AND left(btrim(tx.notes), 1) = '{' THEN
    BEGIN
      v_notes := tx.notes::jsonb;
      SELECT array_agg(value::uuid) INTO v_ids FROM jsonb_array_elements_text(v_notes->'invoice_ids');
    EXCEPTION WHEN others THEN
      v_ids := NULL;
    END;
  END IF;
  IF (v_ids IS NULL OR array_length(v_ids, 1) IS NULL) AND tx.invoice_id IS NOT NULL THEN
    v_ids := ARRAY[tx.invoice_id];
  END IF;
  IF v_ids IS NULL OR array_length(v_ids, 1) IS NULL THEN
    RAISE EXCEPTION 'Pending transaction lists no invoices' USING ERRCODE = '22023';
  END IF;

  UPDATE public.payment_transactions SET
    bank_reference = p_reference,
    payment_method = COALESCE(payment_method, payment_type),
    amount         = v_remaining,
    status         = 'completed',
    completed_at   = COALESCE(completed_at, now()),
    updated_at     = now()
  WHERE id = tx.id;

  FOR v_inv IN
    SELECT id, tenant_id, manager_id, property_id, balance_due
    FROM public.invoices
    WHERE id = ANY(v_ids) AND status IN ('pending', 'overdue', 'partially_paid')
    ORDER BY due_date ASC, id ASC
    FOR UPDATE
  LOOP
    EXIT WHEN v_remaining <= 0;
    IF v_credit_to IS NULL THEN
      v_credit_to := v_inv.tenant_id; v_credit_mgr := v_inv.manager_id; v_credit_prop := v_inv.property_id;
    END IF;
    v_alloc := public.process_invoice_payment(v_inv.id, tx.id, v_remaining);
    IF v_alloc > 0 THEN
      v_allocs := v_allocs || jsonb_build_array(jsonb_build_object(
        'invoice_id', v_inv.id, 'tenant_id', v_inv.tenant_id, 'amount', v_alloc,
        'closed', round(coalesce(v_inv.balance_due, 0) - v_alloc, 2) <= 0));
      v_remaining := round(v_remaining - v_alloc, 2);
    END IF;
  END LOOP;

  -- Surplus (the prompt is rounded up to a whole shilling, or a bill was settled meanwhile).
  IF v_remaining > 0 THEN
    v_credit_to := COALESCE(v_credit_to, tx.tenant_id);
    IF v_credit_to IS NULL THEN
      RAISE EXCEPTION 'No tenant to hold the surplus of this payment' USING ERRCODE = '22023';
    END IF;
    SELECT coalesce((SELECT balance_after FROM public.tenant_credit_ledger
                     WHERE tenant_id = v_credit_to ORDER BY created_at DESC, id DESC LIMIT 1), 0)
      INTO v_credit_bal;
    v_credit_bal := round(v_credit_bal + v_remaining, 2);
    INSERT INTO public.tenant_credit_ledger (tenant_id, manager_id, property_id, transaction_id,
                                             entry_type, amount, balance_after, description)
    VALUES (v_credit_to, COALESCE(v_credit_mgr, tx.manager_id), COALESCE(v_credit_prop, tx.property_id), tx.id,
            'credit', v_remaining, v_credit_bal, 'Surplus of payment ' || p_reference)
    ON CONFLICT DO NOTHING;
    UPDATE public.payment_transactions SET is_advance = true, credit_amount = v_remaining,
      allocated_amount = round(p_amount - v_remaining, 2), updated_at = now() WHERE id = tx.id;
  ELSE
    UPDATE public.payment_transactions SET
      is_partial = EXISTS (SELECT 1 FROM public.payment_allocations WHERE transaction_id = tx.id AND closes_invoice = false),
      allocated_amount = round(p_amount, 2), updated_at = now()
    WHERE id = tx.id;
  END IF;

  PERFORM public.backfill_payment_allocation_payer_atomic(tx.id);

  RETURN jsonb_build_object('success', true, 'idempotent', false, 'transaction_id', tx.id,
    'allocations', v_allocs, 'advance_credit', greatest(v_remaining, 0),
    'credit_balance', v_credit_bal, 'total_allocated', round(p_amount, 2) - greatest(v_remaining, 0));
END $$;

REVOKE ALL ON FUNCTION public.complete_pending_stk_payment_atomic(uuid, numeric, text, date) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.complete_pending_stk_payment_atomic(uuid, numeric, text, date) TO service_role;

-- Contacts for receipts: which tenants and which payer must be told about a transaction,
-- with each tenant's own allocation total and current balance. One round-trip, service only.
CREATE OR REPLACE FUNCTION public.get_payment_receipt_parties(p_transaction_id uuid)
RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT jsonb_build_object(
    'payer', (SELECT jsonb_build_object('id', pp.id, 'name', pp.display_name, 'email', pp.email, 'phone', pp.phone, 'user_id', pp.user_id)
              FROM public.payment_transactions pt JOIN public.payment_parties pp ON pp.id = pt.payer_party_id
              WHERE pt.id = p_transaction_id),
    'tenants', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'tenant_id', t.id, 'name', t.name, 'email', t.email, 'phone', t.phone, 'manager_id', x.manager_id,
        'paid', x.paid,
        'balance_due', COALESCE((SELECT sum(GREATEST(COALESCE(i2.balance_due, 0), 0))
                                 FROM public.invoices i2
                                 WHERE i2.tenant_id = t.id AND i2.status IN ('pending','overdue','partially_paid')), 0)))
      FROM (
        SELECT i.tenant_id, min(i.manager_id::text)::uuid AS manager_id, sum(pa.allocated_amount) AS paid
        FROM public.payment_allocations pa JOIN public.invoices i ON i.id = pa.invoice_id
        WHERE pa.transaction_id = p_transaction_id
        GROUP BY i.tenant_id
      ) x JOIN public.tenants t ON t.id = x.tenant_id
    ), '[]'::jsonb)
  );
$$;
REVOKE ALL ON FUNCTION public.get_payment_receipt_parties(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_payment_receipt_parties(uuid) TO service_role;

COMMIT;
