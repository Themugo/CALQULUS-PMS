# CALQULUS Redesign — Persistent State

> Reconstructed by Claude (Cowork) on 2026-08-20. This file did not exist prior to this
> entry despite the master brief requiring it — everything below Phase 0 was
> reverse-engineered from `git log`, `docs/audits/TYPECHECK_EXEMPTIONS.txt`, and direct
> code inspection, not from a prior state record. Treat historical phase notes as
> best-effort reconstruction, not first-hand agent notes.

## CURRENT PHASE
James issued a new, separate instruction: "CALQULUS PHASE 1 — DESIGN SYSTEM
FOUNDATION" — audit and establish the reusable design system (tokens, component
hierarchy, a preview route) without redesigning individual pages yet. This is
now done (see below). The `@ts-nocheck` remediation from the previous session
is still open and paused, not abandoned - resume it whenever James asks to
continue that instead.

## CURRENT TASK
Just finished: Phase 1 design system foundation audit + implementation (this
entry). Nothing actively in progress as of this write-up.

### Phase 1 audit findings (before any changes)
Read `AGENTS.md` (no `CLAUDE.md` exists in the repo - AGENTS.md is the closest
match to "CLAUDE master instructions") and this file, then inspected
`src/index.css`, `src/shared/theme/tokens.ts`, and the shared `ui/` components
before touching anything, per the brief's "inspect before redesign" instruction.

**The foundation was already substantially built** (Tailwind v4 CSS-first
config, no `tailwind.config.ts`). Specifically already solid, no changes made:
- Full semantic colour system in `src/index.css` `@theme`/`:root` - primary,
  secondary, success/warning/destructive/info with `-bg` tints via
  `color-mix()`, portal accents per `[data-portal]`, legacy purple/indigo/teal/
  gold aliases deliberately resolved to navy/blue so they can't reintroduce a
  second palette. Mirrored 1:1 in `src/shared/theme/tokens.ts`
  (`CALQULUS_COLOR`) as the TypeScript source of truth.
- Spacing (`CALQULUS_SPACE`), radius (`CALQULUS_RADIUS`, `--radius: 0.75rem`),
  shadows (`CALQULUS_SHADOW` - card/elevated, tinted navy not black, no
  decorative glow), a global `*:focus-visible` ring, and an icon size scale
  (`CALQULUS_ICON` xs/sm/md/lg) already existed and are used consistently in
  `button.tsx`/`badge.tsx`/`input.tsx`.
- `button.tsx`: full variant hierarchy (default/destructive/outline/secondary/
  ghost/link) x size hierarchy (sm/default/lg/icon) x state (loading via
  `aria-busy`, disabled), all through one `cva()` definition.
- `badge.tsx`: default/secondary/outline/destructive + full semantic set
  (success/warning/danger/info) + legacy aliases resolved to navy/primary.
- `alert.tsx`: default/destructive/success/warning/info - already existed,
  wasn't in the design-preview page yet.
- `card.tsx`, `table.tsx`, `dialog.tsx`: consistent with the token system,
  no changes needed.
- A `/design-preview` route **already existed**
  (`src/features/design-preview/pages/DesignPreview.tsx`) - more ambitious
  than the brief asked for, since it previews full page hierarchies per portal
  (homepage/manager/landlord/agency/tenant/platform_admin/login/properties/
  tenants/billing/payments/maintenance/reports), not just isolated components.

**Two real gaps found and fixed this session:**
1. **Typography scale was measurably smaller than the brief's spec.**
   `.type-page-title` was 28px mobile / 32px desktop against a spec of
   36-44px; `.type-section-title` was 22px against 26-32px; `.type-card-title`
   was 17px against 20-24px. Bumped all three to the low end of each range
   (36px/40px responsive, 26px, 20px) in `src/index.css` - deliberately the
   floor of each range rather than the ceiling, since this is a data-dense
   operational product, not a marketing site, and a smaller bump is lower-risk
   for existing tight layouts. Added a new `.type-subtitle` (17px, H4's
   16-18px range) using the exact value `.type-card-title` vacated, and
   exposed it as `CALQULUS_TYPE.subTitle` in `tokens.ts` - no H4-equivalent
   existed before.
