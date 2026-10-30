-- Phase 2F: tenant-consented manager claims (audit finding H4 / Phase 2F §4).
--
-- Previously the claim-tenant edge function let an approved manager take any
-- independently registered tenant (tenants.manager_id IS NULL) by guessing the
-- email address; the tenant never consented. This migration adds an explicit,
-- expiring, single-use consent request:
--
--   1. request_tenant_claim()  [service_role only; called by the claim-tenant
--      edge function] records a request bound to (tenant, manager, property,
--      unit) and stores ONLY the SHA-256 of a random token. A new request for the
--      same tuple revokes the previous pending one.
--   2. The tenant receives the raw token by email and, signed in as the tenant,
--      calls preview_tenant_claim / accept_tenant_claim / decline_tenant_claim.
--      The token is hashed inside the database; identity is bound to the
--      authenticated user's own tenant role AND the tenant email.
--   3. accept_tenant_claim() locks the request row, re-validates manager
--      approval, property ownership, unit availability and that the tenant is
--      still independent, then performs the association atomically and logs it.
--
-- No existing function or migration is modified. Idempotent.
-- Do NOT apply to any environment until the Phase 2D migration reconciliation
-- has been completed and approved.

CREATE TABLE IF NOT EXISTS public.tenant_claim_requests (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  manager_id  uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  unit_id     uuid REFERENCES public.units(id) ON DELETE SET NULL,
  token_hash  text NOT NULL UNIQUE CHECK (token_hash ~ '^[0-9a-f]{64}$'),
  status      text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'revoked', 'expired')),
  created_at  timestamptz NOT NULL DEFAULT now(),
  expires_at  timestamptz NOT NULL,
  resolved_at timestamptz,
  resolved_by uuid
);
CREATE UNIQUE INDEX IF NOT EXISTS tenant_claim_requests_one_pending
  ON public.tenant_claim_requests (tenant_id, manager_id, property_id) WHERE status = 'pending';

ALTER TABLE public.tenant_claim_requests ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.tenant_claim_requests FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.tenant_claim_requests TO service_role;

-- Called by the edge function with the service role. Returns zero rows when no
-- eligible tenant exists so the caller can answer identically either way.
CREATE OR REPLACE FUNCTION public.request_tenant_claim(
  p_manager_id uuid, p_email text, p_property_id uuid, p_unit_id uuid,
  p_token_hash text, p_expires_at timestamptz
) RETURNS TABLE (tenant_email text, tenant_name text, property_name text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_tenant public.tenants%ROWTYPE;
  v_prop public.properties%ROWTYPE;
BEGIN
  IF p_expires_at <= now() OR p_expires_at > now() + interval '14 days' THEN
    RAISE EXCEPTION 'invalid expiry' USING ERRCODE = '22023';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = p_manager_id AND ur.role = 'manager' AND ur.approval_status = 'approved') THEN
    RAISE EXCEPTION 'manager not approved' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO v_prop FROM public.properties WHERE id = p_property_id AND manager_id = p_manager_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'property not in managed portfolio' USING ERRCODE = '42501';
  END IF;
  IF p_unit_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.units WHERE id = p_unit_id AND property_id = p_property_id) THEN
    RAISE EXCEPTION 'unit not in property' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_tenant FROM public.tenants
   WHERE lower(email) = lower(btrim(p_email)) AND manager_id IS NULL
     AND COALESCE(management_mode, 'independent') = 'independent'
   LIMIT 1;
  IF NOT FOUND THEN
    RETURN; -- no row: caller responds generically
  END IF;

  UPDATE public.tenant_claim_requests SET status = 'revoked', resolved_at = now()
   WHERE tenant_id = v_tenant.id AND manager_id = p_manager_id AND property_id = p_property_id AND status = 'pending';
  INSERT INTO public.tenant_claim_requests (tenant_id, manager_id, property_id, unit_id, token_hash, expires_at)
  VALUES (v_tenant.id, p_manager_id, p_property_id, p_unit_id, p_token_hash, p_expires_at);

  tenant_email := v_tenant.email; tenant_name := v_tenant.name; property_name := v_prop.name;
  RETURN NEXT;
END $$;

-- Shared lookup: resolves the request for the CURRENT user only.
CREATE OR REPLACE FUNCTION public.tenant_claim_for_caller(p_token text, p_lock boolean)
RETURNS public.tenant_claim_requests
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_hash text;
  v_req public.tenant_claim_requests%ROWTYPE;
  v_email text;
  v_tenant_email text;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'authentication required' USING ERRCODE = '42501'; END IF;
  IF p_token IS NULL OR length(p_token) < 32 OR length(p_token) > 256 THEN
    RAISE EXCEPTION 'invalid or expired claim request' USING ERRCODE = 'P0002';
  END IF;
  v_hash := encode(extensions.digest(p_token, 'sha256'), 'hex');
  IF p_lock THEN
    SELECT * INTO v_req FROM public.tenant_claim_requests WHERE token_hash = v_hash FOR UPDATE;
  ELSE
    SELECT * INTO v_req FROM public.tenant_claim_requests WHERE token_hash = v_hash;
  END IF;
  -- Identical error for unknown token, wrong user, wrong status: no oracle.
  IF NOT FOUND THEN RAISE EXCEPTION 'invalid or expired claim request' USING ERRCODE = 'P0002'; END IF;

  SELECT lower(btrim(u.email)) INTO v_email FROM auth.users u WHERE u.id = v_uid;
  SELECT lower(btrim(t.email)) INTO v_tenant_email FROM public.tenants t WHERE t.id = v_req.tenant_id;
  IF v_email IS NULL OR v_tenant_email IS NULL OR v_email <> v_tenant_email
     OR NOT EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = v_uid AND ur.role = 'tenant' AND ur.tenant_id = v_req.tenant_id) THEN
    RAISE EXCEPTION 'invalid or expired claim request' USING ERRCODE = 'P0002';
  END IF;
  RETURN v_req;
