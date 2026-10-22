# Phase 2D — Staging Reconciliation & Recovery Runbook (operator-run; not executed)

**Live-state verification status: BLOCKED / UNKNOWN.** This runbook is for an authorised operator on a **verified staging** environment. It performs no repair. Nothing here has been run by Claude. **Never paste credentials, connection strings, tokens or exported data into chat, tickets or the repo.**

## 0. Ground rules
- Use a dedicated **read-only** database role; connect from the operator's own terminal. Keep connection strings in your shell/secret manager only.
- Every session: `PGOPTIONS='-c default_transaction_read_only=on'` (belt and braces: the role itself must lack write grants).
- Never run `supabase db push`, `db reset`, `migration repair`, `scripts/apply-pending-migrations.mjs`, or any script that writes `docs/audits/*` while following this runbook.
- Since Phase 2D.1, `scripts/apply-pending-migrations.mjs` refuses unconditionally and `scripts/deployment-reconciliation-gate.mjs` makes no remote contact unless the expected project is named explicitly; neither replaces the checks in this runbook (`PHASE_2D_1_MIGRATION_EXECUTION_SAFEGUARDS.md`).
- Outputs are **catalogue metadata only** (names, signatures, flags, counts). Do **not** export tenant, payment, credential or personal data. Row counts are allowed for a fixed list of tables (§4.9).
- Store exports in a restricted location outside source control; share only the diff summary.

## 1. Approvals required before starting
| # | Approval | Owner | Evidence to record |
|---|---|---|---|
| A | Target identified as **staging** (or a restored clone), read-only operator named | project owner | ticket id |
| B | Backup/restore rehearsal accepted (§3) | project owner | restore drill record |
| C | Staged-apply plan reviewed (§5) | owner + reviewer | change record |
| D | Any production step (separate runbook, not this one) | owner | change record |

## 2. Verify identity and scope (do all; stop on any mismatch)
1. **Project/environment.** Two project refs appear in the repo: `hmgpltrjlsescfquqxeg` (`supabase/config.toml`) and `aelzsqxllkypbzslxyju` (k8s secrets, runbooks, workflows). In the Supabase dashboard confirm: project name, region, *organisation*, and an explicit "staging" label or a documented owner statement. A name alone is not evidence. Record: ref, URL host, who confirmed, when.
2. **Paused?** Check project status in the dashboard. A paused project must **not** be resumed under this runbook without separate approval (it changes external state and may incur cost).
3. **Endpoint.** Connection host must match the confirmed project ref. Record `select inet_server_addr(), current_database()` output.
4. **Credential scope.**
   ```sql
   select current_user, session_user, current_setting('default_transaction_read_only') as ro;
   select rolname, rolsuper, rolcreatedb, rolcreaterole, rolbypassrls
     from pg_roles where rolname = current_user;
   select has_schema_privilege(current_user,'public','CREATE') as can_create_in_public;
   select version();
   ```
   Expect: `ro = on`, not superuser, `can_create_in_public = false`. If not, stop and obtain a proper read-only role.
5. **Source revision.** Compute SHA-256 of every file in `supabase/migrations/` (`PHASE_2D_MIGRATION_INVENTORY.csv` column `sha256`) and record the package/commit being compared. Because the ZIP has no `.git`, the commit id must come from the owner's repository.
6. **Backup/recovery arrangement.** Record the plan tier, PITR on/off and retention, last successful backup time (dashboard). Unknown = BLOCKED for any later change.

## 3. Backup and restore rehearsal (before any change step)
1. Take a logical backup of the staging DB with the operator's own tooling (`pg_dump -Fc --no-owner` using a role with read access), or use a dashboard backup/PITR point. Record the time, size and SHA-256 of the dump.
2. Restore it into an **isolated, empty** database (local Postgres 16 or a throwaway project) — never over staging.
3. Verify the restore: object counts (tables, functions, policies, triggers) equal the source; `schema_migrations` row count equal; sentinel row counts (§4.9) equal; a few invariants (e.g. sum of invoice balances equals source, via aggregate only).
4. Record the elapsed restore time. **A backup file that has not been restored is not evidence of recoverability.**
5. Keep the dump for rollback of the staged rehearsal (§6).

## 4. Read-only collection (run each; save CSV; no data exports)
Run with `psql -X -A -F, --csv -f <file>` or the dashboard SQL editor in read-only mode.

**4.1 Applied history** (statements text is excluded on purpose)
```sql
select version, name, created_by, inserted_at
from supabase_migrations.schema_migrations order by version;
```
(If `inserted_at/created_by` do not exist in your CLI version, select `version, name` only.)

