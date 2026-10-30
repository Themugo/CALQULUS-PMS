-- Phase 2F: first-time Google/OAuth sign-in no longer becomes a pending manager by accident.
--
-- Before: any signup without role metadata (including every OAuth user, on any portal) got a
-- pending 'manager' role. Now OAuth users start with no role and call complete_oauth_signup()
-- once, with the portal they signed in from. Allowed: manager, agency (both pending admin
-- approval, enforced by protect_user_roles_changes) and tenant (approved, unlinked, same as the
-- email signup path). landlord/webhost/submanager/payer are never self-assignable here.
-- Only usable while the caller has no role at all, so it cannot add roles to existing accounts.
-- Do NOT apply before Phase 2D migration reconciliation is complete and approved.

CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role text;
  v_full_name text;
  v_account_type text;
BEGIN
  v_account_type := NEW.raw_user_meta_data ->> 'account_type';
  v_role := NULLIF(NEW.raw_user_meta_data ->> 'role', '');

  IF v_role IS NULL AND v_account_type = 'independent_tenant' THEN
    v_role := 'tenant';
  END IF;

  -- Social (OAuth) signups carry no portal information. They get NO role here; the client
  -- completes registration with complete_oauth_signup() after the user picks a portal.
  IF v_role IS NULL AND v_account_type IS NULL
     AND COALESCE(NEW.raw_app_meta_data ->> 'provider', 'email') <> 'email' THEN
    v_role := 'none';
  END IF;

  v_role := COALESCE(v_role, 'manager');

  -- SECURITY SANITIZATION:
  -- Prevent public signups from self-assigning privileged roles via auth metadata
  IF v_role IN ('webhost', 'platform_admin', 'submanager') THEN
    v_role := 'manager';
  END IF;

  v_full_name := COALESCE(
    NULLIF(NEW.raw_user_meta_data ->> 'full_name', ''),
    NULLIF(NEW.raw_user_meta_data ->> 'name', ''),
    NEW.email
  );

  INSERT INTO public.profiles (id, full_name, email, phone)
  VALUES (
    NEW.id,
    v_full_name,
    NEW.email,
    NULLIF(NEW.raw_user_meta_data ->> 'phone', '')
  )
  ON CONFLICT (id) DO UPDATE
  SET
    full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name),
    email = COALESCE(EXCLUDED.email, public.profiles.email),
    phone = COALESCE(EXCLUDED.phone, public.profiles.phone);

  -- 'landlord' is intentionally absent: it is granted only through
  -- accept_landlord_invitation() or by an administrator.
  IF v_role IN ('manager', 'tenant', 'agency') THEN  -- 'none' (OAuth) matches nothing
    INSERT INTO public.user_roles (user_id, role, tenant_id, approval_status)
    VALUES (
      NEW.id,
      v_role::public.app_role,
      NULL,
      CASE WHEN v_role IN ('manager', 'agency') THEN 'pending' ELSE 'approved' END
    )
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;


CREATE OR REPLACE FUNCTION public.complete_oauth_signup(p_role text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_role text := lower(btrim(coalesce(p_role, '')));
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501'; END IF;
  IF v_role NOT IN ('manager', 'agency', 'tenant') THEN
    RAISE EXCEPTION 'Role not available for self-registration' USING ERRCODE = '42501';
  END IF;
  -- Serialise concurrent calls for the same user.
  PERFORM pg_advisory_xact_lock(hashtextextended('complete_oauth_signup:' || v_uid::text, 0));
  IF EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = v_uid) THEN
    RETURN 'already_registered';
  END IF;
  INSERT INTO public.user_roles (user_id, role, tenant_id, approval_status)
  VALUES (v_uid, v_role::public.app_role, NULL, CASE WHEN v_role = 'tenant' THEN 'approved' ELSE 'pending' END)
  ON CONFLICT (user_id, role) DO NOTHING;
  RETURN 'registered';
END $$;
REVOKE ALL ON FUNCTION public.complete_oauth_signup(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.complete_oauth_signup(text) TO authenticated;
