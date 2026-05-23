/// <reference types="vitest" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 5173,
  },
  build: {
    // 'hidden' produces source maps but does NOT reference them from the
    // bundle, so they are uploaded to Sentry but never delivered to the
    // browser. Production stack traces become readable without leaking
    // source to end users.
    sourcemap: "hidden",
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return;
          if (/[\\/]node_modules[\\/](react|react-dom|react-router-dom)[\\/]/.test(id)) return "vendor-react";
          if (id.includes("@radix-ui")) return "vendor-ui";
          if (id.includes("@tanstack/react-query")) return "vendor-query";
          if (id.includes("jspdf")) return "vendor-pdf";
          if (id.includes("recharts")) return "vendor-charts";
        },
      },
    },
  },
  plugins: [
    react(),
    // Log the dev server URL clearly on startup
    {
      name: "url-logger",
      configureServer(server) {
        server.httpServer?.once("listening", () => {
          const addr = server.httpServer?.address();
          const port = typeof addr === "object" && addr ? addr.port : 5173;
          console.warn("\n  " + "=".repeat(50));
          console.warn("  \x1b[1mRentFlow Dev Server\x1b[0m");
          console.warn("  \x1b[36mhttp://localhost:" + port + "\x1b[0m");
          console.warn("  " + "=".repeat(50) + "\n");
        });
      },
    },
    // Serve placeholder manifest in dev mode to avoid 404
    {
      name: "dev-manifest",
      configureServer(server) {
        server.middlewares.use("/manifest.json", (_req, res, next) => {
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ name: "RentFlow (Dev)", short_name: "RentFlow", start_url: "/", display: "standalone" }));
        });
      },
    },
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.ico", "apple-touch-icon.png", "mask-icon.svg"],
      manifest: {
        name: "RentFlow - Property Management",
        short_name: "RentFlow",
        description: "Modern property management solution for landlords and tenants",
        theme_color: "#0f172a",
        background_color: "#0a0a0a",
        display: "standalone",
        orientation: "portrait",
        scope: "/",
        start_url: "/",
        icons: [
          {
            src: "/pwa-192x192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "/pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
          },
          {
            src: "/pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable",
          },
        ],
      },
      workbox: {
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, // 5 MB
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/images\.unsplash\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "image-cache",
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
              },
            },
          },
        ],
      },
    }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  optimizeDeps: {
    include: [
      "react",
      "react-dom",
      "@radix-ui/react-tooltip",
      "@radix-ui/react-dialog",
      "@radix-ui/react-popover",
      "@radix-ui/react-dropdown-menu",
      "@radix-ui/react-select",
      "@radix-ui/react-tabs",
      "@radix-ui/react-accordion",
    ],
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: "./src/test/setup.ts",
    css: true,
    include: ["src/**/*.test.{ts,tsx}"],
    exclude: ["e2e/**", "node_modules/**", "dist/**", "supabase/**"],
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
}));
