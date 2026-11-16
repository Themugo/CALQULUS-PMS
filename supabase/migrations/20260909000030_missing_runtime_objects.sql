-- Objects the app and edge functions call but no migration created (they only existed in the original
-- hand-built database). Found by cross-checking every .rpc()/.from() in src and supabase/functions
-- against a full replay of the migration chain. All IF NOT EXISTS / OR REPLACE.

-- 1. IP rate limiting. _shared/security.ts calls check_ip_rate_limit() and FAILS OPEN when it is
--    missing, so public endpoints had no IP throttle at all.
CREATE TABLE IF NOT EXISTS public.ip_rate_limits (
  ip_address   text        NOT NULL,
  function_name text       NOT NULL,
  window_start timestamptz NOT NULL,
  request_count integer    NOT NULL DEFAULT 0,
  PRIMARY KEY (ip_address, function_name, window_start)
);
ALTER TABLE public.ip_rate_limits ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.ip_rate_limits FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.check_ip_rate_limit(p_ip_address text, p_function text, p_max_per_hour integer DEFAULT 100)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_window timestamptz := date_trunc('hour', now()); v_count integer;
BEGIN
  IF nullif(trim(p_ip_address),'') IS NULL OR nullif(trim(p_function),'') IS NULL THEN RETURN true; END IF;
  INSERT INTO public.ip_rate_limits(ip_address, function_name, window_start, request_count)
  VALUES (p_ip_address, p_function, v_window, 1)
  ON CONFLICT (ip_address, function_name, window_start)
  DO UPDATE SET request_count = public.ip_rate_limits.request_count + 1
  RETURNING request_count INTO v_count;
  -- opportunistic cleanup of old windows
  IF random() < 0.01 THEN DELETE FROM public.ip_rate_limits WHERE window_start < now() - interval '2 hours'; END IF;
  RETURN v_count <= greatest(coalesce(p_max_per_hour,100),1);
END $$;
REVOKE ALL ON FUNCTION public.check_ip_rate_limit(text,text,integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_ip_rate_limit(text,text,integer) TO service_role;

-- 2. Webhook / request idempotency store (stripe-webhook via _shared/idempotency.ts).
CREATE TABLE IF NOT EXISTS public.idempotency_keys (
  key              text PRIMARY KEY,
  response_body    jsonb,
  response_status  integer,
  response_headers jsonb,
  created_at       timestamptz NOT NULL DEFAULT now(),
  expires_at       timestamptz NOT NULL
);
CREATE INDEX IF NOT EXISTS idempotency_keys_expires_idx ON public.idempotency_keys (expires_at);
ALTER TABLE public.idempotency_keys ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.idempotency_keys FROM anon, authenticated;

-- 3. Legacy per-manager paybill display settings (read by create-tenant-account; routing of money is
--    decided by payment_collection_accounts, this only supplies the tenant-facing paybill hint).
CREATE TABLE IF NOT EXISTS public.mpesa_settings (
  manager_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  paybill_enabled boolean NOT NULL DEFAULT false,
  paybill_shortcode text,
  paybill_account_reference text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.mpesa_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS mpesa_settings_owner_read ON public.mpesa_settings;
CREATE POLICY mpesa_settings_owner_read ON public.mpesa_settings FOR SELECT TO authenticated USING (manager_id = auth.uid());
REVOKE INSERT, UPDATE, DELETE ON public.mpesa_settings FROM anon, authenticated;
REVOKE ALL ON public.mpesa_settings FROM anon;

-- 4. Other charges (penalties, amenities) read by generate-pnl.
CREATE TABLE IF NOT EXISTS public.other_charges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  manager_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id uuid,
  property_id uuid REFERENCES public.properties(id) ON DELETE SET NULL,
  description text,
  charge_type text NOT NULL DEFAULT 'other',
  amount numeric NOT NULL DEFAULT 0 CHECK (amount >= 0),
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS other_charges_manager_idx ON public.other_charges (manager_id, status);
ALTER TABLE public.other_charges ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS other_charges_owner_read ON public.other_charges;
CREATE POLICY other_charges_owner_read ON public.other_charges FOR SELECT TO authenticated
  USING (manager_id = auth.uid() OR public.can_manage_property_scope(manager_id));
REVOKE INSERT, UPDATE, DELETE ON public.other_charges FROM anon, authenticated;
REVOKE ALL ON public.other_charges FROM anon;

-- 5. Webhost marketplace directories (read-only to platform webhost admins; writes are RPC/service only).
CREATE TABLE IF NOT EXISTS public.contractors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL, specialty text, location text, availability text,
  phone text, email text, rating numeric NOT NULL DEFAULT 0,
  response_time text, total_jobs integer NOT NULL DEFAULT 0, completed_jobs integer NOT NULL DEFAULT 0,
  on_time_completion numeric NOT NULL DEFAULT 0, quality_score numeric NOT NULL DEFAULT 0,
  customer_satisfaction numeric NOT NULL DEFAULT 0, verified boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.financial_partners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL, type text, location text, status text NOT NULL DEFAULT 'active',
  interest_rate_min numeric, interest_rate_max numeric, approval_rate numeric NOT NULL DEFAULT 0,
  average_interest_rate numeric NOT NULL DEFAULT 0, disbursement_speed text,
  customer_satisfaction numeric NOT NULL DEFAULT 0, default_rate numeric NOT NULL DEFAULT 0,
  total_volume numeric NOT NULL DEFAULT 0, verified boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.utility_providers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL, type text, location text, status text NOT NULL DEFAULT 'active',
  reliability numeric NOT NULL DEFAULT 0, average_response_time text,
  customer_satisfaction numeric NOT NULL DEFAULT 0, total_connections integer NOT NULL DEFAULT 0,
  outage_rate numeric NOT NULL DEFAULT 0, resolution_time text,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['contractors','financial_partners','utility_providers'] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t||'_webhost_read', t);
    EXECUTE format($p$CREATE POLICY %I ON public.%I FOR SELECT TO authenticated
      USING (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'webhost' AND ur.approval_status = 'approved'))$p$, t||'_webhost_read', t);
    EXECUTE format('REVOKE INSERT, UPDATE, DELETE ON public.%I FROM anon, authenticated', t);
    EXECUTE format('REVOKE ALL ON public.%I FROM anon', t);
  END LOOP;
END $$;
