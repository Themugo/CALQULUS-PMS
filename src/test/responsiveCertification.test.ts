import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const src = (relative: string) => readFileSync(join(process.cwd(), relative), "utf8");

describe("Phase 11 responsive certification contracts", () => {
  it("keeps dialogs inset on small screens instead of edge-to-edge", () => {
    const dialog = src("src/shared/components/ui/dialog.tsx");
    expect(dialog).toContain("w-[calc(100%-1.5rem)]");
    expect(dialog).toContain("max-h-[min(90vh,calc(100dvh-1.5rem))]");
  });

  it("does not clip page titles — titles wrap, they do not truncate", () => {
    const header = src("src/shared/components/layout/PageHeader.tsx");
    expect(header).toContain("break-words");
    expect(header).not.toMatch(/page-title[^\n]*truncate/);
  });

  it("reflows manager search instead of locking a 256px field at tablet widths", () => {
    const header = src("src/shared/components/layout/Header.tsx");
    expect(header).toContain("hidden lg:flex");
    expect(header).toContain("lg:hidden");
    expect(header).not.toMatch(/hidden md:flex[\s\S]*w-64/);
  });

  it("gives tenant amounts a wrapping tabular display", () => {
    const home = src("src/features/tenant-portal/components/TenantHome.tsx");
    expect(home).toContain("amount-display");
    expect(home).toContain("Pay rent");
    expect(home).not.toMatch(/text-4xl font-bold tracking-tight/);
  });

  it("keeps all five tenant mobile nav labels visible", () => {
    const layout = src("src/features/tenant-portal/components/TenantLayout.tsx");
    expect(layout).toContain('label: "Home"');
    expect(layout).toContain('label: "Pay"');
    expect(layout).toContain('label: "Fix"');
    expect(layout).toContain('label: "Docs"');
    expect(layout).toContain('label: "Me"');
    expect(layout).not.toMatch(/MOBILE_NAV[\s\S]*truncate/);
  });

  it("does not hide the maintenance property column in the design preview", () => {
    const preview = src("src/features/design-preview/pages/DesignPreview.tsx");
    expect(preview).toContain("Ridgeview · 2B");
    expect(preview).not.toMatch(/TableHead className="hidden sm:table-cell">Property/);
    expect(preview).toContain("grid-cols-2 gap-2 sm:grid-cols-4");
  });

  it("scales page titles down on phones without dropping the type token", () => {
    const css = src("src/index.css");
    expect(css).toContain("font-size: 1.75rem");
    expect(css).toContain(".amount-display");
    expect(css).toContain(".chart-frame");
    expect(css).toContain("--breakpoint-xs: 24.375rem");
  });
});
