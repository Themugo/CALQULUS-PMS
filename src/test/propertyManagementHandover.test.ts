import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { describeOperator } from "@/features/landlord/lib/handover";

const sql = readFileSync("supabase/migrations/20260909000017_property_management_handover.sql", "utf8");
const read = (p: string) => readFileSync(p, "utf8");

describe("landlord <-> agency handover", () => {
  it("describes who runs a property", () => {
    expect(describeOperator("o1", "o1").self).toBe(true);
    expect(describeOperator("o1", null).self).toBe(true);
    expect(describeOperator("o1", "agency").self).toBe(false);
  });
  it("never deletes records", () => {
    expect(sql).not.toMatch(/\bDELETE\s+FROM\b/i);
    expect(sql).not.toMatch(/\bDROP\s+TABLE\b/i);
  });
  it("keeps the departing operator's own books and never moves the owner's accounts", () => {
    for (const t of ["ledger_journal_entries", "bank_transactions", "owner_payout_batches", "messages"]) expect(sql).toContain(`'${t}'`);
    expect(sql).toContain("landlord_user_id IS DISTINCT FROM t.owner_user_id");
    expect(sql).toContain("is_active = false");
  });
  it("needs the agency's consent to join; handing back to the owner is immediate", () => {
    expect(sql).toContain("Only the property owner can choose who manages it");
    expect(sql).toContain("v_to = v_uid OR v_to = v_owner");
    expect(sql).toContain("Only the receiving agency or manager can accept");
  });
  it("is blocked while a payment is in flight and cannot be called directly by clients", () => {
    expect(sql).toContain("A payment is in progress on this property");
    expect(sql).toMatch(/REVOKE ALL ON FUNCTION public\.execute_property_management_handover\(uuid\) FROM PUBLIC, anon, authenticated/);
    expect(sql).toContain("REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.property_management_transfers");
  });
  it("is reachable from the landlord settings and the agency/manager landlords screen", () => {
    expect(read("src/features/landlord/pages/LandlordSettings.tsx")).toContain("PropertyManagementHandover");
    expect(read("src/features/landlord/components/LandlordLinksManager.tsx")).toContain("IncomingManagementRequests");
  });
});
