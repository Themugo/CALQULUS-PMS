import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { destinationKey, destinationLabel, groupByDestination, lockedReason } from "@/features/payments/lib/destinationGroups";

const paybill = { account_id: "a1", payment_method: "mpesa_paybill", paybill_number: "247247", till_number: null };
const till = { account_id: "a2", payment_method: "mpesa_till", paybill_number: null, till_number: "555" };

describe("destination grouping", () => {
  it("builds the same key the server compares (id|method|paybill|till)", () => {
    expect(destinationKey(paybill)).toBe("a1|mpesa_paybill|247247|");
    expect(destinationKey(till)).toBe("a2|mpesa_till||555");
    const init = readFileSync("supabase/functions/initiate-mpesa-stk-push/index.ts", "utf8");
    expect(init).toContain('[r.id, r.payment_method, r.paybill_number ?? "", r.till_number ?? ""].join("|")');
  });
  it("groups bills by account and keeps one group when they converge", () => {
    const bills = [{ id: "1", r: paybill }, { id: "2", r: till }, { id: "3", r: paybill }];
    const g = groupByDestination(bills, (b) => b.r);
    expect(g.map((x) => x.items.map((b) => b.id))).toEqual([["1", "3"], ["2"]]);
    expect(groupByDestination([bills[0], bills[2]], (b) => b.r)).toHaveLength(1);
  });
  it("puts bills with no configured account together and labels them", () => {
    const g = groupByDestination([{ r: null }, { r: undefined }], (b) => b.r);
    expect(g).toHaveLength(1);
    expect(destinationLabel(null)).toBe("Pay at the office");
    expect(destinationLabel(paybill)).toBe("M-Pesa Paybill 247247");
    expect(destinationLabel(till)).toBe("M-Pesa Till 555");
  });
  it("locks bills of another account once one is selected", () => {
    expect(lockedReason([], "x")).toBeNull();
    expect(lockedReason(["k1"], "k1")).toBeNull();
    expect(lockedReason(["k1"], "k2")).toMatch(/different account/);
  });
});

describe("UI wiring and payer visibility", () => {
  const hub = readFileSync("src/features/tenant-portal/components/TenantBillsHub.tsx", "utf8");
  const payer = readFileSync("src/features/payments/pages/PayerPortal.tsx", "utf8");
  const sql = readFileSync("supabase/migrations/20260909000020_payer_destination_visibility.sql", "utf8");
  it("tenant hub offers one pay button per account when bills split", () => {
    expect(hub).toContain("groupByDestination");
    expect(hub).toContain("multiDestination");
    expect(hub).toContain("different accounts");
    expect(hub).toContain("disabled={!!lockReasonFor(bill.id)}");
  });
  it("payer portal groups by destination before the prompt and waits for routes", () => {
    expect(payer).toContain("get_invoice_payment_instructions");
    expect(payer).toContain("groupByDestination");
    expect(payer).toContain("routes.isLoading");
  });
  it("payers may read destinations only through an active unit link they own", () => {
    expect(sql).toContain("payer_unit_links");
    expect(sql).toContain("pp.user_id = v_uid");
    expect(sql).toContain("pul.is_active");
    expect(sql).toContain("RAISE EXCEPTION 'Forbidden'");
  });
});
