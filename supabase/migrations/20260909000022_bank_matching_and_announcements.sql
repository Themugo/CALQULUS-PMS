-- Bank webhook matching and payment announcements.
--
-- AUDIT FINDINGS
--  1. ingest_bank_webhook_atomic matched with position(upper(unit) IN reference): unit "A1" matched
--     "A12", unit "1" matched any reference containing a 1, invoice "INV-1" matched "INV-12", and
--     the first of several tenants was credited. Money was applied to the wrong tenant with
--     confidence 85-95. Matching now requires the unit / invoice number as a whole token and exactly
--     one candidate tenant; anything ambiguous stays unmatched for manual review.
--  2. Manual recording, bank auto-match and bank reconciliation recorded the payment but never
--     issued a receipt or notified anyone (only process-payment did). A claim function now lets any
--     channel announce a payment exactly once.
--
--  3. verify_payment_receipt_atomic marked an uploaded receipt "verified" without recording any
--     payment when the receipt named no invoice, so the tenant stayed in arrears after approval.
--
-- NOT applied by Claude. Apply with the other Phase 2F migrations after Phase 2D.

BEGIN;

CREATE OR REPLACE FUNCTION public.ref_contains_token(p_ref text, p_token text)
RETURNS boolean LANGUAGE sql IMMUTABLE AS $$
  SELECT nullif(btrim(p_token), '') IS NOT NULL
     AND upper(coalesce(p_ref, '')) ~ (
       '(^|[^A-Z0-9])' ||
       regexp_replace(upper(btrim(p_token)), '([\\^$.|?*+()\[\]{}-])', '\\\1', 'g') ||
       '([^A-Z0-9]|$)'
     );
$$;

ALTER TABLE public.issued_payment_receipts ADD COLUMN IF NOT EXISTS announced_at timestamptz;

