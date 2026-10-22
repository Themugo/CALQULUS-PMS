# Phase 2D — Migration Repair Plan (PROPOSAL ONLY — nothing here has been executed)

**Nothing in this plan is authorised.** Live state is UNKNOWN, so no migration may be renamed, applied, edited or marked applied. Every step needs the approval named in §4. Evidence: `PHASE_2D_MIGRATION_RECONCILIATION.md`; per-file data: `PHASE_2D_MIGRATION_INVENTORY.csv`.

## 1. Principles
1. **Two separate problems.** (a) *Source-file repair*: make the repo reproducible from empty. (b) *Live-database repair*: bring an existing database to the intended schema. They are different artefacts and never share a migration file.
2. **Live state decides.** A file is only renamed, edited or re-run after the live `schema_migrations` history and actual objects show whether it ran and whether its effects exist.
3. **Forward-only.** Fixes ship as new, additive, idempotent migrations (`IF NOT EXISTS`, `CREATE OR REPLACE` with identical signature, `DROP FUNCTION IF EXISTS` only after a signature check). No history rewrite, no `supabase migration repair`, no `db reset` on shared databases.
4. Never apply anything to a database that has not been backed up with a **rehearsed restore** (runbook §3).

## 2. Defect register (state / evidence / impact / live status / forward migration? / backfill?)

Live status for every row: **UNKNOWN** until runbook step A completes.

