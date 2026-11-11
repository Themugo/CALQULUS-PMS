-- Enforce a payer's agreed share on manual payments.
--
-- AUDIT FINDING: payment_payers.pays_amount / pays_percentage (a parent covers 60%, an employer
-- covers a fixed KES 20,000) were stored and shown but never applied: any payer could record any
-- amount against any invoice, and a split arrangement could be paid in full by one party.
--
-- Rule: per invoice, a payer's cumulative contribution may not exceed their share of that
-- invoice's ORIGINAL amount (rent, not penalties): pays_amount if set (capped at the invoice
-- amount), else pays_percentage of it. No limit set = no limit. 'self' payments are never capped.
-- The check runs after allocation so it is exact however the payment was spread, and the exception
-- rolls back the whole payment. get_payer_share_status lets the dialog show the remaining share.
--
-- NOT applied by Claude. Apply after 20260909000023 and after Phase 2D.

BEGIN;

CREATE OR REPLACE FUNCTION public.payer_invoice_share(p_payer_id uuid, p_invoice_id uuid)
RETURNS numeric LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT CASE
    WHEN py.pays_amount IS NOT NULL THEN LEAST(py.pays_amount, COALESCE(i.original_amount, i.amount))
    WHEN py.pays_percentage IS NOT NULL THEN round(COALESCE(i.original_amount, i.amount) * py.pays_percentage / 100, 2)
  END
  FROM public.payment_payers py, public.invoices i
  WHERE py.id = p_payer_id AND i.id = p_invoice_id;
$$;

CREATE OR REPLACE FUNCTION public.payer_invoice_paid(p_payer_id uuid, p_invoice_id uuid)
RETURNS numeric LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT COALESCE(sum(pa.allocated_amount), 0)
  FROM public.payment_allocations pa
  JOIN public.payment_transactions pt ON pt.id = pa.transaction_id
  WHERE pa.invoice_id = p_invoice_id AND pt.paid_by_payer_id = p_payer_id;
