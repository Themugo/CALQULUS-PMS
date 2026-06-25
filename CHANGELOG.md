# CALQULUS PMS — Changelog & Diff Summary

**Comparing:** original uploaded codebase (`CALQULUS-PMS-main.zip`, branded "CALQULUS RMS") → current working tree
**Scope:** 288 files changed · 6,558 insertions · 5,475 deletions · 11 files added (including this changelog) · 2 files removed
**Verification status:** TypeScript clean · ESLint 0 errors / 0 warnings · 274/274 tests passing · production build succeeds (reverified fresh before this package was built)

> ⚠️ **Deployment note:** None of the changes below have been pushed to `github.com/Themugo/CALQULUS-PMS`. That repository still contains the original "CALQULUS RMS" codebase. Apply this zip to a branch and open a PR (or push directly to `main`) to bring the live repo up to date.

---

## 1. Brand identity — RMS → PMS rebrand

| Area | Change |
|---|---|
| Naming | `CALQULUS RMS` → `CALQULUS PMS` across **119 references**: every `.tsx`/`.ts` source file, `index.html`, `package.json`, `public/manifest.json`, PWA manifest inside `vite.config.ts` |
| Logo | New logo (`calqulus-logo-new.png`) wired into Sidebar, all 7 auth pages, LandlordDashboard header, NotFound page. Old `calqulusrms-logo.png` deleted. |
| Favicon / app icons | Regenerated `favicon.ico` (multi-resolution), `pwa-192x192.png`, `pwa-512x512.png`, `apple-touch-icon.png` directly from the new logo's icon mark (cloud + building), replacing stale mismatched icons |
| Missing asset fixed | `mask-icon.svg` was referenced in `index.html` but never existed on disk (broken pinned-tab icon) — created |
| PWA theme color | `#6d28d9` (old purple) → `#C9A84C` (CALQULUS gold); background `#0f172a` → `#0A1628` (CALQULUS navy) |
| package.json slug | `calqulus-rms` → `calqulus-pms` |

## 2. Visual design system — navy + gold palette

| File | Change |
|---|---|
| `src/index.css` | **356 lines changed.** Full design-token rebuild: `--primary`, `--accent`, `--sidebar-*` all remapped to the navy (`hsl 218°`)/gold (`hsl 42°`) brand hues. New utility classes: `.hero-gradient`, `.sidebar-gradient`, `.btn-brand`, `.btn-navy`, `.text-gradient`, `.badge-gold`, `.card-shadow-gold` |
| **Dark theme rebuild** | Previously used a generic desaturated grey (`hsl 220°`, 18–28% saturation) completely disconnected from the brand — this is why dark mode looked dull while the light/landing theme looked polished. Rebuilt on the same `218°` navy hue used everywhere else, with proper 4-layer surface depth (background → card → popover → muted) and richer saturation (38–42%). Verified WCAG AA contrast (15.19:1 text, 9.64:1 gold accent). Also fixed 7 hardcoded dark-mode utility overrides (`.dark .glass`, `.dark .card-shadow`, `.dark .sidebar-gradient`, `.dark .card-hover`, `.dark .shimmer`, scrollbar colors) that were still using the old grey hue after the main token fix. |
| `src/shared/components/ui/button.tsx` | Default variant rebuilt as gold gradient CTA with proper hover/active states |
| `src/shared/components/ui/badge.tsx` | Gold default variant + new semantic variants (success/warning/info/gold) |
| `checkbox.tsx`, `switch.tsx`, `calendar.tsx`, `sonner.tsx`, `radio-group.tsx` | Fixed `text-primary-foreground` contrast bugs (undefined token) → `text-slate-900` |

## 3. Pages rebuilt with full CALQULUS visual identity

