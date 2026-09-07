-- CALQULUS visual identity refresh.
-- Keeps portal/admin configuration editable; this only refreshes platform defaults.
UPDATE public.platform_portal_identities
SET primary_hex = CASE portal_id
  WHEN 'manager' THEN '#0074E6'
  WHEN 'landlord' THEN '#10B981'
  WHEN 'agency' THEN '#0074E6'
  WHEN 'tenant' THEN '#06B6D4'
  WHEN 'platform_admin' THEN '#06B6D4'
  ELSE primary_hex
END
WHERE portal_id IN ('manager','landlord','agency','tenant','platform_admin');
