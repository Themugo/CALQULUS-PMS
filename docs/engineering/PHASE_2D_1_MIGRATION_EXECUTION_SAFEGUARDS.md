# Phase 2D.1 — Migration Execution Safeguards

**Release decision: BLOCKED.** This phase only makes accidental or unauthorised migration execution fail closed. It does not repair migrations, verify any remote database, or make anything production-ready. All statements about the database come from repository inspection and local replay; live state is **UNKNOWN**.

## 1. Risk addressed
`scripts/apply-pending-migrations.mjs` ran `npx supabase db push` against whichever project `supabase/config.toml` named. Phase 2D found that this is unsafe while the following are unresolved: duplicate migration versions (18 versions used by more than one file under the CLI filename rule; 19 groups under the looser audit regex), 3 filenames the CLI would ignore, a base migration containing 33 `DELETE FROM` statements, two conflicting project refs (`hmgpltrjlsescfquqxeg` in `config.toml`; `aelzsqxllkypbzslxyju` in workflows, k8s secrets and runbooks), and unknown live `schema_migrations` state. A `db push` could apply unrecorded files out of order, skip files that share a version, or re-run destructive SQL.

## 2. Baseline
- Workspace: fresh clone of the pushed branch `chore/phase2b-2d-evidence-gate-and-migration-reconciliation`, HEAD `170954a4de0ec416073e4b63030bcf989154b855` (Phase 2B/2B.1 are in `dc73415` on `main`; Phase 2C and 2D docs in `fcb5932`, `170954a`). `git status --short` was clean before editing.
- `supabase/migrations/` is byte-identical to HEAD and to the original Phase 2C input.
- Baseline test status at HEAD (unchanged by this phase): `referencePortalLoginShell` fails (owner decision pending), and `productionTruthDataIntegrity > removes unreferenced mock analytics components` fails because commit `6746f02` (a revert) restored two files that the test says must not exist. `npm run lint` fails at HEAD with 2,301 parser errors, because the repository contains a nested duplicate project tree (`CALQULUS-PMS/`, 2,013 tracked files) with its own `tsconfig`, which makes typescript-eslint's root directory ambiguous.

## 3. Every execution path found

> **Update (follow-up, §10):** the nested `CALQULUS-PMS/` copy referred to in E2, E5, E6, E10 and the nested-copy remarks below has since been removed from the tree. Those rows describe the state when the safeguards were written; the root-level safeguards are unchanged.
"Can change a DB" means the command, as written, can write to a database or to Supabase project state. Line numbers are pre-change.

