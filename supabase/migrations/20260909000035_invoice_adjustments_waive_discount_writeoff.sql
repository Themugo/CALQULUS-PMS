-- Governed forgiveness: waive a penalty, give a discount, or write off bad debt.
-- Whoever operates/enforces collection on an invoice (invoices.manager_id: manager,
-- agency principal or a self-managing landlord) and the property's owner-landlord
-- may forgive. Every action is an immutable, reasoned ledger row; corrections are
-- reversals, never edits. Forgiven money is NOT cash: paid_amount is untouched,
-- so cash reports and landlord income (which come from payments) stay truthful.

-- 1. new terminal status for invoices fully cleared by forgiveness alone
DO $$
DECLARE c text;
BEGIN
  FOR c IN SELECT conname FROM pg_constraint WHERE conrelid='public.invoices'::regclass AND contype='c'
           AND pg_get_constraintdef(oid) ILIKE '%partially_paid%' LOOP
    EXECUTE format('ALTER TABLE public.invoices DROP CONSTRAINT %I', c);
  END LOOP;
  ALTER TABLE public.invoices ADD CONSTRAINT invoices_status_check
    CHECK (status = ANY (ARRAY['pending','partially_paid','paid','overdue','failed','refunded','cancelled','forgiven']));
END $$;

CREATE OR REPLACE FUNCTION public.guard_invoice_financial_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.status IN ('paid','cancelled','forgiven') AND (
    NEW.amount IS DISTINCT FROM OLD.amount OR NEW.original_amount IS DISTINCT FROM OLD.original_amount OR
    NEW.balance_due IS DISTINCT FROM OLD.balance_due OR NEW.tenant_id IS DISTINCT FROM OLD.tenant_id OR
    NEW.property_id IS DISTINCT FROM OLD.property_id OR NEW.unit_id IS DISTINCT FROM OLD.unit_id OR
    NEW.manager_id IS DISTINCT FROM OLD.manager_id
  ) AND COALESCE(current_setting('calqulus.allow_adjustment', true),'') <> 'on' THEN
    RAISE EXCEPTION 'Settled invoice financial terms are immutable; use a governed adjustment/reversal' USING ERRCODE='55000';
  END IF;
  RETURN NEW;
END; $$;

-- 2. the ledger
CREATE TABLE IF NOT EXISTS public.invoice_adjustments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES public.invoices(id) ON DELETE RESTRICT,
  tenant_id uuid,
  property_id uuid,
  manager_id uuid,
  adjustment_type text NOT NULL CHECK (adjustment_type IN ('waive_penalty','discount','write_off','reversal')),
  amount numeric(12,2) NOT NULL CHECK (amount > 0),
  reason text NOT NULL CHECK (char_length(btrim(reason)) >= 5),
  actor_user_id uuid NOT NULL,
  actor_capacity text NOT NULL CHECK (actor_capacity IN ('operator','landlord','service')),
  balance_before numeric(12,2) NOT NULL,
  balance_after numeric(12,2) NOT NULL,
  reverses_id uuid REFERENCES public.invoice_adjustments(id),
  reversed_by_id uuid REFERENCES public.invoice_adjustments(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS invoice_adjustments_invoice_idx ON public.invoice_adjustments(invoice_id);
CREATE INDEX IF NOT EXISTS invoice_adjustments_manager_idx ON public.invoice_adjustments(manager_id, created_at);
CREATE UNIQUE INDEX IF NOT EXISTS invoice_adjustments_one_reversal ON public.invoice_adjustments(reverses_id) WHERE reverses_id IS NOT NULL;
ALTER TABLE public.invoice_adjustments ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.invoice_adjustments FROM anon, authenticated;
GRANT SELECT ON public.invoice_adjustments TO authenticated;
DROP POLICY IF EXISTS invoice_adjustments_select ON public.invoice_adjustments;
CREATE POLICY invoice_adjustments_select ON public.invoice_adjustments FOR SELECT TO authenticated USING (
  manager_id = auth.uid()
  OR public.is_webhost()
  OR EXISTS (SELECT 1 FROM public.property_landlords pl WHERE pl.property_id = invoice_adjustments.property_id AND pl.landlord_user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.tenant_id IS NOT NULL AND ur.tenant_id = invoice_adjustments.tenant_id)
);

-- 3. who may forgive
CREATE OR REPLACE FUNCTION public.invoice_forgiveness_capacity(p_invoice public.invoices) RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE
    WHEN auth.role() = 'service_role' THEN 'service'
    WHEN auth.uid() IS NOT NULL AND p_invoice.manager_id = auth.uid() THEN 'operator'
    WHEN auth.uid() IS NOT NULL AND p_invoice.property_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.property_landlords pl WHERE pl.property_id = p_invoice.property_id AND pl.landlord_user_id = auth.uid()
    ) THEN 'landlord'
    ELSE NULL END
