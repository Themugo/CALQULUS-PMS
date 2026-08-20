import { test, expect } from "@playwright/test";

test.describe("Design preview", () => {
  test("renders the Design Bible gallery on a white desk", async ({ page }) => {
    await page.goto("/design-preview");
    await expect(page.getByRole("heading", { name: "CALQULUS design preview" })).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(/where you are, what matters, what needs attention/i)).toBeVisible();
    await expect(page.getByText(/Colour foundation/)).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Design preview screens" })).toContainText("Brand Studio");
    await expect(page.locator("[data-preview='design']")).toBeVisible();
    await page.getByRole("navigation", { name: "Design preview screens" }).getByRole("button", { name: "Brand Studio" }).click();
    await expect(page.getByText("Brand configuration")).toBeVisible();
    await page.getByRole("navigation", { name: "Design preview screens" }).getByRole("button", { name: "Manager" }).click();
    await expect(page.getByText("Professional Blue")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Manager" })).toBeVisible();
    await expect(page.getByText("Where you are · what needs attention · the next action")).toBeVisible();
    await page.getByRole("navigation", { name: "Design preview screens" }).getByRole("button", { name: "Landlord" }).click();
    await expect(page.getByText("Landlord is a portfolio desk")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Dashboard", exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Portfolio", exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Statements", exact: true })).toBeVisible();
    await expect(page.getByText("No tenant PII")).toBeVisible();
    await page.getByRole("navigation", { name: "Design preview screens" }).getByRole("button", { name: "Maintenance" }).click();
    await expect(page.getByRole("tab", { name: "New" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Assigned" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "In Progress" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Awaiting" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Completed" })).toBeVisible();
    await page.getByRole("navigation", { name: "Design preview screens" }).getByRole("button", { name: "Reports" }).click();
    await expect(page.getByLabel("Period")).toBeVisible();
    await expect(page.getByLabel("Property")).toBeVisible();
    await expect(page.getByLabel("Report type")).toBeVisible();
    await page.getByRole("navigation", { name: "Design preview screens" }).getByRole("button", { name: "Settings" }).click();
    await expect(page.getByRole("navigation", { name: "Settings groups" })).toContainText("Organization");
    await expect(page.getByRole("navigation", { name: "Settings groups" })).toContainText("Users");
    await expect(page.getByRole("navigation", { name: "Settings groups" })).toContainText("Roles");
    await expect(page.getByRole("navigation", { name: "Settings groups" })).toContainText("Notifications");
    await expect(page.getByRole("navigation", { name: "Settings groups" })).toContainText("Billing");
    await expect(page.getByRole("navigation", { name: "Settings groups" })).toContainText("Integrations");
    await expect(page.getByRole("navigation", { name: "Settings groups" })).toContainText("Security");
    await expect(page.getByRole("navigation", { name: "Settings groups" })).toContainText("Branding");
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
