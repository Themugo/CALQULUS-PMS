# CALQULUS PMS — Phase 12 Production Certification

**Date:** 2026-08-19  
**Commit basis:** `main` at `089e6f0` plus this Phase 12 remediation  
**Production origin checked:** `https://www.calqulus.site`  
**Supabase project:** `aelzsqxllkypbzslxyju.supabase.co`

This is a certification and remediation record. It does **not** claim SOC 2, PCI DSS, ISO, “100% secure”, “100% bug free”, or “enterprise certified”. Those would require a formal audit program that was not run here.

---

## Verdict

**Not production-ready under the Phase 12 gate** (all P0 and P1 blockers resolved).

No **P0** (live outage, proven payment-loss bug, or confirmed auth bypass in the production bundle) was demonstrated against `www.calqulus.site` in this session. Several **P1** items remain: the TypeScript CI gate does not typecheck the app, live SQL apply-state is unconfirmed, backup restore was not executed, the `health-check` Edge Function is not deployed (HTTP 404), and the Manager → Tenant → Pay golden path was not executed with live credentials.

**Final score: 62 / 100.** That is a weighted engineering judgment, not a lab composite. It is intentionally below any “ship and forget” bar. Phase 12 remediations fixed lint, smoke, and release-scorecard drift; they did **not** clear P1 blockers.

---

## What was actually run (this session)

| Gate | Result | Evidence |
|------|--------|----------|
| `npx tsc --noEmit` (`package.json` `typecheck`) | **PASS (vacuous)** | Root `tsconfig.json` has `"files": []`. CI can go green without checking `src/`. Reconfirmed this session. |
| `npm run typecheck:app` (`tsc -p tsconfig.app.json`) | **FAIL** | **~2,835** `error TS` lines (~2,638 in `src/features` + `src/shared`, ~193 in `src/test`) |
| `npx eslint src` | **PASS after remediations** | 0 errors, 9 `exhaustive-deps` warnings |
| `npx vitest run` | **PASS** | 762 passed, 1 skipped, 50 files |
| `npm run audit:prod` | **PASS (with warning)** | 127 tables with RLS in **migration SQL**, 88 functions with `config.toml`; now prints that `typecheck` does not compile `src/` |
| `npm audit --audit-level=high` | **PASS** | 0 high; **3 moderate** (`uuid` via `@capacitor/cli`) |
| `npm run release:report` | **PASS 10/10 after remediations** | Was 8/10 before (required unused `netlify.toml` + missing staging smoke doc) |
| `SMOKE_BASE_URL=https://www.calqulus.site npm run smoke:deploy` | **PASS after remediations** | Was failing on empty `#root`; now matches live HTML |
| Production HTTP | **200** | Landing HTML, CSP, HSTS, frame options present |
| Route module graph | **PASS (repo)** | All 64 `lazy(() => import("@/…"))` entries in `src/app/routes.ts` resolve to files |
| `GET …/functions/v1/health-check` | **404** | `{"code":"NOT_FOUND"}` |
| Credentialed Playwright golden paths | **NOT RUN** | `E2E_*` secrets not available in this environment |
| Database backup restore | **NOT RUN** | No DB password / PITR exercise |
| `npx supabase db push` | **NOT RUN** | No linked DB credentials |

`audit:prod` RLS counts are **repository SQL**, not a live `pg_policies` dump.

Financial and isolation suites use the **mocked** Supabase client in `src/test/setup.ts`. They prove the test doubles, not production ledger integrity.

---

## P0 — production blockers

*None confirmed this session.*

If a later live check shows unapplied RLS migrations or a payment double-credit in production, that would be P0. That check was not completed.

---

## P1 — must resolve before calling the product production-ready

