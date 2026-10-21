import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const read = (path: string) => readFileSync(path, "utf8");

describe("Dashboard command-center action continuity", () => {
  it("routes maintenance preview rows into the existing priority-aware maintenance queue", () => {
    const source = read("src/features/dashboard/components/OpenMaintenancePreview.tsx");
    expect(source).toContain("/maintenance?priority=");
    expect(source).toContain("Prioritise urgent work");
  });

  it("lets maintenance consume dashboard priority deep links without replacing its existing lane model", () => {
    const source = read("src/features/maintenance/pages/Maintenance.tsx");
    expect(source).toContain("useSearchParams");
    expect(source).toContain("priorityFilter");
    expect(source).toContain("matchesPriority");
    expect(source).toContain("matchesMaintenanceLane");
  });

  it("routes upcoming payments into the existing billing status filter", () => {
    const source = read("src/features/dashboard/components/UpcomingPayments.tsx");
    expect(source).toContain("/billing?filter=");
    expect(source).toContain("Review billing queue");
  });

  it("connects dashboard section aria labels to actual heading ids", () => {
    const source = read("src/features/dashboard/pages/Dashboard.tsx");
    // The manager desk was restructured into workspace tabs (b7c1b04), which
    // renamed several section ids. The contract that matters is that every
    // aria-labelledby points at a real id, and the core sections still exist.
    const refs = [...source.matchAll(/aria-labelledby="([^"]+)"/g)].map((m) => m[1]);
    for (const id of [
      "dashboard-kpi",
      "dashboard-collections-pulse",
      "dashboard-attention-inline",
      "dashboard-collections-overview",
      "dashboard-maintenance-overview",
      "dashboard-activity",
      "dashboard-upcoming",
    ]) {
      expect(refs).toContain(id);
    }
    for (const id of new Set(refs)) {
      expect(source).toContain(`id="${id}"`);
    }
  });
});
