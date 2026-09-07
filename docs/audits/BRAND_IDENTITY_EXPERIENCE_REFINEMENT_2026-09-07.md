# CALQULUS Brand Identity & Experience Refinement — 2026-09-07

## Objective
Converge the live product onto one CALQULUS visual language without changing established page layouts or portal information architecture.

## Canonical identity
- Deep Navy: `#0A2540` — primary brand chrome.
- CALQULUS Blue: `#0074E6` — interactive actions and focus.
- Cyan: `#06B6D4` — tenant/platform role identity.
- Emerald: `#10B981` — landlord role identity and semantic success.
- Lime: `#84CC16` — restrained logo highlight.
- Mist: `#F1F5F9` — application background.
- White: `#FFFFFF` — application surfaces.
- Outfit — retained product typeface.

## Refinements completed
1. Replaced live tenant mobile payment controls that still used generic `teal` utilities with the tenant portal accent token.
2. Replaced legacy purple PDF receipt branding with CALQULUS Blue.
3. Replaced gold report branding with CALQULUS Navy while retaining emerald/red as semantic status colors.
4. Replaced Admin/Enterprise UI legacy purple/teal utility classes with canonical CALQULUS role tokens.
5. Removed live CSS dependence on the misleading `violet`, `teal-deep`, and `indigo` role-token names; tenant/platform now use explicit `tenant` and `platform` tokens.
6. Updated WebHost/design-preview identity terminology from indigo/teal to navy/cyan.
7. Added regression coverage for canonical palette convergence and legacy utility leakage.

## Design rule
Portal identity is a secondary role signal. The CALQULUS brand remains the primary visual system: navy chrome, blue interaction, light desks, and semantic status colors. White-label branding remains an explicit runtime override rather than a second hardcoded palette.

## Verification
Static source audit passed for the refined surfaces. The package is intended for the user's local Vitest/typecheck/build gate before commit and push.