| ID | Class | Evidence | Impact if unresolved | New forward migration? | Backfill? | Preconditions | Isolated test | Staging validation |
|---|---|---|---|---|---|---|---|---|
| R-01 `20230101000000_base_schema.sql` | POTENTIALLY_DESTRUCTIVE | 33 `DELETE FROM` (incl. `user_roles`, `properties`, `invoices`, `leases`); header forbids running on production; creates 46 tables no other file creates | If `supabase db push` runs against a DB that doesn't record this version: orphan-row deletion on live data | **No** — protect instead: confirm it is recorded as applied; never re-apply | No | Live history export | Replay on empty DB (passes) | Confirm row counts unchanged by `db push --dry-run` diff only |
| R-02 Group 17 `20260904000001` (`property_tenancy_operations_ecosystem`) | REQUIRES_ORDERED_REPAIR, REQUIRES_LIVE_RECONCILIATION | `can_manage_property_scope()` only here; 7 later files fail on it in CLI-style replay; unique indexes data-dependent | RLS/RPC authorisation functions missing or later migrations absent → cross-tenant scope risk if partially applied | Yes if absent live: new version with the function + indexes, after duplicate-data check | Possible (dedupe before unique index) | Live check for function + duplicate rows | Replay with the function defined first | Run dup-check query; apply in staging copy |
| R-03 Group 8 `20260903000018` | REQUIRES_ORDERED_REPAIR | First file fails (`attach_lease_document_atomic` return type); second file holds `create_property_atomic` (11 fns) | `create_property_atomic` absent in a CLI-built DB | Yes if absent: explicit `DROP FUNCTION IF EXISTS … ; CREATE FUNCTION …` with app-expected signature | No | Decide return type the app expects (callers in `src/`) | Replay + RPC contract test | RPC smoke |
| R-04 Group 9 `20260903000019` | REQUIRES_ORDERED_REPAIR | Same-version collision: `save/delete_unit_utility_meter_atomic` return types differ (phase45_46 `uuid`/`void` vs water_billing `jsonb`); notes earlier: app uses phase45_46 shape (verify) | Wrong shape → runtime errors in meter workflows; water_billing file lost | Yes: one canonical definition after owner decision | No | Compare app callers' expected return shape | Contract test per RPC | Meter workflow smoke |
| R-05 Group 3 `20260902000004` + `create_invoice_atomic_v2` | SOURCE_DEFECT + INSUFFICIENT_EVIDENCE | v2 file: "input parameters after one with a default value must also have defaults" | Invoice creation RPC absent from reproducible chain; app calls it | Yes: corrected function as a new migration — **only after live shows whether v2 exists** | No | Live function signature | Replay | Invoice creation + ledger comparison |
| R-06 Group 11 `20260903000021`, Group 6 `…014` | REQUIRES_ORDERED_REPAIR | Return-type changes on `acknowledge_tenant_notice_atomic`, `attach_lease_document_atomic` | RPC missing/mismatched | Yes (drop-then-create) | No | Live signatures | Replay | Tenant notice / lease document smoke |
| R-07 Groups 12, 13, 14 (`phase70_71`, `phase72`, `phase73`) | SOURCE_DEFECT / MISSING_DEPENDENCY / INSUFFICIENT_EVIDENCE | syntax error; tables `workflow_templates`, `utility_connections` created by no migration | Admin-tier, workflow, utility RPCs not reproducible | Yes only if live objects/ intent confirmed; otherwise mark features dead | Unknown | Live existence of the tables | Replay with tables defined | Feature smoke |
| R-08 Never-created tables (17) + `check_ip_rate_limit` | SCHEMA_DRIFT / MISSING_DEPENDENCY | no creating migration; used by `src/`, edge functions | Reproducibility gap; fresh environments break; hidden manual objects | Yes: *baseline-capture* migration generated from the live catalogue (not hand-written) | No | Live catalogue export | Replay from empty | Compare catalogue after apply |
| R-09 Failing `…0904…` / `…0906…` cluster (29 MISSING_DEPENDENCY + 9 SOURCE_DEFECT incl. `…0904000003/23/35/41/42/43`, `…0906000006`) | SOURCE_DEFECT / MISSING_DEPENDENCY | See reconciliation §4 | Financial reporting, receipts, collections, agency settlement features absent from reproducible chain | Yes per file, only after live status | Maybe | Per-file live status | Fix defects in isolation first (SQL parse in scratch DB) | Staged apply with smoke tests |
| R-10 Groups 1, 2, 4, 5, 7, 10, 15, 16, 18, 19 | REQUIRES_LIVE_RECONCILIATION | Independent files; CLI would keep one per version | Lost objects/policies in a CLI-built DB; if live built differently, none | Only for objects proven absent live | No | Live existence per object | Replay | Per-object catalogue diff |
| R-11 Non-CLI files `22b/22c/22d` | DUPLICATE_VERSION / REQUIRES_LIVE_RECONCILIATION | Ignored by CLI (assumed); RLS policy fixes + unique index | If never applied: M-Pesa policy fixes/scoping missing — a security-relevant gap | Yes if absent: re-issue as a new properly named migration (idempotent) | Possible (22d unique index) | Live policy/index check | Replay | Policy + index diff |
| R-12 `…0907000002` (`check_rate_limit` search_path), `…0907000003` (revoke 5 definer functions), `…0906000014` | UNKNOWN application state | Previously described as unapplied (inference only); `…0907000003` cannot replay because `issue_payment_receipt_atomic` creator fails | Search-path hijack / over-broad EXECUTE grants stay open if unapplied | These *are* the forward fixes; apply only after R-05/R-09 resolve their prerequisites and live check | No | Prerequisite functions exist live | Grant-matrix test | Grants diff |
| R-13 Policy file `config/migration-history-policy.json` | DUPLICATE_VERSION governance | Lists 10 of 19 duplicate versions | `audit:migration-chain` fails (exit 1) | Update only after live reconciliation, with documented per-group decision — **do not edit merely to pass** | n/a | — | — | — |
| R-14 Tooling hazards | process | `apply-pending-migrations.mjs` → `db push`; non-CLI files always "missing" in `reconcile-live-migrations.mjs` | Accidental remote apply / false drift | Change scripts to dry-run-only + explicit environment confirmation (code change, separate approval) | n/a | — | unit test | — |

