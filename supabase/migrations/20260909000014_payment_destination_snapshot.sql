-- Destination account for manual, bank and C2B payments.
--
-- STK initiation already snapshots destination_label (migration 13). Payments
-- recorded by a manager, matched from a bank statement or received over Paybill
-- had no destination at all. This service-only RPC fills it AFTER allocation by
-- resolving the same effective collection account the portal shows for the
-- payment's first invoice.
--
-- It only labels a payment when the account's rail matches how the money actually
-- moved (mpesa <-> paybill/till, bank <-> bank account, cash <-> cash). A bank
-- transfer is never labelled with a Paybill, and receipt_upload (rail unknown) is
-- left unlabelled rather than guessed. Bank account numbers are masked to the last 4.
--
-- NOT applied by Claude. Apply with the other Phase 2F migrations.

BEGIN;

CREATE OR REPLACE FUNCTION public.snapshot_payment_destination_atomic(p_transaction_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  tx public.payment_transactions%ROWTYPE;
  v_invoice uuid;
  a public.payment_collection_accounts%ROWTYPE;
  v_family text;
  v_label text;
BEGIN
  IF auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'Unauthorized destination snapshot' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO tx FROM public.payment_transactions WHERE id = p_transaction_id FOR UPDATE;
  IF tx.id IS NULL THEN RAISE EXCEPTION 'Payment transaction not found' USING ERRCODE = 'P0002'; END IF;
  IF tx.destination_label IS NOT NULL THEN
    RETURN jsonb_build_object('success', true, 'labelled', false, 'reason', 'already_set');
  END IF;

  v_family := CASE
    WHEN tx.payment_method LIKE 'mpesa%' OR tx.payment_method = 'paystack_mpesa' THEN 'mpesa'
    WHEN tx.payment_method LIKE 'bank%' THEN 'bank'
    WHEN tx.payment_method = 'cash' THEN 'cash'
    ELSE NULL END;
  IF v_family IS NULL THEN
    RETURN jsonb_build_object('success', true, 'labelled', false, 'reason', 'rail_unknown');
  END IF;

  SELECT pa.invoice_id INTO v_invoice
  FROM public.payment_allocations pa WHERE pa.transaction_id = tx.id
  ORDER BY pa.created_at, pa.invoice_id LIMIT 1;
  IF v_invoice IS NULL THEN
    RETURN jsonb_build_object('success', true, 'labelled', false, 'reason', 'no_allocation');
  END IF;

  a := public.get_effective_payment_collection_account(v_invoice);
  IF a.id IS NULL THEN
    RETURN jsonb_build_object('success', true, 'labelled', false, 'reason', 'no_account');
  END IF;

  IF v_family = 'mpesa' AND a.payment_method IN ('mpesa_paybill', 'mpesa_till') THEN
    v_label := CASE WHEN a.payment_method = 'mpesa_paybill'
      THEN 'M-Pesa Paybill ' || a.paybill_number ELSE 'M-Pesa Till ' || a.till_number END;
  ELSIF v_family = 'bank' AND a.payment_method = 'bank_transfer' THEN
    v_label := 'Bank: ' || a.bank_name || ' · A/C ••' || right(regexp_replace(a.bank_account_number, '\s', '', 'g'), 4);
  ELSIF v_family = 'cash' AND a.payment_method = 'cash' THEN
    v_label := 'Cash · ' || a.account_label;
  ELSE
    RETURN jsonb_build_object('success', true, 'labelled', false, 'reason', 'rail_mismatch');
  END IF;

  UPDATE public.payment_transactions
  SET destination_label = left(v_label, 120),
      collection_account_id = COALESCE(collection_account_id, a.id),
      updated_at = now()
  WHERE id = tx.id;

  RETURN jsonb_build_object('success', true, 'labelled', true, 'label', left(v_label, 120));
END $$;

REVOKE ALL ON FUNCTION public.snapshot_payment_destination_atomic(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.snapshot_payment_destination_atomic(uuid) TO service_role;

COMMIT;
