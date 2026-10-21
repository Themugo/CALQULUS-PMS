import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { assertNoForbiddenClientEnv, findForbiddenClientEnv } from "../../vite.clientEnvGuard";

describe("production client env guard", () => {
  it("flags dev credentials, demo seed secret and webhook secret", () => {
    expect(
      findForbiddenClientEnv({
        VITE_DEV_MANAGER_PASSWORD: "x",
        VITE_DEV_ACCESS_EMAIL: "a@b.c",
        VITE_DEMO_SEED_SECRET: "s",
        VITE_WEBHOOK_SECRET: "w",
        VITE_SUPABASE_URL: "https://x.supabase.co",
      }),
    ).toEqual(["VITE_DEMO_SEED_SECRET", "VITE_DEV_ACCESS_EMAIL", "VITE_DEV_MANAGER_PASSWORD", "VITE_WEBHOOK_SECRET"]);
  });

  it("ignores empty values and public config", () => {
    expect(() =>
      assertNoForbiddenClientEnv({ VITE_DEMO_SEED_SECRET: "", VITE_SUPABASE_PUBLISHABLE_KEY: "pk", VITE_ENABLE_DEV_ACCESS: "false" }),
    ).not.toThrow();
  });

  it("throws with the offending names for a production build", () => {
    expect(() => assertNoForbiddenClientEnv({ VITE_DEV_TENANT_PASSWORD: "pw" })).toThrow(/VITE_DEV_TENANT_PASSWORD/);
  });

  it("is wired into the production build in vite.config.ts", () => {
    const cfg = readFileSync(resolve(process.cwd(), "vite.config.ts"), "utf8");
    expect(cfg).toContain("assertNoForbiddenClientEnv");
    expect(cfg).toMatch(/command === "build" && mode === "production"/);
  });
});
