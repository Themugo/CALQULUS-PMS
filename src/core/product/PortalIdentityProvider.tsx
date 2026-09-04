import { createContext, useContext, useEffect, useMemo, type ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { portalFromAppRole, type PortalId } from "./portals";
import { DEFAULT_PORTAL_IDENTITIES, portalIdentityFromRow, type PortalIdentity } from "./portalIdentity";
import { useAuth } from "@/features/auth/AuthContext";
import { deriveBrandPalette } from "@/core/design/deriveBrandPalette";

interface PortalIdentityContextValue {
  portalId: PortalId;
  identity: PortalIdentity;
  isLoading: boolean;
}

const PortalIdentityContext = createContext<PortalIdentityContextValue>({
  portalId: "manager",
  identity: DEFAULT_PORTAL_IDENTITIES.manager,
  isLoading: false,
});

function portalFromPath(pathname: string): PortalId {
  if (pathname.startsWith("/landlord")) return "landlord";
  if (pathname.startsWith("/agency")) return "agency";
  if (pathname.startsWith("/tenant") || pathname.startsWith("/portal")) return "tenant";
  if (pathname.startsWith("/webhost")) return "platform_admin";
  return "manager";
}

export function usePortalIdentity() {
  return useContext(PortalIdentityContext);
}

export function PortalIdentityProvider({ children }: { children: ReactNode }) {
  const location = useLocation();
  const { userRole } = useAuth();
  const portalId = portalFromAppRole(userRole?.role) ?? portalFromPath(location.pathname);
  const fallback = DEFAULT_PORTAL_IDENTITIES[portalId];

  const { data, isLoading } = useQuery({
    queryKey: ["portal-identity", portalId],
    queryFn: async () => {
      const { data: row, error } = await (supabase.from as any)("platform_portal_identities")
        .select("portal_id,display_name,short_name,tagline,primary_hex,background_image_url")
        .eq("portal_id", portalId)
        .maybeSingle();
      if (error) throw error;
      return portalIdentityFromRow(row, portalId);
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    retry: 1,
  });

  const identity = data ?? fallback;
  const palette = deriveBrandPalette(identity.primaryHex);

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.activePortal = portalId;
    if (palette.approved) {
      root.style.setProperty("--portal-primary", palette.hex);
      root.style.setProperty("--portal-accent", palette.hex);
      root.style.setProperty("--portal-accent-muted", palette.muted);
      root.style.setProperty("--portal-accent-border", palette.border);
      root.style.setProperty("--portal-accent-surface", palette.surface);
      root.style.setProperty("--portal-accent-foreground", palette.onColor);
      root.style.setProperty("--portal-primary-hover", palette.hover);
      root.style.setProperty("--portal-primary-active", palette.active);
      root.style.setProperty("--portal-primary-muted", palette.muted);
      root.style.setProperty("--portal-primary-border", palette.border);
      root.style.setProperty("--portal-primary-surface", palette.surface);
      root.style.setProperty("--portal-primary-focus", palette.focus);
      root.style.setProperty("--portal-primary-foreground", palette.onColor);
    }
    return () => {
      root.removeAttribute("data-active-portal");
      ["--portal-primary", "--portal-primary-hover", "--portal-primary-active", "--portal-primary-muted", "--portal-primary-border", "--portal-primary-surface", "--portal-primary-focus", "--portal-primary-foreground", "--portal-accent", "--portal-accent-muted", "--portal-accent-border", "--portal-accent-surface", "--portal-accent-foreground"].forEach((name) => root.style.removeProperty(name));
    };
  }, [palette, portalId]);

  const value = useMemo(() => ({ portalId, identity, isLoading }), [portalId, identity, isLoading]);
  return <PortalIdentityContext.Provider value={value}>{children}</PortalIdentityContext.Provider>;
}
