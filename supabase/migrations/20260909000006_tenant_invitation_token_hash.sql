-- Phase 2F: tenant invitation tokens hashed at rest (transition-safe).
--
-- * token_hash is added and backfilled in the database from existing raw tokens, so every
--   link already sent keeps working. Raw `token` stays for legacy rows until an operator
--   runs the cleanup step in docs/engineering (NOT done here). New invitations store
--   token_hash only (token NULL).
-- * Lookups accept the hash, or the legacy raw token while token_hash IS NULL.
-- * The manager UI can no longer re-display a stored link: rotate_tenant_invitation_token()
--   issues a NEW token (returned once) and invalidates the previous link.
-- Do NOT apply before Phase 2D migration reconciliation is complete and approved.

CREATE OR REPLACE FUNCTION public.hash_invite_token(p_token text)
RETURNS text LANGUAGE sql IMMUTABLE SET search_path = public, extensions
AS $$ SELECT encode(extensions.digest(coalesce(p_token,''), 'sha256'), 'hex') $$;
REVOKE ALL ON FUNCTION public.hash_invite_token(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.hash_invite_token(text) TO anon, authenticated, service_role;

ALTER TABLE public.tenant_invitations ADD COLUMN IF NOT EXISTS token_hash text;
ALTER TABLE public.tenant_invitations ALTER COLUMN token DROP NOT NULL;

UPDATE public.tenant_invitations
   SET token_hash = public.hash_invite_token(token)
 WHERE token IS NOT NULL AND token_hash IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS tenant_invitations_token_hash_key
  ON public.tenant_invitations (token_hash) WHERE token_hash IS NOT NULL;

-- Any other inserter that still supplies a raw token gets its hash filled in.
CREATE OR REPLACE FUNCTION public.tenant_invitations_set_token_hash()
RETURNS trigger LANGUAGE plpgsql SET search_path = public, extensions AS $$
BEGIN
  IF NEW.token IS NOT NULL AND NEW.token_hash IS NULL THEN
    NEW.token_hash := public.hash_invite_token(NEW.token);
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_tenant_invitations_token_hash ON public.tenant_invitations;
CREATE TRIGGER trg_tenant_invitations_token_hash
  BEFORE INSERT OR UPDATE OF token ON public.tenant_invitations
  FOR EACH ROW EXECUTE FUNCTION public.tenant_invitations_set_token_hash();

CREATE OR REPLACE FUNCTION public.validate_invitation_token(token_value text)
RETURNS TABLE (
  id            uuid,
  email         text,
  tenant_name   text,
  phone         text,
  property_id   uuid,
  property_name text,
  unit          text,
  invited_by    text,
  inviter_name  text,
  status        text,
  expires_at    timestamptz,
  monthly_rent  numeric,
  house_deposit numeric,
  water_deposit numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ti.id,
    ti.email,
    ti.tenant_name,
    ti.phone,
    ti.property_id,
    ti.property_name,
    ti.unit,
    ti.invited_by::text,
    COALESCE(
      (SELECT cs.company_name FROM public.company_settings cs
        WHERE cs.manager_user_id::text = ti.invited_by LIMIT 1),
      (SELECT p.full_name FROM public.profiles p
        WHERE p.id::text = ti.invited_by LIMIT 1),
      'Your property manager'
    ) AS inviter_name,
    ti.status,
    ti.expires_at,
    ti.monthly_rent,
    ti.house_deposit,
    ti.water_deposit
  FROM public.tenant_invitations ti
  WHERE (ti.token_hash = public.hash_invite_token(token_value)
         OR (ti.token_hash IS NULL AND ti.token = token_value))
    AND ti.status = 'pending'
    AND ti.expires_at > now();
END;
$$;
REVOKE ALL ON FUNCTION public.validate_invitation_token(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.validate_invitation_token(text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.invitation_token_state(token_value text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  inv public.tenant_invitations%ROWTYPE;
BEGIN
  SELECT * INTO inv FROM public.tenant_invitations ti WHERE (ti.token_hash = public.hash_invite_token(token_value)
                                          OR (ti.token_hash IS NULL AND ti.token = token_value));
  IF NOT FOUND THEN
    RETURN 'invalid';
  END IF;
  IF inv.status = 'pending' AND inv.expires_at > now() THEN
    RETURN 'pending';
  END IF;
  IF inv.status = 'pending' THEN
    RETURN 'expired';
  END IF;
  IF inv.status = 'used' THEN
    RETURN 'used';
  END IF;
  RETURN 'invalid';
END;
$$;
REVOKE ALL ON FUNCTION public.invitation_token_state(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.invitation_token_state(text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.claim_tenant_invitation_atomic(p_token text)
RETURNS public.tenants LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
  uid uuid:=auth.uid(); v public.tenant_invitations%ROWTYPE; t public.tenants%ROWTYPE;
  existing_tid uuid; v_mode text:='manager'; v_agency uuid; v_unit uuid; old_manager uuid; old_mode text;
BEGIN
  IF uid IS NULL OR auth.role()<>'authenticated' THEN RAISE EXCEPTION 'Authentication required' USING ERRCODE='42501'; END IF;
  IF NULLIF(trim(p_token),'') IS NULL THEN RAISE EXCEPTION 'Invitation token is required' USING ERRCODE='22023'; END IF;

  SELECT * INTO v FROM public.tenant_invitations
   WHERE (token_hash=public.hash_invite_token(trim(p_token)) OR (token_hash IS NULL AND token=trim(p_token))) FOR UPDATE;
  IF NOT FOUND OR v.status<>'pending' OR v.expires_at<=now() THEN RAISE EXCEPTION 'Invitation is invalid or expired' USING ERRCODE='41000'; END IF;
  IF lower(v.email)<>lower(COALESCE((SELECT email FROM auth.users WHERE id=uid),'')) THEN RAISE EXCEPTION 'Invitation email does not match account' USING ERRCODE='42501'; END IF;

  IF v.property_id IS NULL OR NOT EXISTS (SELECT 1 FROM public.properties p WHERE p.id=v.property_id AND p.manager_id::text=v.invited_by::text) THEN
    RAISE EXCEPTION 'Invitation property is no longer valid' USING ERRCODE='42501';
  END IF;

  SELECT ur.tenant_id INTO existing_tid FROM public.user_roles ur WHERE ur.user_id=uid AND ur.role='tenant' LIMIT 1;
  IF existing_tid IS NOT NULL THEN
    SELECT * INTO t FROM public.tenants WHERE id=existing_tid FOR UPDATE;
    IF NOT FOUND THEN existing_tid:=NULL; ELSE old_manager:=t.manager_id; old_mode:=COALESCE(t.management_mode,'independent'); END IF;
  END IF;

  IF existing_tid IS NULL THEN
    SELECT mp.agency_id INTO v_agency FROM public.manager_profiles mp WHERE mp.manager_user_id::text=v.invited_by::text LIMIT 1;
    v_mode:=CASE WHEN v_agency IS NOT NULL THEN 'agency' ELSE 'manager' END;
    IF v.unit IS NOT NULL THEN
      SELECT id INTO v_unit FROM public.units WHERE property_id=v.property_id AND lower(unit_number)=lower(trim(v.unit)) LIMIT 1;
    END IF;
    INSERT INTO public.tenants(name,email,phone,manager_id,property,property_id,unit,unit_id,monthly_rent,status,source,management_mode,management_started_at,management_updated_at,created_at,updated_at)
    VALUES(v.tenant_name,lower(v.email),v.phone, v.invited_by::uuid, v.property_name,v.property_id,v.unit,v_unit,v.monthly_rent,'active','manager_created',v_mode,now(),now(),now(),now())
    RETURNING * INTO t;
    INSERT INTO public.user_roles(user_id,tenant_id,role,approval_status) VALUES(uid,t.id,'tenant','approved') ON CONFLICT(user_id,role) DO UPDATE SET tenant_id=EXCLUDED.tenant_id,approval_status='approved';
  ELSE
    IF COALESCE(t.management_mode,'independent')<>'independent' AND t.manager_id IS NOT NULL THEN
      RAISE EXCEPTION 'This tenant account is already linked to a managed property' USING ERRCODE='40901';
    END IF;
    SELECT mp.agency_id INTO v_agency FROM public.manager_profiles mp WHERE mp.manager_user_id::text=v.invited_by::text LIMIT 1;
    v_mode:=CASE WHEN v_agency IS NOT NULL THEN 'agency' ELSE 'manager' END;
    IF v.unit IS NOT NULL THEN
      SELECT id INTO v_unit FROM public.units WHERE property_id=v.property_id AND lower(unit_number)=lower(trim(v.unit)) LIMIT 1;
    END IF;
    UPDATE public.tenants SET
      name=COALESCE(NULLIF(trim(t.name),''),v.tenant_name),
      email=lower(v.email),
      phone=COALESCE(v.phone,t.phone),
      manager_id=v.invited_by::uuid,
      managing_landlord_id=NULL,
      property=v.property_name,
      property_id=v.property_id,
      unit=v.unit,
      unit_id=v_unit,
      monthly_rent=COALESCE(v.monthly_rent,t.monthly_rent),
      management_mode=v_mode,
      management_started_at=COALESCE(t.management_started_at,now()),
      management_updated_at=now(),
      status=CASE WHEN t.status IS NULL THEN 'active' ELSE t.status END,
      updated_at=now()
    WHERE id=t.id RETURNING * INTO t;
  END IF;

  UPDATE public.user_roles SET tenant_id=t.id,approval_status='approved' WHERE user_id=uid AND role='tenant';
  UPDATE public.profiles SET full_name=COALESCE(NULLIF(trim(v.tenant_name),''),profiles.full_name),phone=COALESCE(v.phone,profiles.phone) WHERE id=uid;
  UPDATE public.orphan_tenant_records SET tenant_id=t.id,updated_at=now() WHERE user_id=uid;
  UPDATE public.orphan_payment_entries SET tenant_id=t.id WHERE user_id=uid AND tenant_id IS NULL;
  UPDATE public.move_condition_photos SET tenant_id=t.id WHERE user_id=uid AND tenant_id IS NULL;
  UPDATE public.tenant_personal_documents SET tenant_id=t.id WHERE user_id=uid AND tenant_id IS NULL;
  UPDATE public.tenant_personal_maintenance_logs SET tenant_id=t.id WHERE user_id=uid AND tenant_id IS NULL;

  UPDATE public.tenant_invitations SET status='accepted',used_at=now() WHERE id=v.id;
  INSERT INTO public.tenant_transfer_log(tenant_id,from_manager_id,to_manager_id,transfer_type,transferred_by,notes)
  VALUES(t.id,old_manager,t.manager_id,CASE WHEN existing_tid IS NULL THEN 'manager_claim' WHEN v_agency IS NOT NULL THEN 'orphan_to_agency' ELSE 'orphan_to_manager' END,uid,'Invitation claimed without replacing the canonical tenant identity; portable records retained.');
  INSERT INTO public.tenant_history(tenant_id,action,description) VALUES(t.id,'Management change','Tenant invitation claimed. Existing tenant history and portable records retained.');
  RETURN t;
END $$;
REVOKE ALL ON FUNCTION public.claim_tenant_invitation_atomic(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_tenant_invitation_atomic(text) TO authenticated, service_role;

-- Issue a replacement link for a pending invitation. Returns the raw token ONCE; only its
-- hash is stored and the previous link stops working.
CREATE OR REPLACE FUNCTION public.rotate_tenant_invitation_token(p_invitation_id uuid)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_inv public.tenant_invitations%ROWTYPE;
  v_token text;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501'; END IF;
  SELECT * INTO v_inv FROM public.tenant_invitations WHERE id = p_invitation_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Invitation not found' USING ERRCODE = '42501'; END IF;
  IF v_inv.invited_by <> v_uid::text
     AND NOT EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = v_uid AND ur.role = 'webhost' AND ur.approval_status = 'approved') THEN
    RAISE EXCEPTION 'Invitation not found' USING ERRCODE = '42501';
  END IF;
  IF v_inv.status <> 'pending' OR v_inv.expires_at <= now() THEN
    RAISE EXCEPTION 'Invitation is no longer pending' USING ERRCODE = '22023';
  END IF;
  v_token := encode(extensions.gen_random_bytes(32), 'hex');
  UPDATE public.tenant_invitations
     SET token = NULL, token_hash = public.hash_invite_token(v_token)
   WHERE id = v_inv.id;
  RETURN v_token;
END $$;
REVOKE ALL ON FUNCTION public.rotate_tenant_invitation_token(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rotate_tenant_invitation_token(uuid) TO authenticated;
