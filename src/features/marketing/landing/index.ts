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
  canEditLandingSection,
  LANDING_PERMISSIONS,
  LANDING_EDITOR_ROLES,
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