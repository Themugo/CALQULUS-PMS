-- Payment routing must follow who COLLECTS, not just which accounts exist.
--
-- get_effective_payment_collection_account ranked accounts by scope only (tenant, lease, unit,
-- property, agency, landlord, manager). When an agency manages a property but the landlord
-- collects (or an agency contract rule says collection_destination = 'landlord'), an
-- agency-level account still outranked the landlord's own account, so a tenant could be shown
-- the agency's paybill for rent that belongs to the landlord.
--
-- The effective destination is now resolved per property from, in order:
--   1. the active agency contract rule on the property's owner link
--      (landlord -> landlord; agency / split -> manager; tenant_direct / external -> no preference),
--   2. property_landlords.payment_destination.
-- When the destination is 'landlord', the landlord's accounts outrank agency- and manager-level
-- accounts. Tenant, lease, unit and property scoped accounts keep their priority (the most
-- specific setting always wins). Agency/manager accounts remain a fallback so a missing landlord
-- account never makes a property un-payable; the account used is recorded on the payment.
CREATE OR REPLACE FUNCTION public.get_effective_payment_collection_account(p_invoice_id uuid)
RETURNS public.payment_collection_accounts
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
DECLARE
  v public.payment_collection_accounts%ROWTYPE;
  v_property uuid;
  v_dest text;
BEGIN
  SELECT i.property_id INTO v_property FROM public.invoices i WHERE i.id = p_invoice_id;

  SELECT CASE
           WHEN r.id IS NOT NULL AND r.collection_destination = 'landlord' THEN 'landlord'
           WHEN r.id IS NOT NULL AND r.collection_destination IN ('agency','split') THEN 'manager'
           WHEN r.id IS NOT NULL THEN NULL
           ELSE pl.payment_destination
         END
    INTO v_dest
  FROM public.property_landlords pl
  LEFT JOIN public.agency_contract_rules r
    ON r.property_landlord_id = pl.id
   AND r.status = 'active'
   AND r.effective_from <= CURRENT_DATE
   AND (r.effective_to IS NULL OR r.effective_to >= CURRENT_DATE)
  WHERE pl.property_id = v_property
  ORDER BY pl.revenue_share_pct DESC NULLS LAST, pl.updated_at DESC
  LIMIT 1;

  SELECT a.* INTO v
  FROM public.invoices i
  JOIN public.properties p ON p.id=i.property_id
  LEFT JOIN public.leases l ON l.id=i.lease_id
  LEFT JOIN public.units u ON u.id=COALESCE(i.unit_id,l.unit_id)
  JOIN public.payment_collection_accounts a ON a.is_active
   AND (a.tenant_id=i.tenant_id OR a.lease_id=i.lease_id OR a.unit_id=COALESCE(i.unit_id,l.unit_id) OR a.property_id=i.property_id OR a.agency_id=(SELECT mp.agency_id FROM public.manager_profiles mp WHERE mp.manager_user_id=p.manager_id LIMIT 1) OR a.landlord_user_id=COALESCE(l.billing_landlord_user_id,(SELECT pl.landlord_user_id FROM public.property_landlords pl WHERE pl.property_id=i.property_id ORDER BY pl.revenue_share_pct DESC NULLS LAST LIMIT 1)) OR a.manager_id=i.manager_id)
  WHERE i.id=p_invoice_id
  ORDER BY CASE
    WHEN a.tenant_id=i.tenant_id AND a.lease_id=i.lease_id THEN 1
    WHEN a.lease_id=i.lease_id THEN 2
    WHEN a.unit_id=COALESCE(i.unit_id,l.unit_id) THEN 3
    WHEN a.property_id=i.property_id THEN 4
    WHEN v_dest='landlord' AND a.landlord_user_id=COALESCE(l.billing_landlord_user_id,(SELECT pl.landlord_user_id FROM public.property_landlords pl WHERE pl.property_id=i.property_id ORDER BY pl.revenue_share_pct DESC NULLS LAST LIMIT 1)) THEN 5
    WHEN a.agency_id=(SELECT mp.agency_id FROM public.manager_profiles mp WHERE mp.manager_user_id=p.manager_id LIMIT 1) AND a.property_id IS NULL THEN 6
    WHEN a.landlord_user_id=COALESCE(l.billing_landlord_user_id,(SELECT pl.landlord_user_id FROM public.property_landlords pl WHERE pl.property_id=i.property_id ORDER BY pl.revenue_share_pct DESC NULLS LAST LIMIT 1)) THEN 7
    WHEN a.manager_id=i.manager_id THEN 8 ELSE 99 END,
    CASE WHEN a.is_default THEN 0 ELSE 1 END,a.priority,a.created_at
  LIMIT 1;
  RETURN v;
END $$;

REVOKE EXECUTE ON FUNCTION public.get_effective_payment_collection_account(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_effective_payment_collection_account(uuid) TO service_role;
