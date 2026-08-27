-- ============================================================
-- Webhost/Admin landing-page content persistence (CMS boundary)
--
-- Public homepage content is config-driven (src/features/marketing/landing).
-- This migration adds the authoritative storage row that a webhost/admin
-- content editor writes to, so edits survive past the static defaults and
-- are served by a Supabase-backed LandingContentProvider.
--
-- Authorization model (mirrors the frontend UX gate, but authoritative):
--   * SELECT for everyone (the public page reads the published config)
--   * INSERT/UPDATE/DELETE only for webhost platform admins via
--     platform_admins — full access for owner/business/can_manage_platform_settings,
--     and a scoped subset for plain 'admin' (hero/capabilities/roles/metrics).
--
-- The whole config is one JSONB row keyed by scope ('landing') so the
-- provider can upsert section-by-section or wholesale. Frontend permissions
-- here are UX-only; this RLS is the real gate.
-- ============================================================

-- ── 1. landing_page_content table ─────────────────────────────
CREATE TABLE IF NOT EXISTS public.landing_page_content (
  scope        text PRIMARY KEY,
  config       jsonb NOT NULL,
  published    boolean NOT NULL DEFAULT true,
  created_by   uuid REFERENCES auth.users(id),
  updated_by   uuid REFERENCES auth.users(id),
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_landing_page_content_scope ON public.landing_page_content(scope);

ALTER TABLE public.landing_page_content ENABLE ROW LEVEL SECURITY;

-- Everyone (any authenticated or anonymous session) may read the published config.
DROP POLICY IF EXISTS "landing_public_read" ON public.landing_page_content;
CREATE POLICY "landing_public_read"
  ON public.landing_page_content FOR SELECT
  USING (published = true);

-- RLS helper: is the caller a webhost platform account?
CREATE OR REPLACE FUNCTION public.is_webhost_platform_admin()
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.platform_admins pa
    JOIN public.user_roles ur ON ur.user_id = pa.user_id
    WHERE pa.user_id = auth.uid()
      AND ur.role = 'webhost'
      AND pa.suspended = false
  );
$$;

-- RLS helper: does the caller have full landing-content management rights?
-- Owner and business platform admins (can_manage_platform_settings) are the
-- webhost "full" tier. Plain 'admin' gets a scoped subset, enforced server-side
-- by upsert_landing_section below.
CREATE OR REPLACE FUNCTION public.can_manage_landing_full()
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.platform_admins pa
    JOIN public.user_roles ur ON ur.user_id = pa.user_id
    WHERE pa.user_id = auth.uid()
      AND ur.role = 'webhost'
      AND pa.suspended = false
      AND (pa.admin_type IN ('owner', 'business') OR pa.can_manage_platform_settings = true)
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_webhost_platform_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_manage_landing_full() TO authenticated;

-- Webhost platform admins may create the content row.
DROP POLICY IF EXISTS "landing_webhost_insert" ON public.landing_page_content;
CREATE POLICY "landing_webhost_insert"
  ON public.landing_page_content FOR INSERT
  WITH CHECK (public.is_webhost_platform_admin());

-- Full editors (owner/business/can_manage_platform_settings) can update/delete.
DROP POLICY IF EXISTS "landing_full_update" ON public.landing_page_content;
CREATE POLICY "landing_full_update"
  ON public.landing_page_content FOR UPDATE
  USING (public.can_manage_landing_full())
  WITH CHECK (public.can_manage_landing_full());

DROP POLICY IF EXISTS "landing_full_delete" ON public.landing_page_content;
CREATE POLICY "landing_full_delete"
  ON public.landing_page_content FOR DELETE
  USING (public.can_manage_landing_full());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.landing_page_content TO authenticated;
GRANT ALL ON public.landing_page_content TO service_role;

-- ── 2. Authoritative, section-scoped upsert RPC ──────────────
-- The single write path for webhost/admin editors. SECURITY DEFINER so the
-- section whitelist is enforced server-side, never by the client.
--   * full editors (owner/business/can_manage_platform_settings): any section
--   * plain admin: only hero, capabilities, roles, metrics
-- The RPC reads the existing row, replaces ONLY the named section key under
-- `config` (top-level: theme, header, hero, dashboard, trust, capabilities,
-- roles, propertyTypes, metrics, finalCta, footer, brand), and upserts.
DROP FUNCTION IF EXISTS public.upsert_landing_section(text, jsonb);

CREATE OR REPLACE FUNCTION public.upsert_landing_section(p_section text, p_payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_existing jsonb;
  v_allowed  boolean;
  v_role     text;
  v_admin_type text;
  v_full     boolean;
BEGIN
  -- Determine the caller's tier.
  SELECT pa.admin_type, ur.role INTO v_admin_type, v_role
  FROM public.platform_admins pa
  JOIN public.user_roles ur ON ur.user_id = pa.user_id
  WHERE pa.user_id = auth.uid()
    AND ur.role = 'webhost'
    AND pa.suspended = false
  LIMIT 1;

  IF v_role IS NULL THEN
    RAISE EXCEPTION 'not_authorized'
      USING ERRCODE = '42501';
  END IF;

  v_full := (v_admin_type IN ('owner', 'business'))
            OR (SELECT pa.can_manage_platform_settings FROM public.platform_admins pa
                WHERE pa.user_id = auth.uid() LIMIT 1);

  -- Scoped whitelist for plain admins.
  v_allowed := p_section IN ('hero', 'capabilities', 'roles', 'metrics');
  IF NOT v_full AND NOT v_allowed THEN
    RAISE EXCEPTION 'section_not_granted'
      USING ERRCODE = '42501';
  END IF;

  -- Merge: read existing config, replace only this section.
  SELECT config INTO v_existing FROM public.landing_page_content WHERE scope = 'landing';
  IF v_existing IS NULL THEN
    v_existing := '{}';
  END IF;

  v_existing := jsonb_set(v_existing::jsonb, ARRAY[p_section], p_payload);

  INSERT INTO public.landing_page_content (scope, config, published, updated_by)
  VALUES ('landing', v_existing::jsonb, true, auth.uid())
  ON CONFLICT (scope) DO UPDATE
    SET config = EXCLUDED.config,
        published = true,
        updated_by = auth.uid(),
        updated_at = now();

  RETURN v_existing::jsonb;
END;
$$;

REVOKE ALL ON FUNCTION public.upsert_landing_section(text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.upsert_landing_section(text, jsonb) TO authenticated;