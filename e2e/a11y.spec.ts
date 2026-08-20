import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test.describe("Accessibility", () => {
  test("design preview has no critical axe violations", async ({ page }) => {
    await page.goto("/design-preview");
    await expect(page.getByRole("heading", { name: "CALQULUS design preview" })).toBeVisible({ timeout: 15000 });
    const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
    const critical = results.violations.filter((v) => v.impact === "critical");
    expect(critical, JSON.stringify(critical, null, 2)).toEqual([]);
  });

  test("homepage has no critical axe violations", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("#main-content h1")).toBeVisible({ timeout: 15000 });
    const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
    const critical = results.violations.filter((v) => v.impact === "critical");
    expect(critical, JSON.stringify(critical, null, 2)).toEqual([]);
  });

  test("manager login has no critical axe violations", async ({ page }) => {
    await page.goto("/auth");
    await expect(page.getByRole("heading", { name: /^sign in$/i })).toBeVisible({ timeout: 15000 });
    const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
    const critical = results.violations.filter((v) => v.impact === "critical");
    expect(critical, JSON.stringify(critical, null, 2)).toEqual([]);
  });
});