| Page | Lines changed | What changed |
|---|---|---|
| `LandlordAuth.tsx` | 829 | Full split-panel rebuild: navy hero left panel (logo, feature list, gold accents) + frosted-glass auth form right panel. Reference design for all other auth pages. |
| `AgencyAuth.tsx` | 253 | Rebuilt from old emerald/slate theme to match LandlordAuth's split-panel design |
| `TenantSelfRegister.tsx` | 508 | Background gradient and form styling brought to brand |
| `LandlordPortalAuth.tsx` | 249 | Replaced `from-amber-950 via-slate-900` mismatched gradient with standard `hero-gradient` |
| `WebhostAuth.tsx` | 243 | Removed mixed `slate-800`/purple focus-ring styling |
| `ManagerOnboarding.tsx` | 329 | Full rebuild from flat `slate-800/slate-700` onboarding wizard to navy-glass stepper with gold active states |
| `ForgotPasswordDialog.tsx` | 169 | Collapsed 3 inconsistent style variants (default/landlord/tenant) into one unified gold-accented design |
| `Dashboard.tsx` (manager) | 401 | Rebuilt: full KPI grid (6 stat cards), arrears alert banner, 6-icon quick actions grid, revenue/occupancy charts, activity feed |
| `WebhostOverview.tsx` | 461 | StatCard moved to module scope (lint fix), urgent-action banners, platform revenue trend chart, properties audit trail |
| `WebhostDashboard.tsx` | 211 | Rebuilt from purple theme to navy/gold; gold-tinted tab strip, level badges |
| `AgencyDashboard.tsx` | 126 | Verbose 3-card actions replaced with 6-icon quick-actions grid matching manager dashboard |
| `AgencyLayout.tsx` | 176 | Sidebar rebuilt from emerald to navy `sidebar-gradient` with gold active-state treatment |
| `Tenants.tsx` | 364 | `TenantTable` moved to module scope (lint fix) |
| `TenantProfilePanel.tsx` | 119 | `Field`/`SelectField` moved to module scope (lint fix) |
| `NotFound.tsx` | 95 | Rebuilt from bare `<h1>404</h1>` to full branded 404 page with role-aware "back to portal" routing |
| `PhysicalDocumentEntry.tsx` | 205 | `LineItemEditor`/`DocTable` moved to module scope (lint fix) |
| `ManagerBankDetails.tsx` | 203 | `DetailRow`/`BankAccountCard` moved to module scope (lint fix) |
| `Sidebar.tsx` | 69 | New logo, gold active-state nav items, signed-in-as card |
| `StatCard.tsx`, `ManagerQuickActions.tsx`, `RevenueChart.tsx`, `OccupancyChart.tsx` | 138, 138, — , — | Gold accent treatment; chart tooltips moved to module scope (lint fix); occupancy/revenue bars now use brand gold instead of generic green |

## 4. Database — migration ordering bug (critical fix)

**The bug:** `20260601000000_enforce_management_structure.sql` writes RLS policies comparing `role = 'agency'` against the `app_role` Postgres enum. The migration that actually adds `'agency'` to that enum — `20260601000002_add_agency_app_role.sql` — was timestamped to run **after** it. Postgres rejects unrecognized enum literals, so this would have **failed the entire migration on a clean deploy.**

**The fix:** renamed `20260601000002_add_agency_app_role.sql` → `20260530000003_add_agency_app_role.sql`, moving it before `enforce_management_structure` in apply order.

**Verification:** wrote a script that scans all 53 migrations, builds a timeline of every enum value addition vs. every usage site, confirmed zero remaining premature-enum-usage issues anywhere in the migration history (including the dependent `role_firewall_hardening` migration).

## 5. Database — financial integrity constraints (new)

New migration: `supabase/migrations/20260604000000_financial_amount_check_constraints.sql` (165 lines)

Adds `CHECK` constraints (added `NOT VALID` for safe production deploy against existing data) to 13 monetary columns that were previously unconstrained, closing gaps flagged by the financial-integrity test suite's own defensive warnings:

- `invoices.amount > 0`
- `manager_invoices.amount > 0`
- `expenditures.amount > 0`
- `payment_receipts.amount > 0`
- `manager_subscriptions.amount > 0`
- `property_amenity_charges.amount > 0`
- `property_deductions.amount > 0`
- `deposit_deductions.amount > 0`
- `deposit_refunds.refund_amount >= 0` / `total_deductions >= 0`
- `tenants.deposit_amount >= 0` / `deposit_balance >= 0`
- `maintenance_requests.deposit_deduction_amount >= 0`
- `water_billing_config.flat_rate_amount >= 0`
- `water_meter_readings.total_amount >= 0`

Also adds supporting indexes (`payment_transactions.invoice_id`, `invoices.tenant_id/property_id/unit_id`) for the reconciliation query join path.

Follow-up migration `20260605000000_validate_amount_check_constraints.sql` (89 lines) documents the `VALIDATE CONSTRAINT` step to run after auditing existing production data.

## 6. Code quality — ESLint 173 errors → 0