$$;
REVOKE ALL ON FUNCTION public.payer_invoice_share(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.payer_invoice_paid(uuid, uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.record_payment_with_installment_atomic(
  p_tenant_id uuid,
  p_manager_id uuid,
  p_amount numeric,
  p_payment_method text,
  p_payment_date date,
  p_reference text,
  p_invoice_id uuid DEFAULT NULL,
  p_recorded_by uuid DEFAULT NULL,
  p_notes text DEFAULT NULL,
  p_instalment_count integer DEFAULT NULL,
  p_is_installment boolean DEFAULT false,
  p_payer_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_user_role text;
  v_effective_manager uuid;
  v_property_id uuid;
  v_invoice_manager uuid;
  v_invoice_tenant uuid;
  v_total_owed numeric := 0;
  v_instalment_amount numeric;
  v_start_date date := COALESCE(p_payment_date, CURRENT_DATE);
  v_next_due_date date := COALESCE(p_payment_date, CURRENT_DATE) + 30;
  v_payment_result jsonb;
  v_payer public.payment_payers%ROWTYPE;
  v_tx_id uuid;
  v_row record;
BEGIN
  IF auth.role() <> 'authenticated' OR v_user_id IS NULL THEN
    RAISE EXCEPTION 'Unauthenticated caller' USING ERRCODE = '28000';
  END IF;

  IF p_tenant_id IS NULL OR p_manager_id IS NULL OR p_amount IS NULL OR p_amount <= 0
     OR NULLIF(trim(COALESCE(p_reference, '')), '') IS NULL THEN
    RAISE EXCEPTION 'Invalid payment request' USING ERRCODE = '22023';
  END IF;

  SELECT ur.role::text
    INTO v_user_role
  FROM public.user_roles ur
  WHERE ur.user_id = v_user_id
    AND ur.role IN ('manager', 'submanager')
  LIMIT 1;

  IF v_user_role IS NULL THEN
    RAISE EXCEPTION 'Manager or submanager role required' USING ERRCODE = '42501';
  END IF;

  IF v_user_role = 'manager' THEN
    IF v_user_id <> p_manager_id THEN
      RAISE EXCEPTION 'Manager scope mismatch' USING ERRCODE = '42501';
    END IF;
    v_effective_manager := v_user_id;
  ELSE
    SELECT ms.manager_id
      INTO v_effective_manager
    FROM public.manager_submanagers ms
    WHERE ms.submanager_user_id = v_user_id
      AND ms.manager_id = p_manager_id
    LIMIT 1;

    IF v_effective_manager IS NULL THEN
      RAISE EXCEPTION 'Submanager is not assigned to this manager' USING ERRCODE = '42501';
    END IF;
  END IF;

  SELECT t.manager_id, t.property_id
    INTO v_invoice_manager, v_property_id
  FROM public.tenants t
  WHERE t.id = p_tenant_id
  FOR UPDATE;

  IF v_invoice_manager IS NULL OR v_invoice_manager <> v_effective_manager THEN
    RAISE EXCEPTION 'Tenant is outside your managed portfolio' USING ERRCODE = '42501';
  END IF;

  IF v_user_role = 'submanager'
     AND EXISTS (
       SELECT 1
       FROM public.submanager_permissions sp
       WHERE sp.submanager_user_id = v_user_id
         AND sp.restrict_to_assigned_properties = true
     )
     AND NOT EXISTS (
       SELECT 1
       FROM public.submanager_property_assignments spa
       WHERE spa.submanager_user_id = v_user_id
         AND spa.property_id = v_property_id
     ) THEN
    RAISE EXCEPTION 'Tenant is outside your assigned properties' USING ERRCODE = '42501';
  END IF;

  IF p_invoice_id IS NOT NULL THEN
    SELECT i.manager_id, i.tenant_id
      INTO v_invoice_manager, v_invoice_tenant
    FROM public.invoices i
    WHERE i.id = p_invoice_id
    FOR UPDATE;

    IF v_invoice_tenant IS NULL OR v_invoice_tenant <> p_tenant_id
       OR v_invoice_manager <> v_effective_manager THEN
      RAISE EXCEPTION 'Invoice is outside your managed portfolio' USING ERRCODE = '42501';
    END IF;
  END IF;

  -- A payer named on a manual payment must be this tenant's own, active, in-date payer record.
  IF p_payer_id IS NOT NULL THEN
    SELECT * INTO v_payer FROM public.payment_payers WHERE id = p_payer_id;
    IF v_payer.id IS NULL OR v_payer.tenant_id <> p_tenant_id
       OR (v_payer.manager_id IS NOT NULL AND v_payer.manager_id <> v_effective_manager) THEN
      RAISE EXCEPTION 'Payer is not registered for this tenant' USING ERRCODE = '42501';
    END IF;
    IF NOT v_payer.is_active OR (v_payer.end_date IS NOT NULL AND v_payer.end_date < COALESCE(p_payment_date, CURRENT_DATE)) THEN
      RAISE EXCEPTION 'Payer is no longer active for this tenant' USING ERRCODE = '55000';
    END IF;
  END IF;

  IF p_is_installment AND COALESCE(p_instalment_count, 0) > 1 THEN
    SELECT COALESCE(SUM(COALESCE(i.balance_due, i.amount)), 0)
      INTO v_total_owed
    FROM public.invoices i
    WHERE i.tenant_id = p_tenant_id
      AND i.status IN ('pending', 'overdue', 'partially_paid');

    v_instalment_amount := CEIL(v_total_owed / p_instalment_count);

    INSERT INTO public.arrears_schedule (
      tenant_id, manager_id, invoice_id, total_owed, instalment_count,
      instalment_amount, status, start_date, next_due_date, notes, payment_reference
    ) VALUES (
      p_tenant_id, v_effective_manager, p_invoice_id, v_total_owed,
      p_instalment_count, v_instalment_amount, 'active', v_start_date,
      v_next_due_date,
      COALESCE(p_notes, 'Installment plan: ' || p_instalment_count || ' payments of ' || v_instalment_amount),
      p_reference
    )
    ON CONFLICT (tenant_id, payment_reference) WHERE payment_reference IS NOT NULL
    DO NOTHING;

    IF p_invoice_id IS NOT NULL THEN
      UPDATE public.invoices
      SET installment_plan = true
      WHERE id = p_invoice_id
        AND tenant_id = p_tenant_id
        AND manager_id = v_effective_manager;
    END IF;
  END IF;

  v_payment_result := public.process_payment_atomic(
    p_tenant_id,
    v_effective_manager,
    p_amount,
    p_payment_method,
    COALESCE(p_payment_date, CURRENT_DATE),
    p_reference,
    p_invoice_id,
    NULL,
    NULL,
    v_property_id,
    NULL,
    NULL,
    COALESCE(p_recorded_by, v_user_id),
    p_notes,
    NULL
  );

  -- Attribute the payment to the payer, atomically with the payment itself.
  IF p_payer_id IS NOT NULL AND v_payer.payer_type <> 'self' THEN
    v_tx_id := NULLIF(v_payment_result->>'transaction_id', '')::uuid;
    IF v_tx_id IS NOT NULL THEN
      UPDATE public.payment_transactions
      SET paid_by_payer_id = v_payer.id,
          payer_type       = v_payer.payer_type,
          payer_name       = COALESCE(NULLIF(v_payer.payer_organisation, ''), NULLIF(v_payer.payer_name, ''))
      WHERE id = v_tx_id;
    END IF;
  END IF;

  -- Enforce the payer's agreed share. Checked AFTER allocation so it is exact however the payment
  -- was spread (oldest-first or a chosen invoice); the exception rolls back the whole payment.
  IF p_payer_id IS NOT NULL AND v_payer.payer_type <> 'self'
     AND (v_payer.pays_amount IS NOT NULL OR v_payer.pays_percentage IS NOT NULL)
     AND v_tx_id IS NOT NULL THEN
    FOR v_row IN
      SELECT i.id, i.invoice_number,
             public.payer_invoice_share(v_payer.id, i.id) AS share,
             public.payer_invoice_paid(v_payer.id, i.id)  AS paid_total,
             COALESCE((SELECT sum(pa.allocated_amount) FROM public.payment_allocations pa
                       WHERE pa.transaction_id = v_tx_id AND pa.invoice_id = i.id), 0) AS this_payment
      FROM public.invoices i
      WHERE i.id IN (SELECT pa.invoice_id FROM public.payment_allocations pa WHERE pa.transaction_id = v_tx_id)
    LOOP
      IF v_row.share IS NOT NULL AND v_row.paid_total > v_row.share + 0.005 THEN
        RAISE EXCEPTION 'Payment exceeds % agreed share of invoice % (share %, already paid by them %, this payment adds %). Lower the amount, choose the invoice, or update the payer''s share.',
          COALESCE(NULLIF(v_payer.payer_organisation, ''), NULLIF(v_payer.payer_name, ''), 'the payer''s'),
          COALESCE(v_row.invoice_number, v_row.id::text),
          to_char(v_row.share, 'FM999G999G990D00'),
          to_char(v_row.paid_total - v_row.this_payment, 'FM999G999G990D00'),
          to_char(v_row.this_payment, 'FM999G999G990D00')
          USING ERRCODE = '23514';
      END IF;
    END LOOP;
  END IF;

  RETURN v_payment_result || jsonb_build_object(
    'installment_plan_created',
    (p_is_installment AND COALESCE(p_instalment_count, 0) > 1)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_payer_share_status(p_tenant_id uuid, p_payer_id uuid)
RETURNS TABLE(invoice_id uuid, invoice_number text, balance_due numeric, share numeric, paid_by_payer numeric, remaining numeric)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid(); v_mgr uuid;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Authentication required' USING ERRCODE = '28000'; END IF;
  SELECT manager_id INTO v_mgr FROM public.tenants WHERE id = p_tenant_id;
  IF v_mgr IS NULL OR NOT (
       v_mgr = v_uid
       OR EXISTS (SELECT 1 FROM public.manager_submanagers ms WHERE ms.manager_id = v_mgr AND ms.submanager_user_id = v_uid)
     ) THEN
    RAISE EXCEPTION 'Tenant is outside your managed portfolio' USING ERRCODE = '42501';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.payment_payers WHERE id = p_payer_id AND tenant_id = p_tenant_id) THEN
    RAISE EXCEPTION 'Payer is not registered for this tenant' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY
  SELECT i.id, i.invoice_number, GREATEST(COALESCE(i.balance_due, i.amount), 0),
         public.payer_invoice_share(p_payer_id, i.id),
         public.payer_invoice_paid(p_payer_id, i.id),
         CASE WHEN public.payer_invoice_share(p_payer_id, i.id) IS NULL THEN NULL
              ELSE GREATEST(public.payer_invoice_share(p_payer_id, i.id) - public.payer_invoice_paid(p_payer_id, i.id), 0) END
  FROM public.invoices i
  WHERE i.tenant_id = p_tenant_id AND i.status IN ('pending', 'overdue', 'partially_paid')
  ORDER BY i.due_date ASC NULLS LAST;
END $$;
REVOKE ALL ON FUNCTION public.get_payer_share_status(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_payer_share_status(uuid, uuid) TO authenticated;

COMMIT;
