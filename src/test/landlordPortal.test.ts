import { describe, expect, it } from "vitest";
import {
  collectionRatePercent,
  landlordNetShare,
  LANDLORD_PRIMARY_SECTIONS,
  managementFeeFromShare,
  occupancyPercent,
} from "@/features/landlord/lib/portfolioMetrics";
import { isLandlordBlockedPath } from "@/features/landlord/lib/landlordAccess";
import { formatCurrency } from "@/shared/lib/formatCurrency";

describe("landlord portfolio metrics", () => {
  it("computes occupancy from occupied and total units", () => {
    expect(occupancyPercent(9, 10)).toBe(90);
    expect(occupancyPercent(0, 0)).toBe(0);
  });

  it("splits collected rent using the revenue share, without inventing expenses", () => {
    expect(landlordNetShare(100_000, 80)).toBe(80_000);
    expect(managementFeeFromShare(100_000, 80)).toBe(20_000);
    expect(landlordNetShare(100_000, 80) + managementFeeFromShare(100_000, 80)).toBe(100_000);
  });

  it("returns 0 collection rate when nothing was billed", () => {
    expect(collectionRatePercent(0, 0)).toBe(0);
    expect(collectionRatePercent(50_000, 100_000)).toBe(50);
  });

  it("formats landlord money with KES", () => {
    expect(formatCurrency(45000)).toContain("45,000");
  });

  it("names the primary dashboard sections in landlord order", () => {
    expect(LANDLORD_PRIMARY_SECTIONS).toEqual([
      "Portfolio overview",
      "Income",
      "Collections",
      "Outstanding",
      "Occupancy",
      "Expenses",
      "Property performance",
      "Recent activity",
    ]);
  });
});

describe("landlord route firewall", () => {
  it("blocks manager-only desks", () => {
    expect(isLandlordBlockedPath("/")).toBe(true);
    expect(isLandlordBlockedPath("/tenants")).toBe(true);
    expect(isLandlordBlockedPath("/leases")).toBe(true);
    expect(isLandlordBlockedPath("/billing")).toBe(true);
    expect(isLandlordBlockedPath("/properties")).toBe(true);
    expect(isLandlordBlockedPath("/invites")).toBe(true);
    expect(isLandlordBlockedPath("/maintenance")).toBe(true);
    expect(isLandlordBlockedPath("/reports")).toBe(true);
    expect(isLandlordBlockedPath("/portal")).toBe(true);
    expect(isLandlordBlockedPath("/agency")).toBe(true);
    expect(isLandlordBlockedPath("/settings")).toBe(true);
    expect(isLandlordBlockedPath("/platform-billing")).toBe(true);
    expect(isLandlordBlockedPath("/my-billing")).toBe(true);
    expect(isLandlordBlockedPath("/webhost")).toBe(true);
  });

  it("allows the landlord portal", () => {
    expect(isLandlordBlockedPath("/landlord/dashboard")).toBe(false);
    expect(isLandlordBlockedPath("/landlord/login")).toBe(false);
  });
});
