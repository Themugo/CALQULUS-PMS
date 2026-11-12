-- Public pricing renders subscription_tiers.description verbatim. The original
-- seed text for Enterprise promised "unlimited properties" and "white label",
-- neither of which the platform guarantees (capacity is 999 properties / 9999
-- units, by agreement). Correct it ONLY where the row still carries the seed
-- text, so any description a platform admin has since written is untouched.
UPDATE public.subscription_tiers
   SET description = 'Larger firms and agencies — capacity by agreement, with custom blocks for bigger portfolios'
 WHERE tier_key = 'enterprise'
   AND description = 'Large agencies — unlimited properties, custom pricing, white label';