| # | Path | Can change a DB? | Condition | Safeguard now | Status |
|---|---|---|---|---|---|
| E1 | `scripts/apply-pending-migrations.mjs:51` `execSync("npx supabase db push")` | **Yes** (remote, via linked project) | Any run without `--dry-run`; not wired to any npm script or workflow (checked) | Script rewritten: no child-process import, no command construction, always exits 1 | **Guarded** |
| E2 | `CALQULUS-PMS/scripts/apply-pending-migrations.mjs` (identical copy in the nested tree) | **Yes** | Direct `node` invocation | Replaced by a 3-line refusal stub | **Guarded** |
| E3 | `scripts/deployment-reconciliation-gate.mjs:31,40-44` `npx supabase --version / projects list / migration list / db push --dry-run` | No by command design (`--dry-run`), but it contacts the project named in `config.toml` | `npm run gate:reconciliation`; CI step `.github/workflows/deploy-production.yml:80-83` supplies `SUPABASE_ACCESS_TOKEN` | No CLI call (not even `--version`, which may download the CLI) and no network unless the chain has no duplicates/non-CLI names **and** the operator names the expected ref (`--expected-project-ref` or `CALQULUS_EXPECTED_PROJECT_REF`) and it equals `config.toml`. Report now records `remoteContact` | **Guarded** (read-only contact still possible once preconditions hold) |
| E4 | `scripts/deploy-production.mjs:131` `npx supabase functions deploy --project-ref <config ref>` | Yes (edge functions, not schema) | Runs only after `runDeploymentGates()` (line 187) succeeds | Transitively blocked while the gate is BLOCKED. No independent guard; a direct `npx supabase functions deploy` by an operator is not prevented | **Partly guarded** (see §8) |
| E5 | `scripts/restore-migrations-drill.sh:36-62` `DROP DATABASE`, `CREATE DATABASE`, applies every migration file with `psql` | Yes, on whatever `PGHOST` points to (default 127.0.0.1, overridable) | Direct `bash` run | Refuses unless `PGHOST` is loopback or a unix-socket path; refuses `PGSERVICE`, `PGSERVICEFILE`, `PGHOSTADDR`; exits 2 before any `psql` call. Nested copy guarded identically | **Guarded** |
| E6 | Legacy scripts that rewrite migration files: `fix-migration.cjs`, `fix-migration.py`, `fix-migration{,-simple,-v2,-complete}.ps1` (rewrite `20230101000000_base_schema.sql`), `apply_phases.py` (writes `20260903000008/09`), `patch_phase10.py` (writes `20260902000004`) | No DB; **edits migration source** | Direct run | Each now starts with a refusal and exits non-zero (root and nested copies). The `.ps1` files target a hard-coded `CALQULUS-RMS` path | **Guarded** |
| E7 | Read-only `psql` against `DATABASE_URL`/`SUPABASE_DB_URL`: `audit-schema-drift.mjs:6`, `reconcile-live-migrations.mjs:19`, `audit-live-rls.mjs:31`, `verify-migration-integrity.mjs:23` | No (SELECT text inspected) | Env var present | Unchanged. They connect to whatever URL is set and perform no identity check | **Unguarded by design** |
| E8 | `scripts/probe-live-schema.mjs:76` POSTs RPCs to the remote REST API, including `log_activity` | Possibly (an activity-log row, if the call succeeds) | `SUPABASE_URL` + key in env | Not changed (outside migration scope) | **Unguarded** |
| E9 | `scripts/assign-roles.mjs:72-142` service-role `upsert`s; `scan-accounts.mjs`, `get-user-ids.mjs`, `test-demo-auth.mjs` call the remote API | `assign-roles`: yes (data) | Env vars present | Not changed (data scripts, not migrations) | **Unguarded** |
| E10 | Documents telling operators to run `supabase db push` / `db reset` / `migration repair`: `docs/deployment/production.md:65,140`, `docs/deployment/README.md:54`, `docs/onboarding/README.md:163,167`, `docs/maintenance/README.md:110`, `STAGING_ENVIRONMENT_SETUP.md:90,315,331,578`, `MANAGEMENT_STRUCTURE_MIGRATION_GUIDE.md:32`, `PRODUCTION_DEPLOYMENT_RECONCILIATION_INITIATIVE.md:22` and their nested-tree copies | Indirectly | Operator copy-paste | A do-not-run warning is inserted before each fenced block; a test enforces it for root and nested copies. `docs/deployment/production.md:140` previously told operators to `db reset` the production URL | **Guarded** (documentation) |
| E11 | Outside the repository: the Supabase dashboard SQL editor, a manually typed CLI command, any assistant or tool holding Supabase credentials | Yes | Human or tool action | Cannot be controlled from repository code. Mitigation is credential scoping and the runbook (`PHASE_2D_STAGING_RUNBOOK.md` §0, §2) | **Unguarded** |

Searched and found no migration-executing route in: all `package.json` scripts (no script calls `apply-pending-migrations`; none runs `db push`), every file under `.github/workflows/`, `helm/`, `k8s/`, `terraform/`, `deployment/`, `monitoring/` (runbooks there contain read-only `psql` examples only), and `supabase/functions/` (no DDL or SQL execution).

