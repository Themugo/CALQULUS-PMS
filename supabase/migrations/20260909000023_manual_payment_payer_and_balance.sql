-- Attribute manual payments to the payer, and report the same balance everywhere.
--
-- AUDIT FINDINGS
--  1. The manual "Record payment" dialog lets a manager pick the tenant's registered payer
--     (employer, parent, guarantor...) but record-payment dropped it: payment_transactions kept
--     no payer, so the receipt, history and reports could not say who paid. The payer is now
--     validated (this tenant's own, active, in-date record) and stamped on the transaction in
--     the same transaction as the payment. Also fixed: an instalment plan computed what is owed
--     from pending/overdue invoices only, ignoring part-paid ones.
--  2. Receipts built by the shared announcer reported SUM(open invoice balances), while the
--     single-tenant receipt and the tenant portal use get_tenant_balance (which counts original
--     amounts, penalties and credit). The same payment therefore showed two different balances.
--     get_payment_receipt_parties now uses get_tenant_balance, and falls back to the legacy
--     payment_payers record for the payer's name and contacts.
--
-- NOT applied by Claude. Apply with the other Phase 2F migrations after Phase 2D.

BEGIN;

DROP FUNCTION IF EXISTS public.record_payment_with_installment_atomic(
  uuid, uuid, numeric, text, date, text, uuid, uuid, text, integer, boolean
);

CREATE FUNCTION public.record_payment_with_installment_atomic(
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

  RETURN v_payment_result || jsonb_build_object(
    'installment_plan_created',
    (p_is_installment AND COALESCE(p_instalment_count, 0) > 1)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.record_payment_with_installment_atomic(
  uuid, uuid, numeric, text, date, text, uuid, uuid, text, integer, boolean, uuid
) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_payment_with_installment_atomic(
  uuid, uuid, numeric, text, date, text, uuid, uuid, text, integer, boolean, uuid
) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.get_payment_receipt_parties(p_transaction_id uuid)
RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT jsonb_build_object(
    'payer', COALESCE(
      (SELECT jsonb_build_object('id', pp.id, 'name', pp.display_name, 'email', pp.email, 'phone', pp.phone, 'user_id', pp.user_id)
         FROM public.payment_transactions pt JOIN public.payment_parties pp ON pp.id = pt.payer_party_id
        WHERE pt.id = p_transaction_id),
      (SELECT jsonb_build_object('id', py.id,
                'name', COALESCE(NULLIF(py.payer_organisation, ''), NULLIF(py.payer_name, '')),
                'email', py.payer_email, 'phone', COALESCE(py.payer_phone, py.mpesa_number), 'user_id', NULL)
         FROM public.payment_transactions pt JOIN public.payment_payers py ON py.id = pt.paid_by_payer_id
        WHERE pt.id = p_transaction_id AND py.payer_type <> 'self')
    ),
    'tenants', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'tenant_id', t.id, 'name', t.name, 'email', t.email, 'phone', t.phone, 'manager_id', x.manager_id,
        'paid', x.paid,
        'balance_due', COALESCE((SELECT b.balance_due FROM public.get_tenant_balance(t.id) b LIMIT 1), 0)))
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
