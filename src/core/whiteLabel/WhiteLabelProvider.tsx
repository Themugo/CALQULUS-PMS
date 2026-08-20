import React, { createContext, useContext, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/features/auth/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import {
  PLATFORM_BRAND,
  resolveBrand,
  type OrgBrandRecord,
  type ResolvedBrand,
} from "@/core/brand/resolve";
import { portalFromAppRole, WHITE_LABEL_CONSUMERS } from "@/core/product/portals";
import { applyResolvedBrand, clearBrandOverrides } from "./applyBrand";

interface WhiteLabelContextValue {
  brand: ResolvedBrand;
  isLoading: boolean;
}

const WhiteLabelContext = createContext<WhiteLabelContextValue>({
  brand: PLATFORM_BRAND,
  isLoading: false,
});

// eslint-disable-next-line react-refresh/only-export-components
export function useWhiteLabel(): WhiteLabelContextValue {
  return useContext(WhiteLabelContext);
}

export function WhiteLabelProvider({ children }: { children: React.ReactNode }) {
  const { user, userRole } = useAuth();
  const portal = portalFromAppRole(userRole?.role);
  const canConsume = !!user && !!portal && (WHITE_LABEL_CONSUMERS as string[]).includes(portal);

  const { data: org, isLoading } = useQuery({
    queryKey: ["org-brand", user?.id, userRole?.role],
    queryFn: async (): Promise<OrgBrandRecord | null> => {
      const { data, error } = await supabase.rpc("get_org_brand");
      if (error) throw error;
      if (!data) return null;
      const row = data as Record<string, unknown>;
      return {
        company_name: typeof row.company_name === "string" ? row.company_name : null,
        logo_url: typeof row.logo_url === "string" ? row.logo_url : null,
        brand_primary_hex: typeof row.brand_primary_hex === "string" ? row.brand_primary_hex : null,
        white_label_enabled: row.white_label_enabled === true,
      };
    },
    enabled: canConsume,
    staleTime: 5 * 60 * 1000,
  });

  const brand = useMemo(
    () => (canConsume ? resolveBrand(org ?? null) : PLATFORM_BRAND),
    [canConsume, org],
  );

  useEffect(() => {
    applyResolvedBrand(brand);
    return () => clearBrandOverrides();
  }, [brand]);

  const value = useMemo(
    () => ({ brand, isLoading: canConsume && isLoading }),
    [brand, canConsume, isLoading],
  );

  return (
    <WhiteLabelContext.Provider value={value}>
      {children}
    </WhiteLabelContext.Provider>
  );
}