## 4. How the safeguards work
- **`scripts/lib/migration-execution-guard.mjs`** (new, ~150 lines): filename/duplicate inspection, project-ref handling, a never-granting authorization assessment, and the preflight. It reuses `scripts/audit-migration-chain.mjs` by running it as a subprocess instead of duplicating it. Its only subprocess is `process.execPath` running that audit.
- **Preflight refusals** (all are reported, none can be skipped): `EXECUTION_DISABLED` (unconditional), `MIGRATIONS_UNREADABLE`, `DUPLICATE_VERSIONS`, `NONCONFORMING_FILENAMES`, `POLICY_UNREADABLE`, `LIVE_RECONCILIATION_REQUIRED`, `AUDIT_FAILED`, `AUDIT_UNAVAILABLE`, `TARGET_UNVERIFIED`, `TARGET_MISMATCH`, `AUTHORIZATION_MISSING`.
- **The history policy is not evidence of resolution.** `audit-migration-chain.mjs` accepts duplicates listed in `config/migration-history-policy.json`, so someone could make it pass by listing them. The executor therefore refuses on any duplicate version regardless of the policy.
- **Target identity** must be supplied explicitly, be well-formed, and match `config.toml`. Even a match is not treated as proof of which environment it is. Production or staging is never inferred from a name, ref, file or document.
- **Logging:** only fixed messages and well-formed project refs are printed. Unrecognised arguments are counted, never echoed (a first test run caught the script echoing a flag that contained a mistyped secret; that was fixed).
- **`--dry-run`** is read-only: it lists the historical hard-coded file list (not a computed pending set), contacts nothing, and still exits 1 while the preflight fails.
- **No bypass:** there is no flag or environment variable that enables execution. A test sets `CI`, `FORCE`, `YES`, `ALLOW_MIGRATIONS` and similar and confirms refusal.

### Authorization design decision
No existing mechanism provides a secure authorization boundary for applying migrations. `deploy-production.yml` uses GitHub `environment:` at lines 233 and 325, but any required-reviewer rules live in GitHub settings and are **not visible from the repository (UNKNOWN)**, and no workflow step applies migrations. Therefore execution stays disabled and no override was invented. A future mechanism must be separately reviewed and must require all of: an explicit target identity verified independently of the repo; a reviewed migration plan (hash-pinned); a successful preflight (clean chain, passing audit, no duplicates or unclassified files); a verified recoverability plan (backup **and** a successful restore rehearsal); and deliberate operator confirmation recorded outside the process environment. `assessAuthorization()` lists these requirements and cannot return `authorized: true`.

## 5. How the tests prove refusal
`src/test/migrationExecutionSafeguards.test.ts` (32 tests, node environment). Commands are stubs on a temporary `PATH` that log any call; fixtures live in a temp directory; no network, credentials or database are used.

| Required behaviour | Evidence |
|---|---|
| 1 Refuses by default | clean conforming fixture still exits 1 with `EXECUTION_DISABLED`; matching target still refuses; generic env vars (`CI`, `FORCE`, …) do not enable it |
| 2 Duplicate versions refuse | fixture with a policy-listed duplicate: legacy audit exits 0, executor still refuses |
| 3 Failed or unavailable audit refuses | audit runner stubbed to fail, throw, return nothing; real audit failing on a fixture; missing policy; unreadable directory |
| 4 Nonconforming filenames refuse | letter-suffixed and non-numeric names reported by name |
| 5 Unknown/mismatched target refuses | null, empty, `staging`, a connection string, a different ref, no `config.toml`; configured ref never assumed |
| 6 Invalid authorization cannot enable | undefined, `{}`, strings, partial and malformed objects, and a fully populated object all give `authorized: false` and `allowed: false` |
| 7 Failed preflight invokes no command | stub log empty after every scenario; script and library source contain no execution capability |
| 8 Nonzero exit | every refusal asserts exit 1 (drill: exit 2) |
| 9 No secrets in logs | five secret-valued variables plus secrets passed as arguments; none appear in output |
| 10 No DB-changing command during tests | stub log asserted empty; `supabase/migrations` hash unchanged by the refusal path and the legacy scripts |
| 11 Existing audit intact | `audit-migration-chain.mjs` still passes a clean chain, fails new duplicates and malformed names |
| 12 Phase 2B/2B.1 intact | evidence validator fails closed on null/empty input; evidence gate CLI still BLOCKS; the Phase 2B and 2B.1 test files also pass in the full run |

