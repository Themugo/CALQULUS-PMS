import { describe, expect, it } from "vitest";
import { CALQULUS_PORTALS } from "@/core/product/portals";
import { DEFAULT_PORTAL_IDENTITIES, portalIdentityFromRow } from "@/core/product/portalIdentity";

describe("portal ecosystem identity", () => {
  it("defines a complete identity for every portal", () => {
    for (const id of Object.keys(CALQULUS_PORTALS) as Array<keyof typeof CALQULUS_PORTALS>) {
      const identity = DEFAULT_PORTAL_IDENTITIES[id];
      expect(identity.portalId).toBe(id);
      expect(identity.name.length).toBeGreaterThan(0);
      expect(identity.shortName.length).toBeGreaterThan(0);
      expect(identity.tagline.length).toBeGreaterThan(0);
      expect(identity.primaryHex).toMatch(/^#[0-9a-f]{6}$/i);
      expect(identity.backgroundImageUrl.length).toBeGreaterThan(0);
    }
  });

  it("falls back safely when admin identity data is incomplete", () => {
    const fallback = DEFAULT_PORTAL_IDENTITIES.manager;
    const identity = portalIdentityFromRow({ display_name: "  Custom Desk  ", primary_hex: "#123456" }, "manager");
    expect(identity.name).toBe("Custom Desk");
    expect(identity.shortName).toBe(fallback.shortName);
    expect(identity.tagline).toBe(fallback.tagline);
    expect(identity.primaryHex).toBe("#123456");
    expect(identity.backgroundImageUrl).toBe(fallback.backgroundImageUrl);
  });
});