-- First caller wins. Returns false when the payment was already announced.
-- If no issued receipt row exists the announcement cannot be de-duplicated, so it is allowed.
CREATE OR REPLACE FUNCTION public.claim_payment_announcement_atomic(p_transaction_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE n integer;
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'Only the payment engine may announce a payment' USING ERRCODE = '42501';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.issued_payment_receipts WHERE transaction_id = p_transaction_id) THEN
    RETURN true;
  END IF;
  UPDATE public.issued_payment_receipts SET announced_at = now()
  WHERE transaction_id = p_transaction_id AND announced_at IS NULL;
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n > 0;
END $$;
REVOKE ALL ON FUNCTION public.claim_payment_announcement_atomic(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_payment_announcement_atomic(uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.ingest_bank_webhook_atomic(
  p_manager_id uuid,
  p_bank_integration_id uuid,
  p_external_id text,
  p_reference text,
  p_description text,
  p_amount numeric,
  p_transaction_date date,
  p_bank_name text,
  p_account_number text DEFAULT NULL,
  p_payer_name text DEFAULT NULL,
  p_payer_phone text DEFAULT NULL,
  p_raw_payload jsonb DEFAULT '{}'::jsonb,
  p_auto_reconcile boolean DEFAULT false,
  p_match_by text DEFAULT 'amount_and_unit'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_bank_tx record;
  v_invoice record;
  v_payment jsonb;
  v_ref text := upper(coalesce(p_reference, '') || ' ' || coalesce(p_description, ''));
  v_match_confidence numeric;
  v_match_method text;
  v_is_new boolean := false;
BEGIN
  IF auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'Unauthorized bank webhook ingestion' USING ERRCODE = '42501';
  END IF;

  IF p_manager_id IS NULL OR p_bank_integration_id IS NULL THEN
    RAISE EXCEPTION 'manager_id and bank_integration_id are required' USING ERRCODE = '22023';
  END IF;
  IF coalesce(p_amount, 0) <= 0 THEN
    RAISE EXCEPTION 'Invalid bank transaction amount' USING ERRCODE = '22003';
  END IF;
  IF p_transaction_date IS NULL THEN
    RAISE EXCEPTION 'transaction_date is required' USING ERRCODE = '22023';
  END IF;
  IF nullif(trim(p_external_id), '') IS NULL AND nullif(trim(p_reference), '') IS NULL THEN
    RAISE EXCEPTION 'Bank webhook payload has neither an external id nor a reference — cannot deduplicate safely' USING ERRCODE = '22023';
  END IF;

  -- Serialize the same external transaction across concurrent bank retries.
  IF nullif(trim(p_external_id), '') IS NOT NULL THEN
    PERFORM pg_advisory_xact_lock(
      hashtextextended(p_manager_id::text || ':' || trim(p_external_id), 0)
    );
  END IF;

  -- Insert exactly once. A duplicate unmatched row is deliberately reusable:
  -- the bank may retry after a transient invoice/payment failure.
  INSERT INTO public.bank_transactions (
    manager_id, bank_integration_id, external_id, reference, description,
    amount, transaction_date, bank_name, account_number, payer_name,
    payer_phone, matched, source, raw_payload
  ) VALUES (
    p_manager_id, p_bank_integration_id, nullif(trim(p_external_id), ''),
    p_reference, p_description, round(p_amount, 2), p_transaction_date,
    p_bank_name, p_account_number, p_payer_name, p_payer_phone, false,
    'webhook', coalesce(p_raw_payload, '{}'::jsonb)
  )
  ON CONFLICT (manager_id, external_id) DO NOTHING
  RETURNING * INTO v_bank_tx;

  IF v_bank_tx.id IS NULL THEN
    SELECT * INTO v_bank_tx
    FROM public.bank_transactions
    WHERE manager_id = p_manager_id
      AND external_id = nullif(trim(p_external_id), '')
    FOR UPDATE;
  ELSE
    v_is_new := true;
  END IF;

  IF v_bank_tx.matched THEN
    RETURN jsonb_build_object(
      'received', true,
      'duplicate', true,
      'matched', true,
      'bank_transaction_id', v_bank_tx.id,
      'invoice_id', v_bank_tx.matched_invoice_id
    );
  END IF;

  IF NOT p_auto_reconcile THEN
    RETURN jsonb_build_object(
      'received', true,
      'duplicate', NOT v_is_new,
      'matched', false,
      'bank_transaction_id', v_bank_tx.id
    );
  END IF;

  -- 1) Invoice number appearing as a whole token in the reference. "INV-1" must not match
  --    "INV-12", and a reference naming invoices of different tenants is ambiguous.
  IF (
    SELECT count(DISTINCT i.tenant_id) FROM public.invoices i
    WHERE i.manager_id = p_manager_id
      AND i.status IN ('pending', 'overdue', 'partially_paid')
      AND public.ref_contains_token(v_ref, i.invoice_number)
  ) = 1 THEN
    SELECT i.id, i.invoice_number, i.amount, i.balance_due, i.tenant_id,
           t.unit, t.property_id, t.unit_id, t.phone
      INTO v_invoice
    FROM public.invoices i
    JOIN public.tenants t ON t.id = i.tenant_id
    WHERE i.manager_id = p_manager_id
      AND i.status IN ('pending', 'overdue', 'partially_paid')
      AND public.ref_contains_token(v_ref, i.invoice_number)
    ORDER BY i.due_date ASC NULLS LAST
    LIMIT 1;
    v_match_confidence := 95;
    v_match_method := 'auto_reference';
  END IF;

  -- 2) Unit appearing as a whole token + amount within 5%, only when exactly one tenant fits.
  IF v_invoice.id IS NULL THEN
    IF (
      SELECT count(DISTINCT i.tenant_id) FROM public.invoices i
      JOIN public.tenants t ON t.id = i.tenant_id
      WHERE i.manager_id = p_manager_id
        AND i.status IN ('pending', 'overdue', 'partially_paid')
        AND public.ref_contains_token(v_ref, t.unit)
        AND greatest(coalesce(i.balance_due, i.amount), 0) > 0
        AND abs(p_amount - greatest(coalesce(i.balance_due, i.amount), 0))
            / greatest(coalesce(i.balance_due, i.amount), 1) < 0.05
    ) = 1 THEN
      SELECT i.id, i.invoice_number, i.amount, i.balance_due, i.tenant_id,
             t.unit, t.property_id, t.unit_id, t.phone
        INTO v_invoice
      FROM public.invoices i
      JOIN public.tenants t ON t.id = i.tenant_id
      WHERE i.manager_id = p_manager_id
        AND i.status IN ('pending', 'overdue', 'partially_paid')
        AND public.ref_contains_token(v_ref, t.unit)
        AND greatest(coalesce(i.balance_due, i.amount), 0) > 0
        AND abs(p_amount - greatest(coalesce(i.balance_due, i.amount), 0))
            / greatest(coalesce(i.balance_due, i.amount), 1) < 0.05
      ORDER BY i.due_date ASC NULLS LAST
      LIMIT 1;
      v_match_confidence := 85;
      v_match_method := 'auto_amount_unit';
    END IF;
  END IF;

  -- 3) Exact amount only when there is one unique candidate.
  IF v_invoice.id IS NULL AND p_match_by <> 'reference' THEN
    IF (
      SELECT count(*)
      FROM public.invoices i
      JOIN public.tenants t ON t.id = i.tenant_id
      WHERE i.manager_id = p_manager_id
        AND i.status IN ('pending', 'overdue', 'partially_paid')
        AND greatest(coalesce(i.balance_due, i.amount), 0) > 0
        AND abs(p_amount - greatest(coalesce(i.balance_due, i.amount), 0)) < 1
    ) = 1 THEN
      SELECT i.id, i.invoice_number, i.amount, i.balance_due, i.tenant_id,
             t.unit, t.property_id, t.unit_id, t.phone
        INTO v_invoice
      FROM public.invoices i
      JOIN public.tenants t ON t.id = i.tenant_id
      WHERE i.manager_id = p_manager_id
        AND i.status IN ('pending', 'overdue', 'partially_paid')
        AND greatest(coalesce(i.balance_due, i.amount), 0) > 0
        AND abs(p_amount - greatest(coalesce(i.balance_due, i.amount), 0)) < 1
      LIMIT 1;
      v_match_confidence := 70;
      v_match_method := 'auto_amount';
    END IF;
  END IF;

  IF v_invoice.id IS NULL THEN
    RETURN jsonb_build_object(
      'received', true,
      'duplicate', NOT v_is_new,
      'matched', false,
      'bank_transaction_id', v_bank_tx.id
    );
  END IF;

  -- The central payment RPC performs ownership, amount, idempotency and
  -- invoice-allocation checks. Because this is called inside this function,
  -- a failure rolls back the bank insert/match as one transaction.
  v_payment := public.process_payment_atomic(
    v_invoice.tenant_id,
    p_manager_id,
    round(p_amount, 2),
    'bank_transfer',
    p_transaction_date,
    coalesce(nullif(trim(p_reference), ''), nullif(trim(p_external_id), '')),
    v_invoice.id,
    NULL,
    v_invoice.unit_id,
    v_invoice.property_id,
    v_invoice.unit,
    v_invoice.phone,
    NULL,
    'Auto-matched from ' || coalesce(p_bank_name, 'bank') || ' webhook. Payer: ' || coalesce(p_payer_name, ''),
    NULL
  );

  UPDATE public.bank_transactions
  SET matched = true,
      matched_invoice_id = v_invoice.id,
      matched_tenant_id = v_invoice.tenant_id,
      match_confidence = v_match_confidence,
      match_method = v_match_method
  WHERE id = v_bank_tx.id;

  RETURN jsonb_build_object(
    'received', true,
    'duplicate', NOT v_is_new,
    'matched', true,
    'bank_transaction_id', v_bank_tx.id,
    'invoice_id', v_invoice.id,
    'payment', v_payment
  );
