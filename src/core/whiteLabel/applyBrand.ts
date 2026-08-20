import { CALQULUS_COLOR } from "@/shared/theme/tokens";
import type { BrandConfig } from "@/core/brand/BrandConfig";
import type { ResolvedBrand } from "@/core/brand/resolve";
import { PLATFORM_BRAND_CONFIG } from "@/core/brand/platformBrand";

const BRAND_PRIMARY_VAR = "--brand-primary";
const FONT_HEADING_VAR = "--font-heading";
const DEFAULT_FAVICON = "/favicon.ico";

let originalFavicon: string | null = null;

/**
 * Apply organization brand without spraying the design-system palette.
 * Only `--brand-primary` (and heading font / favicon when set) change.
 */
export function applyBrandConfig(config: BrandConfig): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;

  if (config.source !== "organization") {
    clearBrandOverrides();
    return;
  }

  if (config.colors.primary !== CALQULUS_COLOR.primary) {
    root.style.setProperty(BRAND_PRIMARY_VAR, config.colors.primary);
  } else {
    root.style.removeProperty(BRAND_PRIMARY_VAR);
  }

  if (config.typography.heading === "system-ui") {
    root.style.setProperty(FONT_HEADING_VAR, "system-ui, sans-serif");
  } else {
    root.style.removeProperty(FONT_HEADING_VAR);
  }

  const favicon = config.identity.favicon?.trim();
  if (favicon && favicon !== PLATFORM_BRAND_CONFIG.identity.favicon) {
    setFavicon(favicon);
  } else {
    restoreFavicon();
  }
}

/** @deprecated Use applyBrandConfig. Kept for the ResolvedBrand adapter. */
export function applyResolvedBrand(brand: ResolvedBrand): void {
  if (typeof document === "undefined") return;
  if (brand.source !== "organization" || brand.primaryHex === CALQULUS_COLOR.primary) {
    clearBrandOverrides();
    return;
  }
  document.documentElement.style.setProperty(BRAND_PRIMARY_VAR, brand.primaryHex);
}

export function clearBrandOverrides(): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.style.removeProperty(BRAND_PRIMARY_VAR);
  root.style.removeProperty(FONT_HEADING_VAR);
  restoreFavicon();
}

function setFavicon(href: string): void {
  const link = document.querySelector<HTMLLinkElement>("link[rel='icon']");
  if (!link) return;
  if (originalFavicon === null) originalFavicon = link.href;
  link.href = href;
}

function restoreFavicon(): void {
  const link = document.querySelector<HTMLLinkElement>("link[rel='icon']");
  if (!link) return;
  link.href = originalFavicon || DEFAULT_FAVICON;
}
