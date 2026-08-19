import { describe, expect, it } from "vitest";
import {
  invoiceStatusTone,
  leaseStatusTone,
  maintenancePriorityTone,
  maintenanceStatusTone,
  occupancyRateColor,
  occupancyTone,
  requestAgeLabel,
  statusBadgeClass,
  tenantStatusTone,
} from "@/shared/lib/statusBadge";

describe("statusBadge helpers", () => {
  it("builds the design-system badge class", () => {
    expect(statusBadgeClass("success")).toBe("status-badge status-success");
    expect(statusBadgeClass("danger")).toBe("status-badge status-danger");
  });

  it("maps tenant, lease, and invoice statuses to semantic tones", () => {
    expect(tenantStatusTone("active")).toBe("success");
    expect(tenantStatusTone("pending")).toBe("warning");
    expect(tenantStatusTone("inactive")).toBe("neutral");
    expect(leaseStatusTone("expiring")).toBe("warning");
    expect(leaseStatusTone("expired")).toBe("danger");
    expect(invoiceStatusTone("paid")).toBe("success");
    expect(invoiceStatusTone("overdue")).toBe("danger");
    expect(invoiceStatusTone("partially_paid")).toBe("info");
  });

  it("maps maintenance priority and status without bright one-off colors", () => {
    expect(maintenancePriorityTone("urgent")).toBe("danger");
    expect(maintenancePriorityTone("medium")).toBe("warning");
    expect(maintenancePriorityTone("low")).toBe("neutral");
    expect(maintenanceStatusTone("in_progress")).toBe("info");
    expect(maintenanceStatusTone("completed")).toBe("success");
  });

  it("grades occupancy for KPI and property cards", () => {
    expect(occupancyTone(95)).toBe("success");
    expect(occupancyTone(75)).toBe("info");
    expect(occupancyTone(55)).toBe("warning");
    expect(occupancyTone(20)).toBe("danger");
    expect(occupancyRateColor(95)).toBe("text-success");
    expect(occupancyRateColor(20)).toBe("text-destructive");
  });

  it("formats work-order age for the maintenance table", () => {
    const now = Date.parse("2026-08-19T12:00:00.000Z");
    expect(requestAgeLabel("2026-08-19T08:00:00.000Z", now)).toBe("Today");
    expect(requestAgeLabel("2026-08-18T12:00:00.000Z", now)).toBe("1d");
    expect(requestAgeLabel("2026-08-07T12:00:00.000Z", now)).toBe("12d");
    expect(requestAgeLabel("not-a-date", now)).toBe("—");
  });
});