END;
$$;

REVOKE ALL ON FUNCTION public.ingest_bank_webhook_atomic(
  uuid, uuid, text, text, text, numeric, date, text, text, text, text, jsonb, boolean, text
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.ingest_bank_webhook_atomic(
  uuid, uuid, text, text, text, numeric, date, text, text, text, text, jsonb, boolean, text
) TO service_role;

-- Receipt-upload approval now always records the payment (see header, finding 3).
CREATE OR REPLACE FUNCTION public.verify_payment_receipt_atomic(
  p_receipt_id uuid,
  p_verified_by uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_receipt public.payment_receipts%ROWTYPE;
  v_manager_id uuid;
  v_payment jsonb;
BEGIN
  IF auth.role() NOT IN ('authenticated', 'service_role') THEN RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501'; END IF;
  SELECT * INTO v_receipt FROM public.payment_receipts WHERE id = p_receipt_id FOR UPDATE;
  IF v_receipt.id IS NULL THEN RAISE EXCEPTION 'Receipt not found' USING ERRCODE = 'P0002'; END IF;
  SELECT manager_id INTO v_manager_id FROM public.tenants WHERE id = v_receipt.tenant_id FOR UPDATE;
  IF v_manager_id IS NULL THEN RAISE EXCEPTION 'Receipt tenant is not assigned to a manager' USING ERRCODE = '55000'; END IF;
  IF auth.role() <> 'service_role' AND v_manager_id <> auth.uid() THEN RAISE EXCEPTION 'Forbidden' USING ERRCODE = '42501'; END IF;
  IF auth.role() <> 'service_role' AND p_verified_by <> auth.uid() THEN RAISE EXCEPTION 'verified_by must be the authenticated manager' USING ERRCODE = '42501'; END IF;
  IF v_receipt.status = 'verified' THEN
    RETURN jsonb_build_object('success', true, 'idempotent', true, 'receipt_id', v_receipt.id);
  END IF;
  IF v_receipt.status <> 'pending' THEN RAISE EXCEPTION 'Only pending receipts can be verified' USING ERRCODE = '55000'; END IF;

  -- Always record the payment. A receipt that names an invoice pays that invoice; one that does not
  -- is allocated oldest-first across the tenant's open invoices (surplus becomes advance credit).
  -- Previously a receipt without an invoice was marked "verified" with NO payment recorded.
  SELECT public.process_payment_atomic(
    v_receipt.tenant_id, v_manager_id, v_receipt.amount, v_receipt.payment_method,
    v_receipt.payment_date, COALESCE(NULLIF(v_receipt.reference_number,''), 'RECEIPT-' || v_receipt.id::text),
    v_receipt.invoice_id, NULL, NULL, NULL, NULL, NULL, COALESCE(p_verified_by, auth.uid()), 'Payment receipt verified'
  ) INTO v_payment;
  IF COALESCE((v_payment->>'success')::boolean, false) IS NOT TRUE THEN
    RAISE EXCEPTION 'Payment could not be recorded for this receipt' USING ERRCODE = '55000';
  END IF;

  UPDATE public.payment_receipts
  SET status = 'verified', verified_by = COALESCE(p_verified_by, auth.uid())::text, verified_at = now(), updated_at = now()
  WHERE id = v_receipt.id;

  RETURN jsonb_build_object('success', true, 'idempotent', false, 'receipt_id', v_receipt.id, 'payment', COALESCE(v_payment, '{}'::jsonb), 'transaction_id', v_payment->>'transaction_id');
END;
$$;
REVOKE ALL ON FUNCTION public.verify_payment_receipt_atomic(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.verify_payment_receipt_atomic(uuid, uuid) TO authenticated, service_role;

COMMIT;
