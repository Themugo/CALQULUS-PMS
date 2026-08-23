/**
 * Agency onboarding — portfolio-centric, efficient.
 * Steps use the same stepper shell as Manager/Landlord; every field
 * maps to existing APIs.
 */

export const AGENCY_ONBOARDING_STEPS = [
  { id: "account", label: "Account", description: "Your login is ready." },
  { id: "verification", label: "Verification", description: "Confirm your email." },
  { id: "profile", label: "Agency profile", description: "The name clients see." },
  { id: "clients", label: "First client", description: "Link a property owner you manage for." },
  { id: "property", label: "First property", description: "Add the first managed building." },
  { id: "team", label: "Team", description: "Invite colleagues to help." },
  { id: "complete", label: "Complete", description: "Your agency is ready." },
] as const;

export type AgencyOnboardingStepId = (typeof AGENCY_ONBOARDING_STEPS)[number]["id"];
