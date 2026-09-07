import type { CapacitorConfig } from "@capacitor/cli";

/**
 * CALQULUS native shell.
 *
 * Production native builds intentionally load the bundled `dist` application.
 * This keeps the Android/iOS app an actual installed application instead of a
 * WebView pointed at the public website. Set CAPACITOR_SERVER_URL only for
 * local development when a remote dev server is explicitly required.
 */
const config: CapacitorConfig = {
  appId: "site.calqulus.pms",
  appName: "CALQULUS PMS",
  webDir: "dist",
  server: {
    cleartext: false,
    ...(process.env.CAPACITOR_SERVER_URL
      ? { url: process.env.CAPACITOR_SERVER_URL }
      : {}),
  },
};

export default config;
