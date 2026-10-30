import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { isAdminHost, isLocalHost, adminSiteOrigin, isAdminPath } from "@/features/auth/lib/adminHost";

const routes = readFileSync(resolve(__dirname, "../app/routes.ts"), "utf8");
const publicBlock = routes.slice(routes.indexOf("export const publicRoutes"), routes.indexOf("export const adminDomainRoutes"));

describe("admin site separation", () => {
  it("serves admin only from admin hosts", () => {
    expect(isAdminHost("admin.calqulus.site", "")).toBe(true);
    expect(isAdminHost("localhost", "")).toBe(false);
    expect(isLocalHost("localhost")).toBe(true);
    expect(isAdminHost("www.calqulus.site", "")).toBe(false);
    expect(isAdminHost("calqulus.site", "")).toBe(false);
    expect(isAdminHost("stg.vercel.app", "stg.vercel.app")).toBe(true);
  });
  it("derives the admin origin from the public host", () => {
    expect(adminSiteOrigin({ protocol: "https:", hostname: "www.calqulus.site" }, "")).toBe("https://admin.calqulus.site");
    expect(adminSiteOrigin({ protocol: "https:", hostname: "calqulus.site" }, "https://a.example.com/")).toBe("https://a.example.com");
    expect(adminSiteOrigin({ protocol: "https:", hostname: "10.0.0.1" }, "")).toBeNull();
  });
  it("recognises admin paths", () => {
    expect(isAdminPath("/webhost")).toBe(true);
    expect(isAdminPath("/webhost/login")).toBe(true);
    expect(isAdminPath("/webhostile")).toBe(false);
  });
  it("public route list has no webhost entries; admin routes list does", () => {
    expect(publicBlock).not.toMatch(/webhost/);
    expect(routes.slice(routes.indexOf("export const adminDomainRoutes"))).toMatch(/\/webhost\/login/);
  });
  it("admin invitation links target the admin site", () => {
    const fn = readFileSync(resolve(__dirname, "../../supabase/functions/send-admin-invitation/index.ts"), "utf8");
    expect(fn).toMatch(/ADMIN_SITE_URL/);
    expect(fn).not.toMatch(/\$\{appUrl\}\/webhost/);
  });
});
