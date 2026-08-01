# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: mobile.spec.ts >> Mobile App Flows E2E Tests >> Mobile Authentication >> mobile login page loads correctly
- Location: e2e\mobile.spec.ts:11:5

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('button:has-text(\'Sign In\')')
Expected: visible
Error: strict mode violation: locator('button:has-text(\'Sign In\')') resolved to 2 elements:
    1) <button role="tab" type="button" tabindex="-1" data-state="active" aria-selected="true" data-orientation="horizontal" data-radix-collection-item="" id="radix-_r_0_-trigger-login" aria-controls="radix-_r_0_-content-login" class="inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm focus-visible:outline-none focus-visibl…>Sign In</button> aka getByRole('tab', { name: 'Sign In' })
    2) <button type="submit" class="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 w-full btn-brand h-11">Sign In</button> aka getByRole('button', { name: 'Sign In' })

Call log:
  - Expect "toBeVisible" with timeout 15000ms
  - waiting for locator('button:has-text(\'Sign In\')')

```

# Page snapshot

```yaml
- generic [ref=e2]:
  - region "Notifications (F8)":
    - list
  - region "Notifications alt+T"
  - generic [ref=e7]:
    - generic [ref=e8]:
      - img "CALQULUS RMS" [ref=e11]
      - heading "Welcome to CALQULUS RMS" [level=3] [ref=e12]
      - paragraph [ref=e13]: Smart rental management made simple
    - generic [ref=e14]:
      - generic [ref=e15]:
        - tablist [ref=e16]:
          - tab "Sign In" [selected] [ref=e17]
          - tab "Get Started" [ref=e18]
        - tabpanel "Sign In" [ref=e19]:
          - generic [ref=e20]:
            - generic [ref=e21]:
              - text: Email
              - textbox "Email" [ref=e22]:
                - /placeholder: you@example.com
            - generic [ref=e23]:
              - generic [ref=e24]:
                - generic [ref=e25]: Password
                - button "Forgot password?" [ref=e26]
              - generic [ref=e27]:
                - textbox "Password" [ref=e28]:
                  - /placeholder: ••••••••
                - button [ref=e29]:
                  - img [ref=e30]
            - button "Sign In" [ref=e33]
      - generic [ref=e34]:
        - paragraph [ref=e35]:
          - text: Are you a tenant?
          - link "Register here" [ref=e36] [cursor=pointer]:
            - /url: /tenant/signup
        - paragraph [ref=e37]:
          - text: Are you a landlord?
          - link "Sign in here" [ref=e38] [cursor=pointer]:
            - /url: /landlord
        - paragraph [ref=e39]:
          - text: Platform admin?
          - link "Webhost login" [ref=e40] [cursor=pointer]:
            - /url: /webhost/login
      - generic [ref=e41]:
        - link "Privacy" [ref=e42] [cursor=pointer]:
          - /url: /legal?tab=privacy
        - generic [ref=e43]: ·
        - link "Terms" [ref=e44] [cursor=pointer]:
          - /url: /legal?tab=terms
        - generic [ref=e45]: ·
        - generic [ref=e46]:
          - img [ref=e47]
          - text: CALQULUS RMS
