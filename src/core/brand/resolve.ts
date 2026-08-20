import { CALQULUS_BRAND, CALQULUS_COLOR } from "@/shared/theme/tokens";

export const HEX_COLOR = /^#([0-9A-Fa-f]{6})$/;

export interface OrgBrandRecord {
  company_name: string | null;
  logo_url: string | null;
  brand_primary_hex: string | null;
  white_label_enabled: boolean;
}

export interface ResolvedBrand {
  source: "platform" | "organization";
  name: string;
  product: string;
  logoUrl: string | null;
  primaryHex: string;
  /** Company name shown next to the CALQULUS mark when white-label is off. */
  workspaceName: string | null;
}

export const PLATFORM_BRAND: ResolvedBrand = {
  source: "platform",
  name: CALQULUS_BRAND.name,
  product: CALQULUS_BRAND.product,
  logoUrl: null,
  primaryHex: CALQULUS_COLOR.primary,
  workspaceName: null,
};

export function isHexColor(value: string | null | undefined): value is string {
  return typeof value === "string" && HEX_COLOR.test(value.trim());
}

export function resolveBrand(org: OrgBrandRecord | null): ResolvedBrand {
  if (!org) return { ...PLATFORM_BRAND };

  const workspaceName = org.company_name?.trim() || null;
  const workspaceLogo = org.logo_url?.trim() || null;

  if (!org.white_label_enabled) {
    return {
      ...PLATFORM_BRAND,
      workspaceName,
      logoUrl: null,
    };
  }

  const primaryHex = isHexColor(org.brand_primary_hex)
    ? org.brand_primary_hex.trim()
    : PLATFORM_BRAND.primaryHex;

  return {
    source: "organization",
    name: workspaceName || PLATFORM_BRAND.name,
    product: workspaceName || PLATFORM_BRAND.product,
    logoUrl: workspaceLogo,
    primaryHex,
    workspaceName,
  };
}
