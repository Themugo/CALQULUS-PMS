import { test, expect } from "@playwright/test";

test.describe("RentFlow E2E Tests", () => {

  test.describe("Public pages", () => {
    test("landing page redirects to landlord auth", async ({ page }) => {
      await page.goto("/");
      await expect(page).toHaveURL(/\/landlord/);
    });

    test("auth page loads login form", async ({ page }) => {
      await page.goto("/auth");
      await expect(page.locator("text=Sign In")).toBeVisible();
      await expect(page.locator("input[type='email']")).toBeVisible();
      await expect(page.locator("input[type='password']")).toBeVisible();
    });

    test("tenant login page loads", async ({ page }) => {
      await page.goto("/tenant/login");
      await expect(page.locator("text=Tenant")).toBeVisible();
    });

    test("reset password page loads", async ({ page }) => {
      await page.goto("/reset-password");
      await expect(page.locator("text=Reset Password")).toBeVisible();
    });
  });

  test.describe("Navigation", () => {
    test("landlord login page loads", async ({ page }) => {
      await page.goto("/landlord/login");
      await expect(page).toHaveURL(/\/landlord/);
    });

    test("demo page loads", async ({ page }) => {
      await page.goto("/demo");
      await expect(page.locator("text=Demo")).toBeVisible();
    });
  });

  test.describe("Auth flows", () => {
    test("login with invalid credentials shows error", async ({ page }) => {
      await page.goto("/auth");
      await page.fill("input[type='email']", "invalid@example.com");
      await page.fill("input[type='password']", "wrongpassword");
      await page.click("button:has-text('Sign In')");
      await expect(page.locator("text=Invalid login credentials")).toBeVisible({ timeout: 10000 });
    });

    test("password visibility toggle works", async ({ page }) => {
      await page.goto("/auth");
      const passwordInput = page.locator("input[type='password']").first();
      await passwordInput.fill("testpassword");
      const toggleButton = page.locator("button").filter({ has: page.locator("svg") }).first();
      await toggleButton.click();
      await expect(page.locator("input[type='text']").first()).toBeVisible();
    });
  });

  test.describe("Responsive design", () => {
    test("mobile viewport renders correctly", async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto("/auth");
      await expect(page.locator("input[type='email']")).toBeVisible();
    });

    test("tablet viewport renders correctly", async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });
      await page.goto("/auth");
      await expect(page.locator("input[type='email']")).toBeVisible();
    });
  });

  test.describe("404 handling", () => {
    test("unknown route shows not found", async ({ page }) => {
      await page.goto("/this-page-does-not-exist");
      await expect(page).toHaveURL(/\/landlord/);
    });
  });
});