1. **Typecheck gate is fake.** `npm run typecheck` does not compile `src/`. Real `tsconfig.app.json` check reports thousands of errors. CI “Typecheck” is not a quality gate.
2. **Live migration apply-state unknown.** Repo has 74 SQL files including `20260819000004_manager_dashboard_stats_complete.sql`. This session did not query `supabase_migrations.schema_migrations` on the live project. Dashboard RPC occupancy previously referenced a non-existent `occupied_units` column; if that migration is not applied, stats still use the JS fallback.
3. **Backup restore untested.** `supabase/migrations/rollback/ROLLBACK_GUIDE.md` is documentation only. No restore was executed.
4. **`health-check` Edge Function not deployed.** Observability docs and Grafana assume it; live invoke is 404.
5. **Critical role E2E not executed here.** `e2e/user-flows.spec.ts` is credential-gated. Manager signup→receipt, landlord statement, tenant pay, webhost audit were **not** run against production.
6. **Stale public E2E (remediated in this PR).** `e2e/app.spec.ts` expected `/` to redirect to `/landlord`. The product serves `PublicLandingPage` at `/`.

---

## P2 — should fix soon

1. **Smoke script vs HTML** (remediated): required empty `#root`; production includes the critical loader.
2. **Release report required Netlify** (remediated): production is Vercel-only; dual-host was a false architecture.
3. **DevPortalSwitcher passwords always in module scope** (remediated): `App.tsx` imports the switcher in all builds. Presets are now `import.meta.env.PROD ? [] : […]` so production DCE can drop them, matching `devAccess.ts`.
4. **Hardcoded anon JWT fallback in `scripts/test-demo-auth.mjs`** (remediated): script now requires env.
5. **Demo / test passwords still exist in source** for local DEV (`devAccess.ts`, `DevPortalSwitcher.tsx` non-prod branch, `scripts/test-demo-auth.mjs`). Gitleaks allowlists them. They must never ship in the production bundle (gated) and should be rotated if they are live production passwords.
6. **Landing LCP.** Lab Lighthouse (Phase 11, localhost): LCP ~5.7–6.3 s on public pages; 204 KB JPEG logo displayed at 20–56 px. Not re-measured as a before/after in this phase.
7. **`npm audit` moderate uuid** via Capacitor CLI (dev tooling).
8. **`/demo` is not a route.** Old smoke hit `/demo`; SPA rewrite still returns `index.html`. `/landing` and `/welcome` still load `MarketingWebsite` while `/` is `PublicLandingPage` (two public marketing surfaces).
9. **Financial “certification” tests are mocked.** They must not be cited as live ledger proof.
10. **Sentry allowlist still includes `app.calqulusrms.com`**, which AGENTS.md says does not resolve. Harmless but stale.
11. **Google Fonts preconnect** in `index.html` while fonts are self-hosted Outfit files — extra DNS, not a functional break.

---

## P3 — debt / polish

1. ESLint exhaustive-deps warnings (9 remaining).
2. In-app navigation via `window.location.href` on specialist dashboards (full reload).
3. Obsolete “CALQULUS RMS” strings in tests, comments, `CALQULUS RMS@2026!` password label, release-report title (report title fixed).
4. Filename `FINAL_CALQULUS_100_100_CERTIFICATION.md` (disclaimer added; do not treat as current).
5. `apply-pending-migrations.mjs` prefix list was stale (updated to include `20260819000003` / `0004`).
6. Capacitor native apps are in the repo; this certification is **web production** (`calqulus.site`), not iOS/Android store review.

---

## Architecture

- Single production host in practice: **Vercel** + **Supabase**. Requiring Netlify was incorrect; removed from the release scorecard.
- Public `/` is the marketing landing, not a silent redirect to landlord login. `/landing` and `/welcome` still serve a second marketing page (`MarketingWebsite`).
- Specialist dashboards (Accountant / Maintenance / Leasing / Support) exist as extra manager-adjacent surfaces; they are not the mockup-minimal sidebar. Not removed (not a Phase 12 feature delete).
- `audit:prod` public-style policies remain on invitation tokens, water companies, unit photos — expected for token/public catalog reads; still worth a human RLS review on live DB.

---

## Frontend

