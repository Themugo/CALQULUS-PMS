-- Payout requests previously accepted ANY positive amount for ANY period and
-- could be created repeatedly for the same period. That allowed paying a
-- landlord more than was collected, or twice for the same month.
-- Guards: (1) no overlapping live request for the same property+landlord,
--         (2) amount may not exceed the landlord's revenue share of completed
--             payments recorded for that property in the period (webhost may override).
CREATE OR REPLACE FUNCTION public.create_payout_request_atomic(p_property_id uuid, p_landlord_user_id uuid, p_amount numeric, p_period_start date, p_period_end date, p_notes text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_uid uuid := auth.uid(); v_role text; v_manager uuid; v_id uuid; v_share numeric; v_collected numeric; v_entitled numeric;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Unauthenticated caller' USING ERRCODE='28000'; END IF;
  SELECT role INTO v_role FROM public.user_roles WHERE user_id=v_uid LIMIT 1;
  IF v_role = 'landlord' THEN
    IF p_landlord_user_id IS DISTINCT FROM v_uid THEN RAISE EXCEPTION 'Unauthorized' USING ERRCODE='42501'; END IF;
  ELSIF v_role IN ('manager','submanager','webhost') THEN
    IF v_role='submanager' THEN SELECT manager_id INTO v_manager FROM public.manager_submanagers WHERE submanager_user_id=v_uid LIMIT 1; ELSE v_manager:=v_uid; END IF;
    IF v_role <> 'webhost' AND NOT EXISTS (SELECT 1 FROM public.property_landlords pl WHERE pl.property_id=p_property_id AND pl.landlord_user_id=p_landlord_user_id AND pl.manager_id=COALESCE(v_manager,v_uid)) THEN
      RAISE EXCEPTION 'Property is not in caller portfolio' USING ERRCODE='42501';
    END IF;
  ELSE RAISE EXCEPTION 'Unauthorized' USING ERRCODE='42501'; END IF;
  IF p_amount IS NULL OR p_amount <= 0 OR p_period_start IS NULL OR p_period_end IS NULL OR p_period_end < p_period_start THEN RAISE EXCEPTION 'Invalid payout request'; END IF;
  SELECT manager_id, COALESCE(revenue_share_pct,100) INTO v_manager, v_share FROM public.property_landlords WHERE property_id=p_property_id AND landlord_user_id=p_landlord_user_id LIMIT 1;

  IF EXISTS (SELECT 1 FROM public.payout_requests r
             WHERE r.property_id=p_property_id AND r.landlord_user_id=p_landlord_user_id
               AND r.status IN ('pending','approved','paid')
               AND r.period_start <= p_period_end AND r.period_end >= p_period_start) THEN
    RAISE EXCEPTION 'A payout request already exists for this property and period' USING ERRCODE='23505';
  END IF;

  IF v_role <> 'webhost' THEN
    SELECT COALESCE(sum(pay.amount),0) INTO v_collected FROM public.payments pay
     WHERE pay.property_id=p_property_id AND pay.status='completed'
       AND COALESCE(pay.completed_at, pay.created_at) >= p_period_start::timestamptz
       AND COALESCE(pay.completed_at, pay.created_at) <  (p_period_end + 1)::timestamptz;
    v_entitled := round(v_collected * COALESCE(v_share,100) / 100, 2);
    IF round(p_amount,2) > v_entitled THEN
      RAISE EXCEPTION 'Requested amount exceeds collected income for the period (available: %)', v_entitled USING ERRCODE='22003';
    END IF;
  END IF;

  INSERT INTO public.payout_requests(property_id,landlord_user_id,manager_id,recipient_type,amount,period_start,period_end,notes,status)
  VALUES(p_property_id,p_landlord_user_id,v_manager,CASE WHEN v_manager IS NULL THEN 'webhost' ELSE 'manager' END,round(p_amount,2),p_period_start,p_period_end,NULLIF(trim(p_notes),''),'pending')
  RETURNING id INTO v_id;
  RETURN jsonb_build_object('id',v_id,'status','pending');
END;
$$;