2. **Design preview page was missing several items the brief explicitly asked
   for as isolated component swatches**: buttons, badges, alerts, tabs,
   success. (It had tables/forms/dialogs/loading/empty/error already, just
   folded into fuller page-hierarchy mockups rather than standalone swatches.)
   Added five new tabs to the existing preview page rather than building a
   second route: Buttons (all variant x size x state combinations), Badges
   (all 9 variants), Alerts (info/success/warning/destructive using the
   existing `alert.tsx`), Tabs (a 3-tab example using the existing
   `tabs.tsx`), and Success (a success alert + success badges + a "saved"
   button state, since no dedicated `SuccessState` component exists
   alongside `EmptyState`/`ErrorState` - a success alert/badge is the honest
   equivalent rather than inventing a new component for a one-off).

No business logic, backend, or routing architecture touched. No individual
page redesigned - only shared tokens/components and the preview route.

**Done this session (10 of 86 files, now permanently clean, no longer in the
exemptions list):**
`src/features/billing/pages/Billing.tsx`, `.../components/BillingStatsBar.tsx`,
`.../components/InvoiceTable.tsx`, `.../components/MpesaPaymentDialog.tsx`,
`.../hooks/useBillingData.ts`, `.../lib/receiptPdfExport.ts`,
`src/integrations/supabase/client.ts`, `src/shared/hooks/useKeyboardShortcuts.ts`,
`src/shared/lib/errorLogger.ts`, `src/shared/lib/observability.ts`.