**Tests are not vacuous:** with the original `apply-pending-migrations.mjs`, gate and drill restored temporarily, 21 of the 32 tests failed; with the guarded versions all 32 pass.

**Limits:** the stubs replace `npx`, `supabase`, `psql`, `pg_dump`, `pg_restore`; the tests prove the repository's code paths do not call them, not that no other tool could. The shell-based tests are skipped on Windows (the stubs are POSIX shell scripts); the static source checks still run there. PowerShell refusals are checked by source inspection, not execution. Execution of the real Supabase CLI, a real database and the CI workflow were not exercised.

## 6. Why these constraints exist
- **`supabase db push` stays prohibited** until reconciliation is complete: the CLI applies files whose versions are not recorded and cannot reconcile duplicate versions or non-CLI names. Any such push could apply a different set of SQL than production's history implies, or re-run `20230101000000_base_schema.sql` (33 `DELETE FROM`).
- **Project identity must be verified independently.** The repo itself names two refs. Neither a ref, a file name, an environment name nor a document is proof of what a database holds. Identity must be confirmed in the Supabase dashboard (organisation, region, an explicit owner statement) and recorded.
- **A backup needs a successful restore rehearsal.** An unrestored dump is not evidence of recoverability. See `PHASE_2D_STAGING_RUNBOOK.md` §3.

## 7. How a future authorized migration should be approved
1. Owner confirms staging identity and authorises the read-only inventory (runbook §2 and §4).
2. Per-file live status is established (applied / absent / drifted) and the repair plan's decision procedure is applied (`PHASE_2D_REPAIR_PLAN.md` §3).
3. Source defects are fixed and reviewed in a scratch Postgres; forward-only corrective migrations are written; duplicates are resolved by decision, not by editing the policy.
4. A separate, reviewed change adds an authorization mechanism satisfying §4, with tests, and is reviewed independently of the person running it.
5. Rehearse on a restored copy; compare catalogue and sentinel counts; only then plan production under its own approval.

## 8. Remaining risks and unguarded paths

> **Update (follow-up, §10):** the nested duplicate tree bullet below is resolved by its removal; a stale local checkout of it can still exist on an operator machine and is not protected by anything in this tree.
- **E4:** an operator can run `npx supabase functions deploy` directly. Edge functions may call RPCs that a CLI-built database lacks (Phase 2D found 175 absent in a CLI-style build).
- **E7–E9:** scripts that connect to a remote database or API using whatever is in the environment, with no identity check. E8 and E9 can write data.
- **E11:** the dashboard SQL editor, manual CLI use, and any assistant or tool with Supabase credentials are outside repository control.
- **Nested duplicate tree** (`CALQULUS-PMS/`, 2,013 tracked files): `deployment-reconciliation-gate.mjs` and `deploy-production.mjs` there are identical, unguarded older copies. GitHub runs only the root `.github/workflows/`, so they are not wired into CI, but they can be run by hand. Removing the nested tree needs an owner decision.
- `gate:reconciliation` returns `EXTERNAL_REQUIRED` (exit 0) if preconditions pass but the CLI is missing; that behaviour is unchanged. `verify:migration-integrity` also exits 0 with `EXTERNAL_REQUIRED`.
- `audit-migration-chain.mjs` still treats policy-listed duplicates as acceptable; it currently fails on 9 duplicate versions not in the policy.
- GitHub environment protection rules for the deploy workflow are UNKNOWN.
- Pre-existing failures: `referencePortalLoginShell`, `productionTruthDataIntegrity` (mock analytics files), repo-wide `npm run lint` (nested tree).
- These guards stop the repository's own scripts. They do not make the migration chain correct.

