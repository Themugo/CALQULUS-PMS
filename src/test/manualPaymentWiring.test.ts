import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (p: string) => readFileSync(p, "utf8");
const m26 = read("supabase/migrations/20260909000026_landlord_collection_account.sql");
const m27 = read("supabase/migrations/20260909000027_manual_payment_destination_consistency.sql");

describe("landlord collection account (migration 26)", () => {
  it("only the primary owner can set it, and only when the landlord is the effective collector", () => {
    expect(m26).toMatch(/Only the primary owner of this property/);
    expect(m26).toMatch(/v_dest IS DISTINCT FROM 'landlord'/);
    expect(m26).toMatch(/r\.collection_destination IN \('agency','split'\) THEN 'manager'/);
  });
  it("delegates validation to the existing RPC and strips other scopes", () => {
    expect(m26).toMatch(/save_payment_collection_account_atomic\(\s*v_existing/);
    expect(m26).toMatch(/- 'unit_id' - 'lease_id' - 'tenant_id' - 'agency_id' - 'manager_id'/);
  });
  it("is not callable anonymously", () => {
    expect(m26).toMatch(/REVOKE EXECUTE ON FUNCTION public\.save_landlord_collection_account_atomic\(uuid,jsonb\) FROM PUBLIC, anon/);
  });
});

describe("tenant manual-payment details (migration 27)", () => {
  it("tenant portal route ranking applies the destination-first rule", () => {
    expect(m27).toMatch(/d\.dest='landlord' AND a\.landlord_user_id=/);
  });
  it("per-bill instructions return the account reference with a unit-number fallback", () => {
    expect(m27).toMatch(/account_reference text\)/);
    expect(m27).toMatch(/COALESCE\(a\.account_reference,\(SELECT u\.unit_number/);
  });
  it("keeps the payer and tenant authorisation clauses", () => {
    expect(m27).toMatch(/caller_tenant_ids/);
    expect(m27).toMatch(/payer_unit_links/);
    expect(m27).toMatch(/RAISE EXCEPTION 'Forbidden'/);
  });
});

describe("tenant portal surfaces manual payment details", () => {
  it("the Payments page mounts the destination details and links to proof upload", () => {
    const page = read("src/features/payments/pages/PaymentHistory.tsx");
    expect(page).toMatch(/<TenantPaymentDetails\s*\/>/);
    const card = read("src/features/tenant-portal/components/TenantPaymentDetails.tsx");
    expect(card).toMatch(/to="\/portal\/receipts"/);
    expect(card).toMatch(/PaymentInstructionsGuide/);
    expect(card).toMatch(/have not been published yet/);
  });
  it("the bill chip shows the paybill account number", () => {
    expect(read("src/features/tenant-portal/components/TenantBillsHub.tsx")).toMatch(/Acc \$\{bill\.paymentAccount\.account_reference\}/);
  });
  it("landlord Management page exposes the collection account editor", () => {
    expect(read("src/features/landlord/pages/LandlordManagement.tsx")).toMatch(/<LandlordCollectionAccount/);
    expect(read("src/features/landlord/components/LandlordCollectionAccount.tsx")).toMatch(/save_landlord_collection_account_atomic/);
  });
});

describe("manager payment readiness covers what tenants can see", () => {
  const src = read("src/features/settings/components/PaymentSetupStatus.tsx");
  it("queries active collection accounts and requires one for a property to count as ready", () => {
    expect(src).toMatch(/from\('payment_collection_accounts'\)/);
    expect(src).toMatch(/\(r\.mpesaReady \|\| r\.bankReady\) && r\.routeReady/);
    expect(src).toMatch(/Tenants see where to pay/);
  });
  it("the manager routing panel names landlords instead of showing id fragments", () => {
    expect(read("src/features/billing/components/PaymentCollectionRoutingPanel.tsx")).toMatch(/landlordNames\[l\.landlord_user_id\]/);
  });
  it("landlord onboarding no longer links to a route that does not exist", () => {
    expect(read("src/features/onboarding/pages/LandlordOnboardingPage.tsx")).not.toMatch(/navigate\("\/landlord\/properties"\)/);
  });
});

describe("help centre is truthful", () => {
  const help = read("src/shared/components/layout/HelpCenterModal.tsx");
  it("has no invented status, ticket confirmation or documentation portal", () => {
    expect(help).not.toMatch(/99\.99|v2\.4\.0|Dispatched|calqulus\.site\/docs|Knowledge Base/);
    expect(help).toMatch(/LiveSystemStatus/);
    expect(help).toMatch(/mailto:/);
  });
  it("only lists shortcuts that are registered", () => {
    expect(help).not.toMatch(/"G", "D"|keys: \["G"/);
  });
});
