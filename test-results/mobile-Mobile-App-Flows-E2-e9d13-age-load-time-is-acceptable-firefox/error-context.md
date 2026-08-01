# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: mobile.spec.ts >> Mobile App Flows E2E Tests >> Mobile Performance >> mobile page load time is acceptable
- Location: e2e\mobile.spec.ts:276:5

# Error details

```
Error: expect(received).toBeLessThan(expected)

Expected: < 5000
Received:   9950
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
  184 |       await page.click("button:has-text('Sign In')");
  185 |       await expect(page).toHaveURL(/\/portal/, { timeout: 15000 });
  186 |       
  187 |       // Navigate to profile
  188 |       await page.click("text=Profile");
  189 |       await expect(page.locator("text=Profile")).toBeVisible({ timeout: 10000 });
  190 |     });
  191 |   });
  192 | 
  193 |   test.describe("Mobile Responsive Design", () => {
  194 |     test("mobile viewport - small phone", async ({ page }) => {
  195 |       await page.setViewportSize({ width: 320, height: 568 });
  196 |       await page.goto("/auth");
  197 |       await expect(page.locator("input[type='email']")).toBeVisible({ timeout: 15000 });
  198 |       await expect(page.locator("input[type='password']")).toBeVisible({ timeout: 15000 });
  199 |     });
  200 | 
  201 |     test("mobile viewport - large phone", async ({ page }) => {
  202 |       await page.setViewportSize({ width: 414, height: 896 });
  203 |       await page.goto("/auth");
  204 |       await expect(page.locator("input[type='email']")).toBeVisible({ timeout: 15000 });
  205 |       await expect(page.locator("input[type='password']")).toBeVisible({ timeout: 15000 });
  206 |     });
  207 | 
  208 |     test("tablet viewport - portrait", async ({ page }) => {
  209 |       await page.setViewportSize({ width: 768, height: 1024 });
  210 |       await page.goto("/auth");
  211 |       await expect(page.locator("input[type='email']")).toBeVisible({ timeout: 15000 });
  212 |       await expect(page.locator("input[type='password']")).toBeVisible({ timeout: 15000 });
  213 |     });
  214 | 
  215 |     test("tablet viewport - landscape", async ({ page }) => {
  216 |       await page.setViewportSize({ width: 1024, height: 768 });
  217 |       await page.goto("/auth");
  218 |       await expect(page.locator("input[type='email']")).toBeVisible({ timeout: 15000 });
  219 |       await expect(page.locator("input[type='password']")).toBeVisible({ timeout: 15000 });
  220 |     });
  221 |   });
  222 | 
  223 |   test.describe("Mobile Touch Interactions", () => {
  224 |     test("mobile navigation menu is accessible", async ({ page }) => {
  225 |       test.skip(!MANAGER_EMAIL || !MANAGER_PASSWORD, "Set E2E_MANAGER_EMAIL and E2E_MANAGER_PASSWORD");
  226 |       await page.setViewportSize({ width: 375, height: 667 });
  227 |       await page.goto("/auth");
  228 |       await page.fill("input[type='email']", MANAGER_EMAIL);
  229 |       await page.fill("input[type='password']", MANAGER_PASSWORD);
  230 |       await page.click("button:has-text('Sign In')");
  231 |       await expect(page).toHaveURL("/", { timeout: 15000 });
  232 |       
  233 |       // Check for mobile menu button
  234 |       const menuButton = page.locator("button[aria-label*='menu']").or(page.locator(".menu-button"));
  235 |       if (await menuButton.isVisible({ timeout: 5000 })) {
  236 |         await menuButton.click();
  237 |         await expect(page.locator("text=Properties").or(page.locator("text=Tenants"))).toBeVisible({ timeout: 10000 });
  238 |       }
  239 |     });
  240 | 
  241 |     test("mobile forms are touch-friendly", async ({ page }) => {
  242 |       await page.setViewportSize({ width: 375, height: 667 });
  243 |       await page.goto("/auth");
  244 |       
  245 |       // Verify input fields are large enough for touch
  246 |       const emailInput = page.locator("input[type='email']");
  247 |       const passwordInput = page.locator("input[type='password']");
  248 |       
  249 |       await expect(emailInput).toBeVisible({ timeout: 15000 });
  250 |       await expect(passwordInput).toBeVisible({ timeout: 15000 });
  251 |       
  252 |       // Verify buttons are large enough for touch
  253 |       const signInButton = page.locator("button:has-text('Sign In')");
  254 |       await expect(signInButton).toBeVisible({ timeout: 15000 });
  255 |     });
  256 | 
  257 |     test("mobile cards are swipeable", async ({ page }) => {
  258 |       test.skip(!MANAGER_EMAIL || !MANAGER_PASSWORD, "Set E2E_MANAGER_EMAIL and E2E_MANAGER_PASSWORD");
  259 |       await page.setViewportSize({ width: 375, height: 667 });
  260 |       await page.goto("/auth");
  261 |       await page.fill("input[type='email']", MANAGER_EMAIL);
  262 |       await page.fill("input[type='password']", MANAGER_PASSWORD);
  263 |       await page.click("button:has-text('Sign In')");
  264 |       await expect(page).toHaveURL("/", { timeout: 15000 });
  265 |       
  266 |       // Navigate to properties
  267 |       await page.click("text=Properties");
  268 |       await expect(page.locator("text=Properties")).toBeVisible({ timeout: 10000 });
  269 |       
  270 |       // Verify property cards are visible
  271 |       await expect(page.locator(".property-card").or(page.locator("[data-testid*='property']"))).toBeVisible({ timeout: 10000 });
  272 |     });
  273 |   });
  274 | 
  275 |   test.describe("Mobile Performance", () => {
  276 |     test("mobile page load time is acceptable", async ({ page }) => {
  277 |       await page.setViewportSize({ width: 375, height: 667 });
  278 |       const startTime = Date.now();
  279 |       await page.goto("/auth");
  280 |       await expect(page.locator("input[type='email']")).toBeVisible({ timeout: 15000 });
  281 |       const loadTime = Date.now() - startTime;
  282 |       
  283 |       // Page should load in less than 5 seconds on mobile
> 284 |       expect(loadTime).toBeLessThan(5000);
      |                        ^ Error: expect(received).toBeLessThan(expected)
  285 |     });
  286 | 
  287 |     test("mobile dashboard load time is acceptable", async ({ page }) => {
  288 |       test.skip(!MANAGER_EMAIL || !MANAGER_PASSWORD, "Set E2E_MANAGER_EMAIL and E2E_MANAGER_PASSWORD");
  289 |       await page.setViewportSize({ width: 375, height: 667 });
  290 |       await page.goto("/auth");
  291 |       await page.fill("input[type='email']", MANAGER_EMAIL);
  292 |       await page.fill("input[type='password']", MANAGER_PASSWORD);
  293 |       await page.click("button:has-text('Sign In')");
  294 |       
  295 |       const startTime = Date.now();
  296 |       await expect(page).toHaveURL("/", { timeout: 15000 });
  297 |       await expect(page.locator("text=Dashboard")).toBeVisible({ timeout: 10000 });
  298 |       const loadTime = Date.now() - startTime;
  299 |       
  300 |       // Dashboard should load in less than 5 seconds on mobile
  301 |       expect(loadTime).toBeLessThan(5000);
  302 |     });
  303 |   });
  304 | 
  305 |   test.describe("Mobile Offline Support", () => {
  306 |     test("mobile app shows offline indicator when offline", async ({ page }) => {
  307 |       await page.setViewportSize({ width: 375, height: 667 });
  308 |       await page.goto("/auth");
  309 |       
  310 |       // Simulate offline mode
  311 |       await page.context().setOffline(true);
  312 |       
  313 |       // Check for offline indicator
  314 |       const offlineIndicator = page.locator("text=Offline").or(page.locator("[data-testid*='offline']"));
  315 |       if (await offlineIndicator.isVisible({ timeout: 3000 })) {
  316 |         await expect(offlineIndicator).toBeVisible();
  317 |       }
  318 |       
  319 |       // Restore online mode
  320 |       await page.context().setOffline(false);
  321 |     });
  322 | 
  323 |     test("mobile app caches data for offline use", async ({ page }) => {
  324 |       test.skip(!MANAGER_EMAIL || !MANAGER_PASSWORD, "Set E2E_MANAGER_EMAIL and E2E_MANAGER_PASSWORD");
  325 |       await page.setViewportSize({ width: 375, height: 667 });
  326 |       await page.goto("/auth");
  327 |       await page.fill("input[type='email']", MANAGER_EMAIL);
  328 |       await page.fill("input[type='password']", MANAGER_PASSWORD);
  329 |       await page.click("button:has-text('Sign In')");
  330 |       await expect(page).toHaveURL("/", { timeout: 15000 });
  331 |       
  332 |       // Navigate to properties to cache data
  333 |       await page.click("text=Properties");
  334 |       await expect(page.locator("text=Properties")).toBeVisible({ timeout: 10000 });
  335 |       
  336 |       // Simulate offline mode
  337 |       await page.context().setOffline(true);
  338 |       
  339 |       // Try to navigate back to dashboard (should use cached data)
  340 |       await page.click("text=Dashboard");
  341 |       await expect(page.locator("text=Dashboard")).toBeVisible({ timeout: 10000 });
  342 |       
  343 |       // Restore online mode
  344 |       await page.context().setOffline(false);
  345 |     });
  346 |   });
  347 | 
  348 |   test.describe("Mobile Push Notifications", () => {
  349 |     test("mobile app requests notification permission", async ({ page, context }) => {
  350 |       await page.setViewportSize({ width: 375, height: 667 });
  351 |       await page.goto("/auth");
  352 |       
  353 |       // Grant notification permission
  354 |       await context.grantPermissions(['notifications']);
  355 |       
  356 |       // Navigate to tenant portal to trigger notification request
  357 |       await page.goto("/tenant/login");
  358 |       await expect(page.locator("text=Tenant")).toBeVisible({ timeout: 15000 });
  359 |     });
  360 | 
  361 |     test("mobile app shows notification settings", async ({ page }) => {
  362 |       test.skip(!TENANT_EMAIL || !TENANT_PASSWORD, "Set E2E_TENANT_EMAIL and E2E_TENANT_PASSWORD");
  363 |       await page.setViewportSize({ width: 375, height: 667 });
  364 |       await page.goto("/tenant/login");
  365 |       await page.fill("input[type='email']", TENANT_EMAIL);
  366 |       await page.fill("input[type='password']", TENANT_PASSWORD);
  367 |       await page.click("button:has-text('Sign In')");
  368 |       await expect(page).toHaveURL(/\/portal/, { timeout: 15000 });
  369 |       
  370 |       // Navigate to settings
  371 |       await page.click("text=Settings");
  372 |       await expect(page.locator("text=Settings")).toBeVisible({ timeout: 10000 });
  373 |       
  374 |       // Check for notification settings
  375 |       const notificationSettings = page.locator("text=Notifications").or(page.locator("[data-testid*='notification']"));
  376 |       if (await notificationSettings.isVisible({ timeout: 3000 })) {
  377 |         await expect(notificationSettings).toBeVisible();
  378 |       }
  379 |     });
  380 |   });
  381 | 
  382 |   test.describe("Mobile Location Services", () => {
  383 |     test("mobile app requests location permission", async ({ page, context }) => {
  384 |       await page.setViewportSize({ width: 375, height: 667 });
```