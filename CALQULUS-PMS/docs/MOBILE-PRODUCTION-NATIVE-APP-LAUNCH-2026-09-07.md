# CALQULUS Mobile Production & Native App Launch — 2026-09-07

## Purpose

Close the gap between the mobile experience in source code and what users actually install from `www.calqulus.site`. The web app remains one shared codebase, while PWA and Capacitor builds use the same app identity and mobile shell.

## Decisions

- `public/manifest.webmanifest` is the single canonical PWA manifest.
- `public/manifest.json` is removed to prevent two competing manifests.
- Production PWA shell, manifest and service worker are explicitly non-cacheable at the edge.
- Versioned icon URLs are retained so installed browser metadata can refresh cleanly.
- Capacitor production builds load the bundled `dist` directory. A remote `CAPACITOR_SERVER_URL` is opt-in for development only.
- Native application ID: `site.calqulus.pms`.
- Native icon source: `assets/icon.svg`; `@capacitor/assets` generates Android/iOS/PWA resources.

## Native commands

```cmd
npm run mobile:doctor
npm run mobile:assets
npm run mobile:init
```

After the first native initialization:

```cmd
npm run mobile:android
npm run mobile:ios
```

Android APK/AAB generation is performed from Android Studio/Gradle. iOS archive/signing is performed from Xcode on macOS.

## Production sequence

1. Pass the production migration reconciliation gate.
2. Build and deploy the current `main` commit.
3. Verify `/manifest.webmanifest`, `/sw.js`, `/pwa-192x192.png` and `/pwa-512x512.png` on the live domain.
4. Remove any previous CALQULUS Home Screen shortcut on a test device.
5. Reinstall from the live site.
6. For native Android/iOS, build from the bundled `dist` app and install the signed package.

## Important

Do not claim the live phone experience is updated merely because the source build passes. Production deployment and installation/update must be verified separately.
