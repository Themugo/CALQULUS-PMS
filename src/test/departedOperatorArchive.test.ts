import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { archiveRowsToCsv } from "@/features/landlord/lib/archiveExport";

const sql = readFileSync("supabase/migrations/20260909000018_departed_operator_archive_access.sql", "utf8");

describe("departed operator archive", () => {
  it("is read-only, window-limited, whitelisted and time-limited", () => {
    expect(sql).toContain("STABLE SECURITY DEFINER");
    expect(sql).not.toMatch(/\b(INSERT INTO public\.(?!property_management)|UPDATE public\.[a-z_]+ SET)/);
    expect(sql).toContain("x.created_at <= $2");
    expect(sql).toContain("t.from_operator_id <> auth.uid()");
    expect(sql).toContain("interval '7 years'");
    expect(sql).toContain("Record type not available in the archive");
  });
  it("strips secret-looking columns and never offers tenant records", () => {
    expect(sql).toContain("secret|token|hash|password|payload|api_key");
    expect(sql).not.toMatch(/v_allowed text\[\] := ARRAY\[[^\]]*'tenants'/);
  });
  it("owner never gets an archive from their own period", () => {
    expect(sql).toContain("t.from_operator_id = t.owner_user_id");
  });
  it("CSV export quotes values and neutralises spreadsheet formulas", () => {
    const csv = archiveRowsToCsv([{ a: '=HYPERLINK("x")', b: 'say "hi"', c: null }, { a: "ok", d: 5 }]);
    const [head, r1] = csv.split("\n");
    expect(head).toBe('"a","b","c","d"');
    expect(r1.startsWith('"\'=HYPERLINK')).toBe(true);
    expect(r1).toContain('"say ""hi"""');
  });
});
