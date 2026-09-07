import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(process.cwd());
const read = (file: string) => fs.readFileSync(path.join(root, file), "utf8");

describe("CALQULUS identity refinement", () => {
  it("keeps the supplied CALQULUS board palette represented in source", () => {
    const tokens = readFileSync(resolve(process.cwd(), "src/shared/theme/tokens.ts"), "utf8");
    const css = readFileSync(resolve(process.cwd(), "src/index.css"), "utf8");
    for (const hex of ["#0A2540", "#0284FF", "#06B6D4", "#10B981", "#84CC16", "#F1F5F9", "#E2E8F0"]) {
      expect(tokens.includes(hex) || css.includes(hex)).toBe(true);
    }
  });

  it("keeps one canonical brand palette and role accents", () => {
    const tokens = read("src/shared/theme/tokens.ts");
    const css = read("src/index.css");
    expect(tokens).toContain('primary: "#0074E6"');
    expect(tokens).toContain('navyDeep: "#0A2540"');
    expect(tokens).toContain('accent: "#06B6D4"');
    expect(tokens).toContain('success: "#10B981"');
    expect(css).toContain("--calqulus-tenant: #06B6D4");
    expect(css).toContain("--calqulus-platform: #06B6D4");
    expect(css).toContain('[data-portal="tenant"] { --portal-accent: var(--calqulus-tenant); }');
    expect(css).toContain('[data-portal="platform_admin"] { --portal-accent: var(--calqulus-platform); }');
    expect(css).not.toContain("--calqulus-violet");
    expect(css).not.toContain("--calqulus-teal-deep");
    expect(css).not.toContain("--calqulus-indigo");
  });

  it("does not use legacy identity utility classes in refined live surfaces", () => {
    const files = [
      "src/features/tenant-portal/components/MobileTenantHome.tsx",
      "src/shared/components/admin/EnterpriseAdminPlatform.tsx",
      "src/shared/components/layout/ProfileMenu.tsx",
    ];
    for (const file of files) {
      const source = read(file);
      expect(source).not.toMatch(/\b(?:bg|text|border)-(?:teal|purple|indigo|violet)(?:\/\d+)?\b/);
    }
  });

  it("keeps generated documents inside the CALQULUS identity", () => {
    const receipt = read("src/features/billing/lib/managerReceiptPdfExport.ts");
    const collection = read("src/features/reports/components/RentCollectionSummary.tsx");
    expect(receipt).toContain("[0, 116, 230]");
    expect(receipt).not.toContain("[147, 51, 234]");
    expect(collection).toContain("BRAND_BLUE = [0, 116, 230]");
    expect(collection).toContain("BRAND_NAVY = [10, 37, 64]");
    expect(collection).not.toContain("BRAND_GOLD");
  });
});
