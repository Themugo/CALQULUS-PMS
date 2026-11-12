-- Manual payment: a tenant must see, in their portal, the SAME account the bill
-- and the STK push will use, including the account number to type at a paybill.
--
-- 1. get_tenant_payment_routes (the portal's "Payment details" card) still ranked
--    accounts the pre-migration-16 way, so on a landlord-collected property it
--    could show the agency/manager paybill while bills and STK pay the landlord.
--    It now applies the same destination-first rule as
--    get_effective_payment_collection_account.
-- 2. get_invoice_payment_instructions (per-bill details) never returned the
--    account reference. It now does, falling back to the unit number exactly like
--    the portal card, so the paybill account number is shown on the bill.

BEGIN;

DROP FUNCTION IF EXISTS public.get_invoice_payment_instructions(uuid);
CREATE FUNCTION public.get_invoice_payment_instructions(p_invoice_id uuid)
RETURNS TABLE(account_id uuid,account_label text,payment_method text,paybill_number text,till_number text,bank_name text,bank_account_name text,bank_account_number text,bank_branch text,payment_instructions text,account_reference text)
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
  v_unit := COALESCE(v_inv.unit_id, (SELECT l.unit_id FROM public.leases l WHERE l.id = v_inv.lease_id));

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
    ELSIF v_unit IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.payer_unit_links pul
      JOIN public.payment_parties pp ON pp.id = pul.payer_party_id
      WHERE pp.user_id = v_uid AND pul.unit_id = v_unit AND pul.is_active
    ) THEN
      v_authorized := true;
    END IF;
  END IF;

  IF NOT v_authorized THEN
    RAISE EXCEPTION 'Forbidden' USING ERRCODE='42501';
  END IF;

  RETURN QUERY
  SELECT a.id,a.account_label,a.payment_method,a.paybill_number,a.till_number,a.bank_name,a.bank_account_name,a.bank_account_number,a.bank_branch,a.payment_instructions,
         COALESCE(a.account_reference,(SELECT u.unit_number FROM public.units u WHERE u.id = v_unit))
  FROM public.get_effective_payment_collection_account(p_invoice_id) a;
END $$;
REVOKE EXECUTE ON FUNCTION public.get_invoice_payment_instructions(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_invoice_payment_instructions(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_tenant_payment_routes()
RETURNS TABLE(
  tenant_id uuid,
  lease_id uuid,
  unit_id uuid,
  unit_number text,
  property_id uuid,
  property_name text,
  payment_account_id uuid,
  account_label text,
  account_reference text,
  payment_method text,
  paybill_number text,
  till_number text,
  bank_name text,
  bank_account_name text,
  bank_account_number text,
  bank_branch text,
  payment_instructions text
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
DECLARE v_tenant_id uuid;
BEGIN
  SELECT ur.tenant_id INTO v_tenant_id
  FROM public.user_roles ur
  WHERE ur.user_id=auth.uid() AND ur.role='tenant'
  LIMIT 1;
  IF v_tenant_id IS NULL THEN RAISE EXCEPTION 'Tenant access required' USING ERRCODE='42501'; END IF;

  RETURN QUERY
  SELECT
    l.tenant_id,
    l.id,
    COALESCE(l.unit_id,t.unit_id),
    u.unit_number,
    l.property_id,
    p.name,
    a.id,
    a.account_label,
    COALESCE(a.account_reference,u.unit_number),
    a.payment_method,
    a.paybill_number,
    a.till_number,
    a.bank_name,
    a.bank_account_name,
    a.bank_account_number,
    a.bank_branch,
    a.payment_instructions
  FROM public.leases l
  JOIN public.properties p ON p.id=l.property_id
  LEFT JOIN public.tenants t ON t.id=l.tenant_id
  LEFT JOIN public.units u ON u.id=COALESCE(l.unit_id,t.unit_id)
  LEFT JOIN LATERAL (
    SELECT CASE
             WHEN r.id IS NOT NULL AND r.collection_destination = 'landlord' THEN 'landlord'
             WHEN r.id IS NOT NULL AND r.collection_destination IN ('agency','split') THEN 'manager'
             WHEN r.id IS NOT NULL THEN NULL
             ELSE pl.payment_destination
           END AS dest
    FROM public.property_landlords pl
    LEFT JOIN public.agency_contract_rules r
      ON r.property_landlord_id = pl.id
     AND r.status = 'active'
     AND r.effective_from <= CURRENT_DATE
     AND (r.effective_to IS NULL OR r.effective_to >= CURRENT_DATE)
    WHERE pl.property_id = l.property_id
    ORDER BY pl.revenue_share_pct DESC NULLS LAST, pl.updated_at DESC
    LIMIT 1
  ) d ON true
  LEFT JOIN LATERAL (
    SELECT a.*,
      CASE
        WHEN a.tenant_id=l.tenant_id AND a.lease_id=l.id THEN 1
        WHEN a.lease_id=l.id THEN 2
        WHEN a.unit_id=COALESCE(l.unit_id,t.unit_id) THEN 3
        WHEN a.property_id=l.property_id THEN 4
        WHEN d.dest='landlord' AND a.landlord_user_id=COALESCE(l.billing_landlord_user_id,(SELECT pl.landlord_user_id FROM public.property_landlords pl WHERE pl.property_id=l.property_id ORDER BY pl.revenue_share_pct DESC NULLS LAST LIMIT 1)) THEN 5
        WHEN a.agency_id=(SELECT mp.agency_id FROM public.manager_profiles mp WHERE mp.manager_user_id=p.manager_id LIMIT 1) AND a.property_id IS NULL THEN 6
        WHEN a.landlord_user_id=COALESCE(l.billing_landlord_user_id,(SELECT pl.landlord_user_id FROM public.property_landlords pl WHERE pl.property_id=l.property_id ORDER BY pl.revenue_share_pct DESC NULLS LAST LIMIT 1)) THEN 7
        WHEN a.manager_id=p.manager_id THEN 8
        ELSE 99
      END AS route_rank
    FROM public.payment_collection_accounts a
    WHERE a.is_active
      AND (
        a.tenant_id=l.tenant_id
        OR a.lease_id=l.id
        OR a.unit_id=COALESCE(l.unit_id,t.unit_id)
        OR a.property_id=l.property_id
        OR (a.agency_id=(SELECT mp.agency_id FROM public.manager_profiles mp WHERE mp.manager_user_id=p.manager_id LIMIT 1) AND a.property_id IS NULL)
        OR a.landlord_user_id=COALESCE(l.billing_landlord_user_id,(SELECT pl.landlord_user_id FROM public.property_landlords pl WHERE pl.property_id=l.property_id ORDER BY pl.revenue_share_pct DESC NULLS LAST LIMIT 1))
        OR (a.manager_id=p.manager_id AND a.property_id IS NULL AND a.unit_id IS NULL AND a.lease_id IS NULL AND a.tenant_id IS NULL)
      )
    ORDER BY route_rank, CASE WHEN a.is_default THEN 0 ELSE 1 END, a.priority, a.created_at
    LIMIT 1
  ) a ON true
  WHERE l.tenant_id=v_tenant_id
    AND l.status='active'
    AND l.archived_at IS NULL
  ORDER BY p.name,u.unit_number;
END $$;
GRANT EXECUTE ON FUNCTION public.get_tenant_payment_routes() TO authenticated;

COMMIT;