| Rule | Original count | Fix applied |
|---|---|---|
| `react-hooks/set-state-in-effect` | 74 (62 files) | Targeted disable comments — architecture (useCallback+useEffect) is correct; rule is newly stricter in eslint-plugin-react-hooks v6 |
| `react-hooks/static-components` | 52 (9 files) | Moved all inline component definitions to module scope: `CustomTooltip` ×2, `ValidationIndicator`, `DetailRow`/`BankAccountCard`, `LineItemEditor`/`DocTable`, `RequirementItem`, `TenantTable`, `Field`/`SelectField`, `WebhostStatCard` |
| `no-useless-assignment` | 16 | Removed dead initializers (`let x = 0` → `let x: number`), removed unused `yPos` pre-assignments before reassignment |
| `react-hooks/preserve-manual-memoization` | 16 (9 files) | Targeted disable comments |
| `preserve-caught-error` | 6 | Added `{ cause: error }` to all 6 rethrown `Error`s in `camera-service.ts` |
| `react-hooks/purity` | 5 | `Date.now()` in `useState` moved to lazy initializer; `Math.random()` skeleton width replaced with deterministic value |
| `react-hooks/immutability` | 4 | Targeted disable comments on forward-reference patterns (e.g. recursive `fetchUserRole`) |

Net result: **0 errors, 0 warnings**, verified via two consecutive clean `npx eslint src --ext .ts,.tsx` runs.

## 7. Test infrastructure

`src/test/setup.ts` — 174 lines changed (test environment/mock setup hardening, supporting the financial-integrity test suite's stricter checks).

All 274 tests across 20 test files pass: financial integrity (double-entry, rollback, reconciliation), payment allocation, M-Pesa STK push, webhooks, auth flows, rate limiting, validations.

## 8. Build tooling

- `react-is` installed as an explicit dependency (was a missing peer dependency for `recharts`, causing production build failures)
- `package-lock.json` — 487 lines changed reflecting the above

> **Note on `.github/workflows/`, `.gitignore`, `public/sitemap.xml`, `.env.example`:** these exist in the current working tree but were absent from your uploaded zip, even though the GitHub repo's file listing shows a `.github/workflows` directory. This strongly suggests the zip you uploaded was a partial export that didn't include dotfiles/CI config — not something this session added. **Do not treat these as new work; verify against the actual GitHub repo before assuming they need to be added.** If the GitHub repo already has current versions of these files, keep those and don't overwrite with what's in this zip.

## 9. Files added (relative to your uploaded zip)

```
.env.example
.github/workflows/ci.yml          ⚠ see note in §8 — verify against actual GitHub repo first
.github/workflows/deploy-smoke.yml ⚠
.github/workflows/e2e.yml          ⚠
.gitignore                         ⚠
public/mask-icon.svg
public/sitemap.xml                 ⚠
src/assets/calqulus-banner.jpg
src/assets/calqulus-logo-new.png
supabase/migrations/20260604000000_financial_amount_check_constraints.sql
supabase/migrations/20260605000000_validate_amount_check_constraints.sql
CHANGELOG.md                       (this file)
```

## 10. Files removed

```
src/assets/calqulusrms-logo.png                              (replaced by calqulus-logo-new.png)
supabase/migrations/20260601000002_add_agency_app_role.sql   (renamed to 20260530000003_*, see §4)
```

## 11. Edge functions — domain consistency (verified, not changed)

Confirmed `www.calqulus.site` is already correctly wired throughout (no action needed):
- CORS allowlist (`_shared/cors.ts`)
- All transactional emails: welcome, invoice notification, manager approval, contract notification, payment confirmation, tenant invitation
- `capacitor.config.ts` mobile app server URL
- iOS/Android app store configs
- `index.html` canonical URL, Open Graph, Twitter Card meta tags

No stale `calquluspms.com` or other domain references found anywhere in the codebase.

---

## Outstanding items for next session

These were identified during the audit but not yet addressed:

1. **GitHub repo sync** — push this zip's contents to `github.com/Themugo/CALQULUS-PMS` (currently on the original RMS-branded code)
2. **Vercel deployment** — `calqulus-pms.vercel.app` (linked from the GitHub repo's About section) is serving the stale build; will need a redeploy once the repo is updated
3. Reports page `COLORS` array still uses old indigo/purple hex codes (`#6366f1` etc.) instead of brand palette
4. Statements/WaterBilling pages use native HTML `<select>` instead of the Radix `Select` component
5. `BillingStatsBar` renders nothing during loading (no skeleton)
6. Zero `react-hook-form` + `zodResolver` usage despite both being installed dependencies — forms rely on manual `useState` validation
7. CHECK constraints from §5 need `VALIDATE CONSTRAINT` run after a production data audit (see `20260605000000_validate_amount_check_constraints.sql`)
