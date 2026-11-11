-- Property management handover: independent landlord <-> agency, with every record kept.
--
-- Every property belongs to its owner (the landlord). Who OPERATES it can change over time:
--   independent landlord (with family / hired team)  ->  agency or manager  ->  back to the landlord.
-- Operational records (tenants, leases, invoices, payments, receipts, maintenance, documents...)
-- are scoped by manager_id, so changing the operator without moving them would hide history from
-- the new operator. This migration adds a consented, atomic, audited handover that:
--   * moves the property and its operational records to the new operator (nothing is deleted),
--   * keeps tenant credit and payment history with the tenant,
--   * ends the old operator's mandate and contract rule (history rows are kept),
--   * deactivates the departing operator's own collection accounts for the property so tenants are
--     never shown a departed agency's paybill,
--   * leaves the departing operator's own books (ledger, bank, payouts, vendors, messages) with them.
-- Joining needs the receiving agency's acceptance. Handing back to the owner needs no acceptance.

CREATE TABLE IF NOT EXISTS public.property_management_transfers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  owner_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  from_operator_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  to_operator_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  direction text NOT NULL CHECK (direction IN ('to_owner','to_operator')),
  status text NOT NULL DEFAULT 'proposed' CHECK (status IN ('proposed','completed','declined','cancelled')),
  initiated_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  responded_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reason text,
  moved jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);
