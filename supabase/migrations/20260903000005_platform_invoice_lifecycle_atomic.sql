-- CALQULUS PMS — Phase 19: platform invoice lifecycle convergence
-- All webhost financial mutations use one authorized database boundary.

CREATE OR REPLACE FUNCTION public.cancel_manager_invoice_atomic(
  p_manager_invoice_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_invoice record;
BEGIN
  IF auth.role() <> 'service_role' AND NOT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role IN ('webhost','platform_admin')
  ) THEN
    RAISE EXCEPTION 'Unauthorized platform invoice cancellation' USING ERRCODE='42501';
  END IF;

  SELECT id, status INTO v_invoice
  FROM public.manager_invoices
  WHERE id = p_manager_invoice_id
  FOR UPDATE;

  IF v_invoice.id IS NULL THEN
    RAISE EXCEPTION 'Platform invoice not found' USING ERRCODE='P0002';
  END IF;
  IF v_invoice.status = 'paid' THEN
    RAISE EXCEPTION 'Paid platform invoice cannot be cancelled' USING ERRCODE='55000';
  END IF;
  IF v_invoice.status = 'cancelled' THEN
    RETURN jsonb_build_object('success',true,'idempotent',true,'invoice_id',v_invoice.id,'status','cancelled');
  END IF;

  UPDATE public.manager_invoices
  SET status = 'cancelled', updated_at = now()
  WHERE id = v_invoice.id;

  RETURN jsonb_build_object('success',true,'idempotent',false,'invoice_id',v_invoice.id,'status','cancelled');
END; $$;

REVOKE ALL ON FUNCTION public.cancel_manager_invoice_atomic(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cancel_manager_invoice_atomic(uuid) TO authenticated, service_role;
