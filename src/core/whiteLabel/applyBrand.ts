import { CALQULUS_COLOR } from "@/shared/theme/tokens";
import type { ResolvedBrand } from "@/core/brand/resolve";

const BRAND_VARS = [
  "--primary",
  "--ring",
  "--sidebar-primary",
  "--color-primary",
] as const;

export function applyResolvedBrand(brand: ResolvedBrand): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  if (brand.source !== "organization" || brand.primaryHex === CALQULUS_COLOR.primary) {
    clearBrandOverrides();
    return;
  }
  for (const name of BRAND_VARS) {
    root.style.setProperty(name, brand.primaryHex);
  }
}

export function clearBrandOverrides(): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  for (const name of BRAND_VARS) {
    root.style.removeProperty(name);
  }
}
