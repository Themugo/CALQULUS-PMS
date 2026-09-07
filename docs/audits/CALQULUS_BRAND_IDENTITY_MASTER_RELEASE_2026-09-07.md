# CALQULUS Brand Identity — Master Release 2026-09-07

## Source of truth

The supplied CALQULUS identity board is the visual source of truth for this release. The existing product layouts, navigation architecture, workflows, data fetching and portal boundaries are preserved.

## Identity

- Deep Navy: `#0A2540` — global chrome, header, sidebar, footer and premium dark surfaces.
- CALQULUS Blue: `#0284FF` — brand-board blue used for logo gradients and atmosphere.
- Accessible interactive blue: `#0074E6` — buttons, links, focus and selected controls where white-on-blue contrast is required.
- Cyan: `#06B6D4` — brand energy and tenant/platform role accent.
- Emerald: `#10B981` — growth and landlord role accent.
- Lime: `#84CC16` — restrained logo/roof highlight.
- Surface: `#FFFFFF`.
- Application background: `#F1F5F9`.
- Border: `#E2E8F0`.
- Primary text: `#0F2942`.
- Secondary text: `#64748B`.

## Logo system

The approved horizontal CALQULUS lockup is available in light and dark-background variants:

- `public/calqulus-logo.svg`
- `public/calqulus-logo-dark.svg`
- `src/assets/branding/calqulus-property-mark.svg`
- `assets/icon.svg`

`BrandMark` now supports the approved lockup while preserving organization/public-site logo overrides. A custom administrator-provided logo continues to render with the configured wordmark instead of being replaced by the platform default.

## Global convergence

The lockup is wired into the public header, public footer, portal authentication chrome, shared application sidebar and shared application footer. Existing portal desk layouts remain unchanged.

Portal accents converge to one CALQULUS identity:

- Manager: CALQULUS Blue
- Agency: CALQULUS Blue
- Landlord: Emerald
- Tenant: Cyan
- Platform/WebHost: Cyan with Deep Navy administration chrome

## Public branding configurability

Admin-managed public brand name, descriptor, logo, navigation, footer, imagery, sections and marketing content remain configuration-driven. The platform default now carries the approved CALQULUS identity and the footer default tagline is `Properties work better with people.`

## Mobile/PWA/native identity

The canonical PWA manifest remains `public/manifest.webmanifest`, with the Deep Navy theme and CALQULUS app icons. Capacitor production continues to bundle `dist`; remote server loading remains an explicit development override.

## Regression protection

Added/updated:

- `scripts/brand-identity-check.mjs`
- `src/test/calqulusBrandIdentity.test.ts`
- `src/test/calqulusIdentityRefinement.test.ts`
- `src/test/designTokens.test.ts`
- `src/test/publicSiteConfiguration.test.tsx`
- `src/test/tenantAuthShell.test.tsx`

CI now runs `npm run brand:doctor` alongside the existing mobile release contract.

## Verification performed in this package

- Brand identity doctor: **PASS**
- Mobile release contract: **PASS**
- SVG XML integrity: **PASS**
- Manifest/Vercel JSON integrity: **PASS**
- Retired live brand-color scan: **PASS**

The container does not contain a complete executable `node_modules` installation, so a full Vitest/typecheck/build run must still be performed from the user's Windows checkout before committing. The current Windows baseline previously confirmed `typecheck` and `build` clean after commit `0936a9c`.

Production deployment remains subject to the existing migration reconciliation gate.
