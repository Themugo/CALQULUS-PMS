import { describe, expect, it } from "vitest";
import { CALQULUS_COLOR } from "@/shared/theme/tokens";
import {
  CALQULUS_PORTALS,
  PRODUCT_STACK,
  WHITE_LABEL_CONSUMERS,
  portalFromAppRole,
} from "@/core/product/portals";
import { PLATFORM_BRAND, resolveBrand } from "@/core/brand/resolve";

describe("CALQULUS CORE product system", () => {
  it("names the three systems under CORE", () => {
    expect(PRODUCT_STACK).toEqual([
      "CALQULUS CORE",
      "Product system",
      "Design system",
      "Brand system",
      "White-label engine",
    ]);
  });

  it("sells Manager, Landlord, and Agency desks, then Tenant, then Platform Admin", () => {
    expect(Object.keys(CALQULUS_PORTALS)).toEqual([
      "manager",
      "landlord",
      "agency",
      "tenant",
      "platform_admin",
    ]);
    expect(WHITE_LABEL_CONSUMERS).toEqual(["manager", "landlord", "agency", "tenant"]);
  });

  it("maps app roles onto portals", () => {
    expect(portalFromAppRole("manager")).toBe("manager");
    expect(portalFromAppRole("submanager")).toBe("manager");
    expect(portalFromAppRole("landlord")).toBe("landlord");
    expect(portalFromAppRole("agency")).toBe("agency");
    expect(portalFromAppRole("tenant")).toBe("tenant");
    expect(portalFromAppRole("webhost")).toBe("platform_admin");
    expect(portalFromAppRole(null)).toBeNull();
  });
});

describe("white-label brand resolver", () => {
  it("keeps the CALQULUS platform brand when no org overlay exists", () => {
    expect(resolveBrand(null)).toEqual(PLATFORM_BRAND);
    expect(resolveBrand(null).primaryHex).toBe(CALQULUS_COLOR.primary);
  });

  it("does not replace the platform mark when white-label is off", () => {
    const brand = resolveBrand({
      company_name: "Ridgeview Estates",
      logo_url: "https://cdn.example/logo.png",
      brand_primary_hex: "#112233",
      white_label_enabled: false,
    });
    expect(brand.source).toBe("platform");
    expect(brand.name).toBe("CALQULUS");
    expect(brand.workspaceName).toBe("Ridgeview Estates");
    expect(brand.primaryHex).toBe(CALQULUS_COLOR.primary);
  });

  it("applies company name, logo, and a valid hex when white-label is on", () => {
    const brand = resolveBrand({
      company_name: "Ridgeview Estates",
      logo_url: "https://cdn.example/logo.png",
      brand_primary_hex: "#2563EB",
      white_label_enabled: true,
    });
    expect(brand.source).toBe("organization");
    expect(brand.name).toBe("Ridgeview Estates");
    expect(brand.logoUrl).toBe("https://cdn.example/logo.png");
    expect(brand.primaryHex).toBe("#2563EB");
  });

  it("falls back to CALQULUS cyan when the stored hex is invalid", () => {
    const brand = resolveBrand({
      company_name: "Ridgeview",
      logo_url: null,
      brand_primary_hex: "blue",
      white_label_enabled: true,
    });
    expect(brand.primaryHex).toBe(CALQULUS_COLOR.primary);
  });
});
