-- Phase 2F: indexed, case-insensitive auth user lookup for edge functions.
-- Replaces paging through auth.admin.listUsers() (O(n), silently capped).
-- Service-role only; never exposed to anon/authenticated (would be an enumeration oracle).
CREATE OR REPLACE FUNCTION public.find_auth_user_id_by_email(p_email text)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT id FROM auth.users WHERE lower(email) = lower(btrim(p_email)) LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.find_auth_user_id_by_email(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.find_auth_user_id_by_email(text) TO service_role;
