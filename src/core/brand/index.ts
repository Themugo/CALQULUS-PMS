export {
  HEX_COLOR,
  PLATFORM_BRAND,
  brandConfigToResolved,
  isHexColor,
  resolveBrand,
  type OrgBrandRecord,
  type ResolvedBrand,
} from "./resolve";
export { PLATFORM_BRAND_CONFIG } from "./platformBrand";
export { composeBrandConfig } from "./composeBrandConfig";
export { mergeBrandConfig } from "./mergeBrandConfig";
export { parseOrgBrandRecord, compactBrandOverlay } from "./parseOrgRecord";
export { term } from "./terms";
export {
  brandConfigToCompanySettings,
  documentAccent,
  documentFooter,
  documentShowLogo,
  documentTitle,
} from "./pdfCompany";
export { CALQULUS_BRAND } from "@/shared/theme/tokens";
export type {
  AllowedFont,
  BrandConfig,
  BrandDocumentKind,
  BrandTerm,
  DeepPartial,
} from "./BrandConfig";
export { ALLOWED_FONTS } from "./BrandConfig";
