import { test, expect, type Page } from "@playwright/test";

const VIEWPORTS = [
  { width: 1440, height: 900 },
  { width: 1280, height: 800 },
  { width: 1024, height: 768 },
  { width: 768, height: 1024 },
  { width: 480, height: 900 },
  { width: 390, height: 844 },
  { width: 360, height: 800 },
] as const;

async function horizontalOverflow(page: Page) {
  return page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
}

test.describe("Manager finance layout preview", () => {
  test("shows billing and payments chrome without invented collections", async ({ page }) => {
    await page.goto("/design-preview/manager-finance");
    await expect(page.getByRole("heading", { name: "Billing", exact: true })).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole("button", { name: "Create invoice" })).toBeVisible();
    await expect(page.getByText("Billed")).toBeVisible();
    await expect(page.getByText("Live value").first()).toBeVisible();
    await expect(page.getByText(/KES 1.24M/i)).toHaveCount(0);

    await page.getByRole("tab", { name: "Payments" }).click();
    await expect(page.getByRole("heading", { name: "Payments", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Record payment" })).toBeVisible();
    await expect(page.getByText("Invoice / reference")).toBeVisible();
    await expect(page.locator("[data-preview='manager-finance']")).toBeVisible();
  });

  for (const viewport of VIEWPORTS) {
    test(`does not overflow horizontally at ${viewport.width}px`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await page.goto("/design-preview/manager-finance");
      await expect(page.getByRole("heading", { name: "Billing", exact: true })).toBeVisible({ timeout: 15_000 });
      expect(await horizontalOverflow(page), `horizontal overflow at ${viewport.width}px`).toBeLessThanOrEqual(1);

      await page.getByRole("tab", { name: "Payments" }).click();
      await expect(page.getByRole("heading", { name: "Payments", exact: true })).toBeVisible();
      expect(await horizontalOverflow(page), `payments overflow at ${viewport.width}px`).toBeLessThanOrEqual(1);
    });
  }
});
