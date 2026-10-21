# Phase 2B.1 — Release Evidence Hardening (follow-up to B-003)

Base: branch `chore/remove-duplicate-project-tree`, HEAD `317afddc…`, uncommitted. Overall release status: **BLOCKED**.
Note: the Phase 1/2A documents and `RELEASE_BLOCKER_REGISTER.md` were not present in this workspace (untracked files lost with the previous sandbox); nothing was recreated from guesswork. `PHASE_2B_EVIDENCE_GATE.md` (Phase 2B) is preserved.

## Defects and root causes (each reproduced on the old scripts in a temp dir)
1. **Ingestion accepted empty evidence.** `ingest-production-evidence.mjs` only checked allow-listed keys and a few types; `{}` => `PASS`, exit 0. The audit then read only that status; and `EXTERNAL_REQUIRED` also exited 0. The PASS feeds `audit-production-release-certification`, `audit-release-reconciliation`, `audit-release-security-gate` and `audit-final-production-decision`.
2. **Promotion lock was self-referential.** `expected = RELEASE_COMMIT_EXPECTED || evidence.releaseCommit`, so with no target supplied the evidence vouched for itself (old script: PASS, exit 0). Missing authorization/revision (`EXTERNAL_REQUIRED`) also exited 0.
3. **Certificate wording.** `audit-release-certificate.mjs` emitted `REPO_CERTIFIED_EXTERNAL_PROOF_REQUIRED` with exit 0 after static checks only, never looking at evidence.
4. **Freshness.** No policy exists in runbooks or CI (searched `docs/operations`, `docs/security`, `.github`), and gates did not say so.

## Fixes
- `scripts/lib/release-evidence-contract.mjs`: added `validateIngestedEvidence` (flat identifier schema), `resolveMaxAgeDays`, `releaseCertificateDecision`, `SHA_PATTERN`, `FRESHNESS_POLICY_UNRESOLVED`; validation primitives shared with Phase 2B.
- `ingest-production-evidence.mjs`: semantic validation always runs; PASS only if valid and bound to the assessed commit (`--expected-commit`, `RELEASE_COMMIT_EXPECTED`, else HEAD); report marks `validation: VALIDATED_AGAINST_SHARED_CONTRACT`, `approvalGranted:false`, freshness status. Added `--source/--out/--max-age-days` (env `PRODUCTION_EVIDENCE_FILE` still works). No source => `EXTERNAL_REQUIRED` (unchanged).
- `audit-production-evidence-ingestion.mjs`: exits non-zero for anything but a validated PASS (EXTERNAL_REQUIRED, NOT_RECORDED, FAIL, PASS without the validation marker). **Compatibility:** previously EXTERNAL_REQUIRED exited 0; no workflow/package chain invokes it, only the runbook.
- `audit-release-promotion-lock.mjs`: intended revision comes **only** from `--expected-commit` or `RELEASE_COMMIT_EXPECTED` (the variable already used by drift/provenance audits and the Phase 120 runbook; nothing new invented). Checks: provided, 40-hex, candidate (`git HEAD` of the checkout) equals it, evidence `releaseCommit` equals it. Non-PASS now exits 1. **Ambiguity:** the repo documents no workflow that promotes a commit different from the checked-out one (drift audit also compares HEAD to expected); if such a workflow is wanted, add an explicit `--candidate-commit` backed by artifact manifest verification — not done here.
- `audit-release-certificate.mjs`: rewritten. States it is not a certification. Layers: static checks / evidence-file validation / independent verification (`INDEPENDENT_RELEASE_ATTESTATION.json` status PASS) / freshness / approval (`NOT_GRANTED_BY_THIS_TOOL`). Decisions: `BLOCKED_STATIC_CHECKS_FAILED`, `BLOCKED_EXTERNAL_EVIDENCE_REQUIRED`, `BLOCKED_INDEPENDENT_VERIFICATION_REQUIRED`, `BLOCKED_FRESHNESS_POLICY_UNRESOLVED` (all exit 1), `EVIDENCE_COMPLETE_NOT_AN_APPROVAL` (exit 0). Added `--out/--no-write/--expected-commit/--max-age-days`. The tracked `docs/audits/RELEASE_SECURITY_CERTIFICATE.json` still contains the old wording until regenerated (not regenerated here by instruction).
- `audit-production-evidence.mjs` / `audit-release-readiness.mjs`: report and print a freshness limitation.

## Freshness policy status: UNRESOLVED (owner decision required)
No authoritative maximum evidence age exists, and none was invented. Mechanism: `EVIDENCE_MAX_AGE_DAYS` / `--max-age-days` (off by default). Without it, gates print a warning and record `freshnessPolicy: UNRESOLVED`, and the certificate refuses to reach `EVIDENCE_COMPLETE_NOT_AN_APPROVAL` (`BLOCKED_FRESHNESS_POLICY_UNRESOLVED`). Implication: that command cannot exit 0 until the owner approves a number. Individual evidence gates still pass without it (with warning) to avoid breaking existing flows.

## Tests (temp fixtures)
`src/test/releaseEvidenceFollowup.test.ts` (20 tests): ingestion (valid, `{}`, blanks/placeholders, malformed/mismatched commit, negative results, bad timestamp/type, malformed JSON, secret/unknown fields, stale, EXTERNAL_REQUIRED, forged/unmarked PASS), promotion lock in a throwaway git repo (match, `--expected-commit`, **no target with matching evidence => blocked**, malformed, candidate mismatch, evidence mismatch, evidence missing commit, no authorization), certificate decision layers (missing external proof, valid local checks without proof, unverified, unresolved freshness, complete case), freshness boundaries. Plus Phase 2B `productionEvidenceGate.test.ts` (25).

## Verification
- `npx vitest run src/test/releaseEvidenceFollowup.test.ts src/test/productionEvidenceGate.test.ts`: 45/45 pass.
- Full `npx vitest run`: 1632 pass, 1 fail, 1 skipped (234 files).
- `npm run typecheck`: exit 0. ESLint (`scripts/`, new tests): exit 0.
- Not run (mutate `docs/audits/*` or need infra): `audit:go-live`, `audit:release-readiness`, `audit:release-certificate`, `audit:release-evidence`, `audit:release-promotion-lock` against the real checkout. Certificate decision logic is tested as a pure function; its static-check execution path was not exercised.
- `git status` shows no change under `docs/audits/`, `supabase/` or `package*.json`.

## `referencePortalLoginShell` failure
Unchanged by this work: the test and `ReferencePortalLoginShell.tsx` are byte-identical between base `20381ab` and HEAD (`git diff --stat` empty), so it fails at the base commit. Cause: `manager` and `agency` configs share accent `#0867E8`, test expects 4 distinct. The component is imported only by its own test (orphaned). Owner decision: delete both or revive and give agency a distinct accent.

## B-003 status
Closed **in source** for: production-evidence gate, release-evidence gate, go-live, ingestion, promotion lock, certificate wording. Remaining limitations: (a) PASS = well-formed, consistent, commit-bound — not independent verification; (b) freshness policy unresolved; (c) `audit-release-reconciliation.mjs` still uses its own emptiness check without commit binding or format checks (smallest fix: call `validateLiveReleaseEvidence`); (d) tracked certificate JSON files still hold old results until regenerated in CI.

## Still blocking release
B-001/B-001a live migration reconciliation; B-002 staging, restore, smoke, security, approval evidence absent; B-004 dependency vulnerabilities; B-008 orphaned test (above); push access.
