import { useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { saveOnboardingSettings } from "../lib/saveOnboarding";

/** Reads brand_config.onboarding.skipped (string[]) defensively. */
export function readSkippedSteps(brandConfig: unknown): string[] {
  const onboarding = (brandConfig as { onboarding?: { skipped?: unknown } } | null)?.onboarding;
  const raw = onboarding?.skipped;
  return Array.isArray(raw) ? raw.filter((v): v is string => typeof v === "string") : [];
}

/**
 * Optional wizard steps the person chose to skip, stored with the rest of the onboarding
 * config so they survive a reload and a change of device. Skipping never blocks completion.
 */
export function useSkippedOnboardingSteps(userId: string | null) {
  const queryClient = useQueryClient();
  const key = ["onboarding-skipped", userId];
  const { data, isSuccess } = useQuery<string[]>({
    queryKey: key,
    enabled: !!userId,
    queryFn: async () => {
      const { data: row } = await supabase
        .from("company_settings")
        .select("brand_config")
        .eq("manager_user_id", userId!)
        .maybeSingle();
      return readSkippedSteps(row?.brand_config);
    },
  });

  const markSkipped = useCallback(
    (stepId: string) => {
      if (!userId) return;
      const current = queryClient.getQueryData<string[]>(key) ?? [];
      if (current.includes(stepId)) return;
      const next = [...current, stepId];
      queryClient.setQueryData(key, next);
      // Best effort: a failed save must never stop the person moving on.
      void saveOnboardingSettings(userId, { onboardingPatch: { skipped: next } }).catch(() => undefined);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [userId, queryClient],
  );

  return { skipped: new Set(data ?? []), loaded: isSuccess, markSkipped };
}
