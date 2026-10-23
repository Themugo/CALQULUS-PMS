# CALQULUS PMS — Phase 2C Dependency Security Remediation

**Assessment date:** 2026-10-21  
**Status:** BLOCKED — authoritative vulnerability scan unavailable in this workspace  
**Scope:** Dependency security assessment only. No dependency or lockfile changes were made.

## Executive summary

The provided `CALQULUS-PMS-master-2026-10-21.zip` was used as the source foundation. The archive does not contain `.git`, so the source branch, HEAD commit, and working-tree status cannot be independently verified from this package. The ZIP itself passed its archive integrity check before extraction.

The previous report of 14 vulnerabilities (2 critical, 5 high, and 7 other) is historical and is **not treated as the current baseline**. An authoritative current count could not be obtained because this environment could not resolve `registry.npmjs.org`. In accordance with `docs/security/RUNTIME_DEPENDENCY_POLICY.md` and `docs/security/VULNERABILITY_POLICY.md`, registry-dependent results must be reported as unavailable rather than fabricated.

No dependency versions, `package.json`, `package-lock.json`, CI workflows, migrations, database files, deployment configuration, or existing audit certificates were changed. Blind upgrades were deliberately avoided because the actual current advisory set and patched versions could not be established.

## Environment and source provenance

- Node.js: `v22.16.0`
- npm: `10.9.2`
- Package manager: npm
- Lockfile: `package-lock.json`, lockfile version 3
- Repository metadata: `.git` is absent from the supplied ZIP; branch, commit SHA, and Git status are unavailable.
- Current direct dependency declarations: 64 production dependencies and 25 development dependencies.
- Lockfile SHA-256: `16764a542eb0efc6431ba30c25da33a9052207e35d0b1dda8fa82f581a79510e`
- `package.json` SHA-256: `5f2cab534a982e052922e3a095f0f7bcd0d43b0b6aa1af3f3a2bd188b27b98a9`

## Commands and outcomes

| Command / check | Outcome | Interpretation |
|---|---|---|
| Inspect `package.json`, lockfile, CI workflows and dependency policies | Completed | Confirmed npm lockfile v3 and existing CI audit gates. |
| `npm ci --ignore-scripts --no-audit --no-fund` | Did not complete within the execution environment's command timeout | No successful clean install can be claimed. The interrupted attempt left a partial local `node_modules` directory, which is excluded from the deliverable archive. |
| `npm audit --audit-level=high --json` | Exit 1 | Registry request failed with `getaddrinfo EAI_AGAIN registry.npmjs.org`. This is a network/evidence failure, not a measured vulnerability count. |
| `npm ls --depth=0 --json` | Exit 1 | Ran against the partial installation left by the interrupted install; it reported missing/invalid/extraneous packages and is not valid evidence of the committed dependency tree. |
| Typecheck, lint, tests, production build | Not run | A complete reproducible dependency installation was not available. |

## Dependency and CI findings

The repository already includes registry-backed `npm audit --audit-level=high` gates in:

- `.github/workflows/ci.yml`
- `.github/workflows/release-integrity-gate.yml`
- `.github/workflows/security-scan.yml`

The CI workflow's audit command remains the authoritative source for current vulnerability counts when executed successfully against the configured registry. The security-scan workflow captures audit output for reporting; its reporting behavior should not be mistaken for proof that the audit passed.

The lockfile contains resolved versions that differ from some declared semver ranges, including recent versions of Capacitor, React Router, Vite, Vitest, DOMPurify, jsPDF, and other packages. Version recency alone does not prove a package is free of advisories. Without current advisory metadata, this assessment does not label any package vulnerable or safe.

## Batch disposition

- **Batch A — Critical:** Not started. Current advisories and dependency paths could not be verified.
- **Batch B — High:** Not started. Current advisories and fixed versions could not be verified.
- **Batch C — Moderate/low:** Not started. Current advisories and fixed versions could not be verified.

