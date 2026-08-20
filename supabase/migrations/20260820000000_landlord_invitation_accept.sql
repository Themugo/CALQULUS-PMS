-- Phase 4: landlord invitation accept without exposing every invitation,
-- and without requiring landlords to INSERT into property_landlords.

-- 1. Stop open SELECT on landlord_invitations (token + email dump).
DROP POLICY IF EXISTS "public_read_invitation_by_token" ON public.landlord_invitations;
DROP POLICY IF EXISTS "public_read_landlord_invitation_by_token" ON public.landlord_invitations;

-- Invitee may read only their own pending row after they are signed in
-- (email must match JWT). Unauthenticated lookup goes through the RPC.
DROP POLICY IF EXISTS "landlord_invitation_invitee_select" ON public.landlord_invitations;
CREATE POLICY "landlord_invitation_invitee_select"
  ON public.landlord_invitations FOR SELECT
  USING (
    status = 'pending'
    AND expires_at > now()
    AND lower(trim(email)) = lower(trim((SELECT email FROM auth.users WHERE id = auth.uid())))
  );

-- 2. Lookup by secret token — returns one invitation, never a table dump.
CREATE OR REPLACE FUNCTION public.lookup_landlord_invitation(p_token text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row jsonb;
BEGIN
  IF p_token IS NULL OR length(trim(p_token)) < 16 THEN
    RETURN NULL;
  END IF;

  SELECT jsonb_build_object(
    'id', li.id,
    'property_id', li.property_id,
    'manager_id', li.manager_id,
    'email', li.email,
    'status', CASE
      WHEN li.status = 'pending' AND li.expires_at < now() THEN 'expired'
      ELSE li.status
    END,
    'expires_at', li.expires_at,
    'property_name', p.name,
    'property_address', p.address
  )
  INTO v_row
  FROM public.landlord_invitations li
  JOIN public.properties p ON p.id = li.property_id
  WHERE li.token = p_token;

  RETURN v_row;
END;
$$;

REVOKE ALL ON FUNCTION public.lookup_landlord_invitation(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.lookup_landlord_invitation(text) TO anon, authenticated;

-- 3. Accept: bind the signed-in user to the property. Landlords stay SELECT-only
-- on property_landlords; this function performs the INSERT.
CREATE OR REPLACE FUNCTION public.accept_landlord_invitation(p_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_email text;
  v_inv public.landlord_invitations%ROWTYPE;
  v_existing uuid;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Unauthenticated caller' USING ERRCODE = '28000';
  END IF;
  IF p_token IS NULL OR length(trim(p_token)) < 16 THEN
    RAISE EXCEPTION 'Invalid invitation' USING ERRCODE = '22023';
  END IF;

  SELECT u.email::text INTO v_email FROM auth.users u WHERE u.id = v_uid;

  SELECT * INTO v_inv
  FROM public.landlord_invitations
  WHERE token = p_token
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid invitation' USING ERRCODE = 'P0002';
  END IF;

  IF v_inv.status = 'accepted' THEN
    RETURN jsonb_build_object('ok', true, 'already_accepted', true, 'property_id', v_inv.property_id);
  END IF;

  IF v_inv.status <> 'pending' OR v_inv.expires_at < now() THEN
    RAISE EXCEPTION 'Invitation expired' USING ERRCODE = 'P0001';
  END IF;

  IF lower(trim(v_inv.email)) IS DISTINCT FROM lower(trim(COALESCE(v_email, ''))) THEN
    RAISE EXCEPTION 'Invitation email does not match this account' USING ERRCODE = '42501';
  END IF;

  SELECT landlord_user_id INTO v_existing
  FROM public.property_landlords
  WHERE property_id = v_inv.property_id;

  IF v_existing IS NOT NULL AND v_existing IS DISTINCT FROM v_uid THEN
    RAISE EXCEPTION 'This property is already linked to another landlord' USING ERRCODE = '23505';
  END IF;

  IF v_existing IS NULL THEN
    INSERT INTO public.property_landlords (
      property_id, landlord_user_id, manager_id, revenue_share_pct
    ) VALUES (
      v_inv.property_id, v_uid, v_inv.manager_id, 100
    );
  END IF;

  INSERT INTO public.user_roles (user_id, role, tenant_id, approval_status)
  VALUES (v_uid, 'landlord', NULL, 'approved')
  ON CONFLICT (user_id, role) DO UPDATE
    SET approval_status = EXCLUDED.approval_status;

  UPDATE public.landlord_invitations
  SET status = 'accepted', accepted_at = now()
  WHERE id = v_inv.id;

  RETURN jsonb_build_object('ok', true, 'property_id', v_inv.property_id);
END;
$$;

REVOKE ALL ON FUNCTION public.accept_landlord_invitation(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.accept_landlord_invitation(text) TO authenticated;

-- 4. Landlords may read manager + team-member profiles (not tenants).
DROP POLICY IF EXISTS "landlord_reads_linked_manager_and_team_profiles" ON public.profiles;
CREATE POLICY "landlord_reads_linked_manager_and_team_profiles"
  ON public.profiles FOR SELECT
  USING (
    id IN (
      SELECT pl.manager_id
      FROM public.property_landlords pl
      WHERE pl.landlord_user_id = auth.uid()
        AND pl.manager_id IS NOT NULL
    )
    OR id IN (
      SELECT tm.member_user_id
      FROM public.landlord_team_members tm
      WHERE tm.landlord_user_id = auth.uid()
    )
  );
