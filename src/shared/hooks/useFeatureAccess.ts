import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/features/auth/AuthContext';
import { useRBAC } from '@/shared/hooks/useRBAC';

/**
 * Feature keys recognized by the check-feature edge function's plan map.
 * Keep this in sync with PLAN_FEATURES in supabase/functions/check-feature/index.ts.
 */
export type PlanFeature =
  | 'basic_billing' | 'tenant_portal' | 'maintenance'
  | 'water_billing' | 'contracts' | 'vacation_notices' | 'payment_reminders' | 'pdf_export'
  | 'api_access' | 'white_label' | 'advanced_analytics' | 'bulk_sms';

interface FeatureAccessResult {
  enabled: boolean;
  plan: string;
  isLoading: boolean;
}

/**
 * Checks whether the current manager's subscription plan includes a given
 * feature, via the check-feature edge function (free/pro/enterprise plan
 * map). This existed with zero callers anywhere in the app — every manager
 * has had unrestricted access to every feature regardless of what
 * manager_subscriptions.plan actually says.
 *
 * This hook makes that check available; it does not itself decide which
 * features should be gated where — wrap the specific UI you want to
 * restrict with it (see <FeatureGate> below) as a deliberate, page-by-page
 * choice rather than blanket-enforcing this everywhere at once.
 */
export function useFeatureAccess(feature: PlanFeature): FeatureAccessResult {
  const { whoAmI } = useRBAC();
  const { user } = useAuth();
  const managerId = whoAmI.managerId ?? user?.id ?? null;

  const { data, isLoading } = useQuery({
    queryKey: ['feature-access', managerId, feature],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('check-feature', {
        body: { managerId, feature },
      });
      if (error) throw error;
      return data as { enabled: boolean; plan: string };
    },
    enabled: !!managerId,
    staleTime: 5 * 60 * 1000, // plan changes aren't frequent; avoid refetching on every render
  });

  return {
    enabled: data?.enabled ?? true, // fail open — an infra hiccup shouldn't lock a paying manager out
    plan: data?.plan ?? 'pro',
    isLoading,
  };
}