No blanket `npm audit fix`, forced upgrade, dependency removal, or advisory suppression was performed.

## Required next steps in an online, approved CI environment

1. Start from this exact `package-lock.json` and record the commit SHA of the checkout being assessed.
2. Run `npm ci` successfully using the approved npm registry.
3. Run `npm audit --audit-level=high --json` and preserve the raw output as CI artifact evidence, without committing registry credentials.
4. For each finding, record advisory ID, affected package/version, dependency path, severity, production/development scope, fixed version and compatibility implications.
5. Remediate critical findings in the smallest safe batch, then rerun focused tests and the audit before proceeding to high and remaining findings.
6. Run `npm ci`, `npm audit --audit-level=high`, `npm ls --depth=0`, lint, typecheck, the full test suite and production build after the final batch.
7. Compare failures against a clean baseline and inspect the complete dependency and lockfile diff.
8. Update this report with actual output and results. Do not record the phase as passed until the checks have run successfully.

## Acceptance status

| Criterion | Status |
|---|---|
| Current vulnerability baseline measured | BLOCKED — registry unavailable |
| Critical and high findings individually dispositioned | BLOCKED — current findings unavailable |
| Minimal dependency fixes applied | NOT STARTED — unsafe to guess without advisory evidence |
| Reproducible `npm ci` | NOT VERIFIED |
| Typecheck and lint pass | NOT RUN |
| Tests and production build pass | NOT RUN |
| No migrations, database, deployment or secrets changed | PASS — no such changes were made |
| No commit or push | PASS — no Git metadata is present in this ZIP, and no commit/push was attempted |

## Release decision

**Phase 2C acceptance criteria are not met. Release remains BLOCKED.** This report documents an environment limitation, not a successful remediation. Resume dependency changes only when a clean install and authoritative registry-backed audit can run in an approved connected environment.

## Addendum (2026-10-22): measured baseline and remediation after PR #94 CI failures
The registry was reachable on this date, so the baseline above is superseded by measured results. This addendum does not change the original (historical) findings.

- **Measured baseline** (`npm audit`, lockfile at `170954a`): 15 vulnerabilities — 3 critical (`@capacitor/android`, `@capacitor/ios`, `dompurify`), 6 high (`vite`, `undici`, `@xmldom/xmldom`, `brace-expansion`, `fast-uri`, `source-map-js`), 6 moderate (`vitest`, `@vitest/coverage-v8`, `@vitest/mocker`, `@capacitor/cli`, `xcode`, `uuid`).
- **Change made:** lockfile updates within existing semver ranges only (`vite` 8.3.5, `dompurify` 3.4.17, `@capacitor/*` 8.5.3, `undici` 8.12.3, `@xmldom/xmldom` 0.9.12, `fast-uri` 3.1.9, `brace-expansion` 5.0.12, `source-map-js` 1.2.2), plus raising the declared minimum of `vitest` and `@vitest/coverage-v8` from `^4.1.8` to `^4.1.12`. No major-version upgrade, no `--force`, no advisory suppression.
- **Tool note:** `npm audit fix` and `npm update` (npm 10.9.4) crash with `Cannot read properties of null (reading 'edgesOut')` on this dependency graph. The lockfile was updated with npm 11.21.1 (`npx npm@11 update … --package-lock-only`), and `npm ci` was then verified with npm 10.9.4, the version CI uses.
- **Result:** `npm audit --audit-level=high` exits 0, and so does `--production`. **3 moderate advisories remain** (`uuid` 7.0.3 via `xcode` via `@capacitor/cli`); no non-breaking fix is available and they were left as-is.
- **Verified locally:** `npm ci` (exit 0), `npm run typecheck`, `npm run lint` (0 errors), `npm test` and `npm run test:all` (all pass), `npm run build`, `audit:prod`.
- **Not verified:** runtime behaviour of the upgraded Capacitor, vite and DOMPurify packages in a real mobile or browser session; only the automated checks above were run.
