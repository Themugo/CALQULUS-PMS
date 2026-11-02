-- Payment self-credit lockdown.
--
-- AUDIT FINDING (critical): a signed-in tenant could call
--   rpc('process_payment_atomic', {p_tenant_id: <own id>, p_amount: 99999, p_reference: 'X', ...})
-- straight from the browser. The wrapper added in 20260906000008 and the renamed
-- core both treated "caller is the tenant" as authorised, so invoices were marked
-- paid (or advance credit created) with no money having moved. The renamed
-- process_payment_atomic_core also kept its original EXECUTE grant to
-- `authenticated`, so the wrapper could be bypassed entirely.
--
-- The same pattern existed in process_payer_payment_atomic: a linked payer could
-- credit invoices directly.
--
-- Legitimate callers:
--   * edge functions (process-payment, reconcile-bank) -> service_role
--   * managers / submanagers recording offline payments -> still allowed here,
--     gated by the management mandate, via process_payment_atomic
-- Tenants and payers never need to call these RPCs; they pay through the M-Pesa /
-- Paystack flows whose callbacks run as service_role after money is confirmed.
--
-- This migration is NOT applied by Claude. Review, then apply with the other
-- Phase 2F migrations after Phase 2D reconciliation.

BEGIN;

CREATE OR REPLACE FUNCTION public.process_payment_atomic(
  p_tenant_id uuid, p_manager_id uuid, p_amount numeric, p_payment_method text,
  p_payment_date date, p_reference text, p_invoice_id uuid DEFAULT NULL,
  p_invoice_ids uuid[] DEFAULT NULL, p_unit_id uuid DEFAULT NULL,
  p_property_id uuid DEFAULT NULL, p_unit_number text DEFAULT NULL,
  p_phone text DEFAULT NULL, p_recorded_by uuid DEFAULT NULL,
  p_notes text DEFAULT NULL, p_existing_transaction_id uuid DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
  v_property uuid := p_property_id;
  v_caller uuid := auth.uid();
  v_is_service boolean := auth.role()='service_role';
  v_is_manager boolean := false;
  v_is_submanager boolean := false;
BEGIN
  IF v_caller IS NULL AND NOT v_is_service THEN
    RAISE EXCEPTION 'Unauthenticated payment processing' USING ERRCODE='28000';
  END IF;
  IF v_property IS NULL AND p_invoice_id IS NOT NULL THEN
    SELECT property_id INTO v_property FROM public.invoices WHERE id=p_invoice_id;
  END IF;
  IF v_property IS NULL THEN
    SELECT property_id INTO v_property FROM public.tenants WHERE id=p_tenant_id;
  END IF;

  IF NOT v_is_service THEN
    v_is_manager := v_caller=p_manager_id;
    v_is_submanager := EXISTS (
      SELECT 1 FROM public.manager_submanagers ms
      JOIN public.submanager_permissions sp ON sp.manager_id=ms.manager_id AND sp.submanager_user_id=ms.submanager_user_id
      WHERE ms.manager_id=p_manager_id AND ms.submanager_user_id=v_caller
        AND COALESCE(sp.can_record_payments,false)=true
        AND (COALESCE(sp.restrict_to_assigned_properties,true)=false OR v_property=ANY(COALESCE(sp.assigned_property_ids,'{}'::uuid[])))
    );
    IF v_is_manager OR v_is_submanager THEN
      IF NOT public.manager_payment_authority_for_property(p_manager_id,v_property,v_caller) THEN
        RAISE EXCEPTION 'Manager mandate does not permit payment collection for this property' USING ERRCODE='42501';
      END IF;
    ELSE
      -- Tenants (and everyone else) can never credit an invoice directly.
      RAISE EXCEPTION 'Unauthorized payment processing attempt' USING ERRCODE='42501';
    END IF;
  END IF;

  RETURN public.process_payment_atomic_core(
    p_tenant_id,p_manager_id,p_amount,p_payment_method,p_payment_date,p_reference,
    p_invoice_id,p_invoice_ids,p_unit_id,p_property_id,p_unit_number,p_phone,
    p_recorded_by,p_notes,p_existing_transaction_id
  );
END;
$$;

-- The core keeps its original grants after the rename; it must only be reachable
-- through the wrapper (SECURITY DEFINER, so the wrapper does not need the grant).
REVOKE ALL ON FUNCTION public.process_payment_atomic_core(uuid,uuid,numeric,text,date,text,uuid,uuid[],uuid,uuid,text,text,uuid,text,uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.process_payment_atomic_core(uuid,uuid,numeric,text,date,text,uuid,uuid[],uuid,uuid,text,text,uuid,text,uuid)
  TO service_role;

REVOKE ALL ON FUNCTION public.process_payment_atomic(uuid,uuid,numeric,text,date,text,uuid,uuid[],uuid,uuid,text,text,uuid,text,uuid)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.process_payment_atomic(uuid,uuid,numeric,text,date,text,uuid,uuid[],uuid,uuid,text,text,uuid,text,uuid)
  TO authenticated, service_role;

-- Third-party payer crediting is service-only (no client code calls it).
REVOKE ALL ON FUNCTION public.process_payer_payment_atomic(uuid,numeric,text,date,text,jsonb,text,text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.process_payer_payment_atomic(uuid,numeric,text,date,text,jsonb,text,text)
  TO service_role;

COMMIT;
