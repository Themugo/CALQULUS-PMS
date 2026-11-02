-- Manager-chosen credit application mode.
--
-- Each manager / landlord / agency account chooses how a tenant's advance
-- (overpayment) credit is used on future invoices:
--   manual (default) - credit waits until a manager runs "apply credit"
--   auto             - credit is applied to the tenant's open invoices as soon
--                      as a new invoice is created
-- Existing behaviour is unchanged until an owner switches to 'auto'.
--
-- Auto-apply runs in a deferred constraint trigger, so it fires at COMMIT after
-- the invoice and its line items are complete. It reuses apply_tenant_credit_atomic
-- (same locking, ledger 'debit' rows and allocations as the manual path) and can
-- never block invoice creation: any failure is downgraded to a WARNING and the
-- credit simply stays available for manual application.
--
-- NOT applied by Claude. Apply after Phase 2D reconciliation.

BEGIN;

CREATE TABLE IF NOT EXISTS public.manager_credit_settings (
  manager_id  uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  apply_mode  text NOT NULL DEFAULT 'manual' CHECK (apply_mode IN ('manual', 'auto')),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.manager_credit_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "owner_manages_credit_settings" ON public.manager_credit_settings;
CREATE POLICY "owner_manages_credit_settings"
  ON public.manager_credit_settings FOR ALL TO authenticated
  USING (manager_id = auth.uid())
  WITH CHECK (manager_id = auth.uid());

REVOKE ALL ON public.manager_credit_settings FROM PUBLIC, anon;
GRANT SELECT, INSERT, UPDATE ON public.manager_credit_settings TO authenticated;
GRANT ALL ON public.manager_credit_settings TO service_role;

DROP TRIGGER IF EXISTS update_manager_credit_settings_updated_at ON public.manager_credit_settings;
CREATE TRIGGER update_manager_credit_settings_updated_at
  BEFORE UPDATE ON public.manager_credit_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.auto_apply_credit_after_invoice()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_mode text;
  v_credit numeric;
BEGIN
  IF NEW.tenant_id IS NULL OR NEW.manager_id IS NULL THEN RETURN NULL; END IF;

  SELECT apply_mode INTO v_mode FROM public.manager_credit_settings WHERE manager_id = NEW.manager_id;
  IF coalesce(v_mode, 'manual') <> 'auto' THEN RETURN NULL; END IF;

  SELECT balance_after INTO v_credit
  FROM public.tenant_credit_ledger
  WHERE tenant_id = NEW.tenant_id
  ORDER BY created_at DESC, id DESC LIMIT 1;
  IF coalesce(v_credit, 0) <= 0 THEN RETURN NULL; END IF;

  BEGIN
    PERFORM public.apply_tenant_credit_atomic(NEW.tenant_id, NEW.manager_id, NULL);
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'auto credit application skipped for tenant %: %', NEW.tenant_id, SQLERRM;
  END;
  RETURN NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.auto_apply_credit_after_invoice() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_auto_apply_credit_after_invoice ON public.invoices;
CREATE CONSTRAINT TRIGGER trg_auto_apply_credit_after_invoice
  AFTER INSERT ON public.invoices
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION public.auto_apply_credit_after_invoice();

COMMIT;
