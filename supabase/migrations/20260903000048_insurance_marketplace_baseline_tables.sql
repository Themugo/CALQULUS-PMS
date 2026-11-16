-- Insurance marketplace baseline tables.
-- These existed in the original hand-built database but were never created by any migration,
-- so a fresh project failed at 20260903000037 (phase66_insurance_atomic). IF NOT EXISTS keeps this
-- a no-op anywhere they already exist. Writes go through the *_atomic RPCs only.
CREATE TABLE IF NOT EXISTS public.insurance_providers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type text NOT NULL DEFAULT 'property',
  rating numeric NOT NULL DEFAULT 0,
  review_count integer NOT NULL DEFAULT 0,
  total_policies integer NOT NULL DEFAULT 0,
  active_policies integer NOT NULL DEFAULT 0,
  location text,
  premium_range text,
  coverage_range text,
  claim_approval_rate numeric NOT NULL DEFAULT 0,
  average_claim_time text,
  verified boolean NOT NULL DEFAULT false,
  coverage_types text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.insurance_policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid REFERENCES public.insurance_providers(id) ON DELETE RESTRICT,
  property_id uuid REFERENCES public.properties(id) ON DELETE CASCADE,
  unit text,
  policy_type text,
  coverage_type text,
  coverage_amount numeric,
  premium numeric,
  deductible numeric,
  status text NOT NULL DEFAULT 'pending',
  start_date timestamptz,
  end_date timestamptz,
  renewal_date timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.insurance_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_id uuid REFERENCES public.insurance_policies(id) ON DELETE RESTRICT,
  provider_id uuid REFERENCES public.insurance_providers(id) ON DELETE RESTRICT,
  property_id uuid REFERENCES public.properties(id) ON DELETE CASCADE,
  claim_type text,
  description text,
  claim_amount numeric NOT NULL DEFAULT 0,
  approved_amount numeric,
  status text NOT NULL DEFAULT 'submitted',
  submitted_date timestamptz NOT NULL DEFAULT now(),
  approved_date timestamptz,
  paid_date timestamptz,
  documents jsonb
);

ALTER TABLE public.insurance_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.insurance_policies  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.insurance_claims    ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS insurance_providers_read ON public.insurance_providers;
CREATE POLICY insurance_providers_read ON public.insurance_providers FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role IN ('webhost','manager','submanager')));

DROP POLICY IF EXISTS insurance_policies_read ON public.insurance_policies;
CREATE POLICY insurance_policies_read ON public.insurance_policies FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'webhost')
    OR EXISTS (SELECT 1 FROM public.properties p WHERE p.id = insurance_policies.property_id AND p.manager_id = auth.uid())
  );

DROP POLICY IF EXISTS insurance_claims_read ON public.insurance_claims;
CREATE POLICY insurance_claims_read ON public.insurance_claims FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'webhost')
    OR EXISTS (SELECT 1 FROM public.properties p WHERE p.id = insurance_claims.property_id AND p.manager_id = auth.uid())
  );

REVOKE INSERT, UPDATE, DELETE ON public.insurance_providers, public.insurance_policies, public.insurance_claims FROM anon, authenticated;
REVOKE ALL ON public.insurance_providers, public.insurance_policies, public.insurance_claims FROM anon;
