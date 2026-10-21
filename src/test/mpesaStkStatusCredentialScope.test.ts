import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const src = readFileSync(resolve(process.cwd(), "supabase/functions/verify-mpesa-stk-status/index.ts"), "utf8");

describe("verify-mpesa-stk-status credential scoping", () => {
  it("looks up M-Pesa credentials per property, then falls back to the owner-wide row", () => {
    expect(src).toContain("propertyId");
    expect(src).toContain(".eq('property_id', propertyId)");
    expect(src).toContain(".is('property_id', null)");
    // The transaction's property must be passed to the query helper.
    expect(src).toMatch(/querySafaricomSTK\([^)]*transaction\.property_id/);
  });

  it("no longer reads credentials with an owner-only maybeSingle()", () => {
    expect(src).not.toMatch(/\.eq\('landlord_user_id',landlordId\)\.maybeSingle\(\)/);
    expect(src).not.toMatch(/\.eq\('manager_user_id',managerId\)\.maybeSingle\(\)/);
  });
});
