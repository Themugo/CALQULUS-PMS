-- Read-only access for a departing agency/manager to the records of its own management period.
-- After a handover the live records move to the new operator (see 20260909000017), but the
-- departing operator still needs its own period for accounting, tax and legal purposes.
--
-- Rules:
--   * Only the operator that handed the property over (or lost it) can read, never the owner's
--     other operators, and only for a COMPLETED transfer where it was the departing party.
--   * Window: from when that operator took the property over until the handover completed.
--     Records created by anyone else outside the window are not exposed.
--   * Read-only, whitelisted record types, secret-looking columns stripped, paged.
--   * Access lapses 7 years after the handover (statutory record-keeping period).
ALTER TABLE public.property_management_transfers
  ADD COLUMN IF NOT EXISTS period_start timestamptz,
  ADD COLUMN IF NOT EXISTS archive_access_until timestamptz;

CREATE OR REPLACE FUNCTION public.stamp_handover_archive_window()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status IS DISTINCT FROM 'completed' THEN
    NEW.period_start := (
      SELECT max(x.completed_at) FROM public.property_management_transfers x
      WHERE x.property_id = NEW.property_id AND x.to_operator_id = NEW.from_operator_id
        AND x.status = 'completed' AND x.id <> NEW.id);
    IF NEW.period_start IS NULL AND NEW.from_operator_id <> NEW.owner_user_id THEN
      NEW.period_start := (SELECT pl.assigned_at FROM public.property_landlords pl WHERE pl.property_id = NEW.property_id);
    END IF;
    NEW.archive_access_until := COALESCE(NEW.completed_at, now()) + interval '7 years';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS property_management_transfers_archive_window ON public.property_management_transfers;
CREATE TRIGGER property_management_transfers_archive_window
BEFORE UPDATE OF status ON public.property_management_transfers
FOR EACH ROW EXECUTE FUNCTION public.stamp_handover_archive_window();

CREATE OR REPLACE FUNCTION public.get_archived_property_records(
  p_transfer_id uuid, p_table text, p_limit integer DEFAULT 500, p_offset integer DEFAULT 0
) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  t public.property_management_transfers%ROWTYPE;
  v_allowed text[] := ARRAY['invoices','payment_transactions','payment_allocations','issued_payment_receipts',
                            'leases','maintenance_requests','expenditures','physical_receipts'];
  v_to timestamptz;
  v_total bigint;
  v_rows jsonb;
BEGIN
  IF auth.uid() IS NULL OR auth.role() <> 'authenticated' THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO t FROM public.property_management_transfers WHERE id = p_transfer_id;
  IF NOT FOUND OR t.status <> 'completed' OR t.from_operator_id <> auth.uid()
     OR t.from_operator_id = t.owner_user_id THEN
    RAISE EXCEPTION 'No archive available for this handover' USING ERRCODE = '42501';
  END IF;
  IF t.archive_access_until IS NOT NULL AND t.archive_access_until < now() THEN
    RAISE EXCEPTION 'Archive access for this handover has expired' USING ERRCODE = '42501';
  END IF;
  IF NOT (p_table = ANY (v_allowed)) THEN
    RAISE EXCEPTION 'Record type not available in the archive' USING ERRCODE = '22023';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name=p_table AND column_name='property_id')
     OR NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name=p_table AND column_name='created_at') THEN
    RETURN jsonb_build_object('total', 0, 'rows', '[]'::jsonb);
  END IF;

  v_to := COALESCE(t.completed_at, now());
  p_limit := LEAST(GREATEST(COALESCE(p_limit, 500), 1), 1000);
  p_offset := GREATEST(COALESCE(p_offset, 0), 0);

  EXECUTE format('SELECT count(*) FROM public.%I x WHERE x.property_id = $1 AND x.created_at <= $2 AND ($3::timestamptz IS NULL OR x.created_at >= $3)', p_table)
    INTO v_total USING t.property_id, v_to, t.period_start;

  EXECUTE format($q$
    SELECT COALESCE(jsonb_agg(clean ORDER BY created), '[]'::jsonb) FROM (
      SELECT x.created_at AS created,
             (SELECT jsonb_object_agg(k, v) FROM jsonb_each(to_jsonb(x)) AS e(k, v)
              WHERE k !~* '(secret|token|hash|password|payload|api_key)') AS clean
      FROM public.%I x
      WHERE x.property_id = $1 AND x.created_at <= $2 AND ($3::timestamptz IS NULL OR x.created_at >= $3)
      ORDER BY x.created_at, x.id
      LIMIT $4 OFFSET $5) s
  $q$, p_table) INTO v_rows USING t.property_id, v_to, t.period_start, p_limit, p_offset;

  RETURN jsonb_build_object('total', v_total, 'rows', v_rows, 'period_start', t.period_start, 'period_end', v_to);
END $$;

REVOKE ALL ON FUNCTION public.get_archived_property_records(uuid,text,integer,integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_archived_property_records(uuid,text,integer,integer) TO authenticated;
