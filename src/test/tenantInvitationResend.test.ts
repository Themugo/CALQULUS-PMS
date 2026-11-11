import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const src = readFileSync("src/features/auth/pages/TenantAuth.tsx", "utf8");

describe("tenant invitation verification screen", () => {
  it("resends the verification email instead of re-submitting signup", () => {
    expect(src).toContain("ResendVerificationButton");
    expect(src).not.toMatch(/onClick=\{\(\) => setShowVerificationMessage\(false\)\}/);
  });
});
