import { describe, expect, it } from "vitest";

const migration = "supabase/migrations/20260904000037_management_compliance_assurance.sql";
const component = "src/features/dashboard/components/ManagementComplianceAssuranceCenter.tsx";

describe("management compliance assurance", () => {
  it("defines explicit review lifecycle and fail-closed approval threshold", async () => {
    const sql = await Bun.file(migration).text();
    expect(sql).toContain("management_assurance_reviews");
    expect(sql).toContain("p_target_status NOT IN ('in_review','approved','rejected')");
    expect(sql).toContain("v_review.control_score < 80");
    expect(sql).toContain("REVOKE ALL ON FUNCTION public.review_manager_assurance_atomic");
  });

  it("uses the existing close-period and manager scope rather than a duplicate financial source", async () => {
    const source = await Bun.file(component).text();
    expect(source).toContain("financial_close_periods");
    expect(source).toContain("useManagerScope");
    expect(source).toContain("get_manager_assurance_reviews");
    expect(source).toContain("review_manager_assurance_atomic");
  });
});
