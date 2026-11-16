-- 1. payment_transactions_select had a tenant branch that read auth.users. The `authenticated`
--    role has no privilege on auth.users, so ANY evaluation of that branch raised
--    "permission denied for table users" for every signed-in user, i.e. payment history broke.
--    Tenants are already covered by tenant_reads_own_transactions (user_roles.tenant_id), so the
--    broken branch is removed and the manager/agency/service branches are kept unchanged.
DROP POLICY IF EXISTS payment_transactions_select ON public.payment_transactions;
CREATE POLICY payment_transactions_select ON public.payment_transactions
  FOR SELECT TO authenticated
  USING (
    auth.role() = 'authenticated'
    AND (
      (auth.jwt() ->> 'role') = 'service_role'
      OR (
        EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role IN ('manager','agency'))
        AND EXISTS (
          SELECT 1
          FROM public.invoices i
          JOIN public.tenants t ON t.id = i.tenant_id
          JOIN public.units u ON u.id = t.unit_id
          JOIN public.properties p ON p.id = u.property_id
          WHERE i.id = payment_transactions.invoice_id AND p.manager_id = auth.uid()
        )
      )
    )
  );

-- 2. callback_secret authenticates Safaricom's STK callback (mpesa-callback matches it from the URL).
--    It was readable by every role that can read the row, so a tenant could read the secret of
--    their own pending payment and forge a "paid" callback. Column-level privileges: API roles keep
--    every column except callback_secret; the service role (edge functions) is unaffected.
REVOKE SELECT ON public.payment_transactions FROM anon, authenticated;
DO $cols$
DECLARE v_cols text;
BEGIN
  SELECT string_agg(quote_ident(attname), ', ' ORDER BY attnum) INTO v_cols
  FROM pg_attribute
  WHERE attrelid = 'public.payment_transactions'::regclass
    AND attnum > 0 AND NOT attisdropped AND attname <> 'callback_secret';
  EXECUTE format('GRANT SELECT (%s) ON public.payment_transactions TO authenticated', v_cols);
END $cols$;
