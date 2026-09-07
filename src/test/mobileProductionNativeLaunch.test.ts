import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const read = (file: string) => readFileSync(resolve(process.cwd(), file), "utf8");

describe("CALQULUS mobile production and native launch contract", () => {
  it("keeps the canonical PWA manifest separate from the generated service worker", () => {
    const manifest = JSON.parse(read("public/manifest.webmanifest"));
    const index = read("index.html");
    const vite = read("vite.config.ts");

    expect(manifest.display).toBe("standalone");
    expect(manifest.id).toBe("/");
    expect(manifest.scope).toBe("/");
    expect(manifest.display_override).toContain("standalone");
    expect(index).toContain("/manifest.webmanifest?v=20260907");
    expect(vite).toContain("manifest: false");
  });

  it("does not turn the native app into a remote website wrapper", () => {
    const config = read("capacitor.config.ts");
    expect(config).toContain('appId: "site.calqulus.pms"');
    expect(config).toContain('webDir: "dist"');
    expect(config).not.toContain('url: "https://www.calqulus.site"');
    expect(config).toContain("CAPACITOR_SERVER_URL");
  });

  it("ships explicit edge cache controls for the app shell and update assets", () => {
    const vercel = read("vercel.json");
    expect(vercel).toContain("manifest.webmanifest");
    expect(vercel).toContain("sw.js");
    expect(vercel).toContain("no-cache, no-store, must-revalidate");
    expect(vercel).toContain("pwa-512x512.png");
  });

  it("keeps one source icon for native asset generation", () => {
    const icon = read("assets/icon.svg");
    expect(icon).toContain('viewBox="0 0 1024 1024"');
    expect(icon).toContain("CALQULUS app icon");
  });
});
