# CALQULUS PMS — FRONTEND FINAL QA

**Phase 12 — Visual + UX certification**
**Date:** 2026-08-25
**Scope:** Public site (homepage, registration, login, onboarding) + all six portal surfaces (Manager, Landlord, Agency, Tenant, Admin, WebHost). QA only — no new features, no redesign. Two colour-consistency fixes were applied where off-palette leftovers contradicted the locked token system.
**Gates:** lint 0 errors · typecheck clean · 1152 unit tests passed / 1 skipped · E2E (a11y + responsive certification) 25 passed · production build clean (precache 764.70 KiB).

---

## VERDICT: PASS — the frontend reads as ONE product.

One token system, one typeface, one component library, one layout grammar per portal, six thin identity accents. Nothing template-generated, crypto-like, or consumer-social remains in the audited surfaces.

---

## PASS

### Colour
- **Single palette authority.** `src/shared/theme/tokens.ts` (TS source of truth) is kept in lockstep with `src/index.css` by `designTokens.test.ts`. Foundation: white/mist desks, deep navy `#173650` + mid navy `#31577E` chrome only, interactive blue `#356FE5`.
- **Palette remap is total.** Every raw Tailwind scale (blue/slate/gray/green/amber/yellow/orange/red/rose/pink/cyan…) resolves to the muted CALQULUS families via `@theme` in `index.css`. Legacy class names literally cannot introduce a second palette — verified by scanning all `text-/bg-/border-/ring-/from-/to-/fill-/stroke-*` usages in `src`.
- **Six portal identities, 2px only.** Manager Blue `#356FE5`, Landlord Emerald `#2F9B74`, Agency Amber `#C08A37`, Tenant Violet `#7C5FD3`, WebHost Teal `#2C9183`, Admin Indigo `#4658C9` (admin surface inside the webhost portal via `ADMIN_SURFACE_ACCENT`). Identity is carried by `portalSurfaceProps()` + the 2px `PortalAccentBar` in all five layouts — never page fills.
- **Status stays semantic.** Success `#2F8061` / warning `#A66A16` / danger `#B94A48` are reserved for status; portal accents never replace them. No green-washed financial numbers: money renders in ink, only positive/negative *status* is coloured.
- **Fixed during this QA:** webhost chart internals (`BillingAnalytics.tsx`, `PropertyTypeAnalytics.tsx`) still carried a dark-mode leftover — `#1e293b` tooltips with a bright purple `#7c3aed` border, `#374151` grids, `#9ca3af` ticks — on white cards. All 5 tooltips + grid/axis strokes now use the token convention (`hsl(var(--card))`, `hsl(var(--border))`, `hsl(var(--muted-foreground))`) that every other chart in the product already follows.
- Production-source hex scan is otherwise clean: remaining literals are token definitions, on-palette mist shades in marketing (`#F4F7FB`/`#EAF0F8`), or deliberate test fixtures.

### Typography
- Outfit everywhere: `h1–h6` are forced to Outfit in base CSS; `--font-heading` + 128 `font-heading` usages for display text; system sans for body. Self-hosted woff2 with `font-display: swap`. Type scale (`.page-title` 28→32→36px responsive, `.section-title`, `.supporting-text`) is shared, not per-page improvisation.

### Components
- shadcn/ui primitives are the only component source: 217 feature files import the shared `Button`; cards, inputs, selects, dialogs, tables, badges, empty/error/loading states all come from `src/shared/components/ui`. Raw `<button>` occurrences (64 files) are icon toggles, password visibility switches, and overlay dismissers using token classes — not parallel button systems.
- Icons: lucide-react only, enforced by `componentAuditPhase9.test.ts` (react-icons/iconify/heroicons banned). Functional ✓/✗/⚠ glyphs appear only in checklists/documents.
- Radii: one scale (`--radius: 0.75rem`; rounded-lg/xl/md dominate with 536/285/133 usages). Arbitrary radii are confined to marketing showcase cards (14px) and a device-frame mock (38px) — not product chrome.
- Spacing: shared token scale; desks are dense but not cramped; no giant empty regions found in the portal pages audited.

### Navigation & layout
- All five portal layouts (Manager `Layout`, `LandlordLayout`, `AgencyLayout`, `TenantLayout`, `WebhostLayout`) share the same grammar: navy chrome, white desk, accent bar, mobile hamburger + overlay drawer (`lg:hidden` patterns verified in each). Manager sidebar groups match the locked mockup; webhost sidebar matches `dashboard_previews.html`.
- 97 routes marked `protected: true`; role-scoped route configs per portal; role boundaries covered by dedicated suites (`landlordPortalPhase5`, `webhostOperatorOnboarding`, `adminWebhostPhase8`, RBAC hooks).

