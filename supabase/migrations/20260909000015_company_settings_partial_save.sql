-- Company settings: partial saves must not erase the rest of the profile.
--
-- AUDIT FINDING (onboarding): save_manager_company_settings_atomic set address, city,
-- state, zip, email, phone, website, brand colour and logo to NULL whenever the key was
-- missing from the payload, and replaced brand_config wholesale. Each onboarding step
-- sends only the field it collects, so saving "property types" or an agency name erased
-- the organization's profile, logo and onboarding progress. The same applied to the
-- agencies row (county, KRA PIN, registration number, WhatsApp).
--
-- New semantics, backwards compatible with full-form saves:
--   * a key PRESENT in the payload sets the column (an empty string still clears it)
--   * a key ABSENT leaves the column untouched
--   * brand_config is merged: top-level keys from the payload win, and the nested
--     `onboarding` object is merged key by key so wizard progress survives other saves
--
-- NOT applied by Claude. Apply with the other Phase 2F migrations.

BEGIN;

CREATE OR REPLACE FUNCTION public.save_manager_company_settings_atomic(p_payload jsonb) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_id uuid;
  v_manager uuid := auth.uid();
  v_role text;
  v_current jsonb;
  v_incoming jsonb := p_payload->'brand_config';
  v_merged jsonb;
BEGIN
  SELECT role INTO v_role FROM user_roles
  WHERE user_id = v_manager AND role IN ('manager','agency','landlord')
    AND COALESCE(approval_status,'approved') = 'approved' LIMIT 1;
  IF v_role IS NULL THEN RAISE EXCEPTION 'Organization authorization required'; END IF;

  SELECT id, COALESCE(brand_config, '{}'::jsonb) INTO v_id, v_current
  FROM company_settings WHERE manager_user_id = v_manager LIMIT 1 FOR UPDATE;

  -- With no existing row the SELECT assigns NULL (COALESCE never runs), and NULL || x is NULL.
  v_current := COALESCE(v_current, '{}'::jsonb);

  IF jsonb_typeof(v_incoming) = 'object' THEN
    v_merged := v_current || (v_incoming - 'onboarding');
    IF v_incoming ? 'onboarding' THEN
      v_merged := jsonb_set(v_merged, '{onboarding}',
        COALESCE(v_current->'onboarding', '{}'::jsonb) || COALESCE(v_incoming->'onboarding', '{}'::jsonb));
    END IF;
  ELSE
    v_merged := v_current;
  END IF;

  IF v_id IS NULL THEN
    INSERT INTO company_settings(manager_user_id, company_name, address, city, state, zip_code, email, phone, website,
                                 brand_primary_hex, white_label_enabled, brand_config, logo_url)
    VALUES (v_manager, COALESCE(NULLIF(p_payload->>'company_name',''),'My Company'),
            NULLIF(p_payload->>'address',''), NULLIF(p_payload->>'city',''), NULLIF(p_payload->>'state',''),
            NULLIF(p_payload->>'zip_code',''), NULLIF(p_payload->>'email',''), NULLIF(p_payload->>'phone',''),
            NULLIF(p_payload->>'website',''), NULLIF(p_payload->>'brand_primary_hex',''),
            COALESCE((p_payload->>'white_label_enabled')::boolean,false), v_merged, NULLIF(p_payload->>'logo_url',''))
    RETURNING id INTO v_id;
  ELSE
    UPDATE company_settings SET
      company_name        = COALESCE(NULLIF(p_payload->>'company_name',''), company_name),
      address             = CASE WHEN p_payload ? 'address' THEN NULLIF(p_payload->>'address','') ELSE address END,
      city                = CASE WHEN p_payload ? 'city' THEN NULLIF(p_payload->>'city','') ELSE city END,
      state               = CASE WHEN p_payload ? 'state' THEN NULLIF(p_payload->>'state','') ELSE state END,
      zip_code            = CASE WHEN p_payload ? 'zip_code' THEN NULLIF(p_payload->>'zip_code','') ELSE zip_code END,
      email               = CASE WHEN p_payload ? 'email' THEN NULLIF(p_payload->>'email','') ELSE email END,
      phone               = CASE WHEN p_payload ? 'phone' THEN NULLIF(p_payload->>'phone','') ELSE phone END,
      website             = CASE WHEN p_payload ? 'website' THEN NULLIF(p_payload->>'website','') ELSE website END,
      brand_primary_hex   = CASE WHEN p_payload ? 'brand_primary_hex' THEN NULLIF(p_payload->>'brand_primary_hex','') ELSE brand_primary_hex END,
      white_label_enabled = COALESCE((p_payload->>'white_label_enabled')::boolean, white_label_enabled),
      brand_config        = v_merged,
      logo_url            = CASE WHEN p_payload ? 'logo_url' THEN NULLIF(p_payload->>'logo_url','') ELSE logo_url END,
      updated_at          = now()
    WHERE id = v_id;
  END IF;

  IF v_role IN ('manager','agency') AND to_regclass('public.agencies') IS NOT NULL THEN
    INSERT INTO agencies(manager_id, name, email, phone, address, county, kra_pin, registration_number, whatsapp, website)
    VALUES (v_manager, COALESCE(NULLIF(p_payload->>'company_name',''),'My Agency'),
            NULLIF(p_payload->>'email',''), NULLIF(p_payload->>'phone',''), NULLIF(p_payload->>'address',''),
            NULLIF(p_payload->>'county',''), NULLIF(p_payload->>'kra_pin',''), NULLIF(p_payload->>'registration_number',''),
            NULLIF(p_payload->>'whatsapp',''), NULLIF(p_payload->>'website',''))
    ON CONFLICT (manager_id) DO UPDATE SET
      name                = COALESCE(NULLIF(p_payload->>'company_name',''), agencies.name),
      email               = CASE WHEN p_payload ? 'email' THEN EXCLUDED.email ELSE agencies.email END,
      phone               = CASE WHEN p_payload ? 'phone' THEN EXCLUDED.phone ELSE agencies.phone END,
      address             = CASE WHEN p_payload ? 'address' THEN EXCLUDED.address ELSE agencies.address END,
      county              = CASE WHEN p_payload ? 'county' THEN EXCLUDED.county ELSE agencies.county END,
      kra_pin             = CASE WHEN p_payload ? 'kra_pin' THEN EXCLUDED.kra_pin ELSE agencies.kra_pin END,
      registration_number = CASE WHEN p_payload ? 'registration_number' THEN EXCLUDED.registration_number ELSE agencies.registration_number END,
      whatsapp            = CASE WHEN p_payload ? 'whatsapp' THEN EXCLUDED.whatsapp ELSE agencies.whatsapp END,
      website             = CASE WHEN p_payload ? 'website' THEN EXCLUDED.website ELSE agencies.website END;
  END IF;
  RETURN v_id;
END $$;

REVOKE ALL ON FUNCTION public.save_manager_company_settings_atomic(jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.save_manager_company_settings_atomic(jsonb) TO authenticated, service_role;

COMMIT;