**4.2 Tables and columns**
```sql
select table_schema, table_name, column_name, data_type, is_nullable, column_default
from information_schema.columns where table_schema in ('public') order by 1,2,ordinal_position;
```
**4.3 Functions (signature, return type, security, search_path, grants)**
```sql
select n.nspname, p.proname, pg_get_function_identity_arguments(p.oid) as args,
       pg_get_function_result(p.oid) as returns, p.prosecdef as security_definer,
       p.proconfig as settings, p.proacl::text as acl, md5(pg_get_functiondef(p.oid)) as def_md5
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public' order by 1,2,3;
```
**4.4 Triggers**
```sql
select event_object_table, trigger_name, action_timing, event_manipulation, action_statement
from information_schema.triggers where trigger_schema='public' order by 1,2;
```
**4.5 RLS status and policies**
```sql
select c.relname, c.relrowsecurity as rls, c.relforcerowsecurity as forced
from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind='r' order by 1;
select schemaname, tablename, policyname, cmd, roles, md5(coalesce(qual,'')||coalesce(with_check,'')) as pred_md5
from pg_policies where schemaname='public' order by 2,3;
```
**4.6 Indexes and constraints**
```sql
select tablename, indexname, indexdef from pg_indexes where schemaname='public' order by 1,2;
select conrelid::regclass as tbl, conname, contype, pg_get_constraintdef(oid) as def
from pg_constraint where connamespace='public'::regnamespace order by 1,2;
```
**4.7 Extensions, schemas**
```sql
select extname, extversion from pg_extension order by 1;
select nspname from pg_namespace where nspname !~ '^pg_' and nspname <> 'information_schema' order by 1;
```
**4.8 Grants (tables and routines)**
```sql
select grantee, table_name, privilege_type from information_schema.role_table_grants
 where table_schema='public' and grantee in ('anon','authenticated','service_role','public') order by 2,1,3;
select grantee, routine_name, privilege_type from information_schema.routine_privileges
 where routine_schema='public' and grantee in ('anon','authenticated','service_role','public') order by 2,1;
```
**4.9 Sentinel counts (aggregates only; fixed list)**
```sql
select 'profiles' t, count(*) from public.profiles union all select 'properties', count(*) from public.properties
union all select 'units', count(*) from public.units union all select 'leases', count(*) from public.leases
union all select 'invoices', count(*) from public.invoices union all select 'payments', count(*) from public.payments;
```
(Adjust names to those that exist; absence of a table is itself a finding.)

**4.10 Targeted probes** for the open questions (existence only):
```sql
select to_regclass('public.idempotency_keys') is not null as idempotency_keys,
       to_regclass('public.mpesa_settings') is not null as mpesa_settings,
       to_regclass('public.insurance_claims') is not null as insurance_claims,
       to_regclass('public.workflow_templates') is not null as workflow_templates,
       to_regclass('public.utility_connections') is not null as utility_connections,
       to_regprocedure('public.can_manage_property_scope()') is not null as can_manage_property_scope,
       to_regprocedure('public.check_ip_rate_limit(text,integer,integer)') is not null as check_ip_rate_limit;
```
(Adjust the argument list of `check_ip_rate_limit` to the caller in `supabase/functions/_shared/security.ts`.)

## 5. Compare (offline, on the operator's machine)
1. Generate the **expected** catalogue by running the same §4 queries against the local replay database (`scripts/phase2d-replay/`, LEXICAL_ALL mode; note its 41 known failures) — this is "what the repo can produce", not "what is intended".
2. Diff observed vs expected for: history (versions present/absent/duplicate-name), tables/columns, functions (args, returns, `def_md5` only informational), policies, grants, triggers, extensions.
3. For each of the 19 duplicate groups apply the decision procedure in `PHASE_2D_REPAIR_PLAN.md` §3 and record: applied / absent / drift / undeterminable.
4. Record findings as VERIFIED (observed) or UNKNOWN; do not infer.

## 6. Staged rehearsal of a proposed repair (only after Approval C)
1. Restore the §3 backup into a **new staging copy**. Never rehearse on the shared staging DB itself.
2. Pre-change snapshot: §4 outputs + sentinel counts + invariant aggregates (e.g. total outstanding by property).
3. Apply the proposed forward migrations one at a time with a normal (writing) role *on the copy only*.
4. After each: re-run §4 diff, then smoke tests:
   - **Auth/provisioning:** create a test user (staging), profile row appears with correct role.
   - **Tenant isolation:** run `supabase/tests/rls/*.sql` (tenant_isolation, cross_manager_isolation, manager/tenant read matrices) against the copy; any cross-tenant read = stop.
   - **Property/tenant/lease workflow:** `golden_path_property_unit_tenant_lease.sql`, `golden_path_atomic_lease.sql`, `landlord_invitation_rpc.sql`.
   - **Financial:** `financial_integrity_payment_engine.sql`, `golden_path_atomic_invoice.sql`; compare balances/invoice totals to the pre-change snapshot (must be identical).
   - **Critical RPCs:** call each of `create_property_atomic`, `finalize_tenant_creation_atomic`, `create_invoice_atomic_v2`, `check_rate_limit`, receipts/payment RPCs with a test fixture; assert return shape against callers.
   - **Grants:** assert the revoked functions (`issue_payment_receipt_atomic`, `resolve_tenant_auth_user`, `get_effective_billing_due_config`, `check_idempotency_key`, `can_access_property`) are not EXECUTE-able by `anon`/`authenticated`.
5. **Stop conditions:** any count/balance difference not explained by the change set; any new cross-tenant visibility; any unexpected grant; any failed smoke test; `schema_migrations` anomaly. On stop: do not patch live, restore the copy from the §3 backup, record, escalate.
6. **Recovery:** forward-recovery means a *new* corrective migration tested the same way; rollback means discarding the copy / restoring the backup. `supabase/migrations/rollback/ROLLBACK_GUIDE.md` exists but has not been validated.

## 7. Evidence to retain
Identity record (§2), backup + restore record (§3), CSV exports (§4, restricted), diff summary (§5), smoke results (§6). Without these the release remains BLOCKED (B-001/B-002).

## 8. Environments that must not be touched in this process
Production, any database whose role you cannot prove, any project that is paused (resume requires separate approval), and the shared staging DB for write steps.

## 9. Validation status of this runbook
The SQL in §4 (except 4.1, which needs `supabase_migrations.schema_migrations`) was syntax-checked read-only against the *local throwaway replay database*, never a remote one. It has **not** been run on any Supabase project; column availability (e.g. `inserted_at`) may differ by CLI version.
