-- accept_landlord_invitation() used ON CONFLICT (property_id), but 20260904000004 replaced the
-- one-landlord-per-property constraint with UNIQUE (property_id, landlord_user_id) so a property can
-- have co-owners. Result: every landlord invitation failed with "no unique or exclusion constraint
-- matching the ON CONFLICT specification". Re-create the function against the real key. It no longer
-- silently replaces a different owner: a property that already has another owner is refused.
CREATE OR REPLACE FUNCTION public.accept_landlord_invitation(p_token text)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_inv   public.landlord_invitations%ROWTYPE;
  v_email text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'must be signed in to accept an invitation';
  END IF;

  SELECT * INTO v_inv FROM public.landlord_invitations WHERE token = p_token FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'invitation not found'; END IF;

  IF v_inv.status = 'accepted' THEN
    IF EXISTS (SELECT 1 FROM public.property_landlords
               WHERE property_id = v_inv.property_id AND landlord_user_id = auth.uid()) THEN
      RETURN v_inv.id;
    END IF;
    RAISE EXCEPTION 'invitation has already been accepted';
  END IF;
  IF v_inv.status <> 'pending' THEN
    RAISE EXCEPTION 'invitation is not pending (status: %)', v_inv.status;
  END IF;
  IF v_inv.expires_at < now() THEN RAISE EXCEPTION 'invitation has expired'; END IF;

  v_email := auth.jwt() ->> 'email';
  IF v_email IS NOT NULL AND lower(v_email) <> lower(v_inv.email) THEN
    RAISE EXCEPTION 'invitation email does not match your account email';
  END IF;

  IF EXISTS (SELECT 1 FROM public.property_landlords
             WHERE property_id = v_inv.property_id AND landlord_user_id <> auth.uid()) THEN
    RAISE EXCEPTION 'this property already has an owner; ask the manager to add you as a co-owner';
  END IF;

  INSERT INTO public.property_landlords (property_id, landlord_user_id, manager_id, revenue_share_pct)
  VALUES (v_inv.property_id, auth.uid(), v_inv.manager_id, 100)
  ON CONFLICT (property_id, landlord_user_id) DO UPDATE SET manager_id = EXCLUDED.manager_id;

  INSERT INTO public.user_roles (user_id, role, approval_status)
  VALUES (auth.uid(), 'landlord', 'approved')
  ON CONFLICT (user_id, role) DO NOTHING;

  UPDATE public.landlord_invitations SET status = 'accepted', accepted_at = now() WHERE id = v_inv.id;
  RETURN v_inv.id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.accept_landlord_invitation(text) TO authenticated;
