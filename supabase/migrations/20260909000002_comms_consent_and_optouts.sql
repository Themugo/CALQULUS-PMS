-- Phase 2F: server-side consent record, communication opt-outs and preference audit.
--
-- * user_consents: authoritative record of terms/privacy acceptance (user id,
--   policy type, version, server timestamp). NOT derived from editable
--   user_metadata. Written only through record_user_consent() for the caller.
-- * communication_opt_outs: per-channel, per-address opt-outs (email
--   unsubscribe, SMS/WhatsApp STOP). Written/read only by the service role
--   (edge functions: unsubscribe, sms-inbound-webhook, senders).
-- * communication_preference_events: append-only audit of opt-out changes.
--
-- Essential/security messages are NOT governed by these tables (see
-- supabase/functions/_shared/commsPolicy.ts). Idempotent. Do NOT apply to any
-- environment until the Phase 2D migration reconciliation is approved.

CREATE TABLE IF NOT EXISTS public.user_consents (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  policy_type    text NOT NULL CHECK (policy_type IN ('terms', 'privacy')),
  policy_version text NOT NULL CHECK (length(policy_version) BETWEEN 1 AND 64),
  accepted_at    timestamptz NOT NULL DEFAULT now(),
  source         text NOT NULL DEFAULT 'signup' CHECK (source IN ('signup', 'login', 'settings', 'invitation')),
  UNIQUE (user_id, policy_type, policy_version)
);
ALTER TABLE public.user_consents ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.user_consents FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.user_consents TO service_role;
GRANT SELECT ON TABLE public.user_consents TO authenticated;

DROP POLICY IF EXISTS user_consents_select_own ON public.user_consents;
CREATE POLICY user_consents_select_own ON public.user_consents
  FOR SELECT TO authenticated USING (user_id = auth.uid());

-- The caller can only record consent for themselves; user_id and timestamp are
-- taken from the session, never from the request.
CREATE OR REPLACE FUNCTION public.record_user_consent(p_policy_type text, p_policy_version text, p_source text DEFAULT 'signup')
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'authentication required' USING ERRCODE = '42501';
  END IF;
  IF p_policy_type NOT IN ('terms', 'privacy') THEN
    RAISE EXCEPTION 'invalid policy type' USING ERRCODE = '22023';
  END IF;
  IF p_policy_version IS NULL OR length(p_policy_version) NOT BETWEEN 1 AND 64 THEN
    RAISE EXCEPTION 'invalid policy version' USING ERRCODE = '22023';
  END IF;
  INSERT INTO public.user_consents (user_id, policy_type, policy_version, source)
  VALUES (auth.uid(), p_policy_type, p_policy_version,
          CASE WHEN p_source IN ('signup', 'login', 'settings', 'invitation') THEN p_source ELSE 'signup' END)
  ON CONFLICT (user_id, policy_type, policy_version) DO NOTHING;
END;
$$;
REVOKE ALL ON FUNCTION public.record_user_consent(text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_user_consent(text, text, text) TO authenticated, service_role;

CREATE TABLE IF NOT EXISTS public.communication_opt_outs (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel    text NOT NULL CHECK (channel IN ('email', 'sms', 'whatsapp')),
  address    text NOT NULL CHECK (length(address) BETWEEN 3 AND 254),
  scope      text NOT NULL DEFAULT 'non_essential' CHECK (scope IN ('non_essential')),
  source     text NOT NULL CHECK (source IN ('email_unsubscribe', 'sms_stop', 'whatsapp_stop', 'admin', 'user_settings')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (channel, address)
);
ALTER TABLE public.communication_opt_outs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.communication_opt_outs FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.communication_opt_outs TO service_role;

CREATE TABLE IF NOT EXISTS public.communication_preference_events (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel    text NOT NULL,
  address    text NOT NULL,
  action     text NOT NULL CHECK (action IN ('opt_out', 'opt_in')),
  source     text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.communication_preference_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.communication_preference_events FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.communication_preference_events TO service_role;

-- Repeated STOP / unsubscribe requests are idempotent: one row, every request audited.
CREATE OR REPLACE FUNCTION public.record_comms_opt_out(p_channel text, p_address text, p_source text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.communication_opt_outs (channel, address, source)
  VALUES (p_channel, lower(p_address), p_source)
  ON CONFLICT (channel, address) DO NOTHING;
  INSERT INTO public.communication_preference_events (channel, address, action, source)
  VALUES (p_channel, lower(p_address), 'opt_out', p_source);
END;
$$;

CREATE OR REPLACE FUNCTION public.clear_comms_opt_out(p_channel text, p_address text, p_source text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.communication_opt_outs WHERE channel = p_channel AND address = lower(p_address);
  INSERT INTO public.communication_preference_events (channel, address, action, source)
  VALUES (p_channel, lower(p_address), 'opt_in', p_source);
END;
$$;

CREATE OR REPLACE FUNCTION public.is_comms_opted_out(p_channel text, p_address text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.communication_opt_outs WHERE channel = p_channel AND address = lower(p_address)
  );
$$;

REVOKE ALL ON FUNCTION public.record_comms_opt_out(text, text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.clear_comms_opt_out(text, text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.is_comms_opted_out(text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_comms_opt_out(text, text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.clear_comms_opt_out(text, text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.is_comms_opted_out(text, text) TO service_role;
