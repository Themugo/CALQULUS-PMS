import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const sql = readFileSync(resolve(root, "supabase/migrations/20260907000003_restrict_internal_definer_functions.sql"), "utf8");

const INTERNAL = [
  "issue_payment_receipt_atomic(uuid)",
  "resolve_tenant_auth_user(uuid)",
  "get_effective_billing_due_config(uuid)",
  "check_idempotency_key(text, text)",
  "can_access_property(uuid, uuid)",
];

describe("internal SECURITY DEFINER helpers are service-role only", () => {
  it.each(INTERNAL)("revokes %s from authenticated and grants service_role", (sig) => {
    expect(sql).toContain(`REVOKE ALL ON FUNCTION public.${sig} FROM PUBLIC, anon, authenticated;`);
    expect(sql).toContain(`GRANT EXECUTE ON FUNCTION public.${sig} TO service_role;`);
  });

  it("no browser code calls the restricted RPCs", () => {
    const names = INTERNAL.map((s) => s.split("(")[0]);
    const walk = (dir: string): string[] =>
      readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
        e.isDirectory() ? walk(resolve(dir, e.name)) : /\.(ts|tsx)$/.test(e.name) ? [resolve(dir, e.name)] : [],
      );
    const offenders = walk(resolve(root, "src"))
      .map((f) => ({ f, posix: f.replace(/\\/g, "/") }))
      .filter(({ posix }) => !/\/test\/|integrations\/supabase\/types/.test(posix))
      .map(({ f }) => f)
      .filter((f) => names.some((n) => readFileSync(f, "utf8").includes(n)));
    expect(offenders).toEqual([]);
  });

  it("the only edge function calling issue_payment_receipt_atomic uses the service-role client", () => {
    const src = readFileSync(resolve(root, "supabase/functions/process-payment/index.ts"), "utf8");
    expect(src).toContain("createClient(SUPABASE_URL, SERVICE_KEY)");
    expect(src).toContain('"issue_payment_receipt_atomic"');
  });
});