```

# Test source

```ts
  1   | import { test, expect } from "@playwright/test";
  2   | 
  3   | const MANAGER_EMAIL = process.env.E2E_MANAGER_EMAIL || "";
  4   | const MANAGER_PASSWORD = process.env.E2E_MANAGER_PASSWORD || "";
  5   | const TENANT_EMAIL = process.env.E2E_TENANT_EMAIL || "";
  6   | const TENANT_PASSWORD = process.env.E2E_TENANT_PASSWORD || "";
  7   | 
  8   | test.describe("Mobile App Flows E2E Tests", () => {
  9   | 
  10  |   test.describe("Mobile Authentication", () => {
  11  |     test("mobile login page loads correctly", async ({ page }) => {
  12  |       await page.setViewportSize({ width: 375, height: 667 });
  13  |       await page.goto("/auth");
  14  |       await expect(page.locator("input[type='email']")).toBeVisible({ timeout: 15000 });
  15  |       await expect(page.locator("input[type='password']")).toBeVisible({ timeout: 15000 });
> 16  |       await expect(page.locator("button:has-text('Sign In')")).toBeVisible({ timeout: 15000 });
      |                                                                ^ Error: expect(locator).toBeVisible() failed
  17  |     });
  18  | 
  19  |     test("mobile tenant login page loads correctly", async ({ page }) => {
  20  |       await page.setViewportSize({ width: 375, height: 667 });
  21  |       await page.goto("/tenant/login");
  22  |       await expect(page.locator("text=Tenant")).toBeVisible({ timeout: 15000 });
  23  |       await expect(page.locator("input[type='email']")).toBeVisible({ timeout: 15000 });
  24  |       await expect(page.locator("input[type='password']")).toBeVisible({ timeout: 15000 });
  25  |     });
  26  | 
  27  |     test("mobile manager can sign in", async ({ page }) => {
  28  |       test.skip(!MANAGER_EMAIL || !MANAGER_PASSWORD, "Set E2E_MANAGER_EMAIL and E2E_MANAGER_PASSWORD");
  29  |       await page.setViewportSize({ width: 375, height: 667 });
  30  |       await page.goto("/auth");
  31  |       await page.fill("input[type='email']", MANAGER_EMAIL);
  32  |       await page.fill("input[type='password']", MANAGER_PASSWORD);
  33  |       await page.click("button:has-text('Sign In')");
  34  |       await expect(page).toHaveURL("/", { timeout: 15000 });
  35  |       await expect(page.locator("text=Dashboard")).toBeVisible({ timeout: 10000 });
  36  |     });
  37  | 
  38  |     test("mobile tenant can sign in", async ({ page }) => {
  39  |       test.skip(!TENANT_EMAIL || !TENANT_PASSWORD, "Set E2E_TENANT_EMAIL and E2E_TENANT_PASSWORD");
  40  |       await page.setViewportSize({ width: 375, height: 667 });
  41  |       await page.goto("/tenant/login");
  42  |       await page.fill("input[type='email']", TENANT_EMAIL);
  43  |       await page.fill("input[type='password']", TENANT_PASSWORD);
  44  |       await page.click("button:has-text('Sign In')");
  45  |       await expect(page).toHaveURL(/\/portal/, { timeout: 15000 });
  46  |       await expect(page.locator("text=Dashboard").or(page.locator("text=Home"))).toBeVisible({ timeout: 10000 });
  47  |     });
  48  |   });
  49  | 
  50  |   test.describe("Mobile Manager Flows", () => {
  51  |     test("mobile manager dashboard renders correctly", async ({ page }) => {
  52  |       test.skip(!MANAGER_EMAIL || !MANAGER_PASSWORD, "Set E2E_MANAGER_EMAIL and E2E_MANAGER_PASSWORD");
  53  |       await page.setViewportSize({ width: 375, height: 667 });
  54  |       await page.goto("/auth");
  55  |       await page.fill("input[type='email']", MANAGER_EMAIL);
  56  |       await page.fill("input[type='password']", MANAGER_PASSWORD);
  57  |       await page.click("button:has-text('Sign In')");
  58  |       await expect(page).toHaveURL("/", { timeout: 15000 });
  59  |       
  60  |       // Verify dashboard elements are visible on mobile
  61  |       await expect(page.locator("text=Dashboard")).toBeVisible({ timeout: 10000 });
  62  |       await expect(page.locator("text=Properties").or(page.locator("text=Tenants"))).toBeVisible({ timeout: 10000 });
  63  |     });
  64  | 
  65  |     test("mobile manager can navigate to properties", async ({ page }) => {
  66  |       test.skip(!MANAGER_EMAIL || !MANAGER_PASSWORD, "Set E2E_MANAGER_EMAIL and E2E_MANAGER_PASSWORD");
  67  |       await page.setViewportSize({ width: 375, height: 667 });
  68  |       await page.goto("/auth");
  69  |       await page.fill("input[type='email']", MANAGER_EMAIL);
  70  |       await page.fill("input[type='password']", MANAGER_PASSWORD);
  71  |       await page.click("button:has-text('Sign In')");
  72  |       await expect(page).toHaveURL("/", { timeout: 15000 });
  73  |       
  74  |       // Navigate to properties
  75  |       await page.click("text=Properties");
  76  |       await expect(page.locator("text=Properties")).toBeVisible({ timeout: 10000 });
  77  |     });
  78  | 
  79  |     test("mobile manager can navigate to tenants", async ({ page }) => {
  80  |       test.skip(!MANAGER_EMAIL || !MANAGER_PASSWORD, "Set E2E_MANAGER_EMAIL and E2E_MANAGER_PASSWORD");
  81  |       await page.setViewportSize({ width: 375, height: 667 });
  82  |       await page.goto("/auth");
  83  |       await page.fill("input[type='email']", MANAGER_EMAIL);
  84  |       await page.fill("input[type='password']", MANAGER_PASSWORD);
  85  |       await page.click("button:has-text('Sign In')");
  86  |       await expect(page).toHaveURL("/", { timeout: 15000 });
  87  |       
  88  |       // Navigate to tenants
  89  |       await page.click("text=Tenants");
  90  |       await expect(page.locator("text=Tenants")).toBeVisible({ timeout: 10000 });
  91  |     });
  92  | 
  93  |     test("mobile manager can view maintenance requests", async ({ page }) => {
  94  |       test.skip(!MANAGER_EMAIL || !MANAGER_PASSWORD, "Set E2E_MANAGER_EMAIL and E2E_MANAGER_PASSWORD");
  95  |       await page.setViewportSize({ width: 375, height: 667 });
  96  |       await page.goto("/auth");
  97  |       await page.fill("input[type='email']", MANAGER_EMAIL);
  98  |       await page.fill("input[type='password']", MANAGER_PASSWORD);
  99  |       await page.click("button:has-text('Sign In')");
  100 |       await expect(page).toHaveURL("/", { timeout: 15000 });
  101 |       
  102 |       // Navigate to maintenance
  103 |       await page.click("text=Maintenance");
  104 |       await expect(page.locator("text=Maintenance")).toBeVisible({ timeout: 10000 });
  105 |     });
  106 | 
  107 |     test("mobile manager can view financial reports", async ({ page }) => {
  108 |       test.skip(!MANAGER_EMAIL || !MANAGER_PASSWORD, "Set E2E_MANAGER_EMAIL and E2E_MANAGER_PASSWORD");
  109 |       await page.setViewportSize({ width: 375, height: 667 });
  110 |       await page.goto("/auth");
  111 |       await page.fill("input[type='email']", MANAGER_EMAIL);
  112 |       await page.fill("input[type='password']", MANAGER_PASSWORD);
  113 |       await page.click("button:has-text('Sign In')");
  114 |       await expect(page).toHaveURL("/", { timeout: 15000 });
  115 |       
  116 |       // Navigate to reports
```