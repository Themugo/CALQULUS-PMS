import { describe, expect, it } from "vitest";
import { BACKEND_UNREACHABLE_MESSAGE, isNetworkAuthError, sanitizeAuthError } from "@/features/auth/lib/authFlow";

describe("auth network errors", () => {
  it("recognises unreachable-backend failures across browsers", () => {
    for (const m of ["Failed to fetch", "NetworkError when attempting to fetch resource.", "Load failed", "AuthRetryableFetchError", "fetch failed"]) {
      expect(isNetworkAuthError(m)).toBe(true);
      expect(sanitizeAuthError(m)).toBe(BACKEND_UNREACHABLE_MESSAGE);
    }
  });
  it("does not mislabel credential errors as network errors", () => {
    expect(isNetworkAuthError("Invalid login credentials")).toBe(false);
    expect(sanitizeAuthError("Invalid login credentials")).toBe("Invalid email or password.");
  });
  it("explains an unconfigured deployment", () => {
    expect(sanitizeAuthError("Supabase is not configured")).toMatch(/not available/i);
  });
});
