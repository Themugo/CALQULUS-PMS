-- Found by listing SECURITY DEFINER functions executable by `anon` that contain no caller check.
-- Each is internal (service role / edge function / other definer functions) or unused by the app,
-- yet was callable by anyone with the public key:
--   check_rate_limit(p_user_id,...)          -> anyone could burn another user's rate-limit budget
--   get_trusted_devices(user_id)             -> any caller could list any user's devices
--   is_mfa_required(user_id)                 -> any caller could probe whether a user has MFA
--   backfill_payment_allocation_payer_atomic -> unauthenticated writes to payment_allocations
--   notify_payment_receipt_recipients_atomic -> unauthenticated notification inserts
-- Applied by name to every overload, like 20260903000052.
DO $close$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig FROM pg_proc p
    WHERE p.pronamespace = 'public'::regnamespace
      AND p.proname IN ('check_rate_limit','get_trusted_devices','is_mfa_required',
                        'backfill_payment_allocation_payer_atomic','notify_payment_receipt_recipients_atomic')
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated', r.sig);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', r.sig);
  END LOOP;
END $close$;