## 3. Disposition of every duplicate group
Groups 1, 2, 4, 5, 7, 10, 15, 16, 18, 19 → **hold; REQUIRES_LIVE_RECONCILIATION** (R-10/R-11).
Groups 3, 12, 13, 14 → **hold; INSUFFICIENT_EVIDENCE** (R-05/R-07).
Groups 6, 8, 9, 11, 17 → **hold; REQUIRES_ORDERED_REPAIR** (R-02/R-03/R-04/R-06) with the order below.
**No group is SAFE_TO_REPAIR_IN_SOURCE; no file may be renamed.** The decision procedure per file, once live history is exported:
1. Version present in live `schema_migrations` **and** its objects exist → *applied*. Keep file unchanged; record in the policy as an accepted historical duplicate; never re-apply.
2. Version absent **and** objects absent → *not applied*. Only then may a new-timestamp copy (or a corrective forward migration) be proposed; rename is safe only in this case.
3. Version present but objects absent/different (or vice versa) → *drift*. Write a forward corrective migration; do not touch the original file; escalate.
4. Cannot determine → INSUFFICIENT_EVIDENCE; no action.

## 4. Recommended sequence (each step gated on approval)
1. **Approval A — identity and access.** Owner confirms which project ref is staging/prod and authorises a *read-only* operator run (runbook §2). *Required before anything else.*
2. **Backup and restore rehearsal in an isolated target** (runbook §3). Approval B — owner accepts the evidence.
3. Export applied history + catalogue (runbook §4) on staging; build the per-file table (applied / drifted / absent).
4. Fix **source defects** in a scratch Postgres (not remote): `…0902000004`, `…0903000029`, `…0904000003/23/35/41/42/43`, `…0906000006`, return-type changes. Review gate.
5. Generate **baseline-capture** for the 17 unmigrated tables and `check_ip_rate_limit` from the live catalogue (R-08).
6. Resolve ordering: group 17 first (it unblocks 7+ files), then groups 8, 9, 11, 6, then the `…0904…` cluster, then `…0906…`.
7. Apply forward migrations to a **staging copy restored from backup**, one at a time, with smoke tests after each (runbook §5). Approval C — owner reviews staging evidence.
8. Only then plan production application (new approval D, maintenance window, backup + PITR point, stop conditions per runbook §6).
9. Last: update `migration-history-policy.json` with documented per-group decisions; re-run `audit:migration-chain`.

## 5. Risks of each remediation style
| Style | Risk |
|---|---|
| Rename duplicate to new timestamp | If applied live under the old version, history diverges; if absent, safe. Live state required. |
| Apply "first file only" (CLI default) | Silently drops 55 RPC definitions the app calls plus policies/indexes |
| Merge files in a group | Hides provenance; order-dependent DDL; same-function collisions (group 9) |
| `migration repair --status applied` | Marks SQL as applied without executing it — forbidden in this phase and unsafe when objects are absent |
| Re-run everything | base_schema DELETEs; non-idempotent files; duplicate unique-index failures |
| Edit applied file in place | Checksum drift against live history |

## 6. Data migration / backfill candidates (all UNKNOWN until live data is examined)
- Unique indexes (`20260506000021`, `…22d`, `…0903000011`, `…0903000029`, group 17) may need duplicate resolution first.
- `ADD CONSTRAINT`/`SET NOT NULL` on tables with historical rows.
- Orphan-row deletion in base_schema is *already data-destructive*; do not repeat it.

## 7. Stop conditions (apply to every staged step)
Any row-count or balance mismatch vs. the pre-change snapshot; any RLS/grant diff not in the change set; any failed smoke test; any `schema_migrations` anomaly. Stop, do not "fix forward" blindly, restore from the rehearsed backup, report.

## 8. Update — Phase 2D.1 (R-14 tooling hazards; findings above are unchanged)
`apply-pending-migrations.mjs` can no longer execute anything; the reconciliation gate makes no remote contact unless the chain is clean and the expected project is named explicitly; the restore drill is local-only; legacy scripts that rewrite migration files are disabled; unsafe `db push`/`db reset` instructions in documentation carry a do-not-run warning. This does **not** repair any defect in the register above. Details, residual unguarded paths and tests: `PHASE_2D_1_MIGRATION_EXECUTION_SAFEGUARDS.md`.
