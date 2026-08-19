/**
 * Live JWT isolation. Skipped unless LIVE_ISOLATION=1 and credentials are set.
 * Does not use the mocked Supabase client from src/test/setup.ts.
 *
 * Required env:
 *   VITE_SUPABASE_URL or SUPABASE_URL
 *   VITE_SUPABASE_PUBLISHABLE_KEY or SUPABASE_ANON_KEY
 *   LIVE_MANAGER_EMAIL / LIVE_MANAGER_PASSWORD
 *   LIVE_TENANT_EMAIL / LIVE_TENANT_PASSWORD
 */
import { createClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";

const enabled = process.env.LIVE_ISOLATION === "1";
const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "";
const anon =
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY || "";
const managerEmail = process.env.LIVE_MANAGER_EMAIL || "";
const managerPassword = process.env.LIVE_MANAGER_PASSWORD || "";
const tenantEmail = process.env.LIVE_TENANT_EMAIL || "";
const tenantPassword = process.env.LIVE_TENANT_PASSWORD || "";
const ready =
  enabled &&
  url.includes("supabase.co") &&
  !url.includes("placeholder") &&
  anon.length > 20 &&
  managerEmail.includes("@") &&
  managerPassword.length > 0 &&
  tenantEmail.includes("@") &&
  tenantPassword.length > 0;

describe.skipIf(!ready)("live JWT isolation", () => {
  it("tenant JWT cannot read another tenant's row by id guess, and manager JWT cannot satisfy landlord RPC as someone else", async () => {
    const tenantClient = createClient(url, anon, { auth: { persistSession: false } });
    const managerClient = createClient(url, anon, { auth: { persistSession: false } });

    const tenantAuth = await tenantClient.auth.signInWithPassword({
      email: tenantEmail,
      password: tenantPassword,
    });
    expect(tenantAuth.error).toBeNull();

    const { data: ownRoles, error: roleErr } = await tenantClient
      .from("user_roles")
      .select("tenant_id")
      .eq("role", "tenant")
      .maybeSingle();
    expect(roleErr).toBeNull();
    const ownTenantId = ownRoles?.tenant_id as string | null;
    expect(ownTenantId).toBeTruthy();

    const foreignId = "00000000-0000-4000-8000-000000000099";
    const { data: foreignTenant, error: foreignErr } = await tenantClient
      .from("tenants")
      .select("id, email, name")
      .eq("id", foreignId)
      .maybeSingle();
    expect(foreignTenant).toBeNull();
    expect(foreignErr === null || foreignErr.code === "PGRST116").toBe(true);

    const { data: ownTenant } = await tenantClient
      .from("tenants")
      .select("id")
      .eq("id", ownTenantId!)
      .maybeSingle();
    expect(ownTenant?.id).toBe(ownTenantId);

    const managerAuth = await managerClient.auth.signInWithPassword({
      email: managerEmail,
      password: managerPassword,
    });
    expect(managerAuth.error).toBeNull();

    const { error: rpcErr } = await managerClient.rpc("get_landlord_revenue", {
      p_property_id: foreignId,
      p_landlord_user_id: foreignId,
    });
    expect(rpcErr).toBeTruthy();

    await tenantClient.auth.signOut();
    await managerClient.auth.signOut();
  });
});