END $$;

CREATE OR REPLACE FUNCTION public.preview_tenant_claim(p_token text)
RETURNS TABLE (manager_name text, property_name text, unit_number text, expires_at timestamptz, status text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_req public.tenant_claim_requests%ROWTYPE;
BEGIN
  v_req := public.tenant_claim_for_caller(p_token, false);
  IF v_req.status <> 'pending' OR v_req.expires_at <= now() THEN
    RAISE EXCEPTION 'invalid or expired claim request' USING ERRCODE = 'P0002';
  END IF;
  RETURN QUERY
  SELECT pr.full_name, p.name, u.unit_number, v_req.expires_at, v_req.status
    FROM public.properties p
    LEFT JOIN public.profiles pr ON pr.id = v_req.manager_id
    LEFT JOIN public.units u ON u.id = v_req.unit_id
   WHERE p.id = v_req.property_id;
END $$;

CREATE OR REPLACE FUNCTION public.decline_tenant_claim(p_token text)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_req public.tenant_claim_requests%ROWTYPE;
BEGIN
  v_req := public.tenant_claim_for_caller(p_token, true);
  IF v_req.status <> 'pending' THEN
    RAISE EXCEPTION 'invalid or expired claim request' USING ERRCODE = 'P0002';
  END IF;
  UPDATE public.tenant_claim_requests SET status = 'declined', resolved_at = now(), resolved_by = auth.uid() WHERE id = v_req.id;
END $$;

CREATE OR REPLACE FUNCTION public.accept_tenant_claim(p_token text)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_req public.tenant_claim_requests%ROWTYPE;
  v_prop public.properties%ROWTYPE;
  v_unit public.units%ROWTYPE;
  v_tenant public.tenants%ROWTYPE;
  v_mode text;
BEGIN
  v_req := public.tenant_claim_for_caller(p_token, true);   -- row locked: concurrent accepts serialise
  IF v_req.status <> 'pending' THEN
    RAISE EXCEPTION 'invalid or expired claim request' USING ERRCODE = 'P0002';
  END IF;
  IF v_req.expires_at <= now() THEN
    UPDATE public.tenant_claim_requests SET status = 'expired', resolved_at = now() WHERE id = v_req.id;
    RETURN NULL;   -- committed state change; caller treats NULL as expired
  END IF;

  SELECT * INTO v_tenant FROM public.tenants WHERE id = v_req.tenant_id FOR UPDATE;
  IF NOT FOUND OR v_tenant.manager_id IS NOT NULL OR COALESCE(v_tenant.management_mode, 'independent') <> 'independent' THEN
    UPDATE public.tenant_claim_requests SET status = 'revoked', resolved_at = now() WHERE id = v_req.id;
    RETURN NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = v_req.manager_id AND ur.role = 'manager' AND ur.approval_status = 'approved') THEN
    UPDATE public.tenant_claim_requests SET status = 'revoked', resolved_at = now() WHERE id = v_req.id;
    RETURN NULL;
  END IF;
  SELECT * INTO v_prop FROM public.properties WHERE id = v_req.property_id AND manager_id = v_req.manager_id FOR UPDATE;
  IF NOT FOUND THEN
    UPDATE public.tenant_claim_requests SET status = 'revoked', resolved_at = now() WHERE id = v_req.id;
    RETURN NULL;
  END IF;
  IF v_req.unit_id IS NOT NULL THEN
    SELECT * INTO v_unit FROM public.units WHERE id = v_req.unit_id AND property_id = v_req.property_id FOR UPDATE;
    IF NOT FOUND OR v_unit.status = 'inactive'
       OR EXISTS (SELECT 1 FROM public.tenants x WHERE x.id <> v_tenant.id AND x.unit_id = v_unit.id AND x.status = 'active') THEN
      UPDATE public.tenant_claim_requests SET status = 'revoked', resolved_at = now() WHERE id = v_req.id;
      RETURN NULL;
    END IF;
  END IF;

  v_mode := CASE WHEN EXISTS (SELECT 1 FROM public.manager_profiles mp WHERE mp.manager_user_id = v_req.manager_id AND mp.agency_id IS NOT NULL) THEN 'agency' ELSE 'manager' END;

  UPDATE public.tenants
     SET manager_id = v_req.manager_id, management_mode = v_mode, property_id = v_req.property_id,
         unit_id = v_req.unit_id, property = v_prop.name, unit = v_unit.unit_number,
         management_started_at = COALESCE(management_started_at, now()), management_updated_at = now(), updated_at = now()
   WHERE id = v_tenant.id;

  INSERT INTO public.tenant_transfer_log (tenant_id, from_manager_id, to_manager_id, transfer_type, transferred_by, notes)
  VALUES (v_tenant.id, NULL, v_req.manager_id, 'manager_claim', auth.uid(), 'Tenant consented to manager association (claim request ' || v_req.id || ')');

  UPDATE public.tenant_claim_requests SET status = 'accepted', resolved_at = now(), resolved_by = auth.uid() WHERE id = v_req.id;
  RETURN v_tenant.id;
END $$;

REVOKE ALL ON FUNCTION public.request_tenant_claim(uuid, text, uuid, uuid, text, timestamptz) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.request_tenant_claim(uuid, text, uuid, uuid, text, timestamptz) TO service_role;
REVOKE ALL ON FUNCTION public.tenant_claim_for_caller(text, boolean) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.preview_tenant_claim(text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.accept_tenant_claim(text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.decline_tenant_claim(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.preview_tenant_claim(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.accept_tenant_claim(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.decline_tenant_claim(text) TO authenticated;
