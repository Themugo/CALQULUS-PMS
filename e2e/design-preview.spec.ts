import { test, expect } from "@playwright/test";

test.describe("Design preview", () => {
  test("renders the Design Bible gallery on a white desk", async ({ page }) => {
    await page.goto("/design-preview");
    await expect(page.getByRole("heading", { name: "CALQULUS design preview" })).toBeVisible({ timeout: 15000 });
    await expect(page.getByRole("navigation", { name: "Design preview screens" })).toContainText("Brand Studio");
    await expect(page.locator("[data-preview='design']")).toBeVisible();
    await page.getByRole("navigation", { name: "Design preview screens" }).getByRole("button", { name: "Brand Studio" }).click();
    await expect(page.getByText("Brand configuration")).toBeVisible();
    await page.getByRole("navigation", { name: "Design preview screens" }).getByRole("button", { name: "Manager" }).click();
    await expect(page.getByText("Navy / Professional Blue")).toBeVisible();
  });

  test("does not overflow horizontally at 390px", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/design-preview");
    await expect(page.getByRole("heading", { name: "CALQULUS design preview" })).toBeVisible({ timeout: 15000 });
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1);
  });
});
