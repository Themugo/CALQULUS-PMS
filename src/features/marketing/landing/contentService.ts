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
import { supabase } from "@/integrations/supabase/client";

/* ─────────────────────── content permission model ────────────────── */

/**
 * Editor roles that may edit landing content. These map onto the CALQULUS
 * authority model:
 *   - webhost: the platform account tier — full control. Backed by
 *     `platform_admins` (owner/business/can_manage_platform_settings) with
 *     `user_roles.role = 'webhost'`.
 *   - admin: operational content editor — only a scoped subset of sections.
 */
export const LANDING_EDITOR_ROLES = ["webhost", "admin"] as const;
export type LandingEditorRole = (typeof LANDING_EDITOR_ROLES)[number];

/**
 * Which parts of the landing page a role may edit. Webhost owns everything;
 * Admin receives only a scoped subset assigned by the webhost. These are
 * frontend UX gates — the backend (`upsert_landing_section` RPC + RLS) is
 * authoritative.
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
    "sections",
  ],
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
  | "footer"
  | "sections";

/**
 * Resolve the editor role for a webhost account from the platform tier.
 * @param role  the authenticated user's role (user_roles.role).
 * @param adminType the platform_admins.admin_type, when the caller is webhost.
 * @param canManagePlatformSettings whether platform settings management is granted.
 * @returns the LandingEditorRole used for permission checks, or null when the
 *          caller is not a landing editor at all.
 */
export function resolveLandingEditorRole(
  role: string | null | undefined,
  adminType?: string | null,
  canManagePlatformSettings?: boolean,
): LandingEditorRole | null {
  if (role === "webhost") {
    // owner/business (or any account granted platform settings management)
    // are the "webhost" full editors; plain 'admin' is the scoped editor.
    if (adminType === "owner" || adminType === "business" || canManagePlatformSettings) {
      return "webhost";
    }
    return "admin";
  }
  return null;
}

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

export type LandingSectionKey = keyof Pick<
  LandingPageConfig,
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
  | "footer"
  | "sections"
>;

export type SaveLandingSectionResult =
  | { ok: true; data: LandingPageConfig[LandingSectionKey] }
  | { ok: false; error: string };

/** Result of an asset upload to the landing CMS asset store. */
export type UploadLandingAssetResult =
  | { ok: true; url: string; path: string }
  | { ok: false; error: string };

/** Persist one section of the landing config (webhost/admin editor). */
export type LandSectionSaver = (
  section: LandingSectionKey,
  payload: LandingPageConfig[LandingSectionKey],
) => Promise<SaveLandingSectionResult>;

/** Upload an image into the landing asset store and return its public URL. */
export type LandingAssetUploader = (file: File, folder?: string) => Promise<UploadLandingAssetResult>;

/** Storage bucket used for public landing-marketing assets. */
export const LANDING_ASSET_BUCKET = "landing-images";

export interface LandingContentProvider {
  /** Load the active landing config (defaults when nothing persisted). */
  getConfig(): Promise<LandingPageConfig>;
  /**
   * Persist a single section through the authorized backend
   * (`upsert_landing_section`). Optional on the static adapter.
   */
  saveSection?: LandSectionSaver;
  /** Persist config wholesale — only meaningful for full webhost editors. */
  saveConfig?(config: LandingPageConfig): Promise<void>;
  /** Upload a marketing image to the landing asset store. */
  uploadLandingAsset?: LandingAssetUploader;
  readiness: "static" | "service";
}

interface LandingContentAdapterOptions {
  theme?: LandingTheme;
}

/** Merge persisted section values over the shipped defaults, without mutation. */
export function mergeLandingConfig(
  active: LandingPageConfig,
  persisted: Partial<LandingPageConfig>,
): LandingPageConfig {
  return { ...active, ...persisted };
}

/**
 * Static adapter — returns the shipped defaults and reports
 * `readiness: "static"`. Used for unit tests and sandbox previews. Never writes.
 */
export function createLandingContentAdapter(
  options: LandingContentAdapterOptions = {},
): LandingContentProvider {
  const merged = options.theme ? { ...defaultLandingConfig, theme: options.theme } : defaultLandingConfig;
  return {
    readiness: "static",
    getConfig: async () => merged,
    saveSection: undefined,
    saveConfig: undefined,
    uploadLandingAsset: async () => ({ ok: false, error: "Static adapter has no asset store" }),
  };
}