CREATE INDEX IF NOT EXISTS property_management_transfers_property_idx ON public.property_management_transfers(property_id, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS property_management_transfers_one_open_uidx
  ON public.property_management_transfers(property_id) WHERE status = 'proposed';

ALTER TABLE public.property_management_transfers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS property_management_transfers_party_read ON public.property_management_transfers;
CREATE POLICY property_management_transfers_party_read ON public.property_management_transfers
  FOR SELECT TO authenticated
  USING (auth.uid() IN (owner_user_id, from_operator_id, to_operator_id));
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.property_management_transfers FROM authenticated, anon;

-- Internal: moves everything. Not granted to any client role.
CREATE OR REPLACE FUNCTION public.execute_property_management_handover(p_transfer_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  t public.property_management_transfers%ROWTYPE;
  v_current uuid;
  v_link public.property_landlords%ROWTYPE;
  v_denied text[] := ARRAY[
    'properties','property_landlords','payment_collection_accounts','manager_management_mandates',
    'activity_logs','audit_logs','agencies','agency_members','manager_submanagers',
    'submanager_permissions','submanager_property_assignments','webhook_secrets',
    'ledger_accounts','ledger_journal_entries','ledger_adjustment_requests',
    'financial_close_periods','financial_close_audit','financial_audit_packs','treasury_control_settings',
    'commissions','owner_payout_batches','owner_payout_settlement_audit',
    'bank_details','bank_integration_settings','bank_transactions',
    'management_vendors','in_app_notifications','notification_failures','messages','broadcast_campaigns',
    'manager_credit_settings','manager_owner_profiles','property_management_transfers'
  ];
  v_units uuid[];
  v_tenants uuid[];
  v_moved jsonb := '{}'::jsonb;
  v_tbl text;
  v_n bigint;
  v_to_role text;
BEGIN
  SELECT * INTO t FROM public.property_management_transfers WHERE id = p_transfer_id FOR UPDATE;
  IF NOT FOUND OR t.status <> 'proposed' THEN
    RAISE EXCEPTION 'Transfer is not open' USING ERRCODE = '22023';
  END IF;

  SELECT manager_id INTO v_current FROM public.properties WHERE id = t.property_id FOR UPDATE;
  IF v_current IS DISTINCT FROM t.from_operator_id THEN
    RAISE EXCEPTION 'The property is no longer operated by the party that started this transfer' USING ERRCODE = '40001';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.payment_transactions pt
    WHERE pt.property_id = t.property_id AND pt.status = 'pending' AND pt.created_at > now() - interval '2 hours'
  ) THEN
    RAISE EXCEPTION 'A payment is in progress on this property. Try again in a few minutes.' USING ERRCODE = '55006';
  END IF;

  SELECT * INTO v_link FROM public.property_landlords WHERE property_id = t.property_id FOR UPDATE;

  SELECT COALESCE(array_agg(id), '{}') INTO v_units FROM public.units WHERE property_id = t.property_id;

  -- 1. Property itself.
  UPDATE public.properties SET manager_id = t.to_operator_id, updated_at = now() WHERE id = t.property_id;

  -- 2. Tenants of this property (their ids drive the tenant-keyed pass below).
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='tenants' AND column_name='property_id') THEN
    WITH m AS (
      UPDATE public.tenants SET manager_id = t.to_operator_id
      WHERE property_id = t.property_id AND manager_id = t.from_operator_id
      RETURNING id)
    SELECT COALESCE(array_agg(id), '{}') INTO v_tenants FROM m;
    v_moved := v_moved || jsonb_build_object('tenants', COALESCE(array_length(v_tenants,1),0));
  ELSE
    v_tenants := '{}';
  END IF;

  -- 3. Property-keyed operational records.
  FOR v_tbl IN
    SELECT c.table_name FROM information_schema.columns c
    JOIN information_schema.tables tb ON tb.table_schema=c.table_schema AND tb.table_name=c.table_name AND tb.table_type='BASE TABLE'
    WHERE c.table_schema='public' AND c.column_name='manager_id' AND c.data_type='uuid'
      AND EXISTS (SELECT 1 FROM information_schema.columns c2 WHERE c2.table_schema='public' AND c2.table_name=c.table_name AND c2.column_name='property_id')
      AND c.table_name <> 'tenants' AND NOT (c.table_name = ANY (v_denied))
    ORDER BY c.table_name
  LOOP
    EXECUTE format('UPDATE public.%I SET manager_id = $1 WHERE property_id = $2 AND manager_id = $3', v_tbl)
      USING t.to_operator_id, t.property_id, t.from_operator_id;
    GET DIAGNOSTICS v_n = ROW_COUNT;
    IF v_n > 0 THEN v_moved := v_moved || jsonb_build_object(v_tbl, v_n); END IF;
  END LOOP;

  -- 4. Unit-keyed records without a property column.
  FOR v_tbl IN
    SELECT c.table_name FROM information_schema.columns c
    JOIN information_schema.tables tb ON tb.table_schema=c.table_schema AND tb.table_name=c.table_name AND tb.table_type='BASE TABLE'
    WHERE c.table_schema='public' AND c.column_name='manager_id' AND c.data_type='uuid'
      AND EXISTS (SELECT 1 FROM information_schema.columns c2 WHERE c2.table_schema='public' AND c2.table_name=c.table_name AND c2.column_name='unit_id')
      AND NOT EXISTS (SELECT 1 FROM information_schema.columns c3 WHERE c3.table_schema='public' AND c3.table_name=c.table_name AND c3.column_name='property_id')
      AND c.table_name <> 'tenants' AND NOT (c.table_name = ANY (v_denied))
    ORDER BY c.table_name
  LOOP
    EXECUTE format('UPDATE public.%I SET manager_id = $1 WHERE unit_id = ANY($2) AND manager_id = $3', v_tbl)
      USING t.to_operator_id, v_units, t.from_operator_id;
    GET DIAGNOSTICS v_n = ROW_COUNT;
    IF v_n > 0 THEN v_moved := v_moved || jsonb_build_object(v_tbl, v_n); END IF;
  END LOOP;

  -- 5. Tenant-keyed records without property or unit columns (credit ledger, payers, notices...).
  IF array_length(v_tenants,1) > 0 THEN
    FOR v_tbl IN
      SELECT c.table_name FROM information_schema.columns c
      JOIN information_schema.tables tb ON tb.table_schema=c.table_schema AND tb.table_name=c.table_name AND tb.table_type='BASE TABLE'
      WHERE c.table_schema='public' AND c.column_name='manager_id' AND c.data_type='uuid'
        AND EXISTS (SELECT 1 FROM information_schema.columns c2 WHERE c2.table_schema='public' AND c2.table_name=c.table_name AND c2.column_name='tenant_id')
        AND NOT EXISTS (SELECT 1 FROM information_schema.columns c3 WHERE c3.table_schema='public' AND c3.table_name=c.table_name AND c3.column_name IN ('property_id','unit_id'))
        AND c.table_name <> 'tenants' AND NOT (c.table_name = ANY (v_denied))
      ORDER BY c.table_name
    LOOP
      EXECUTE format('UPDATE public.%I SET manager_id = $1 WHERE tenant_id = ANY($2) AND manager_id = $3', v_tbl)
        USING t.to_operator_id, v_tenants, t.from_operator_id;
      GET DIAGNOSTICS v_n = ROW_COUNT;
      IF v_n > 0 THEN v_moved := v_moved || jsonb_build_object(v_tbl, v_n); END IF;
    END LOOP;
  END IF;

  -- 6. The departing operator's own collection accounts for this property go inactive (kept, not
  --    deleted) so tenants are never shown them. The owner's own accounts are never touched.
  IF t.from_operator_id <> t.owner_user_id THEN
    UPDATE public.payment_collection_accounts
    SET is_active = false, updated_at = now()
    WHERE is_active AND manager_id = t.from_operator_id
      AND landlord_user_id IS DISTINCT FROM t.owner_user_id
      AND (property_id = t.property_id OR unit_id = ANY(v_units));
    GET DIAGNOSTICS v_n = ROW_COUNT;
    IF v_n > 0 THEN v_moved := v_moved || jsonb_build_object('collection_accounts_deactivated', v_n); END IF;
  END IF;

  -- 7. End the old mandate and contract rule (rows kept as history).
  UPDATE public.manager_management_mandates SET mandate_status = 'ended', updated_at = now()
  WHERE property_id = t.property_id AND manager_id = t.from_operator_id AND mandate_status <> 'ended';
  IF v_link.id IS NOT NULL THEN
    UPDATE public.agency_contract_rules
    SET status = 'expired', effective_to = GREATEST(CURRENT_DATE, effective_from), updated_at = now()
    WHERE property_landlord_id = v_link.id AND status = 'active';
  END IF;

  -- 8. Owner link: independent landlords carry no managing party; otherwise the landlord keeps
  --    collecting by default and the new operator can agree a different arrangement afterwards.
  SELECT ur.role::text INTO v_to_role FROM public.user_roles ur WHERE ur.user_id = t.to_operator_id
  ORDER BY CASE WHEN ur.role = 'agency' THEN 0 WHEN ur.role = 'manager' THEN 1 ELSE 2 END LIMIT 1;

  IF t.direction = 'to_owner' THEN
    UPDATE public.property_landlords
    SET manager_id = NULL, operating_model = 'landlord_self_managed', payment_destination = 'landlord',
        agency_service_model = NULL, delegated_manager_id = NULL, updated_at = now()
    WHERE property_id = t.property_id;
  ELSE
    UPDATE public.property_landlords
    SET manager_id = t.to_operator_id, operating_model = 'manager_operates_landlord_collects',
        payment_destination = 'landlord',
        agency_service_model = CASE WHEN v_to_role = 'agency' THEN 'managed_direct_landlord_collection' ELSE NULL END,
        delegated_manager_id = NULL, updated_at = now()
    WHERE property_id = t.property_id;
  END IF;

  UPDATE public.property_management_transfers
  SET status = 'completed', completed_at = now(), moved = v_moved
  WHERE id = t.id;

  INSERT INTO public.audit_logs (action, resource_type, resource_id, user_id, details)
  VALUES ('property_management_transferred', 'property', t.property_id, COALESCE(t.responded_by, t.initiated_by),
          jsonb_build_object('transfer_id', t.id, 'from', t.from_operator_id, 'to', t.to_operator_id,
                             'direction', t.direction, 'moved', v_moved));
  RETURN v_moved;