- **Build:** last production deploy on the origin is serving hashed assets and the Phase 11 viewport (`user-scalable` no longer locked). This session did not wait for a new Vercel deploy of Phase 12 remediations.
- **Lint:** one error blocking `eslint src` — fixed via `redirectBrowser()`.
- **Responsive / design:** not re-QA’d visually; Phase 5–11 work is in the tree. No new design system was added.
- **Loading / errors / empty:** manager dashboard has retry; tenant portal has offline banners. Specialist dashboards still use full-page `window.location` for some actions.

---

## Backend

- **88** Edge Functions with `config.toml` entries (repo). Deployment of each function to the linked project was **not** enumerated via `supabase functions list`.
- **health-check:** missing on the live functions host (404).
- **Realtime:** manager dashboard subscribes to table changes; not load-tested here.
- **Storage:** isolation tests exist and pass **against mocks**. Live bucket policies were not dumped.

---

## Security

| Control | Status |
|---------|--------|
| Auth | Supabase Auth; production `isDevAccessEnabledFromEnv(PROD)` is false even if `VITE_ENABLE_DEV_ACCESS=true` (unit-tested) |
| Authorization | Frontend `can()` / `evaluateCanAccessProperty` unit-tested; **RLS is the real control** and must be verified on live DB |
| Tenant / property isolation | Isolation **unit** suites pass on mocks |
| CSP / headers | Present on `www.calqulus.site` (HSTS, CSP, XFO, nosniff, Permissions-Policy) |
| Secrets scan | Gitleaks config **allowlists** demo passwords and several paths |
| Rate limits | Not independently verified on Supabase Auth or Edge Functions |
| Audit logs | UI + `rpc('log_activity')` pattern exists; `activity_logs` RLS historically blocked direct inserts |

**Do not treat gitleaks allowlists as “no secrets in the repo”.**

---

## Financial

Unit suites under `src/test/financial-integrity/` (double-entry, duplicate prevention, reconciliation, rollback, Phase 7) **passed in Vitest with the mock client**.

Not verified live:

- Stripe / M-Pesa / Paystack webhook idempotency against the real provider
- Duplicate Safaricom callbacks
- Refund / reversal operator path
- Receipt email/SMS delivery

Tenant pay is designed to refuse offline success (Phase 11). That is code-path verified, not a live STK test.

---

## Critical E2E (requested vs executed)

| Flow | Executed this session? |
|------|-------------------------|
| Manager: signup → property → unit → tenant → lease → invoice → payment → receipt | **No** (credential-gated Playwright) |
| Landlord: login → portfolio → financial overview → statement | **No** |
| Tenant: login → balance → payment → receipt → maintenance | **No** |
| Admin/webhost: login → users → org → subscription → audit | **No** |
| Commercial: landing → pricing → signup → trial → onboarding | Public landing HTML **yes**; signup/trial **no** |
| Mobile critical workflows | **No** device lab; Phase 11 added 44px targets and offline pay copy |

---

## Commercial

- Landing and `/pricing` exist (`PublicLandingPage`).
- Subscription recovery banners exist in the manager dashboard tree (Phase 10).
- Live Stripe subscription state was not queried.

---

## Performance (lab, not field)

Phase 11 localhost Lighthouse (after perf work, public pages only):

- Landing: Performance 69, Accessibility 96, LCP 6303 ms, CLS 0, TTFB 5 ms  
- Tenant login: Performance 71, Accessibility 92, LCP 5680 ms, CLS 0  

No CrUX / RUM export was pulled. `initObservability()` is wired as of Phase 11; there is no production before-series.

API/DB latency: not measured against the live project (would need authenticated traces).

---

## Observability

- Frontend: `initObservability()` in `main.tsx` (LCP, INP, CLS, TTFB). Flush depends on app metrics pipeline.
- Edge `health-check`: **not deployed**.
- Payment webhook logs: not tailed this session.
- Sentry: DSN is optional (`VITE_SENTRY_DSN`); presence on Vercel was not confirmed.

---

## Backups and disaster recovery

