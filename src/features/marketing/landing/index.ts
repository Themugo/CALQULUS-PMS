export { LandingPage, LandingPageInner, LandingSections } from "./LandingPage";
export { useDefaultLandingConfig } from "./useLandingConfig";
export {
  defaultLandingConfig,
} from "./defaultLandingConfig";

export {
  landingIcon,
  LANDING_ICON_NAMES,
} from "./landingIcon";

export {
  createLandingContentAdapter,
  createSupabaseLandingContentProvider,
  landingContent,
  mergeLandingConfig,
  pickLandingSections,
  saveAllLandingSections,
  canEditLandingSection,
  resolveLandingEditorRole,
  LANDING_PERMISSIONS,
  LANDING_EDITOR_ROLES,
  LANDING_ASSET_BUCKET,
} from "./contentService";
export type {
  LandingContentProvider,
  LandingSectionKey,
  LandSectionSaver,
  SaveLandingSectionResult,
  LandingAssetUploader,
  UploadLandingAssetResult,
} from "./contentService";

export type {
  LandingPageConfig,
  LandingPageContent,
  LandingSectionId,
} from "./landingContent";

export type {
  LandingTheme,
} from "@/features/marketing/theme/landingTheme";
export { LANDING_THEME, landingThemeToCssVars, isLight } from "@/features/marketing/theme/landingTheme";