END $$;
REVOKE ALL ON FUNCTION public.execute_property_management_handover(uuid) FROM PUBLIC, anon, authenticated;

-- Owner (or the current operator, only when handing back to the owner) starts a handover.
-- p_to_email NULL = back to the owner. Joining an agency/manager waits for their acceptance.
CREATE OR REPLACE FUNCTION public.request_property_management_transfer_atomic(
  p_property_id uuid, p_to_email text DEFAULT NULL, p_reason text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_owner uuid;
  v_current uuid;
  v_to uuid;
  v_id uuid;
  v_moved jsonb;
BEGIN
  IF v_uid IS NULL OR auth.role() <> 'authenticated' THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;

  SELECT pl.landlord_user_id INTO v_owner FROM public.property_landlords pl WHERE pl.property_id = p_property_id;
  SELECT p.manager_id INTO v_current FROM public.properties p WHERE p.id = p_property_id;
  IF v_owner IS NULL OR v_current IS NULL THEN
    RAISE EXCEPTION 'Property or owner not found' USING ERRCODE = '22023';
  END IF;

  IF NULLIF(trim(COALESCE(p_to_email,'')), '') IS NULL THEN
    v_to := v_owner;
  ELSE
    SELECT u.id INTO v_to FROM auth.users u WHERE lower(u.email) = lower(trim(p_to_email)) LIMIT 1;
    IF v_to IS NULL OR NOT EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = v_to AND ur.role IN ('agency','manager')) THEN
      RAISE EXCEPTION 'No agency or manager account found for that email' USING ERRCODE = '22023';
    END IF;
  END IF;

  IF v_to = v_current THEN
    RAISE EXCEPTION 'This property is already managed by that party' USING ERRCODE = '22023';
  END IF;

  -- Only the owner can choose a new operator; the operator can only hand back to the owner.
  IF v_uid <> v_owner AND NOT (v_uid = v_current AND v_to = v_owner) THEN
    RAISE EXCEPTION 'Only the property owner can choose who manages it' USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.property_management_transfers(
    property_id, owner_user_id, from_operator_id, to_operator_id, direction, initiated_by, reason)
  VALUES (p_property_id, v_owner, v_current, v_to,
          CASE WHEN v_to = v_owner THEN 'to_owner' ELSE 'to_operator' END,
          v_uid, NULLIF(left(trim(COALESCE(p_reason,'')), 300), ''))
  RETURNING id INTO v_id;

  -- Consent: the receiving party is the caller, or the receiver is the owner themself.
  IF v_to = v_uid OR v_to = v_owner THEN
    v_moved := public.execute_property_management_handover(v_id);
    RETURN jsonb_build_object('status', 'completed', 'transfer_id', v_id, 'moved', v_moved);
  END IF;
  RETURN jsonb_build_object('status', 'proposed', 'transfer_id', v_id);