**Unverified.** No PITR restore, no `pg_dump` restore, no Vercel rollback drill was executed. The rollback SQL guide is not a tested runbook.

---

## Deployment

- Vercel native GitHub integration deploys `main` (prior CI audit). GitHub Actions `deploy-production.yml` still expects `VERCEL_TOKEN` / org / project secrets and can fail while native Vercel succeeds.
- Required frontend env: `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` (`config/production-env.json`). Live HTML preconnects to the known Supabase host, so those are **likely** set.
- Edge Function secrets listed in `config/production-env.json` were **not** enumerated on the Supabase dashboard.

---

## Documentation honesty

- This file is the current certification.
- `FINAL_CALQULUS_100_100_CERTIFICATION.md` is historical and now disclaimed.
- `PRODUCTION_CHECKLIST.md` lists env names; it does not prove they are set.
- `docs/STAGING_SMOKE_TEST.md` now matches `scripts/smoke-deploy.mjs`.

---

## Score breakdown (honest weights)

| Area | Score | Why not higher |
|------|------:|----------------|
| Live site up + headers | 82 | Origin 200, CSP/HSTS present |
| Frontend automated tests | 80 | 762 unit tests pass; eslint 0 errors / 9 warnings |
| Type safety | 22 | Vacuous CI typecheck; thousands of real errors |
| Backend / RLS (repo) | 70 | SQL RLS present; live apply unknown |
| Security (bundle + headers) | 68 | Switcher passwords now DCE-gated; demo secrets remain in git |
| Financial (live) | 45 | Mock tests only |
| E2E golden path | 20 | Not run |
| Observability | 40 | health-check 404 |
| DR / backups | 20 | Docs only |
| Docs vs product | 62 | 100/100 filename remains; smoke/E2E/scorecard now match the live product |

**Overall: 62 / 100.**

---

## Production blockers (gate)

Call the product production-ready only after:

1. `typecheck` compiles `src` (or CI is rewritten so it cannot pretend) **and** error count is an accepted, tracked number — not thousands of ignored `strict` failures.
2. Confirm live `schema_migrations` (or equivalent) includes the 20260812 and 20260819 files you rely on.
3. Execute one backup restore in staging.
4. Deploy or remove `health-check` from runbooks.
5. Run credentialed Playwright (or equivalent) for manager collect, tenant pay, landlord statement, webhost login.

Until then: **do not** describe CALQULUS as production-certified.

---

## Remaining technical debt

- ~2,600 TypeScript errors in application code
- Mock-only financial/isolation tests
- Dual deploy stories (native Vercel vs Actions)
- 88 Edge Functions operational burden
- 204 KB brand JPEG
- Capacitor / k8s artifacts unused by `calqulus.site`

## Commercial risks

- Pricing/signup/trial not proven end-to-end in this audit
- Support email `enterprise@calqulusrms.com` unverified as a working mailbox
- Demo passwords in git if those users exist in production

## Security risks

- Live RLS not dumped
- Gitleaks allowlists
- Unpublished rate-limit proof
- health-check 404 reduces incident detection

## UX risks

- Public LCP still weak in lab
- Credentialed mobile pay not retested here
- Specialist dashboards full-page reloads

## Performance risks

- Lab LCP > 5 s on public pages
- `vendor-charts` still on the React vendor graph
- No field INP/LCP dashboard was inspected

---

## Remediation included in this Phase 12 change set

- Tenant checkout redirect uses `redirectBrowser()` (ESLint)
- Smoke script matches real `#root` HTML and real public routes
- Release scorecard is Vercel-only; staging smoke doc added
- DevPortalSwitcher passwords compile-out in `PROD`
- `test-demo-auth.mjs` requires env (no committed JWT fallback)
- Landing E2E expects the public home, not landlord auth
- `typecheck:app` script added for the real compiler
- Pending-migration prefix list updated
- This report; disclaimer on the 100/100 filename
- `audit:prod` now warns that root `typecheck` does not compile `src/`