/** Filter a persisted JSON object down to the known section keys of the config. */
export function pickLandingSections(persisted: Record<string, unknown>): Partial<LandingPageConfig> {
  const partial: Partial<LandingPageConfig> = {};
  const keys = Object.keys(defaultLandingConfig) as LandingSectionKey[];
  for (const key of keys) {
    if (key in persisted) {
      // Keep only known keys, leaving the concrete section typing to the
      // merge logic that consumes this partial.
      if (key === "sections") {
        partial[key] = Array.isArray(persisted[key]) ? (persisted[key] as LandingPageConfig["sections"]) : undefined;
      } else {
        (partial as Record<string, unknown>)[key] = persisted[key];
      }
    }
  }
  return partial;
}

/**
 * Supabase-backed landing content provider — the live CMS wiring.
 *
 * - getConfig(): reads the single published `landing_page_content` row and
 *   merges it over the shipped defaults. When the row is absent (or Supabase
 *   isn't configured in this environment) it falls back to defaults.
 * - saveSection(): calls the `upsert_landing_section` RPC, which enforces the
 *   section whitelist by platform tier server-side. Returns a typed result so
 *   the editor UI can show success/failure without throwing.
 *
 * The public page reads through this provider, so webhost/admin edits persist
 * and are served. Frontend permissions stay UX-only; the RPC is authoritative.
 */
export function createSupabaseLandingContentProvider(): LandingContentProvider {
  let cache: LandingPageConfig | null = null;

  const uploadLandingAsset: LandingAssetUploader = async (file, folder = "general") => {
    if (!file) return { ok: false, error: "No file selected" };
    const ext = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "png";
    const safeFolder = folder.replace(/[^a-z0-9-_]/gi, "").slice(0, 40);
    const path = `${safeFolder}/${Date.now()}-${crypto.randomUUID?.().slice(0, 8) ?? Math.random().toString(36).slice(2, 10)}.${ext}`;
    const { error } = await supabase.storage.from(LANDING_ASSET_BUCKET).upload(path, file, {
      cacheControl: "31536000",
      upsert: false,
    });
    if (error) return { ok: false, error: error.message };
    const { data } = supabase.storage.from(LANDING_ASSET_BUCKET).getPublicUrl(path);
    return { ok: true, url: data.publicUrl, path };
  };

  const provider: LandingContentProvider = {
    readiness: "service",
    uploadLandingAsset: uploadLandingAsset,
    getConfig: async (): Promise<LandingPageConfig> => {
      if (cache) return cache;
      const { data, error } = await supabase
        .from("landing_page_content")
        .select("config")
        .eq("scope", "landing")
        .single();
      if (error || !data?.config) {
        cache = { ...defaultLandingConfig };
        return cache;
      }
      const persisted = (data.config ?? {}) as Record<string, unknown>;
      cache = mergeLandingConfig({ ...defaultLandingConfig }, pickLandingSections(persisted));
      return cache;
    },
    saveSection: async (section, payload): Promise<SaveLandingSectionResult> => {
      const { data, error } = await supabase.rpc("upsert_landing_section", {
        p_section: section,
        p_payload: payload,
      });
      if (error) return { ok: false, error: error.message };
      // Refresh the local cache so edits render immediately on the next read.
      if (cache) cache = { ...cache, [section]: (data ?? payload) as LandingPageConfig[LandingSectionKey] };
      return { ok: true, data: (data ?? payload) as LandingPageConfig[LandingSectionKey] };
    },
    saveConfig: async (config: LandingPageConfig): Promise<void> => {
      // Wholesale save is a webhost-tier operation; proxy through the scoped
      // section updater so the RPC authorizes each key individually.
      await saveAllLandingSections(provider, config);
    },
  };

  return provider;
}

/** Persist a full config one section at a time through the authorized RPC. */
export async function saveAllLandingSections(
  provider: LandingContentProvider,
  config: LandingPageConfig,
): Promise<{ ok: boolean; error?: string }> {
  if (!provider.saveSection) return { ok: false, error: "Provider does not support section writes" };
  for (const key of Object.keys(config) as LandingSectionKey[]) {
    const result = await provider.saveSection(key, config[key]);
    if (!result.ok) return { ok: false, error: result.error };
  }
  return { ok: true };
}

/** The page-level singleton the public landing page consumes. */
export const landingContent: LandingContentProvider = createSupabaseLandingContentProvider();