$$;

-- 4. apply a waiver / discount / write-off
CREATE OR REPLACE FUNCTION public.adjust_invoice_atomic(p_invoice_id uuid, p_type text, p_amount numeric, p_reason text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v public.invoices%ROWTYPE; cap text; amt numeric := round(COALESCE(p_amount,0),2); nb numeric; ns text; adj public.invoice_adjustments%ROWTYPE;
BEGIN
  IF auth.role() NOT IN ('authenticated','service_role') THEN RAISE EXCEPTION 'Authentication required' USING ERRCODE='42501'; END IF;
  IF p_type NOT IN ('waive_penalty','discount','write_off') THEN RAISE EXCEPTION 'Invalid adjustment type' USING ERRCODE='22023'; END IF;
  IF char_length(btrim(COALESCE(p_reason,''))) < 5 THEN RAISE EXCEPTION 'A reason of at least 5 characters is required' USING ERRCODE='22023'; END IF;
  IF amt <= 0 THEN RAISE EXCEPTION 'Amount must be positive' USING ERRCODE='22023'; END IF;
  SELECT * INTO v FROM public.invoices WHERE id = p_invoice_id FOR UPDATE;
  IF v.id IS NULL THEN RAISE EXCEPTION 'Invoice not found' USING ERRCODE='P0002'; END IF;
  cap := public.invoice_forgiveness_capacity(v);
  IF cap IS NULL THEN RAISE EXCEPTION 'You do not have authority over this invoice' USING ERRCODE='42501'; END IF;
  IF v.status NOT IN ('pending','overdue','partially_paid') THEN RAISE EXCEPTION 'Only open invoices can be adjusted (status: %)', v.status USING ERRCODE='55000'; END IF;
  IF p_type = 'waive_penalty' AND COALESCE(v.invoice_type,'') <> 'penalty' THEN RAISE EXCEPTION 'Only penalty invoices can be waived; use discount or write-off for other invoices' USING ERRCODE='22023'; END IF;
  IF p_type = 'discount' AND COALESCE(v.invoice_type,'') = 'penalty' THEN RAISE EXCEPTION 'Use waive penalty for penalty invoices' USING ERRCODE='22023'; END IF;
  IF p_type = 'write_off' AND v.status <> 'overdue' AND v.due_date >= current_date THEN RAISE EXCEPTION 'Only overdue debt can be written off' USING ERRCODE='55000'; END IF;
  IF amt > round(COALESCE(v.balance_due,0),2) THEN RAISE EXCEPTION 'Amount exceeds the outstanding balance (%)', round(COALESCE(v.balance_due,0),2) USING ERRCODE='22003'; END IF;
  nb := round(COALESCE(v.balance_due,0) - amt, 2);
  ns := CASE WHEN nb > 0 THEN v.status
             WHEN COALESCE(v.paid_amount,0) > 0 THEN 'paid' ELSE 'forgiven' END;
  PERFORM set_config('calqulus.allow_adjustment','on',true);
  UPDATE public.invoices SET balance_due = nb, status = ns,
         paid_date = CASE WHEN ns = 'paid' THEN current_date ELSE paid_date END, updated_at = now() WHERE id = v.id;
  PERFORM set_config('calqulus.allow_adjustment','off',true);
  INSERT INTO public.invoice_adjustments(invoice_id,tenant_id,property_id,manager_id,adjustment_type,amount,reason,actor_user_id,actor_capacity,balance_before,balance_after)
  VALUES (v.id,v.tenant_id,v.property_id,v.manager_id,p_type,amt,btrim(p_reason),COALESCE(auth.uid(),v.manager_id),cap,round(COALESCE(v.balance_due,0),2),nb)
  RETURNING * INTO adj;
  RETURN jsonb_build_object('success',true,'adjustment_id',adj.id,'balance_after',nb,'status',ns);
END $$;

-- 5. reverse (correct) an earlier adjustment
CREATE OR REPLACE FUNCTION public.reverse_invoice_adjustment_atomic(p_adjustment_id uuid, p_reason text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE a public.invoice_adjustments%ROWTYPE; v public.invoices%ROWTYPE; cap text; nb numeric; ns text; rev public.invoice_adjustments%ROWTYPE;
BEGIN
  IF auth.role() NOT IN ('authenticated','service_role') THEN RAISE EXCEPTION 'Authentication required' USING ERRCODE='42501'; END IF;
  IF char_length(btrim(COALESCE(p_reason,''))) < 5 THEN RAISE EXCEPTION 'A reason of at least 5 characters is required' USING ERRCODE='22023'; END IF;
  SELECT * INTO a FROM public.invoice_adjustments WHERE id = p_adjustment_id FOR UPDATE;
  IF a.id IS NULL THEN RAISE EXCEPTION 'Adjustment not found' USING ERRCODE='P0002'; END IF;
  IF a.adjustment_type = 'reversal' THEN RAISE EXCEPTION 'A reversal cannot be reversed' USING ERRCODE='55000'; END IF;
  IF a.reversed_by_id IS NOT NULL THEN RAISE EXCEPTION 'Adjustment already reversed' USING ERRCODE='55000'; END IF;
  SELECT * INTO v FROM public.invoices WHERE id = a.invoice_id FOR UPDATE;
  cap := public.invoice_forgiveness_capacity(v);
  IF cap IS NULL THEN RAISE EXCEPTION 'You do not have authority over this invoice' USING ERRCODE='42501'; END IF;
  IF v.status = 'cancelled' THEN RAISE EXCEPTION 'Cancelled invoice cannot be reinstated' USING ERRCODE='55000'; END IF;
  nb := round(COALESCE(v.balance_due,0) + a.amount, 2);
  ns := CASE WHEN COALESCE(v.paid_amount,0) > 0 THEN 'partially_paid' WHEN v.due_date < current_date THEN 'overdue' ELSE 'pending' END;
  PERFORM set_config('calqulus.allow_adjustment','on',true);
  UPDATE public.invoices SET balance_due = nb, status = ns, paid_date = NULL, updated_at = now() WHERE id = v.id;
  PERFORM set_config('calqulus.allow_adjustment','off',true);
  INSERT INTO public.invoice_adjustments(invoice_id,tenant_id,property_id,manager_id,adjustment_type,amount,reason,actor_user_id,actor_capacity,balance_before,balance_after,reverses_id)
  VALUES (v.id,v.tenant_id,v.property_id,v.manager_id,'reversal',a.amount,btrim(p_reason),COALESCE(auth.uid(),v.manager_id),cap,round(COALESCE(v.balance_due,0),2),nb,a.id)
  RETURNING * INTO rev;
  UPDATE public.invoice_adjustments SET reversed_by_id = rev.id WHERE id = a.id;
  RETURN jsonb_build_object('success',true,'reversal_id',rev.id,'balance_after',nb,'status',ns);
END $$;

-- 6. immutability of the ledger
CREATE OR REPLACE FUNCTION public.invoice_adjustments_immutable() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN RAISE EXCEPTION 'Adjustment ledger rows cannot be deleted' USING ERRCODE='55000'; END IF;
  IF (NEW.invoice_id, NEW.amount, NEW.adjustment_type, NEW.reason, NEW.actor_user_id, NEW.balance_before, NEW.balance_after, NEW.created_at)
     IS DISTINCT FROM (OLD.invoice_id, OLD.amount, OLD.adjustment_type, OLD.reason, OLD.actor_user_id, OLD.balance_before, OLD.balance_after, OLD.created_at) THEN
    RAISE EXCEPTION 'Adjustment ledger rows are immutable' USING ERRCODE='55000';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_invoice_adjustments_immutable ON public.invoice_adjustments;
CREATE TRIGGER trg_invoice_adjustments_immutable BEFORE UPDATE OR DELETE ON public.invoice_adjustments FOR EACH ROW EXECUTE FUNCTION public.invoice_adjustments_immutable();

-- 7. period summary for statements / accounting (own scope only)
CREATE OR REPLACE FUNCTION public.get_adjustment_summary(p_from date, p_to date)
RETURNS jsonb LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$
  SELECT jsonb_build_object(
    'penalties_waived', COALESCE(sum(amount) FILTER (WHERE adjustment_type='waive_penalty' AND reversed_by_id IS NULL),0),
    'discounts',        COALESCE(sum(amount) FILTER (WHERE adjustment_type='discount'      AND reversed_by_id IS NULL),0),
    'written_off',      COALESCE(sum(amount) FILTER (WHERE adjustment_type='write_off'     AND reversed_by_id IS NULL),0),
    'count', count(*) FILTER (WHERE adjustment_type <> 'reversal'))
  FROM public.invoice_adjustments
  WHERE created_at >= p_from::timestamptz AND created_at < (p_to + 1)::timestamptz
$$;

REVOKE ALL ON FUNCTION public.adjust_invoice_atomic(uuid,text,numeric,text), public.reverse_invoice_adjustment_atomic(uuid,text),
  public.invoice_forgiveness_capacity(public.invoices), public.get_adjustment_summary(date,date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.adjust_invoice_atomic(uuid,text,numeric,text), public.reverse_invoice_adjustment_atomic(uuid,text),
  public.get_adjustment_summary(date,date) TO authenticated, service_role;
