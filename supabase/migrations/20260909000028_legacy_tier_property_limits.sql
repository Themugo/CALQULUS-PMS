-- New managers are created on tier 'starter' (manager_profiles default, subscription_tiers row), but
-- property_tier_limits only had lite/pro/enterprise, so check_tier_allows_property() returned false for
-- every category and NO new manager could create a property. Give the legacy tier keys explicit limits
-- that match their published caps (subscription_tiers.max_properties: starter 5, growth 20, professional 50).
INSERT INTO public.property_tier_limits (tier_key, category_group, max_properties, price_multiplier) VALUES
  ('starter','residential',5,1.00),('starter','commercial',0,0),('starter','industrial',0,0),
  ('starter','mixed',0,0),('starter','land',5,0.80),('starter','any',5,1.00),
  ('growth','residential',20,1.00),('growth','commercial',5,1.80),('growth','industrial',0,0),
  ('growth','mixed',5,1.40),('growth','land',10,0.80),('growth','any',20,1.00),
  ('professional','residential',50,1.00),('professional','commercial',20,1.80),('professional','industrial',5,1.60),
  ('professional','mixed',10,1.40),('professional','land',20,0.80),('professional','any',50,1.00)
ON CONFLICT (tier_key, category_group) DO NOTHING;