### Visual hierarchy
- Exactly one `<h1>` per page, rendered by the shared `PageHeader` (`page-title`), with subtitle + `headerActions` slot. Dashboards follow one-primary-action discipline (e.g. Manager Dashboard: primary "Add property", outline "View reports", ghost refresh icon). Sections use `section-title` + `aria-labelledby`. Empty/error/loading states are shared components, not bespoke per page.

### Loading & performance posture
- 101 lazy routes; heavy charts/budget dashboards lazy + idle-warmed; skeletons on data surfaces; `loading="lazy"` images; WebP logo (1.0 KB @112px + @2x); precache 764.70 KiB after the icon sweep.

### Security surface
- No secrets, tokens, service-role keys, JWTs, or passwords in `src` or the built bundle (scanned both). Supabase client is env-driven with placeholder detection + noop fallback; `.env.local` is gitignored; only `.env.example` (template) is committed. Webhost ops/log viewers mask secret-shaped keys via `lib/secrets.ts`. No permission changes made in this phase.

### Functionality (regression evidence)
- Full unit suite (1152 passed / 1 skipped) covers auth flows, invitation flows (tenant + admin), onboarding completion per role, RBAC hooks, portal desks, chart colours, currency/date formatting.
- E2E certification: 25 passed — axe (wcag2a/aa, 0 critical/serious) on homepage, design-preview, all 5 logins; 8 viewport widths × 16 screens with zero horizontal overflow; tenant touch targets ≥44px; dialogs, skip-links, table headers verified.
- Build green; no behaviour or backend changes introduced.

---

## WARNINGS (non-blocking; product decisions needed)

1. **Receipt default brand colour is bright green.** `ReceiptSettings.tsx` seeds `primary_color: "#22c55e"` (default Tailwind green, off-palette) for generated receipts. Receipts are tenant-facing documents; the default contradicts the muted palette and the "no excessive green" rule. Not changed in QA because it alters a stored-default behaviour — recommend changing the seed to the brand navy/blue in a product-approved pass.
2. **Spreadsheet statement palette.** `PropertyCollectionStatement.tsx` intentionally mimics an Excel rent schedule (`#ADD8E6` header rows, `#FFFF99` arrears, `#EBF5FF` striping). It is a *document renderer*, not app chrome, so it was left as-is — but if this statement ever becomes interactive screen UI it should be re-tokenized.
3. **Amber as decoration on webhost Billing.** `BillingAnalytics.tsx` uses `text-warning` titles/descriptions and `border-warning/15` on every card regardless of state. Warning colour should mean "warning"; recommend reverting those to neutral foreground/border tokens in a future pass (left unchanged here to avoid a visual redesign during QA).
4. **pg_cron setup hint in a manager-facing report.** `RentCollectionSummary.tsx` shows a SQL snippet containing `<SERVICE_ROLE_KEY>` *placeholders* (no real secret) intended for a Supabase project owner. Managers do not have project access, so this is operational clutter in the wrong portal — recommend moving it to platform-admin docs or the webhost surface.
5. **One consumer-style emoji.** M-Pesa success toast title contains 🎉. Everything else is enterprise-toned; recommend plain text.
6. **11 pre-existing ESLint warnings** (0 errors) — mostly exhaustive-deps notes; tracked, not introduced by this phase.
7. **Marketing radius drift.** Marketing showcase cards use `rounded-[14px]` vs the 12px card token — invisible to users, noted for completeness.

## FAILURES

- **None.** No broken authentication, navigation, forms, CRUD, payments, tenant flows, role boundaries, or onboarding detected. All gates green. The two off-palette chart leftovers found during the audit were fixed in-phase and re-verified (typecheck + full suite + build).

## RECOMMENDED FUTURE WORK

1. Product-approved pass on warnings 1–5 (receipt default colour, billing amber decoration, cron hint relocation, toast emoji, statement tokenization).
2. Manual exploratory QA on the live deployment with the demo accounts (demo.manager / demo.landlord) across a real device matrix — automated suites cover structure and a11y, not taste.
3. Optional Lighthouse baseline for reference only — record scores, do not chase them at the expense of desk density (per standing instruction).
4. Dark mode remains classified **dormant** — if ever activated, the chart token convention fixed in this phase is the pattern to follow everywhere.
5. Resolve the 11 ESLint warnings and the 8 outdated major dependencies in a dedicated maintenance window.
6. Consider an axe scan of authenticated portal screens (current E2E covers public + login surfaces; portals are covered by responsive certification and unit-level a11y patterns only).
