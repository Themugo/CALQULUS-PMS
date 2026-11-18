-- Late penalties are a business decision, not a platform default.
-- Each business owner (manager, agency, landlord) can set a default penalty policy.
-- Resolution for a property, first match wins:
--   1. an explicit property_billing_config row (per-property override, set by the operator)
--   2. the operating manager/agency policy of properties.manager_id
--   3. the landlord's policy (property_landlords)
--   4. nothing configured => NO penalty.
CREATE TABLE IF NOT EXISTS public.penalty_policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  owner_role text NOT NULL CHECK (owner_role IN ('manager','agency','landlord')),
  enabled boolean NOT NULL DEFAULT false,
  penalty_type text NOT NULL DEFAULT 'fixed' CHECK (penalty_type IN ('fixed','percentage')),
  penalty_amount numeric(12,2) NOT NULL DEFAULT 0 CHECK (penalty_amount >= 0),
  penalty_pct numeric(5,2) NOT NULL DEFAULT 0 CHECK (penalty_pct >= 0 AND penalty_pct <= 100),
  grace_period_days integer NOT NULL DEFAULT 0 CHECK (grace_period_days BETWEEN 0 AND 90),
  max_penalty_amount numeric(12,2) CHECK (max_penalty_amount IS NULL OR max_penalty_amount >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (owner_user_id, owner_role)
);
ALTER TABLE public.penalty_policies ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS penalty_policies_owner_select ON public.penalty_policies;
CREATE POLICY penalty_policies_owner_select ON public.penalty_policies FOR SELECT TO authenticated
  USING (owner_user_id = auth.uid() OR public.is_webhost());
-- Writes go through upsert_penalty_policy only.
REVOKE INSERT, UPDATE, DELETE ON public.penalty_policies FROM anon, authenticated;
REVOKE ALL ON public.penalty_policies FROM anon;

CREATE OR REPLACE FUNCTION public.upsert_penalty_policy(
  p_owner_role text, p_enabled boolean, p_penalty_type text, p_penalty_amount numeric,
  p_penalty_pct numeric, p_grace_period_days integer, p_max_penalty_amount numeric DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Authentication required' USING ERRCODE='28000'; END IF;
  IF p_owner_role NOT IN ('manager','agency','landlord') THEN RAISE EXCEPTION 'Invalid role' USING ERRCODE='22023'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id=v_uid AND role::text=p_owner_role) THEN
    RAISE EXCEPTION 'You do not hold the % role', p_owner_role USING ERRCODE='42501';
  END IF;
  IF p_penalty_type NOT IN ('fixed','percentage') THEN RAISE EXCEPTION 'Invalid penalty type' USING ERRCODE='22023'; END IF;
  IF COALESCE(p_penalty_amount,0) < 0 OR COALESCE(p_penalty_pct,0) < 0 OR COALESCE(p_penalty_pct,0) > 100
     OR COALESCE(p_grace_period_days,0) < 0 OR COALESCE(p_grace_period_days,0) > 90 THEN
    RAISE EXCEPTION 'Penalty values out of range' USING ERRCODE='22023';
  END IF;
  IF p_enabled AND ((p_penalty_type='fixed' AND COALESCE(p_penalty_amount,0)=0) OR (p_penalty_type='percentage' AND COALESCE(p_penalty_pct,0)=0)) THEN
    RAISE EXCEPTION 'Enter a penalty amount or percentage before enabling' USING ERRCODE='22023';
  END IF;
  INSERT INTO public.penalty_policies(owner_user_id, owner_role, enabled, penalty_type, penalty_amount, penalty_pct, grace_period_days, max_penalty_amount)
  VALUES (v_uid, p_owner_role, COALESCE(p_enabled,false), p_penalty_type, COALESCE(p_penalty_amount,0), COALESCE(p_penalty_pct,0), COALESCE(p_grace_period_days,0), p_max_penalty_amount)
  ON CONFLICT (owner_user_id, owner_role) DO UPDATE SET enabled=EXCLUDED.enabled, penalty_type=EXCLUDED.penalty_type,
    penalty_amount=EXCLUDED.penalty_amount, penalty_pct=EXCLUDED.penalty_pct, grace_period_days=EXCLUDED.grace_period_days,
    max_penalty_amount=EXCLUDED.max_penalty_amount, updated_at=now();
  RETURN jsonb_build_object('success', true);
END $$;
REVOKE ALL ON FUNCTION public.upsert_penalty_policy(text,boolean,text,numeric,numeric,integer,numeric) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.upsert_penalty_policy(text,boolean,text,numeric,numeric,integer,numeric) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.resolve_late_penalty_policy(p_property_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE c public.property_billing_config%ROWTYPE; pp public.penalty_policies%ROWTYPE; v_mgr uuid;
BEGIN
  IF auth.role() <> 'service_role' THEN RAISE EXCEPTION 'Service role only' USING ERRCODE='42501'; END IF;
  SELECT * INTO c FROM public.property_billing_config WHERE property_id = p_property_id LIMIT 1;
  IF c.id IS NOT NULL THEN
    RETURN jsonb_build_object('source','property','enabled',COALESCE(c.late_penalty_enabled,false),'type',c.late_penalty_type,
      'amount',COALESCE(c.late_penalty_amount,0),'pct',COALESCE(c.late_penalty_pct,0),'grace_days',COALESCE(c.grace_period_days,0),'max_amount',NULL);
  END IF;
  SELECT manager_id INTO v_mgr FROM public.properties WHERE id = p_property_id;
  SELECT * INTO pp FROM public.penalty_policies WHERE owner_user_id = v_mgr AND owner_role IN ('manager','agency') ORDER BY updated_at DESC LIMIT 1;
  IF pp.id IS NULL THEN
    SELECT p2.* INTO pp FROM public.penalty_policies p2
      JOIN public.property_landlords pl ON pl.landlord_user_id = p2.owner_user_id AND pl.property_id = p_property_id
     WHERE p2.owner_role = 'landlord' ORDER BY p2.updated_at DESC LIMIT 1;
  END IF;
  IF pp.id IS NULL THEN
    RETURN jsonb_build_object('source','none','enabled',false,'type','fixed','amount',0,'pct',0,'grace_days',0,'max_amount',NULL);
  END IF;
  RETURN jsonb_build_object('source',pp.owner_role,'enabled',pp.enabled,'type',pp.penalty_type,'amount',pp.penalty_amount,
    'pct',pp.penalty_pct,'grace_days',pp.grace_period_days,'max_amount',pp.max_penalty_amount);
END $$;
REVOKE ALL ON FUNCTION public.resolve_late_penalty_policy(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.resolve_late_penalty_policy(uuid) TO service_role;
