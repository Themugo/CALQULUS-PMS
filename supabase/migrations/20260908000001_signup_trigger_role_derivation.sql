-- Registration hardening (audit 2026-10-24, findings H2/H3).
--
-- 1. Tenant signups were given a pending `manager` role because the trigger
--    defaulted every signup without `role` metadata to manager. Tenant flows
--    (account_type = 'independent_tenant', or role = 'tenant') now map to the
--    tenant role, which is what self_register_tenant_atomic /
--    create-tenant-account expect.
-- 2. A public signup can no longer self-assign an *approved* landlord role by
--    sending role = 'landlord'. Landlord roles are granted only by
--    accept_landlord_invitation (token + email match) or by an admin.
--
-- Only the function body changes (CREATE OR REPLACE); the existing trigger
-- binding and grants are untouched. Do NOT apply to any environment until the
-- Phase 2D migration reconciliation has been completed and approved.

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
  IF v_role IN ('manager', 'tenant', 'agency') THEN
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
