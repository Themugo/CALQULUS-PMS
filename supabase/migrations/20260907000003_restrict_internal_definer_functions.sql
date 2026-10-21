-- Restrict internal SECURITY DEFINER helpers to service_role.
--
-- These functions are only called from edge functions that use the service-role
-- client (process-payment) or from other SECURITY DEFINER functions (which run
-- as the function owner and are unaffected by this change). None are used in RLS
-- policies or by the browser client. They were nevertheless executable by every
-- signed-in user and perform no caller authorisation:
--
--   issue_payment_receipt_atomic  - issues a receipt, creates payer parties and
--                                   fires notifications for ANY completed
--                                   transaction id; returns receipt id/number.
--   resolve_tenant_auth_user      - maps tenant id -> auth user id (identifier leak).
--   get_effective_billing_due_config - reads any lease's due-date configuration.
--   check_idempotency_key         - existence oracle over a caller-chosen table.
--   can_access_property           - access oracle for a caller-chosen user id.
--
-- Deployment note: apply AFTER confirming no other client code calls these RPCs
-- with a user-scoped session (repo search found none).

REVOKE ALL ON FUNCTION public.issue_payment_receipt_atomic(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.issue_payment_receipt_atomic(uuid) TO service_role;

REVOKE ALL ON FUNCTION public.resolve_tenant_auth_user(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.resolve_tenant_auth_user(uuid) TO service_role;

REVOKE ALL ON FUNCTION public.get_effective_billing_due_config(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_effective_billing_due_config(uuid) TO service_role;

REVOKE ALL ON FUNCTION public.check_idempotency_key(text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_idempotency_key(text, text) TO service_role;

REVOKE ALL ON FUNCTION public.can_access_property(uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.can_access_property(uuid, uuid) TO service_role;
