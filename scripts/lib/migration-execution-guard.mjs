// Phase 2D.1 — migration execution safeguards (fail closed).
//
// This module decides whether a migration-changing operation may even be
// *considered*. In this phase the answer is always "no": no approved
// authorization mechanism exists, and live migration state is UNKNOWN.
// It never executes anything and never reads secret values.
//
// See docs/engineering/PHASE_2D_1_MIGRATION_EXECUTION_SAFEGUARDS.md.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

// Same filename rule the Supabase CLI applies (assumed; CLI not run here).
export const CLI_MIGRATION_PATTERN = /^(\d+)_.+\.sql$/;
export const PROJECT_REF_PATTERN = /^[a-z0-9]{20}$/;
const HEX64 = /^[0-9a-f]{64}$/;

export const GUIDE_DOC = 'docs/engineering/PHASE_2D_1_MIGRATION_EXECUTION_SAFEGUARDS.md';

const here = path.dirname(fileURLToPath(import.meta.url));
const AUDIT_SCRIPT = path.resolve(here, '..', 'audit-migration-chain.mjs');

/** Only ever echo a project ref if it is a well-formed ref; never echo arbitrary input. */
export function safeRef(value) {
  return typeof value === 'string' && PROJECT_REF_PATTERN.test(value) ? value : '<unset-or-invalid>';
}

/** Inspect the migration directory without trusting the history policy. */
export function inspectMigrationChain(root) {
  const dir = path.join(root, 'supabase', 'migrations');
  let names;
  try {
    names = fs.readdirSync(dir, { withFileTypes: true }).filter(e => e.isFile()).map(e => e.name).sort();
  } catch {
    return { ok: false, error: 'MIGRATIONS_UNREADABLE', files: [], nonconforming: [], duplicates: [] };
  }
  const sql = names.filter(n => n.toLowerCase().endsWith('.sql'));
  const nonconforming = sql.filter(n => !CLI_MIGRATION_PATTERN.test(n));
  const byVersion = new Map();
  for (const n of sql) {
    const m = n.match(CLI_MIGRATION_PATTERN);
    if (!m) continue;
    byVersion.set(m[1], [...(byVersion.get(m[1]) || []), n]);
  }
  const duplicates = [...byVersion.entries()].filter(([, v]) => v.length > 1).map(([version, files]) => ({ version, files }));
  return { ok: true, files: sql, nonconforming, duplicates };
}

export function readConfiguredProjectRef(root) {
  try {
    const text = fs.readFileSync(path.join(root, 'supabase', 'config.toml'), 'utf8');
    return text.match(/^project_id\s*=\s*"([^"]+)"/m)?.[1] ?? null;
  } catch {
    return null;
  }
}

function readPolicy(root) {
  try {
    return JSON.parse(fs.readFileSync(path.join(root, 'config', 'migration-history-policy.json'), 'utf8'));
  } catch {
    return null;
  }
}

/** Reuse the existing migration-chain auditor as a subprocess (read-only; prints to the console only). */
export function defaultRunAudit(root) {
  const r = spawnSync(process.execPath, [AUDIT_SCRIPT], { cwd: root, encoding: 'utf8', timeout: 60000 });
  if (r.error || r.status === null) return { available: false, passed: false };
  return { available: true, passed: r.status === 0 };
}

/**
 * Authorization is NOT implemented in this phase. The function lists what a
 * future, separately reviewed mechanism must supply, and can never return
 * `authorized: true`. Nothing here is a bypass.
 */
export function assessAuthorization(input) {
  const a = input && typeof input === 'object' ? input : {};
  const missing = [];
  if (!PROJECT_REF_PATTERN.test(String(a.targetRef || ''))) missing.push('explicit target project identity');
  if (!HEX64.test(String(a.reviewedPlanSha256 || ''))) missing.push('reviewed migration plan (sha256)');
  if (a.preflightPassed !== true) missing.push('successful preflight');
  if (!(a.recoverability && a.recoverability.backupVerified === true && String(a.recoverability.restoreRehearsalId || '').trim())) {
    missing.push('verified recoverability (backup + successful restore rehearsal)');
  }
  if (a.operatorConfirmation !== true) missing.push('deliberate operator confirmation');
  return {
    authorized: false,
    missing,
    reason: 'No approved authorization mechanism exists in this repository; execution stays disabled until one is separately reviewed.',
  };
}