Real bugs found and fixed along the way (not just type-satisfying noise):
- **`MpesaPaymentDialog.tsx`**: `setCheckoutRequestId(data.checkoutRequestId)` was
  calling a setter for a state variable that was never declared — dead code left
  over from a refactor (the real value flows straight into
  `pollPaymentStatus(data.checkoutRequestId)` on the next line, so nothing was
  actually broken, but this doesn't type-check and never worked).
- **`BillingStatsBar.tsx` / `InvoiceTable.tsx`**: both referenced
  `invoice.paid_amount` / `invoice.balance_due` and an `invoice_status` value of
  `"partially_paid"` — none of which exist in the live schema (`invoices` has no
  such columns, and the `invoice_status` enum is only
  `paid | pending | overdue | cancelled`). These branches were always silently
  falling back to the full invoice amount. Simplified to match what the schema
  actually supports rather than inventing a migration to match the aspirational
  UI code (brief says don't fabricate backend data/endpoints).
- **`useBillingData.ts`**: `BillingLease` claimed to extend the full `LeaseRow`
  but `fetchLeases()` only selects 7 columns — narrowed the type to match the
  real projection. Also normalized the `tenants` embed, which Supabase's
  generated types infer as an array even though `leases.tenant_id` is a forward
  FK that PostgREST actually returns as a single object at runtime.
- **`src/integrations/supabase/client.ts`**: the offline/unconfigured-Supabase
  `NoopBuilder` fallback had a typing-order bug (chain methods were attached
  after the object was already cast to its final type) and a spurious `.catch()`
  that real Supabase query builders don't have either — removed it for
  consistency rather than papering over the mismatch.
- Added `getAutoTableFinalY()` to `src/shared/lib/pdf/companyPdfHeader.ts` — a
  properly-typed helper for reading jspdf-autotable's runtime-injected
  `lastAutoTable` property, replacing one `as any` (in
  `propertyStatementPdfExport.ts`, also in the exemption list but not otherwise
  touched this session) and one broken direct cast (`receiptPdfExport.ts`) with
  a single reusable, honestly-typed function.
- `NodeJS.Timeout` (browser code doesn't have the Node globals) replaced with
  `ReturnType<typeof setTimeout>` / `ReturnType<typeof setInterval>` in
  `useKeyboardShortcuts.ts` and `observability.ts`.
- `errorLogger.ts` and `Billing.tsx` were calling `.catch()` on Supabase
  PromiseLike results, which don't have `.catch()` (only real Promises do) —
  fixed via two-arg `.then(ok, err)` for the simple cases and an async/await +
  try/catch rewrite for the one nested case in `Billing.tsx`.

**NOT done — 76 files still have `@ts-nocheck` and real errors underneath.**
Re-added the marker to all 76 rather than leave them broken; the exemptions file
now lists exactly these 76 (down from 86). Full remaining error count, captured
this session by temporarily stripping `@ts-nocheck` from all 76 at once and
running `tsc --noEmit`: **562 errors**, breakdown by TS code:
- TS2339 (property doesn't exist) — 101
- TS2304 (cannot find name) — 53
- TS2322 (type not assignable) — 52
- TS18046 (`unknown` used without narrowing) — 38
- TS2345 (argument type mismatch) — 28
- TS2561/TS2551 (property doesn't exist, did-you-mean suggestions) — 36 combined
- TS2353 (unknown object property) — 17
- TS18047/TS18048/TS18049 (possibly null/undefined) — 23 combined
- remainder (TS7006, TS2769, TS2459, TS2352, TS1345, TS2719, TS2552, TS2344,
  TS2774) — ~18 combined

This has NOT been triaged file-by-file the way the billing batch was — this is
raw `tsc` output, not yet reviewed for real-bug-vs-noise the way the 10 finished
files were. That review is the next step.

## COMPLETED TASKS (reconstructed from git log, newest first)
- `6ff14e2` feat(design): apply master colour foundation without rewriting desks
- `68f372f` feat(design): make the public site feel like an operating system
- `458e2ea` fix(design): prefer hierarchy over extra chrome
- `78a0bd8` feat(design): apply Design Bible desk chrome without changing operations
- `f3e7598` fix(design): map leftover palettes to tokens and close Design Bible gaps
- `cf546a2` feat(design): lock portal accents and design-preview to the Design Bible
- `30cf00a` feat(brand): add BrandConfig layer instead of CSS overrides
- `6a6287a` feat(core): add product, design, and brand systems with a white-label engine
- `20e0f0f` feat(theme): lift chrome from near-black to mid navy
- `527aa11` feat(brand): apply navy-cyan identity and compact the homepage
- `6b67ecc` feat(manager-portal): rebuild executive dashboard hierarchy (phase 3)
- `bc99d45` feat(auth): rebuild agency and tenant portals as operational desks
- `68cc979` feat(auth): rebuild the landlord portal as a revenue-only desk
- `6aa9261` feat(auth): rebuild the manager portal as an operational desk
- `905d00e` feat(marketing): rebuild the public homepage as an executive entry point
- Merge `cursor/phase-8-platform-admin-1e5d` — platform admin pass
- Merge `cursor/phase-6-portal-excellence-1e5d`
- Merge `cursor/phase-12-certification-1e5d` — quality-gate certification pass
- `71343cb` cert: independent 30-gate quality assessment (55/100), followed by fixes
  in `709d19e`
- Round 5–9 (separate engagement, this agent): a11y/dead-code cleanup, corrupted
  binary asset restoration, Vercel rewrite fix, npm audit fixes, mislabeled logo fix,
  TenantContracts/TenantContractsSection hook dedupe, orphaned-file cleanup,
  26 unused npm dependencies removed. These predate the redesign brief and are
  orthogonal to it (bug fixes / hygiene, not visual redesign).

## IN PROGRESS
Nothing actively mid-edit as of this entry.

## NEXT TASK (Phase 1 design system - James's most recent instruction)
Phase 1 as scoped is done. Natural continuations, not yet started:
- Now that the type scale changed globally, spot-check a few dense screens
  (Properties table, Billing invoice list, Manager dashboard) for any heading
  that now wraps awkwardly or crowds a card - the brief explicitly asked to
  test across 1440/1280/1024/768/480/390/360, which hasn't been done for this
  specific change.
- Consider whether `DialogTitle` (currently hardcoded `text-lg font-semibold`
  in `dialog.tsx`) should adopt `CALQULUS_TYPE.subTitle` instead, for full
  consistency - left alone this session since it wasn't broken, just slightly
  off-pattern.
- James may want the `/design-preview` page's new tabs cross-linked from
  `docs/audits/` or `AGENTS.md` so future contributors know it's the reference.

## NEXT TASK (older, paused - resume when asked)
Continue `@ts-nocheck` remediation: pick up the remaining 76 files listed in
`docs/audits/TYPECHECK_EXEMPTIONS.txt`. Suggested approach (same one used this
session, it works and stays within sandbox time limits): strip `@ts-nocheck` from
a batch of files via a scoped `tsconfig` that extends `tsconfig.app.json` with a
narrower `include` (must also include `src/vite-env.d.ts` or you'll get false
`ImportMeta.env`/module-not-found noise), run `tsc --noEmit -p` against it,
triage real-bug-vs-noise, fix properly, re-run to confirm zero errors, THEN
remove those files from the exemptions list. Do not remove `@ts-nocheck` from a
batch without either finishing it in the same session or restoring the marker —
leaving files mid-fix with no `@ts-nocheck` and real errors regresses CI.
Good next batches to try (grouped by shared root-cause potential):
- `src/features/contracts/**` (5 files) + `src/features/payments/**` (6 files,
  1 already done) — likely share the same PostgREST forward-FK array-vs-object
  pattern fixed in billing this session.
- `src/features/webhost/**` (15 files) — the largest single cluster, all
  platform-admin surfaces.
- `src/features/tenant-portal/**` + `src/features/tenants/**` (11 files combined).

Once `@ts-nocheck` remediation is fully done (or paused again), the other
candidates James didn't pick this round are still open: line-by-line portal
verification against the brief's exact section hierarchy, responsive QA across
the seven required breakpoints, accessibility pass on the redesigned surfaces
specifically, and the white-label config UI (engine exists, no settings screen).

## FILES CHANGED
See `git log --stat` for exhaustive detail. High-level areas touched by the redesign
effort so far: `src/index.css` (design tokens), `tailwind.config.ts`, `src/core/brand/*`,
`src/core/design/*`, `src/core/whiteLabel/*`, `src/shared/components/branding/*`,
`src/features/marketing/*` (homepage), `src/features/dashboard/*` (manager),
`src/features/landlord/*`, `src/features/agency/*`, `src/features/tenant-portal/*`,
`src/features/webhost/*` (platform admin).

## ROUTES CHANGED
Not enumerated this session — no route-level regressions found in the build, but no
explicit route diff against pre-redesign `main` was run either.

## COMPONENTS CREATED
`src/core/brand/BrandConfig.ts`, `mergeBrandConfig.ts`, `platformBrand.ts`,
`composeBrandConfig.ts`; `src/core/design/deriveBrandPalette.ts`;
`src/core/whiteLabel/applyBrand.ts`, `WhiteLabelProvider.tsx`;
`src/shared/components/branding/BrandMark.tsx`, `MultiBrandStudio.tsx`,
`BrandAssetManager.tsx`.

## COMPONENTS MODIFIED
Effectively every portal dashboard and the homepage, per the commit list above.
Exhaustive list not reconstructed — refer to git history per-commit.

## KNOWN ISSUES
1. **86 files under `@ts-nocheck`** (see `docs/audits/TYPECHECK_EXEMPTIONS.txt`).
   This is the single largest piece of tracked debt right now. Documented, not
   hidden, but violates the brief's own code-quality rule.
2. **This state file didn't exist until now** — any prior agent (Cursor) session
   notes, rationale, or "why this approach" context for specific redesign
   decisions is not recoverable beyond what commit messages say.
3. Full `npm run test` (vitest) suite is large enough that it doesn't finish
   inside this sandbox's ~170s per-command cap. Spot-checked: 300+ tests observed
   passing across two separate capped runs, zero `FAIL` markers seen, including
   `designTokens.test.ts` (15/15) and `publicLanding.test.tsx` (8/8, validates the
   new executive homepage). Full-suite green status not independently confirmed
   end-to-end this session.
4. Certification history shows a documented low score at one point
   (`71343cb` "independent 30-gate quality assessment (55/100)") followed by a
   remediation commit (`709d19e`). Current score not re-verified.

## TEST STATUS
Phase 1 session: `designTokens.test.ts` (15/15) and `publicLanding.test.tsx`
(8/8) re-run after the typography/preview-page changes - both still green, so
the global heading-size bump didn't break the homepage's "single h1"/layout
assertions. Scoped `tsc --noEmit` on `src/features/design-preview/**` - zero
errors. Full-suite vitest run still not completed end-to-end in one sandbox
call (same limitation as before, suite is large); no evidence of breakage in
what was run.
`npm run test:e2e` (Playwright): not run this session (requires a browser +
longer runtime than available per sandbox call).

## BUILD STATUS
Clean. `npm run build` succeeds, PWA service worker builds (256 precache
entries, up from 255 - the new design-preview bundle is marginally bigger).

## DESIGN DECISIONS
(Reconstructed from commit messages, not first-hand)
- Outfit remains the primary font (brief said "Inter unless the project already
  has an equally appropriate font" — Cursor kept Outfit, treating it as
  already-appropriate rather than switching to Inter).
- Portal colour is applied as an accent only (brief's "these are accents, not
  separate design systems" rule) — enforced via `cf546a2` "lock portal accents
  ... to the Design Bible."
- Chrome was deliberately moved from near-black toward mid-navy across two
  iterations (`20e0f0f`, then `6ff14e2`) rather than landing on the final navy
  value in one pass.

## DEVIATIONS FROM BLUEPRINT
- **Palette — RESOLVED, doc is just stale.** Verified `src/index.css` directly:
  the live tokens are exactly the brief's hex values (`--navy-deep: #081A2E`,
  `--navy-primary: #0D2744`, `--navy-mid/--secondary-navy: #173F67`,
  `--primary/--accent/--ring: #2F6FED`, `--background/--muted: #F7F9FC`,
  `--border/--input: #E5EAF0`, `--foreground: #102033`,
  `--muted-foreground: #637286`). Portal accents also match: manager `#2F6FED`
  blue, landlord `#23856B` emerald, agency `#9A5A16` amber, tenant `#5C4A8A`
  violet, platform_admin `#3E4C94` indigo. So `6ff14e2` did land the brief's exact
  palette. The *only* loose end is that `ENTERPRISE_DESIGN_SYSTEM.md` (a repo doc,
  not the brief) still documents the old `#304FFE`/`#546E7A` palette and hasn't
  been updated to match — stale documentation, not a code problem. Small fix,
  low priority.
- Font: brief implies Inter as default; repo has standardized on Outfit and self-hosts
  it. Confirmed intentional (`ENTERPRISE_DESIGN_SYSTEM.md` explicitly: "This markdown
  must not specify Inter"), and defensible under the brief's own "unless the project
  already has an equally appropriate established font" carve-out.

---

## Open question for James
Cursor has already run through the homepage, all five portals, platform admin, and
a white-label engine, plus a 30-gate certification pass — the palette/typography/
portal-accent foundation is confirmed live and matches your brief exactly. Rather
than risk duplicate or conflicting work by picking a phase at random, tell me where
to focus. Candidates: pay down the `@ts-nocheck` debt (86 files), verify one specific
portal against the brief's exact section hierarchy, run the responsive/a11y QA pass,
update the stale `ENTERPRISE_DESIGN_SYSTEM.md`, or build the white-label config UI
(engine exists, no settings screen for it yet).
