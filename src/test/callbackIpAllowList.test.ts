import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
// @ts-expect-error deno module imported for pure-function testing
import { isCallbackIpAllowed, parseAllowedIps } from "../../supabase/functions/_shared/callbackIp.ts";

const h = (ip?: string) => new Headers(ip ? { "x-forwarded-for": ip } : {});

describe("callback IP allow-list", () => {
  it("is off when unset or blank", () => {
    expect(isCallbackIpAllowed(h("1.2.3.4"), undefined)).toBe(true);
    expect(isCallbackIpAllowed(h(), " , ")).toBe(true);
  });
  it("allows only listed IPs (first forwarded hop)", () => {
    expect(parseAllowedIps("1.1.1.1, 2.2.2.2")).toEqual(["1.1.1.1", "2.2.2.2"]);
    expect(isCallbackIpAllowed(h("2.2.2.2, 9.9.9.9"), "1.1.1.1,2.2.2.2")).toBe(true);
    expect(isCallbackIpAllowed(h("3.3.3.3"), "1.1.1.1,2.2.2.2")).toBe(false);
    expect(isCallbackIpAllowed(h(), "1.1.1.1")).toBe(false);
  });
  it("is enforced before the secret check in mpesa-callback", () => {
    const s = readFileSync("supabase/functions/mpesa-callback/index.ts", "utf8");
    expect(s.indexOf("isCallbackIpAllowed(")).toBeGreaterThan(0);
    expect(s.indexOf("isCallbackIpAllowed(")).toBeLessThan(s.indexOf("Validate webhook secret"));
  });
});
