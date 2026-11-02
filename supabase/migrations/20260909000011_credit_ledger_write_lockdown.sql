-- Credit ledger write lockdown.
--
-- AUDIT FINDING: policy "manager_manages_credit" was FOR ALL, so a manager (or a
-- compromised manager session) could INSERT/UPDATE/DELETE tenant_credit_ledger rows
-- straight from the browser, forging or erasing credit with no audit trail and
-- bypassing recall_tenant_credit_atomic / apply_tenant_credit_atomic.
-- All legitimate writes happen inside SECURITY DEFINER RPCs (service_role / owner),
-- so clients only need to READ. Managers and their submanagers keep read access.
--
-- NOT applied by Claude. Apply with the other Phase 2F migrations.

BEGIN;

DROP POLICY IF EXISTS "manager_manages_credit" ON public.tenant_credit_ledger;
DROP POLICY IF EXISTS "manager_reads_credit" ON public.tenant_credit_ledger;
CREATE POLICY "manager_reads_credit" ON public.tenant_credit_ledger
  FOR SELECT TO authenticated
  USING (
    manager_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.manager_submanagers ms
      WHERE ms.manager_id = tenant_credit_ledger.manager_id
        AND ms.submanager_user_id = auth.uid()
    )
  );

REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.tenant_credit_ledger FROM PUBLIC, anon, authenticated;

COMMIT;
