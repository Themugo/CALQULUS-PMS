/// <reference types="vitest" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { VitePWA } from "vite-plugin-pwa";
import { visualizer } from "rollup-plugin-visualizer";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "0.0.0.0",
    port: 3000,
    allowedHosts: true,
    hmr: process.env.DISABLE_HMR !== 'true',
    watch: process.env.DISABLE_HMR === 'true' ? null : {},
  },
  build: {
    target: "esnext",
    // 'hidden' produces source maps but does NOT reference them from the
    // bundle, so they are uploaded to Sentry but never delivered to the
    // browser. Production stack traces become readable without leaking
    // source to end users.
    sourcemap: "hidden",
    // Enable minification with esbuild (faster than terser)
    minify: "esbuild",
    // Chunk size warning limit
    chunkSizeWarningLimit: 600,
    // CSS code splitting
    cssCodeSplit: true,
    // Disable hoisting of static imports for better caching
    assetsInlineLimit: 4096, // 4KB - inline small assets as base64
    rollupOptions: {
      output: {
        // Consistent chunk naming for better caching
        entryFileNames: "assets/[name]-[hash].js",
        chunkFileNames: "assets/[name]-[hash].js",
        assetFileNames: "assets/[name]-[hash][extname]",
        // Manual chunk splitting for optimal bundle sizes
        manualChunks(id) {
          if (!id.includes("node_modules")) return;
          
          // React core - rarely changes, maximum caching
          if (/[\\/]node_modules[\\/](react|react-dom)[\\/]/.test(id)) {
            return "vendor-react";
          }
          
          // React Router - stable routing chunk
          if (/[\\/]node_modules[\\/](react-router-dom|react-router)[\\/]/.test(id)) {
            return "vendor-router";
          }
          
          // Radix UI - many small components, group together
          if (id.includes("@radix-ui")) {
            return "vendor-ui";
          }
          
          // TanStack Query - state management
          if (id.includes("@tanstack")) {
            return "vendor-query";
          }
          
          // PDF generation - large, lazy load
          if (id.includes("jspdf") || id.includes("jspdf-autotable")) {
            return "vendor-pdf";
          }
          
          // Charts - large, lazy load
          if (id.includes("recharts")) {
            return "vendor-charts";
          }
          
          // Date utilities
          if (id.includes("date-fns")) {
            return "vendor-date";
          }
          
          // Supabase client
          if (id.includes("@supabase")) {
            return "vendor-supabase";
          }
          
          // Radix UI animations and hooks
          if (id.includes("@radix-ui/react-") && !id.includes("@radix-ui/react-dialog")) {
            return "vendor-ui-animations";
          }
          
          // Heavy libraries - PDF, image processing
          if (id.includes("html2canvas") || id.includes("dompurify")) {
            return "vendor-utils";
          }
        },
      },
    },
  },
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.ico", "apple-touch-icon.png", "mask-icon.svg"],
      manifest: {
        name: "CALQULUS PMS — Property Management",
        short_name: "CALQULUS",
        description: "The complete property management platform for East Africa. Manage properties, collect rent, track tenants, and grow your portfolio.",
        theme_color: "#C9A84C",
        background_color: "#0A1628",
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
        // Don't cache external image domains — let them go to network directly.
        // CacheFirst on cross-origin URLs causes "no-response" errors when
        // the SW intercepts before the network has a chance to respond.
        navigateFallback: "/index.html",
        navigateFallbackDenylist: [/^\/api/],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/images\.unsplash\.com\/.*/i,
            handler: "NetworkFirst",
            options: {
              cacheName: "image-cache",
              networkTimeoutSeconds: 5,
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24 * 7, // 7 days
              },
            },
          },
        ],
      },
    }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(process.cwd(), "./src"),
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
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'node_modules/',
        'src/test/',
        '**/*.test.{ts,tsx}',
        '**/*.config.{ts,js}',
        'src/main.tsx',
        'src/vite-env.d.ts',
        'e2e/',
        'dist/',
        'supabase/',
      ],
    },
  },
}));
