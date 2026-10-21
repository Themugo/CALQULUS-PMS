# Phase 2B — Production Evidence Gate (B-003)

Base: branch `chore/remove-duplicate-project-tree`, HEAD `317afddc…` (uncommitted changes on top).

## Root cause
`audit-production-evidence.mjs` and `audit-go-live.mjs` tested required evidence with `!evidence[k]` (truthiness). The template-shaped objects (`{timestamp:"",target:"",…}`) are truthy, so once `releaseCommit` was non-empty the gate returned PASS with every field blank. `capture:release-evidence` (run inside `audit:go-live`) auto-fills `releaseCommit` from `git rev-parse HEAD`, so the false pass was reachable in normal use. Reproduced on the old script: made-up commit + blank blocks => `PASS`, exit 0. Also: malformed/missing files were silently swallowed, no commit binding, no format checks.

## Evidence contract (`scripts/lib/release-evidence-contract.mjs`)
- `releaseCommit`: full 40-hex SHA, must equal the assessed commit (`--expected-commit`, `RELEASE_COMMIT_EXPECTED`, else `git rev-parse HEAD`); undeterminable => fail.
- `stagingMigrationRun`/`stagingSmokeRun`: timestamp, target, operator, outcome. `stagingRestoreRun`: timestamp, recoveryPoint, restoreTarget, operator, outcome. `productionApproval`: timestamp, approver, decision.
- Strings must be non-empty, non-placeholder; timestamps ISO-8601, not in the future; outcome in PASS/PASSED/SUCCESS/SUCCEEDED/COMPLETED; decision in APPROVED/APPROVE/GO (**vocabulary is my choice — review**).
- Approval must not predate the staging runs. Automated records `migrationReconciliation|stagingSmoke|stagingE2E|liveSecurity` or `STAGING_SMOKE_EVIDENCE.json` reporting FAIL contradict the claim. `EXTERNAL_REQUIRED` is informational.
- No credential-like keys or credentialed URLs.
- Optional: `automatedEvidence`, smoke file. Staleness: **no repository policy exists**, so `--max-age-days`/`EVIDENCE_MAX_AGE_DAYS` is opt-in (off by default) — a policy decision is needed.

## Changes
- `scripts/audit-production-evidence.mjs`: rewritten on the contract; flags `--evidence --smoke --expected-commit --max-age-days --out --no-write`; defaults unchanged; report adds `failures`, `assessedCommit`, `scope`, `notProofOf`. A first draft passed a file containing `null`; caught by the new test and fixed (explicit `loaded` flag).
- `scripts/audit-go-live.mjs`, `scripts/audit-release-evidence.mjs`: use the same validator (go-live could previously say GO on blank evidence).
- `src/test/productionEvidenceGate.test.ts`: 25 tests, temp fixtures only.

## Verification
- `npx vitest run src/test/productionEvidenceGate.test.ts`: 25/25 pass.
- Full `npx vitest run`: 1612 pass, 1 fail (`referencePortalLoginShell`, pre-existing B-008), 1 skipped.
- `npm run typecheck`: clean. ESLint on touched files: clean.
- Gate on the repo's real evidence (`--no-write`): BLOCKED, exit 1, 17 failures.
- Not run: `audit:go-live`, `audit:release-readiness`, `audit:release-certificate`, `audit:release-evidence` (they rewrite `docs/audits/*`).

## Status
B-003: **gate logic fixed and tested in source**. This is not evidence: staging migration, smoke, restore, security evidence and approval are still absent, so the release stays **BLOCKED**. PASS from this gate means "recorded evidence is well-formed and consistent", never independent verification.

## Other gates (documented, not changed)
- `audit-release-readiness`/`audit-release-certificate` run static audits; the certificate can emit `REPO_CERTIFIED_EXTERNAL_PROOF_REQUIRED` (not approval, but wording could mislead). `audit-release-promotion-lock` takes `expected = evidence.releaseCommit`, so it is self-referential; should use HEAD/`RELEASE_COMMIT_EXPECTED` like this gate.
- `audit-production-evidence-ingestion` returns PASS for any parseable file with allowed keys even if values are empty — same defect class; proposed fix: run the contract validator on ingested data.
