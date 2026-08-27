/**
 * Landing-page content service — the editability boundary between the typed
 * content model and any future Webhost/Admin CMS.
 *
 * Today the public homepage renders the shipped `defaultLandingConfig`.
 * This module defines the contracts (LandingPageContent, LandingPageAsset,
 * LandingPagePermission) and the service adapter that a future webhost-admin
 * implementation would back with Supabase. The adapter is intentionally
 * inert: it returns defaults and a read-only flag, and never writes to a
 * database. No fabricated persistence.
 *
 * Security note: frontend permissions here are UX-only. Backend authorization
 * (webhost > admin, per assigned capability) must remain authoritative — see
 * `LandingPagePermission`.
 */
import { defaultLandingConfig } from "@/features/marketing/landing/defaultLandingConfig";
import type { LandingPageConfig } from "@/features/marketing/landing/landingContent";
import type { LandingTheme } from "@/features/marketing/theme/landingTheme";

/* ─────────────────────── content permission model ────────────────── */

export const LANDING_EDITOR_ROLES = ["webhost", "platform_admin", "admin"] as const;
export type LandingEditorRole = (typeof LANDING_EDITOR_ROLES)[number];

/**
 * Which parts of the landing page a role may edit. Webhost owns everything;
 * Admin receives only a scoped subset assigned by the webhost. These are
 * frontend UX gates — the backend must stay authoritative.
 */
export const LANDING_PERMISSIONS: Record<LandingEditorRole, LandingPagePermission[]> = {
  webhost: [
    "brand",
    "theme",
    "header",
    "hero",
    "dashboard",
    "trust",
    "capabilities",
    "roles",
    "propertyTypes",
    "metrics",
    "finalCta",
    "footer",
  ],
  platform_admin: ["brand", "theme", "footer"],
  admin: ["hero", "capabilities", "roles", "metrics"],
};

export type LandingPagePermission =
  | "brand"
  | "theme"
  | "header"
  | "hero"
  | "dashboard"
  | "trust"
  | "capabilities"
  | "roles"
  | "propertyTypes"
  | "metrics"
  | "finalCta"
  | "footer";

export function canEditLandingSection(
  role: LandingEditorRole | null | undefined,
  permission: LandingPagePermission,
): boolean {
  if (!role) return false;
  return (LANDING_PERMISSIONS[role] ?? []).includes(permission);
}

/* ─────────────────────── asset model ─────────────────────────────── */

/** A replaceable landing asset — a webhost can later point these anywhere. */
export interface LandingPageAsset {
  key: string;
  /** Stable asset key; resolved to a src/marketing asset or remote URL. */
  src: string;
  alt: string;
  loading: "lazy" | "eager";
}

/* ─────────────────────── service boundary ────────────────────────── */

export interface LandingContentProvider {
  /** Load the active landing config (defaults when nothing persisted). */
  getConfig(): Promise<LandingPageConfig>;
  /** Persist config — clear boundary; NOT implemented (no fake DB). */
  saveConfig?(config: LandingPageConfig): Promise<void>;
  readiness: "static" | "service";
}

interface LandingContentAdapterOptions {
  theme?: LandingTheme;
}

/**
 * Adapter boundary towards a future Supabase-backed content table. Currently
 * static: returns the shipped defaults and reports `readiness: "static"`.
 */
export function createLandingContentAdapter(
  options: LandingContentAdapterOptions = {},
): LandingContentProvider {
  const merged = options.theme ? { ...defaultLandingConfig, theme: options.theme } : defaultLandingConfig;
  return {
    readiness: "static",
    getConfig: async () => merged,
    saveConfig: undefined,
  };
}

/** The page-level singleton the landing page consumes. */
export const landingContent: LandingContentProvider = createLandingContentAdapter();