import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";

const fnDir = resolve(process.cwd(), "supabase/functions");

describe("auth user lookups are paginated", () => {
  it("no edge function calls auth.admin.listUsers() outside the shared helper", () => {
    const offenders = readdirSync(fnDir, { withFileTypes: true })
      .filter((d) => d.isDirectory() && d.name !== "_shared")
      .map((d) => d.name)
      .filter((name) => {
        try {
          return /auth\.admin\.listUsers\(/.test(readFileSync(resolve(fnDir, name, "index.ts"), "utf8"));
        } catch {
          return false;
        }
      });
    // listUsers() returns one page (50 users). Existence checks built on it
    // stop working past that, including the "already an administrator" guard.
    expect(offenders).toEqual([]);
  });

  it("shared helper walks pages until a short page is returned", () => {
    const src = readFileSync(resolve(fnDir, "_shared/authUsers.ts"), "utf8");
    expect(src).toContain("page,");
    expect(src).toContain("batch.length < PER_PAGE");
  });

  it("send-admin-invitation uses the paginated lookup for its administrator guard", () => {
    const src = readFileSync(resolve(fnDir, "send-admin-invitation/index.ts"), "utf8");
    expect(src).toContain("findAuthUserByEmail(ctx.supabase, email)");
  });
});