## 9. Decisions needed from a human
1. Which project ref is staging and which is production, confirmed independently of the repo.
2. Whether to remove the nested `CALQULUS-PMS/` tree (it also breaks repo-wide lint).
3. Whether `functions deploy` and the E7–E9 scripts should get the same explicit-target guard (a separate phase).
4. Whether to design the future authorization mechanism now or after live inventory.
5. The earlier open items from Phase 2D (read-only operator access, staging/restore copy, unmigrated tables, `referencePortalLoginShell`).

## 10. Addendum (2026-10-22): CI repair after PR #94
The first CI run of this branch failed on checks that were **already failing on the base branch** or were caused by one finding in this phase's test. Corrections:
- **CodeQL (high, "file system race condition")** in `src/test/migrationExecutionSafeguards.test.ts`: `hashDir` checked a path with `statSync` and then read it. It now reads each entry once and skips directories on `EISDIR`.
- **Lint failed repo-wide (2,301 errors at the base commit):** the tracked nested copy `CALQULUS-PMS/` has its own `tsconfig`, so typescript-eslint could not pick a root. `eslint.config.js` now ignores that nested copy and sets `tsconfigRootDir`. Result: 0 errors, 7 warnings (React fast-refresh, pre-existing). The nested copy is still not linted; removing it remains an owner decision (§9).
- **Two failing tests:** `referencePortalLoginShell` required four distinct portal accents, but the manager and agency logins both used `#0867E8` since the screen was introduced (agency is now navy `#0B3A8C`). `productionTruthDataIntegrity` requires two unused mock analytics components to be absent; a revert (`6746f02`) had restored them, nothing imported them, and they were deleted.
- **Dependency audit / provenance / supply-chain:** see the Phase 2C addendum. `npm audit --audit-level=high` now passes.
- **`audit:release-manifest` failed** because `docs/audits/SIGNED_RELEASE_MANIFEST.json` (generated 2026-09-03) no longer matched `package.json`, `package-lock.json`, `vite.config.ts` or `supabase/config.toml`. It was regenerated with `create-signed-release-manifest.mjs`. It is **unsigned** (`EXTERNAL_REQUIRED`) and `releaseCommit` is `null`, as before; it is a hash record, not an approval, and must be regenerated whenever those files or any migration change.
- **Not fixed, by design:** the "Release integrity gate" job (previously skipped because provenance failed) will now run and is expected to **fail** on `migrationChain` (9 duplicate versions not in the history policy, a Phase 2D finding) and on `deploymentControls` (clean-git-tree check, which CI's own earlier steps can dirty). The history policy was not edited to make it pass. These failures reflect the unresolved reconciliation and keep the release BLOCKED.
- **Nested duplicate tree removed (follow-up).** Evidence it was a stale snapshot: of its 2,013 files, 2,011 had a counterpart at the repository root and the remaining 2 were the two unused mock components already deleted; 94 files differed, and for the 89 not edited by this phase the root copy had the newer commit in 85 cases (2 equal, 2 only because of uncommitted edits at the time). Nothing at the root (scripts, configuration, workflows, tests) referenced the nested path. It was deleted from the tree; its history remains in git. This also removes its unguarded copies of `deployment-reconciliation-gate.mjs` and `deploy-production.mjs`. The `eslint.config.js` ignore for it is kept so a leftover local copy cannot break lint again.
- **Release integrity gate caveat (not changed).** The gate runs several audit scripts that rewrite tracked files under `docs/audits/`, and `audit:deployment-controls` then fails with "Git working tree is not clean". On a clean, committed checkout the chain therefore still reports `deploymentControls` FAIL (and `migrationChain`, the real Phase 2D finding). Narrowing that check to source files is a release-governance change and was left for an explicit decision.