END $$;

-- The receiving agency/manager accepts or declines; the owner can cancel their own proposal.
CREATE OR REPLACE FUNCTION public.respond_property_management_transfer_atomic(p_transfer_id uuid, p_accept boolean)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid uuid := auth.uid();
  t public.property_management_transfers%ROWTYPE;
  v_moved jsonb;
BEGIN
  IF v_uid IS NULL OR auth.role() <> 'authenticated' THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO t FROM public.property_management_transfers WHERE id = p_transfer_id FOR UPDATE;
  IF NOT FOUND OR t.status <> 'proposed' THEN
    RAISE EXCEPTION 'Transfer is not open' USING ERRCODE = '22023';
  END IF;

  IF p_accept THEN
    IF v_uid <> t.to_operator_id THEN
      RAISE EXCEPTION 'Only the receiving agency or manager can accept' USING ERRCODE = '42501';
    END IF;
    UPDATE public.property_management_transfers SET responded_by = v_uid WHERE id = t.id;
    v_moved := public.execute_property_management_handover(t.id);
    RETURN jsonb_build_object('status', 'completed', 'transfer_id', t.id, 'moved', v_moved);
  END IF;

  IF v_uid = t.to_operator_id THEN
    UPDATE public.property_management_transfers SET status = 'declined', responded_by = v_uid, completed_at = now() WHERE id = t.id;
    RETURN jsonb_build_object('status', 'declined', 'transfer_id', t.id);
  ELSIF v_uid IN (t.owner_user_id, t.initiated_by) THEN
    UPDATE public.property_management_transfers SET status = 'cancelled', responded_by = v_uid, completed_at = now() WHERE id = t.id;
    RETURN jsonb_build_object('status', 'cancelled', 'transfer_id', t.id);
  END IF;
  RAISE EXCEPTION 'Not a party to this transfer' USING ERRCODE = '42501';
END $$;

REVOKE ALL ON FUNCTION public.request_property_management_transfer_atomic(uuid,text,text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.respond_property_management_transfer_atomic(uuid,boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.request_property_management_transfer_atomic(uuid,text,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.respond_property_management_transfer_atomic(uuid,boolean) TO authenticated;
