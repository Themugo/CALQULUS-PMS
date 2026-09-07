import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const fail = [];
const read = (p) => readFileSync(resolve(root, p), "utf8");

const cap = read("capacitor.config.ts");
if (!cap.includes('appId: "site.calqulus.pms"')) fail.push("Capacitor appId is not site.calqulus.pms");
if (!cap.includes('webDir: "dist"')) fail.push("Capacitor webDir must be dist");
if (cap.includes('url: "https://www.calqulus.site"')) fail.push("Native production shell must not hard-code the public website URL");

const manifest = JSON.parse(read("public/manifest.webmanifest"));
if (manifest.display !== "standalone") fail.push("PWA display must be standalone");
if (!manifest.display_override?.includes("standalone")) fail.push("PWA display_override must include standalone");
if (manifest.id !== "/" || manifest.scope !== "/") fail.push("PWA identity/scope must remain canonical");
if (!manifest.icons.some((icon) => icon.src.includes("pwa-512x512.png"))) fail.push("512px CALQULUS icon is missing from manifest");
if (!existsSync(resolve(root, "assets/icon.svg"))) fail.push("Capacitor icon source is missing");

const index = read("index.html");
if (!index.includes('/manifest.webmanifest?v=20260907')) fail.push("index.html is not linked to the versioned canonical manifest");
if (!index.includes("/pwa-512x512.png?v=20260907")) fail.push("index.html is not linked to the versioned 512px icon");

const vercel = JSON.parse(read("vercel.json"));
const joinedHeaders = JSON.stringify(vercel.headers);
if (!joinedHeaders.includes("manifest.webmanifest")) fail.push("Vercel manifest cache policy is missing");
if (!joinedHeaders.includes("sw.js")) fail.push("Vercel service-worker cache policy is missing");

if (fail.length) {
  console.error("mobile-release-check: FAIL");
  for (const item of fail) console.error(`- ${item}`);
  process.exit(1);
}

console.log("mobile-release-check: PASS");
console.log("- canonical PWA manifest: public/manifest.webmanifest");
console.log("- standalone phone identity: PASS");
console.log("- native shell defaults to bundled dist: PASS");
console.log("- cache policy protects manifest/service worker: PASS");
console.log("- Capacitor icon source: assets/icon.svg");
