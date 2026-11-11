import { supabase } from "@/integrations/supabase/client";

/**
 * Onboarding saves go through save_manager_company_settings_atomic, which overwrites any
 * field missing from the payload (address, phone, logo, brand colours...) and replaces
 * brand_config outright. Sending a partial payload from a wizard step therefore erased the
 * organization's profile, and placeholder names ("CALQULUS Workspace") replaced real ones.
 *
 * This helper reads what is already stored and sends the FULL record back with only the
 * requested change applied, so it is safe against both the old and the merge-aware RPC.
 */
export interface StoredCompanyRow {
  company_name?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  zip_code?: string | null;
  email?: string | null;
  phone?: string | null;
  website?: string | null;
  brand_primary_hex?: string | null;
  white_label_enabled?: boolean | null;
  logo_url?: string | null;
  brand_config?: unknown;
}

export interface StoredAgencyRow {
  county?: string | null;
  kra_pin?: string | null;
  registration_number?: string | null;
  whatsapp?: string | null;
}

export interface OnboardingSaveInput {
  /** Only a real, user-entered name. Never pass a placeholder. */
  companyName?: string | null;
  /** Merged into brand_config.onboarding; other onboarding keys are kept. */
  onboardingPatch?: Record<string, unknown>;
}

const isRecord = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);

export function buildCompanySettingsPayload(
  company: StoredCompanyRow | null,
  agency: StoredAgencyRow | null,
  input: OnboardingSaveInput,
): Record<string, unknown> {
  const brand = isRecord(company?.brand_config) ? company!.brand_config as Record<string, unknown> : {};
  const onboarding = isRecord(brand.onboarding) ? brand.onboarding as Record<string, unknown> : {};
  const typed = input.companyName?.trim();
  const payload: Record<string, unknown> = {
    address: company?.address ?? null,
    city: company?.city ?? null,
    state: company?.state ?? null,
    zip_code: company?.zip_code ?? null,
    email: company?.email ?? null,
    phone: company?.phone ?? null,
    website: company?.website ?? null,
    brand_primary_hex: company?.brand_primary_hex ?? null,
    white_label_enabled: company?.white_label_enabled ?? false,
    logo_url: company?.logo_url ?? null,
    brand_config: input.onboardingPatch
      ? { ...brand, onboarding: { ...onboarding, ...input.onboardingPatch } }
      : brand,
  };
  const name = typed || company?.company_name?.trim();
  if (name) payload.company_name = name;
  if (agency) {
    payload.county = agency.county ?? null;
    payload.kra_pin = agency.kra_pin ?? null;
    payload.registration_number = agency.registration_number ?? null;
    payload.whatsapp = agency.whatsapp ?? null;
  }
  return payload;
}

export async function saveOnboardingSettings(userId: string, input: OnboardingSaveInput): Promise<void> {
  const [{ data: company }, { data: agency }] = await Promise.all([
    supabase.from("company_settings")
      .select("company_name, address, city, state, zip_code, email, phone, website, brand_primary_hex, white_label_enabled, logo_url, brand_config")
      .eq("manager_user_id", userId).maybeSingle(),
    supabase.from("agencies").select("county, kra_pin, registration_number, whatsapp").eq("manager_id", userId).maybeSingle(),
  ]);
  const { error } = await supabase.rpc("save_manager_company_settings_atomic", {
    p_payload: buildCompanySettingsPayload(company as StoredCompanyRow | null, agency as StoredAgencyRow | null, input) as never,
  });
  if (error) throw error;
}
