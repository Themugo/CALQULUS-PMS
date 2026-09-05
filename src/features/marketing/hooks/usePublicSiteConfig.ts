import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DEFAULT_PUBLIC_SITE_CONFIG, mergePublicSiteConfig, type PublicSiteConfig } from "@/features/marketing/publicSiteConfig";

export const PUBLIC_SITE_CONFIG_QUERY_KEY = ["public-site-config"] as const;

export function usePublicSiteConfig() {
  return useQuery<PublicSiteConfig>({
    queryKey: PUBLIC_SITE_CONFIG_QUERY_KEY,
    queryFn: async () => {
      const { data, error } = await (supabase.rpc as any)("get_public_site_config");
      if (error) throw error;
      return mergePublicSiteConfig(data);
    },
    staleTime: 60_000,
    placeholderData: DEFAULT_PUBLIC_SITE_CONFIG,
  });
}