/**
 * Evaluate every precondition and return all refusals. `allowed` is always
 * false in this phase because EXECUTION_DISABLED is unconditional.
 */
export function evaluateMigrationPreflight({ root, targetRef = null, authorization = null, runAudit = defaultRunAudit } = {}) {
  const refusals = [];
  const add = (code, message) => refusals.push({ code, message });

  add('EXECUTION_DISABLED', 'Migration execution is disabled. No approved authorization mechanism exists and live migration state is UNKNOWN.');

  const chain = inspectMigrationChain(root);
  if (!chain.ok) {
    add('MIGRATIONS_UNREADABLE', 'supabase/migrations could not be read.');
  } else {
    if (chain.duplicates.length) {
      add('DUPLICATE_VERSIONS', `${chain.duplicates.length} migration version(s) are used by more than one file (e.g. ${chain.duplicates.slice(0, 3).map(d => d.version).join(', ')}). The history policy does not count as resolution.`);
    }
    if (chain.nonconforming.length) {
      add('NONCONFORMING_FILENAMES', `${chain.nonconforming.length} migration file(s) do not match the CLI naming pattern and are unclassified: ${chain.nonconforming.join(', ')}.`);
    }
  }

  const policy = readPolicy(root);
  if (!policy) add('POLICY_UNREADABLE', 'config/migration-history-policy.json is missing or invalid.');
  else if (policy.liveReconciliationRequired !== false) add('LIVE_RECONCILIATION_REQUIRED', 'The migration history policy states live reconciliation is still required.');

  let audit;
  try { audit = runAudit(root); } catch { audit = { available: false, passed: false }; }
  if (!audit || audit.available !== true) add('AUDIT_UNAVAILABLE', 'The migration integrity audit could not be run.');
  else if (audit.passed !== true) add('AUDIT_FAILED', 'The migration integrity audit failed.');

  const configured = readConfiguredProjectRef(root);
  if (!targetRef || !PROJECT_REF_PATTERN.test(String(targetRef))) {
    add('TARGET_UNVERIFIED', 'No explicit, well-formed target project identity was supplied. The configured project_id is never assumed to be the target.');
  } else if (!configured) {
    add('TARGET_UNVERIFIED', 'supabase/config.toml has no project_id to compare with the supplied target.');
  } else if (configured !== targetRef) {
    add('TARGET_MISMATCH', 'The supplied target does not match the configured project_id; refusing rather than choosing one.');
  }

  const auth = assessAuthorization(authorization);
  add('AUTHORIZATION_MISSING', `Authorization cannot be granted: ${auth.reason}${auth.missing.length ? ` Missing: ${auth.missing.join('; ')}.` : ''}`);

  return { allowed: false, refusals, chain, configuredRef: configured };
}

/** Conditions under which any command may contact a remote project (read-only or not). */
export function remoteContactBlockers({ root, expectedRef = null }) {
  const reasons = [];
  const chain = inspectMigrationChain(root);
  if (!chain.ok) reasons.push('MIGRATIONS_UNREADABLE');
  else {
    if (chain.duplicates.length) reasons.push('DUPLICATE_VERSIONS');
    if (chain.nonconforming.length) reasons.push('NONCONFORMING_FILENAMES');
  }
  const configured = readConfiguredProjectRef(root);
  if (!expectedRef || !PROJECT_REF_PATTERN.test(String(expectedRef))) reasons.push('TARGET_UNVERIFIED');
  else if (!configured || configured !== expectedRef) reasons.push('TARGET_MISMATCH');
  return reasons;
}
