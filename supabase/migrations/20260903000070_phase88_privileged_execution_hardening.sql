-- Phase 88: privileged execution boundary hardening.
-- Public/anon callers must not be able to execute internal mutation helpers.
-- Token validation helpers remain intentionally public because activation and
-- invitation links are bearer-token workflows; mutation helpers do not.





-- Sensitive payment/account helpers must never be callable by anonymous users.
-- Service-role-only hardening, applied to every overload by name (the original statements named
-- stale zero-argument signatures for functions that take arguments, which fails on a fresh database).
DO $harden$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig FROM pg_proc p
    WHERE p.pronamespace = 'public'::regnamespace AND p.proname = ANY (ARRAY['log_payment_processed', 'auto_generate_platform_invoices', 'escalate_overdue_manager_invoices', 'reinstate_manager_on_payment', 'refresh_manager_stats', 'sync_property_occupied_count', 'sync_unit_on_tenant_change', 'update_provider_rating', 'generate_invoice_number', 'set_invoice_number', 'update_updated_at_column', 'use_activation_token'])
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated', r.sig);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', r.sig);
  END LOOP;
END $harden$;
DO $anon$
DECLARE r record;
BEGIN
  FOR r IN SELECT p.oid::regprocedure AS sig FROM pg_proc p
    WHERE p.pronamespace = 'public'::regnamespace
      AND p.proname IN ('process_payment_atomic','process_invoice_payment','reconcile_bank_transaction_atomic')
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM anon', r.sig);
  END LOOP;
END $anon$;

-- Token validation is read-only bearer-token functionality; token consumption
-- remains callable only by the activation flow, not by arbitrary anonymous RPC.
