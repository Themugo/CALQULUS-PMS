-- End-to-end payment trace: tenant -> unit -> payer -> method -> destination account
-- -> invoice allocation -> receipt, with balances that reconcile.
--
-- AUDIT FINDINGS
--  1. payment_allocations.unit_id / property_id were only filled by the bulk
--     third-party RPC. The main path (process_invoice_payment) and credit
--     application left them NULL, so receipts showed no unit/property and
--     landlord receipt recipients (joined on allocation property_id) were never
--     created for ordinary tenant payments.
--  2. The destination ACCOUNT (paybill / till / account reference) was never
--     recorded on the transaction, only manager-vs-landlord. After a config
--     change nobody could say which account a past payment was sent to.
--  3. get_payment_receipt returned allocations without the tenant, per-invoice
--     amount/balance, or the advance-credit portion, so a receipt total could
--     exceed the sum of its lines with no explanation.
--
-- NOT applied by Claude. Apply with the other Phase 2F migrations.

BEGIN;

ALTER TABLE public.payment_transactions
  ADD COLUMN IF NOT EXISTS collection_account_id uuid,
  ADD COLUMN IF NOT EXISTS destination_label text;

-- Stamp unit / property on every allocation from its own invoice (lease as fallback),
-- whatever code path created it.
CREATE OR REPLACE FUNCTION public.stamp_payment_allocation_unit_property()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE v_unit uuid; v_property uuid;
BEGIN
  IF NEW.unit_id IS NOT NULL AND NEW.property_id IS NOT NULL THEN RETURN NEW; END IF;
  SELECT COALESCE(i.unit_id, l.unit_id), COALESCE(i.property_id, l.property_id)
    INTO v_unit, v_property
  FROM public.invoices i
  LEFT JOIN public.leases l ON l.id = i.lease_id
  WHERE i.id = NEW.invoice_id;
  NEW.unit_id := COALESCE(NEW.unit_id, v_unit);
  NEW.property_id := COALESCE(NEW.property_id, v_property);
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_stamp_payment_allocation_unit_property ON public.payment_allocations;
CREATE TRIGGER trg_stamp_payment_allocation_unit_property
  BEFORE INSERT ON public.payment_allocations
  FOR EACH ROW EXECUTE FUNCTION public.stamp_payment_allocation_unit_property();

-- Repair history.
UPDATE public.payment_allocations pa
SET unit_id = COALESCE(pa.unit_id, i.unit_id, l.unit_id),
    property_id = COALESCE(pa.property_id, i.property_id, l.property_id)
FROM public.invoices i
LEFT JOIN public.leases l ON l.id = i.lease_id
WHERE i.id = pa.invoice_id AND (pa.unit_id IS NULL OR pa.property_id IS NULL);

UPDATE public.payment_allocations pa
SET payer_party_id = pt.payer_party_id
FROM public.payment_transactions pt
WHERE pt.id = pa.transaction_id AND pa.payer_party_id IS NULL AND pt.payer_party_id IS NOT NULL;

-- Richer receipt payload. Existing keys are unchanged; new keys are additive.
CREATE OR REPLACE FUNCTION public.get_payment_receipt(p_receipt_id uuid)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT jsonb_build_object(
    'receipt', to_jsonb(r),
    'payer', to_jsonb(pp),
    'transaction', to_jsonb(pt),
    'allocations', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'invoice_id', pa.invoice_id, 'amount', pa.allocated_amount,
        'unit_id', pa.unit_id, 'property_id', pa.property_id,
        'invoice_number', i.invoice_number, 'unit_number', u.unit_number,
        'property_name', p.name, 'tenant_id', i.tenant_id,
        'tenant_name', t.name,
        'invoice_amount', i.amount, 'invoice_paid_amount', i.paid_amount,
        'invoice_balance_due', i.balance_due, 'invoice_status', i.status
      ) ORDER BY i.due_date, i.invoice_number)
      FROM public.payment_allocations pa
      JOIN public.invoices i ON i.id = pa.invoice_id
      LEFT JOIN public.units u ON u.id = pa.unit_id
      LEFT JOIN public.properties p ON p.id = pa.property_id
      LEFT JOIN public.tenants t ON t.id = i.tenant_id
      WHERE pa.transaction_id = r.transaction_id), '[]'::jsonb),
    'advance_credit', GREATEST(round(r.total_amount - COALESCE((
      SELECT SUM(pa.allocated_amount) FROM public.payment_allocations pa WHERE pa.transaction_id = r.transaction_id), 0), 2), 0),
    'destination', jsonb_build_object(
      'label', pt.destination_label,
      'receiver_type', pt.payment_receiver_type,
      'receiver_name', (SELECT pr.full_name FROM public.profiles pr
                        WHERE pr.id = COALESCE(pt.landlord_id, pt.manager_id) LIMIT 1))
  )
  FROM public.issued_payment_receipts r
  LEFT JOIN public.payment_parties pp ON pp.id = r.payer_party_id
  JOIN public.payment_transactions pt ON pt.id = r.transaction_id
  WHERE r.id = p_receipt_id AND EXISTS (
    SELECT 1 FROM public.payment_receipt_recipients rr
    WHERE rr.receipt_id = r.id AND rr.recipient_user_id = auth.uid());
$$;
GRANT EXECUTE ON FUNCTION public.get_payment_receipt(uuid) TO authenticated, service_role;

COMMIT;
