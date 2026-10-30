-- Phase 2F: lease-based notification claims (supersedes the naive insert-only
-- use of notification_dedup from 20260908000002; that file is unchanged).
--
-- Protocol (see supabase/functions/_shared/notificationDedup.ts):
--   claim_notification(key, lease)  -> 'claimed' | 'reclaimed' | 'duplicate_sent' | 'duplicate_in_flight'
--   complete_notification(key)      -> marks the claim as sent (terminal for that key)
--   release_notification(key)       -> frees an in-flight claim after a DEFINITE non-delivery
-- An in-flight claim whose lease has expired may be re-claimed (abandoned run
-- or ambiguous provider outcome). Guarantee: at-most-once per live lease;
-- NOT exactly-once. Callers fail closed on any error from these functions.
--
-- Idempotent. Do NOT apply to any environment until the Phase 2D migration
-- reconciliation has been completed and approved.

CREATE TABLE IF NOT EXISTS public.notification_dedup (
  key     text PRIMARY KEY,
  sent_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.notification_dedup
  ADD COLUMN IF NOT EXISTS status           text        NOT NULL DEFAULT 'sent',
  ADD COLUMN IF NOT EXISTS claimed_at       timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS lease_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS attempts         integer     NOT NULL DEFAULT 1;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'notification_dedup_status_check'
  ) THEN
    ALTER TABLE public.notification_dedup
      ADD CONSTRAINT notification_dedup_status_check CHECK (status IN ('claimed', 'sent'));
  END IF;
END $$;

ALTER TABLE public.notification_dedup ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.notification_dedup FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.notification_dedup TO service_role;

CREATE OR REPLACE FUNCTION public.claim_notification(p_key text, p_lease_seconds integer DEFAULT 900)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_lease integer := LEAST(GREATEST(COALESCE(p_lease_seconds, 900), 30), 86400);
  v_status text;
  v_expires timestamptz;
BEGIN
  IF p_key IS NULL OR length(p_key) = 0 OR length(p_key) > 400 THEN
    RAISE EXCEPTION 'invalid key' USING ERRCODE = '22023';
  END IF;

  -- Atomic first claim. Concurrent callers race on the primary key: exactly one wins.
  INSERT INTO public.notification_dedup (key, status, claimed_at, lease_expires_at, attempts)
  VALUES (p_key, 'claimed', now(), now() + make_interval(secs => v_lease), 1)
  ON CONFLICT (key) DO NOTHING;
  IF FOUND THEN
    RETURN 'claimed';
  END IF;

  -- Existing row: lock it so concurrent re-claims serialise.
  SELECT status, lease_expires_at INTO v_status, v_expires
  FROM public.notification_dedup WHERE key = p_key FOR UPDATE;

  IF NOT FOUND THEN
    -- Row was released between the insert and the lock; the caller can simply retry.
    RETURN 'duplicate_in_flight';
  END IF;
  IF v_status = 'sent' THEN
    RETURN 'duplicate_sent';
  END IF;
  IF v_expires IS NOT NULL AND v_expires <= now() THEN
    UPDATE public.notification_dedup
       SET claimed_at = now(),
           lease_expires_at = now() + make_interval(secs => v_lease),
           attempts = attempts + 1
     WHERE key = p_key;
    RETURN 'reclaimed';
  END IF;
  RETURN 'duplicate_in_flight';
END;
$$;

CREATE OR REPLACE FUNCTION public.complete_notification(p_key text)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.notification_dedup
     SET status = 'sent', sent_at = now(), lease_expires_at = NULL
   WHERE key = p_key;
$$;

-- Only an in-flight claim can be released; a completed ('sent') key never is.
CREATE OR REPLACE FUNCTION public.release_notification(p_key text)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM public.notification_dedup WHERE key = p_key AND status = 'claimed';
$$;

REVOKE ALL ON FUNCTION public.claim_notification(text, integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.complete_notification(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.release_notification(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_notification(text, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.complete_notification(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.release_notification(text) TO service_role;

CREATE INDEX IF NOT EXISTS notification_dedup_status_lease_idx
  ON public.notification_dedup (status, lease_expires_at);
