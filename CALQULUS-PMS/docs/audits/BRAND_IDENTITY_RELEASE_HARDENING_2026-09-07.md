# CALQULUS Brand Identity Release Hardening — 2026-09-07

## Scope
Preserve the existing CALQULUS page layouts and workflows while making the new visual identity internally consistent across public chrome, portal entry chrome, application tokens, and configurable branding surfaces.

## Corrections from Windows verification
- Canonical interactive focus token now equals CALQULUS primary blue (`#0074E6`).
- Manager and Agency portal fallback accents now resolve from the shared portal token source instead of a duplicate hard-coded blue.
- Manager login accent now uses the canonical CALQULUS blue.
- Receipt default primary color now uses the canonical CALQULUS blue.
- Public landing portal colors now resolve from the shared portal token source.
- Public portal-access colors now resolve from shared portal identity tokens.
- Public header/footer retain their existing layout while using CALQULUS navy chrome.
- Existing administrator-controlled public brand name, descriptor, logo, navigation, footer, imagery, sections and marketing content remain configuration-driven.
- Updated regression tests to reflect the current intentional master-control navigation and identity architecture rather than the superseded WebHost/Admin split.
- Tenant auth regression now supplies the QueryClient required by the public-site branding hook.

## Verification
Static source/configuration checks pass in the package. The supplied Windows run identified 18 failures; all were classified as either stale assertions against the superseded identity architecture or the concrete token/provider regressions corrected in this release.

Full Vitest/typecheck/build must be rerun from the Windows project after replacing this package. Production deployment remains subject to the existing migration reconciliation gate.
