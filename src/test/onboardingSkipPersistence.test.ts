import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { readSkippedSteps } from "@/features/onboarding/hooks/useSkippedOnboardingSteps";

describe("onboarding skipped steps", () => {
  it("reads skipped ids defensively", () => {
    expect(readSkippedSteps(null)).toEqual([]);
    expect(readSkippedSteps({ onboarding: { skipped: "x" } })).toEqual([]);
    expect(readSkippedSteps({ onboarding: { skipped: ["team", 3, "portfolio"] } })).toEqual(["team", "portfolio"]);
  });
  for (const page of ["Manager", "Agency", "Landlord"]) {
    it(`${page} wizard saves skips and does not resume into them`, () => {
      const s = readFileSync(`src/features/onboarding/pages/${page}OnboardingPage.tsx`, "utf8");
      expect(s).toContain("useSkippedOnboardingSteps(");
      expect(s).toContain("skippedSteps.has(id)");
      expect(s).toContain("!skipsLoaded");
      expect(s).not.toMatch(/onClick=\{skipStep\}[^>]*>\s*<SkipForward/);
    });
  }
});
