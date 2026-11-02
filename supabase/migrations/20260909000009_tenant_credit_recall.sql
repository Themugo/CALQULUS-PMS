-- Advance-credit recall.
--
-- POLICY (confirmed by product owner): overpayments are accepted and held as
-- advance credit for future invoices, and that credit can be recalled so the
-- manager can return it instead of leaving money stranded.
--
-- Crediting already happens in process_payment_atomic_core (entry_type='credit').
-- This adds the missing reverse path: a recall writes a 'refund' ledger row that
-- reduces the running balance. It never moves money itself; the manager returns
-- the funds out-of-band (M-Pesa send / bank) and the ledger + audit log record it.
--
-- Safety:
--   * manager, or submanager with can_record_payments, within the payment mandate
--   * service_role may call it (edge function) but must name p_recorded_by
--   * tenants cannot call it (no self-service money-out)
--   * locks tenant row + latest ledger row so a recall cannot race an apply
--   * cannot recall more than the current balance; amount must be > 0
--
-- NOT applied by Claude. Apply after Phase 2D reconciliation with the others.

BEGIN;

CREATE OR REPLACE FUNCTION public.recall_tenant_credit_atomic(
  p_tenant_id uuid,
  p_amount numeric,
  p_reason text,
  p_recorded_by uuid DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_is_service boolean := auth.role() = 'service_role';
  v_caller uuid := auth.uid();
  v_actor uuid;
  v_manager uuid;
  v_property uuid;
  v_ledger record;
  v_balance numeric;
  v_amount numeric := round(coalesce(p_amount, 0), 2);
  v_new_balance numeric;
  v_ok boolean := false;
BEGIN
  IF v_caller IS NULL AND NOT v_is_service THEN
    RAISE EXCEPTION 'Unauthenticated credit recall' USING ERRCODE = '28000';
  END IF;
  IF v_amount <= 0 THEN
    RAISE EXCEPTION 'Recall amount must be positive' USING ERRCODE = '22023';
  END IF;
  IF NULLIF(trim(coalesce(p_reason, '')), '') IS NULL THEN
    RAISE EXCEPTION 'A reason is required to recall credit' USING ERRCODE = '22023';
  END IF;

  SELECT manager_id, property_id INTO v_manager, v_property
  FROM public.tenants WHERE id = p_tenant_id FOR UPDATE;
  IF v_manager IS NULL THEN
    RAISE EXCEPTION 'Tenant not found' USING ERRCODE = 'P0002';
  END IF;

  IF v_is_service THEN
    v_actor := p_recorded_by;
    IF v_actor IS NULL THEN
      RAISE EXCEPTION 'recorded_by is required for service recalls' USING ERRCODE = '22023';
    END IF;
  ELSE
    v_actor := v_caller;
    IF v_caller = v_manager THEN
      v_ok := true;
    ELSE
      v_ok := EXISTS (
        SELECT 1 FROM public.manager_submanagers ms
        JOIN public.submanager_permissions sp
          ON sp.manager_id = ms.manager_id AND sp.submanager_user_id = ms.submanager_user_id
        WHERE ms.manager_id = v_manager AND ms.submanager_user_id = v_caller
          AND COALESCE(sp.can_record_payments, false) = true
          AND (COALESCE(sp.restrict_to_assigned_properties, true) = false
               OR v_property = ANY(COALESCE(sp.assigned_property_ids, '{}'::uuid[])))
      );
    END IF;
    IF NOT v_ok THEN
      RAISE EXCEPTION 'Unauthorized credit recall' USING ERRCODE = '42501';
    END IF;
    IF NOT public.manager_payment_authority_for_property(v_manager, v_property, v_caller) THEN
      RAISE EXCEPTION 'Manager mandate does not permit credit recall for this property' USING ERRCODE = '42501';
    END IF;
  END IF;

  SELECT id, balance_after INTO v_ledger
  FROM public.tenant_credit_ledger
  WHERE tenant_id = p_tenant_id
  ORDER BY created_at DESC, id DESC
  LIMIT 1
  FOR UPDATE;
  v_balance := round(coalesce(v_ledger.balance_after, 0), 2);

  IF v_amount > v_balance THEN
    RAISE EXCEPTION 'Recall amount % exceeds available credit %', v_amount, v_balance USING ERRCODE = '22023';
  END IF;
  v_new_balance := round(v_balance - v_amount, 2);

  INSERT INTO public.tenant_credit_ledger (
    tenant_id, manager_id, property_id, entry_type, amount, balance_after, description
  ) VALUES (
    p_tenant_id, v_manager, v_property, 'refund', v_amount, v_new_balance,
    'Credit recalled: ' || left(trim(p_reason), 200)
  );

  INSERT INTO public.audit_logs (action, resource_type, resource_id, user_id, details)
  VALUES ('tenant_credit_recalled', 'tenant', p_tenant_id, v_actor,
    jsonb_build_object('amount', v_amount, 'balance_before', v_balance,
                       'balance_after', v_new_balance, 'reason', left(trim(p_reason), 200)));

  RETURN jsonb_build_object('recalled', v_amount, 'remaining_credit', v_new_balance);
END;
$$;

REVOKE ALL ON FUNCTION public.recall_tenant_credit_atomic(uuid, numeric, text, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.recall_tenant_credit_atomic(uuid, numeric, text, uuid) TO authenticated, service_role;

COMMIT;
