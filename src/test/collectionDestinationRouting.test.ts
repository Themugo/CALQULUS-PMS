import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const sql = readFileSync("supabase/migrations/20260909000016_collection_destination_routing.sql", "utf8");

describe("payment routing follows who collects", () => {
  it("reads the active contract rule destination, then the owner link destination", () => {
    expect(sql).toContain("agency_contract_rules");
    expect(sql).toContain("r.collection_destination = 'landlord'");
    expect(sql).toContain("pl.payment_destination");
  });
  it("ranks landlord accounts above agency accounts only when the landlord collects", () => {
    expect(sql).toMatch(/WHEN v_dest='landlord' AND a\.landlord_user_id=[\s\S]*THEN 5/);
    expect(sql).toMatch(/a\.agency_id=[\s\S]*THEN 6/);
  });
  it("keeps tenant, lease, unit and property accounts most specific", () => {
    const order = sql.slice(sql.indexOf("ORDER BY CASE"));
    expect(order.indexOf("THEN 1")).toBeLessThan(order.indexOf("THEN 4"));
    expect(order.indexOf("THEN 4")).toBeLessThan(order.indexOf("THEN 5"));
  });
  it("stays service-role only", () => {
    expect(sql).toContain("TO service_role");
    expect(sql).toContain("FROM PUBLIC, anon, authenticated");
  });
});
