# CALQULUS Redesign — Persistent State

> Reconstructed by Claude (Cowork) on 2026-08-20. This file did not exist prior to this
> entry despite the master brief requiring it — everything below Phase 0 was
> reverse-engineered from `git log`, `docs/audits/TYPECHECK_EXEMPTIONS.txt`, and direct
> code inspection, not from a prior state record. Treat historical phase notes as
> best-effort reconstruction, not first-hand agent notes.

## CURRENT PHASE
Post-Phase-12 stabilization / audit. The master brief's phases (homepage → shell →
per-portal → white-label) have each been touched at least once. No phase is
independently verified against the brief line-by-line yet.

## CURRENT TASK
None claimed yet by this agent as of this entry. Awaiting direction on division of
labor with Cursor (see "Open Question for James" at the bottom).

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

## NEXT TASK
Not yet assigned — see open question below. Candidates, in rough priority order:
1. Remediate `docs/audits/TYPECHECK_EXEMPTIONS.txt` — 86 files currently carry
   `// @ts-nocheck`, disabling typecheck entirely for those files. This directly
   contradicts the brief's "Do not use `any` to hide errors. Do not suppress
   warnings" rule. It's tracked/documented (not hidden), but still open debt.
2. Line-by-line verification of each portal against the brief's exact hierarchy
   spec (Manager: Attention → Portfolio health → Financial performance →
   Operations → Activity; Landlord: Portfolio performance → Income → Collection →
   Property performance → Transactions; etc.) — no agent has confirmed each
   dashboard matches the prescribed section order yet.
3. Responsive QA across the seven required breakpoints (1440/1280/1024/768/480/390/360)
   — not verified this session.
4. Accessibility pass (keyboard nav, focus states, contrast, touch targets) on the
   redesigned surfaces specifically — the brief's a11y section predates this
   redesign and was checked against the *old* UI in Round 5, not the new one.
5. White-label config UI (brand colour/logo/domain editor for admins) — the
   underlying engine (`src/core/brand/`, `src/core/whiteLabel/`) exists, but no
   settings-page UI to drive it was found in this pass.

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
`npm run build`: clean (verified this session).
`npm run test` (vitest, default suite): no failures observed in partial runs;
not run to completion in one sandbox call due to suite size/time.
`npm run test:e2e` (Playwright): not run this session (requires a browser + longer
runtime than available per sandbox call).

## BUILD STATUS
Clean. `npm run build` succeeds, PWA service worker builds, no new type errors
introduced relative to files not already under `@ts-nocheck`.

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
