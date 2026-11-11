-- Let a linked third-party payer see WHERE each bill they are allowed to pay will be
-- collected, so the payer portal can group bills by payment destination before they
-- pick them, instead of failing server-side with "different payment destinations".
--
-- get_invoice_payment_instructions (granted to authenticated) authorised the invoice's
-- tenant, its manager/submanager and webhost only. A payer linked to the unit through
-- payer_unit_links was refused ("Forbidden"). This adds exactly that clause and nothing
-- else: the payer must own an active link to the invoice's unit.
--
-- NOT applied by Claude. Apply with the other Phase 2F migrations after Phase 2D.

BEGIN;

CREATE OR REPLACE FUNCTION public.get_invoice_payment_instructions(p_invoice_id uuid)
RETURNS TABLE(account_id uuid,account_label text,payment_method text,paybill_number text,till_number text,bank_name text,bank_account_name text,bank_account_number text,bank_branch text,payment_instructions text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_inv public.invoices%ROWTYPE;
  v_authorized boolean := false;
  v_unit uuid;
BEGIN
  SELECT * INTO v_inv FROM public.invoices WHERE id = p_invoice_id;
  IF v_inv.id IS NULL THEN
    RETURN;
  END IF;

  IF v_uid IS NOT NULL THEN
    IF v_inv.tenant_id IN (SELECT public.caller_tenant_ids()) THEN
      v_authorized := true;
    ELSIF v_inv.manager_id = v_uid THEN
      v_authorized := true;
    ELSIF v_inv.property_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.properties p
      WHERE p.id = v_inv.property_id
        AND (
          p.manager_id = v_uid
          OR EXISTS (SELECT 1 FROM public.manager_submanagers ms WHERE ms.manager_id = p.manager_id AND ms.submanager_user_id = v_uid)
        )
    ) THEN
      v_authorized := true;
    ELSIF EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = v_uid AND role = 'webhost') THEN
      v_authorized := true;
    ELSE
      v_unit := COALESCE(v_inv.unit_id, (SELECT l.unit_id FROM public.leases l WHERE l.id = v_inv.lease_id));
      IF v_unit IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.payer_unit_links pul
        JOIN public.payment_parties pp ON pp.id = pul.payer_party_id
        WHERE pp.user_id = v_uid AND pul.unit_id = v_unit AND pul.is_active
      ) THEN
        v_authorized := true;
      END IF;
    END IF;
  END IF;

  IF NOT v_authorized THEN
    RAISE EXCEPTION 'Forbidden' USING ERRCODE='42501';
  END IF;

  RETURN QUERY
  SELECT a.id,a.account_label,a.payment_method,a.paybill_number,a.till_number,a.bank_name,a.bank_account_name,a.bank_account_number,a.bank_branch,a.payment_instructions
  FROM public.get_effective_payment_collection_account(p_invoice_id) a;
END $$;
GRANT EXECUTE ON FUNCTION public.get_invoice_payment_instructions(uuid) TO authenticated;

COMMIT;
