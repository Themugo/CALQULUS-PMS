import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const failures = [];
const read = (file) => readFileSync(resolve(root, file), "utf8");
const expect = (condition, message) => { if (!condition) failures.push(message); };

const tokens = read("src/shared/theme/tokens.ts");
const css = read("src/index.css");
const brandMark = read("src/shared/components/branding/BrandMark.tsx");
const header = read("src/features/marketing/components/PublicHeader.tsx");
const footer = read("src/features/marketing/components/PublicFooter.tsx");
const publicConfig = read("src/features/marketing/publicSiteConfig.ts");
const logo = read("public/calqulus-logo.svg");
const darkLogo = read("public/calqulus-logo-dark.svg");

for (const [name, hex] of Object.entries({
  "Deep Navy": "#0A2540",
  "CALQULUS Blue": "#0074E6",
  "Brand Blue": "#0284FF",
  "Cyan": "#06B6D4",
  "Emerald": "#10B981",
  "Lime": "#84CC16",
  "Surface": "#FFFFFF",
  "Application background": "#F1F5F9",
  "Border": "#E2E8F0",
})) {
  expect(tokens.includes(hex) || css.includes(hex) || logo.includes(hex) || darkLogo.includes(hex), `${name} ${hex} is missing from the canonical source tokens`);
}

expect(tokens.includes('primary: "#0074E6"'), "Interactive primary must remain the accessible CALQULUS blue");
expect(tokens.includes('accent: "#06B6D4"'), "Brand accent must remain cyan");
expect(tokens.includes('navyPrimary: "#0A2540"'), "Deep navy must remain the chrome identity");
expect(brandMark.includes("/calqulus-logo.svg"), "BrandMark must reference the approved horizontal CALQULUS lockup");
expect(brandMark.includes("/calqulus-logo-dark.svg"), "BrandMark must reference the approved dark-background lockup");
expect(header.includes("lockup") && footer.includes("lockup"), "Public header/footer must render the approved lockup");
expect(publicConfig.includes('tagline: "Properties work better with people."'), "Public footer default tagline must match the identity");
expect(existsSync(resolve(root, "public/calqulus-logo.svg")), "Approved CALQULUS light logo is missing");
expect(existsSync(resolve(root, "public/calqulus-logo-dark.svg")), "Approved CALQULUS dark logo is missing");

const legacyHexes = ["#123FB7", "#356FE5", "#7C5FD3", "#2F9B74", "#2C9183", "#4658C9", "#173650", "#0D2744", "#0B2B7A"];
for (const file of ["src/index.css", "src/shared/theme/tokens.ts", "src/shared/components/branding/BrandMark.tsx", "src/features/marketing/components/PublicHeader.tsx", "src/features/marketing/components/PublicFooter.tsx"]) {
  const source = read(file);
  for (const hex of legacyHexes) expect(!source.includes(hex), `${file} still contains retired brand color ${hex}`);
}

if (failures.length) {
  console.error("brand-identity-check: FAIL");
  failures.forEach((item) => console.error(`- ${item}`));
  process.exit(1);
}

console.log("brand-identity-check: PASS");
console.log("- canonical CALQULUS logo lockups: PASS");
console.log("- public header/footer lockup integration: PASS");
console.log("- palette and legacy-color gate: PASS");
console.log("- configurable public branding contract: PASS");
