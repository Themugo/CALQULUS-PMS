import { describe, expect, it } from "vitest";
import {
  CONTACT_EMAIL,
  PUBLIC_NAV,
  PUBLIC_ROUTES,
  homeSectionHref,
} from "@/features/marketing/publicConfig";

describe("public marketing config", () => {
  it("uses the live portal login routes", () => {
    expect(PUBLIC_ROUTES.managerSignIn).toBe("/auth");
    expect(PUBLIC_ROUTES.managerSignUp).toBe("/auth?tab=signup");
    expect(PUBLIC_ROUTES.landlordLogin).toBe("/landlord/login");
    expect(PUBLIC_ROUTES.agencyLogin).toBe("/agency/login");
    expect(PUBLIC_ROUTES.tenantLogin).toBe("/tenant/login");
    expect(PUBLIC_ROUTES.webhostLogin).toBe("/webhost/login");
    expect(PUBLIC_ROUTES.pricing).toBe("/pricing");
    expect(PUBLIC_ROUTES.legalPrivacy).toBe("/legal?tab=privacy");
    expect(PUBLIC_ROUTES.legalTerms).toBe("/legal?tab=terms");
  });

  it("keeps the existing support mailbox", () => {
    expect(CONTACT_EMAIL).toBe("enterprise@calqulusrms.com");
  });

  it("builds in-page hashes on the homepage and rooted hashes elsewhere", () => {
    expect(homeSectionHref("platform", "/")).toBe("#platform");
    expect(homeSectionHref("platform", "/pricing")).toBe("/#platform");
    expect(homeSectionHref("contact", "/legal")).toBe("/#contact");
  });

  it("exposes executive primary navigation hashes", () => {
    expect(PUBLIC_NAV.map((item) => item.label)).toEqual(["Platform", "Solutions", "How it works"]);
    expect(PUBLIC_NAV.map((item) => item.hash)).toEqual(["platform", "solutions", "how-it-works"]);
  });
});
