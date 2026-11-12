-- A landlord who collects rent directly must be able to publish THEIR OWN
-- paybill / till / bank details for the tenants of their property, so those
-- tenants can pay manually from the tenant portal.
--
-- save_payment_collection_account_atomic already accepts a landlord-owned
-- account, but a property-scoped account outranks every landlord/agency/manager
-- level one in get_effective_payment_collection_account. Calling it directly,
-- a landlord could therefore redirect rent on a property that the manager or
-- agency collects. This wrapper closes that: it only works when the property's
-- effective destination (agency contract rule first, then property_landlords)
-- is the landlord AND the caller is the property's primary owner (the same
-- link the router uses). Validation and storage are delegated to the existing
-- RPC so there is a single place that checks scopes and methods.
CREATE OR REPLACE FUNCTION public.save_landlord_collection_account_atomic(p_property_id uuid, p_payload jsonb)
RETURNS public.payment_collection_accounts
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_primary uuid;
  v_dest text;
  v_existing uuid;
  v public.payment_collection_accounts%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Authentication required' USING ERRCODE='42501'; END IF;
  IF p_property_id IS NULL THEN RAISE EXCEPTION 'A property is required' USING ERRCODE='22023'; END IF;

  SELECT pl.landlord_user_id,
         CASE
           WHEN r.id IS NOT NULL AND r.collection_destination = 'landlord' THEN 'landlord'
           WHEN r.id IS NOT NULL AND r.collection_destination IN ('agency','split') THEN 'manager'
           WHEN r.id IS NOT NULL THEN NULL
           ELSE pl.payment_destination
         END
    INTO v_primary, v_dest
  FROM public.property_landlords pl
  LEFT JOIN public.agency_contract_rules r
    ON r.property_landlord_id = pl.id
   AND r.status = 'active'
   AND r.effective_from <= CURRENT_DATE
   AND (r.effective_to IS NULL OR r.effective_to >= CURRENT_DATE)
  WHERE pl.property_id = p_property_id
  ORDER BY pl.revenue_share_pct DESC NULLS LAST, pl.updated_at DESC
  LIMIT 1;

  IF v_primary IS DISTINCT FROM v_uid THEN
    RAISE EXCEPTION 'Only the primary owner of this property can set its collection account' USING ERRCODE='42501';
  END IF;
  IF v_dest IS DISTINCT FROM 'landlord' THEN
    RAISE EXCEPTION 'Rent for this property is collected by your manager or agency, so a landlord account would not be used' USING ERRCODE='42501';
  END IF;

  SELECT a.id INTO v_existing
  FROM public.payment_collection_accounts a
  WHERE a.property_id = p_property_id AND a.landlord_user_id = v_uid
    AND a.unit_id IS NULL AND a.lease_id IS NULL AND a.tenant_id IS NULL AND a.agency_id IS NULL
    AND a.is_active AND a.is_default
  ORDER BY a.updated_at DESC
  LIMIT 1;

  SELECT * INTO v FROM public.save_payment_collection_account_atomic(
    v_existing,
    (COALESCE(p_payload,'{}'::jsonb)
       - 'unit_id' - 'lease_id' - 'tenant_id' - 'agency_id' - 'manager_id')
    || jsonb_build_object(
         'property_id', p_property_id,
         'landlord_user_id', v_uid,
         'is_default', true,
         'is_active', true,
         'priority', 100));
  RETURN v;
END $$;

REVOKE EXECUTE ON FUNCTION public.save_landlord_collection_account_atomic(uuid,jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.save_landlord_collection_account_atomic(uuid,jsonb) TO authenticated;
