import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { CALQULUS_BRAND, CALQULUS_COLOR, CALQULUS_PORTAL_ACCENT } from "@/shared/theme/tokens";

describe("CALQULUS brand identity", () => {
  it("uses the premium navy, blue, cyan and emerald identity tokens", () => {
    expect(CALQULUS_BRAND.name).toBe("CALQULUS");
    expect(CALQULUS_COLOR.primary).toBe("#0074E6");
    expect(CALQULUS_COLOR.brandBlue).toBe("#0284FF");
    expect(CALQULUS_COLOR.navyPrimary).toBe("#0A2540");
    expect(CALQULUS_COLOR.accent).toBe("#06B6D4");
    expect(CALQULUS_COLOR.success).toBe("#10B981");
    expect(CALQULUS_PORTAL_ACCENT.manager.hex).toBe("#0074E6");
    expect(CALQULUS_PORTAL_ACCENT.landlord.hex).toBe("#10B981");
    expect(CALQULUS_PORTAL_ACCENT.tenant.hex).toBe("#06B6D4");
  });

  it("keeps the default logo transparent and the public shell tokenized", () => {
    const mark = readFileSync(resolve(process.cwd(), "src/assets/branding/calqulus-property-mark.svg"), "utf8");
    const logo = readFileSync(resolve(process.cwd(), "public/calqulus-logo.svg"), "utf8");
    const header = readFileSync(resolve(process.cwd(), "src/features/marketing/components/PublicHeader.tsx"), "utf8");
    const footer = readFileSync(resolve(process.cwd(), "src/features/marketing/components/PublicFooter.tsx"), "utf8");
    expect(mark).not.toContain('<rect width="256"');
    expect(logo).toContain("CALQULUS");
    expect(logo).toContain("PROPERTY MANAGEMENT SYSTEM");
    expect(header).toContain("var(--calqulus-navy-900)");
    expect(footer).toContain("var(--calqulus-navy-900)");
    expect(header).toContain("config.brand.logoUrl");
    expect(footer).toContain("config.brand.logoUrl");
  });
});
