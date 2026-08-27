import { useEffect, useMemo, useState } from "react";
import { defaultLandingConfig } from "@/features/marketing/landing/defaultLandingConfig";
import { landingContent } from "@/features/marketing/landing/contentService";
import type { LandingPageConfig } from "@/features/marketing/landing/landingContent";

/**
 * Hook the landing page uses to obtain its active content.
 *
 * Today the content provider is static (returns the shipped defaults). This
 * hook is the seam where a future Webhost/Admin CMS would inject persisted
 * content — components never change, only this boundary.
 */
export function useDefaultLandingConfig(): LandingPageConfig {
  const [config, setConfig] = useState<LandingPageConfig>(defaultLandingConfig);

  useEffect(() => {
    let active = true;
    void landingContent.getConfig().then((loaded) => {
      if (active) setConfig(loaded);
    });
    return () => {
      active = false;
    };
  }, []);

  return useMemo(() => config, [config]);
}