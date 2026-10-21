// Shared contract for docs/audits/LIVE_RELEASE_EVIDENCE.json.
//
// Fail-closed by design: anything that cannot be positively validated is a failure.
// PASS from this module means "the recorded evidence is complete, well-formed, bound to the
// expected commit and internally consistent". It does NOT prove the staging runs, restore
// drill or approval actually happened — that requires independent verification of the
// referenced external records.

export const REQUIRED_EVIDENCE = [
  'releaseCommit',
  'stagingMigrationRun',
  'stagingSmokeRun',
  'stagingRestoreRun',
  'productionApproval',
];

// Required string fields per evidence block (from docs/operations/GO_LIVE_RUNBOOK.md and
// docs/audits/LIVE_RELEASE_EVIDENCE.template.json).
export const REQUIRED_FIELDS = {
  stagingMigrationRun: ['timestamp', 'target', 'operator', 'outcome'],
  stagingSmokeRun: ['timestamp', 'target', 'operator', 'outcome'],
  stagingRestoreRun: ['timestamp', 'recoveryPoint', 'restoreTarget', 'operator', 'outcome'],
  productionApproval: ['timestamp', 'approver', 'decision'],
};

// Vocabulary that counts as a positive result. Anything else (including FAIL, PARTIAL, TBD)
// is rejected rather than interpreted. The runbook only says "outcome"/"decision"; this list is
// a review item and can be widened deliberately.
export const PASSING_OUTCOMES = ['PASS', 'PASSED', 'SUCCESS', 'SUCCEEDED', 'COMPLETED'];
export const APPROVING_DECISIONS = ['APPROVED', 'APPROVE', 'GO'];

const PLACEHOLDERS = /^(todo|tbd|tba|n\/?a|none|null|undefined|unknown|pending|placeholder|example|changeme|xxx+|-+|\.+)$/i;
const SHA_RE = /^[0-9a-f]{40}$/i;
const ISO_RE = /^\d{4}-\d{2}-\d{2}([T ]\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})?)?$/;
export const FORBIDDEN_KEY = /(password|secret|access[_-]?token|database[_-]?url|supabase[_-]?db[_-]?url|private[_-]?key|api[_-]?key|credential)/i;
const CREDENTIAL_URL = /[a-z][a-z0-9+.-]*:\/\/[^/\s:@]+:[^/\s@]+@/i;

const isPlainObject = v => v !== null && typeof v === 'object' && !Array.isArray(v);
const FUTURE_SKEW_MS = 5 * 60 * 1000;

function walkKeys(value, out = []) {
  if (!isPlainObject(value)) return out;
  for (const [k, v] of Object.entries(value)) { out.push(k); walkKeys(v, out); }
  return out;
}

function textProblem(value) {
  if (typeof value !== 'string') return 'must be a string';
  const t = value.trim();
  if (!t) return 'is empty';
  if (PLACEHOLDERS.test(t)) return 'is a placeholder value';
  return null;
}

function timestampProblem(value, now) {
  const base = textProblem(value);
  if (base) return base;
  const t = value.trim();
  if (!ISO_RE.test(t)) return 'is not an ISO-8601 timestamp';
  const ms = Date.parse(t);
  if (Number.isNaN(ms)) return 'is not a valid timestamp';
  if (ms > now + FUTURE_SKEW_MS) return 'is in the future';
  return null;
}

/**
 * @param {unknown} evidence parsed LIVE_RELEASE_EVIDENCE.json
 * @param {object} [opts]
 * @param {string|null} [opts.expectedCommit] revision under assessment; required for a PASS
 * @param {object|null} [opts.smokeEvidence] parsed STAGING_SMOKE_EVIDENCE.json, if present
 * @param {number} [opts.now] epoch ms (injectable for tests)
 * @param {number|null} [opts.maxAgeDays] optional staleness bound; no repository policy exists, so off by default
 * @returns {{failures: {field: string, code: string, message: string}[], failedKeys: string[]}}
 */
export function validateLiveReleaseEvidence(evidence, opts = {}) {
  const { expectedCommit = null, smokeEvidence = null, now = Date.now(), maxAgeDays = null } = opts;
  const failures = [];
  const fail = (field, code, message) => failures.push({ field, code, message: `${field}: ${message}` });

  if (!isPlainObject(evidence)) {
    fail('evidence', 'NOT_AN_OBJECT', 'evidence is not a JSON object');
    return { failures, failedKeys: ['evidence'] };
  }

  // releaseCommit
  const rc = evidence.releaseCommit;
  if (typeof rc !== 'string' || !rc.trim()) fail('releaseCommit', 'MISSING', 'is missing or empty');
  else if (!SHA_RE.test(rc.trim())) fail('releaseCommit', 'MALFORMED', 'is not a full 40-character git SHA');
  else if (!expectedCommit) fail('releaseCommit', 'UNBOUND', 'cannot be verified: no expected commit available (pass --expected-commit or set RELEASE_COMMIT_EXPECTED)');
  else if (!SHA_RE.test(String(expectedCommit).trim())) fail('releaseCommit', 'MALFORMED_EXPECTED', 'expected commit is not a full 40-character git SHA');
  else if (rc.trim().toLowerCase() !== String(expectedCommit).trim().toLowerCase()) fail('releaseCommit', 'COMMIT_MISMATCH', `evidence is for ${rc.trim().slice(0, 12)} but assessed revision is ${String(expectedCommit).trim().slice(0, 12)}`);

  // Structured blocks
  const stamps = {};
  for (const [block, fields] of Object.entries(REQUIRED_FIELDS)) {
    const v = evidence[block];
    if (v === undefined || v === null) { fail(block, 'MISSING', 'is missing'); continue; }
    if (!isPlainObject(v)) { fail(block, 'WRONG_TYPE', 'must be an object'); continue; }
    for (const f of fields) {
      const path = `${block}.${f}`;
      if (!(f in v)) { fail(path, 'MISSING', 'is missing'); continue; }
      const problem = f === 'timestamp' ? timestampProblem(v[f], now) : textProblem(v[f]);
      if (problem) { fail(path, f === 'timestamp' ? 'BAD_TIMESTAMP' : 'INVALID_VALUE', problem); continue; }
      if (f === 'timestamp') stamps[block] = Date.parse(v[f].trim());
      if (f === 'outcome' && !PASSING_OUTCOMES.includes(v[f].trim().toUpperCase())) fail(path, 'NOT_PASSING', `"${v[f].trim()}" is not a recognised passing outcome (${PASSING_OUTCOMES.join('/')})`);
      if (f === 'decision' && !APPROVING_DECISIONS.includes(v[f].trim().toUpperCase())) fail(path, 'NOT_APPROVED', `"${v[f].trim()}" is not an approving decision (${APPROVING_DECISIONS.join('/')})`);
    }
  }

  // Chronology: approval must follow the staging evidence it relies on.
  if (stamps.productionApproval !== undefined) {
    for (const b of ['stagingMigrationRun', 'stagingSmokeRun', 'stagingRestoreRun']) {
      if (stamps[b] !== undefined && stamps[b] > stamps.productionApproval) fail('productionApproval.timestamp', 'CONTRADICTION', `approval is dated before ${b}`);
    }
  }

  // Staleness (only when a policy is supplied)
  if (maxAgeDays !== null && maxAgeDays !== undefined) {
    const limit = now - maxAgeDays * 86_400_000;
    for (const [b, ms] of Object.entries(stamps)) if (ms < limit) fail(`${b}.timestamp`, 'STALE', `older than ${maxAgeDays} day(s)`);
  }

  // Contradictions with other authoritative records
  const auto = isPlainObject(evidence.automatedEvidence) ? evidence.automatedEvidence : {};
  for (const k of ['migrationReconciliation', 'stagingSmoke', 'stagingE2E', 'liveSecurity']) {
    if (String(auto[k]?.status || '').toUpperCase() === 'FAIL') fail(`automatedEvidence.${k}`, 'CONTRADICTION', 'automated record reports FAIL while evidence claims a passing release');
  }
  if (isPlainObject(smokeEvidence) && String(smokeEvidence.status || '').toUpperCase() === 'FAIL') fail('stagingSmokeRun', 'CONTRADICTION', 'STAGING_SMOKE_EVIDENCE.json reports FAIL');

  // Secrets must never live in evidence
  if (walkKeys(evidence).some(k => FORBIDDEN_KEY.test(k))) fail('evidence', 'FORBIDDEN_FIELD', 'contains a credential/secret-like field name');
  if (JSON.stringify(evidence).match(CREDENTIAL_URL)) fail('evidence', 'FORBIDDEN_VALUE', 'contains a URL with embedded credentials');

  const failedKeys = [...new Set(failures.map(f => f.field.split('.')[0]))];
  return { failures, failedKeys };
}

// ---------------------------------------------------------------------------
// Phase 2B.1 additions
// ---------------------------------------------------------------------------

export const SHA_PATTERN = SHA_RE;

/** Optional evidence-age bound. No repository policy exists, so null means "unresolved", not "approved". */
export function resolveMaxAgeDays(cliValue, env = process.env) {
  const raw = String(cliValue ?? env.EVIDENCE_MAX_AGE_DAYS ?? '').trim();
  if (raw === '') return { value: null, error: null };
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return { value: null, error: 'maxAgeDays: must be a positive number' };
  return { value: n, error: null };
}

export const FRESHNESS_POLICY_UNRESOLVED =
  'Evidence freshness policy is UNRESOLVED: no maximum evidence age is configured (set EVIDENCE_MAX_AGE_DAYS to an owner-approved value). Age was NOT verified.';

// Flat identifier schema used by scripts/ingest-production-evidence.mjs (PRODUCTION_EVIDENCE_FILE).
const INGEST_REQUIRED_TEXT = ['stagingMigrationRun', 'stagingSmokeRun', 'stagingRestoreRun', 'productionApproval', 'productionApprovalId', 'productionApprover'];
const INGEST_OPTIONAL_TEXT = ['deploymentId', 'deploymentTarget', 'deploymentOperator', 'migrationRunId', 'migrationOperator', 'rollbackExecutionId', 'rollbackOperator', 'rollbackRestoreRunId'];
const INGEST_OPTIONAL_TIME = ['deploymentAt', 'migrationAppliedAt', 'rollbackExecutedAt'];
const NEGATIVE_RESULT = /^(fail(ed|ure)?|reject(ed)?|denied|declined|error(ed)?|rolled[_ -]?back|aborted|blocked)$/i;

/**
 * Semantic validation of an ingested evidence bundle (flat identifier schema).
 * Parsing/allow-listing is the ingestion script's job; this decides whether the content is usable.
 */
export function validateIngestedEvidence(data, opts = {}) {
  const { expectedCommit = null, now = Date.now(), maxAgeDays = null } = opts;
  const failures = [];
  const fail = (field, code, message) => failures.push({ field, code, message: `${field}: ${message}` });
  if (!isPlainObject(data)) { fail('evidence', 'NOT_AN_OBJECT', 'evidence is not a JSON object'); return { failures }; }

  const rc = data.releaseCommit;
  if (typeof rc !== 'string' || !rc.trim()) fail('releaseCommit', 'MISSING', 'is missing or empty');
  else if (!SHA_RE.test(rc.trim())) fail('releaseCommit', 'MALFORMED', 'is not a full 40-character git SHA');
  else if (!expectedCommit) fail('releaseCommit', 'UNBOUND', 'cannot be verified: no expected commit available');
  else if (!SHA_RE.test(String(expectedCommit).trim())) fail('releaseCommit', 'MALFORMED_EXPECTED', 'expected commit is not a full 40-character git SHA');
  else if (rc.trim().toLowerCase() !== String(expectedCommit).trim().toLowerCase()) fail('releaseCommit', 'COMMIT_MISMATCH', `evidence is for ${rc.trim().slice(0, 12)} but assessed revision is ${String(expectedCommit).trim().slice(0, 12)}`);

  const checkText = (k, required) => {
    if (data[k] === undefined || data[k] === null) { if (required) fail(k, 'MISSING', 'is missing'); return; }
    const p = textProblem(data[k]);
    if (p) { fail(k, 'INVALID_VALUE', p); return; }
    if (NEGATIVE_RESULT.test(data[k].trim())) fail(k, 'NOT_PASSING', `"${data[k].trim()}" records a negative result`);
  };
  for (const k of INGEST_REQUIRED_TEXT) checkText(k, true);
  for (const k of INGEST_OPTIONAL_TEXT) checkText(k, false);

  const stamps = {};
  const checkTime = (k, required) => {
    if (data[k] === undefined || data[k] === null) { if (required) fail(k, 'MISSING', 'is missing'); return; }
    const p = timestampProblem(data[k], now);
    if (p) fail(k, 'BAD_TIMESTAMP', p); else stamps[k] = Date.parse(data[k].trim());
  };
  checkTime('productionApprovedAt', true);
  for (const k of INGEST_OPTIONAL_TIME) checkTime(k, false);
  if (data.rollbackVerified !== undefined && typeof data.rollbackVerified !== 'boolean') fail('rollbackVerified', 'WRONG_TYPE', 'must be a boolean');

  if (maxAgeDays !== null && maxAgeDays !== undefined) {
    const limit = now - maxAgeDays * 86_400_000;
    for (const [k, ms] of Object.entries(stamps)) if (ms < limit) fail(k, 'STALE', `older than ${maxAgeDays} day(s)`);
  }
  return { failures };
}

/**
 * Decision wording for scripts/audit-release-certificate.mjs. Four layers are kept distinct:
 * static repository checks, validated evidence file, independent verification, approval.
 * No value of `releaseDecision` is an approval; `approval` is always NOT_GRANTED_BY_THIS_TOOL.
 */
export function releaseCertificateDecision({ staticChecksPass, evidenceFailures = [], independentAttestation = 'NOT_RECORDED', maxAgeDays = null }) {
  const layers = {
    staticRepositoryChecks: staticChecksPass ? 'PASS' : 'FAIL',
    evidenceFileValidation: evidenceFailures.length ? 'FAIL' : 'PASS',
    independentVerification: independentAttestation === 'PASS' ? 'PASS' : 'NOT_VERIFIED',
    evidenceFreshness: maxAgeDays === null || maxAgeDays === undefined ? 'UNRESOLVED_POLICY' : 'CHECKED',
    approval: 'NOT_GRANTED_BY_THIS_TOOL',
  };
  let releaseDecision;
  if (!staticChecksPass) releaseDecision = 'BLOCKED_STATIC_CHECKS_FAILED';
  else if (evidenceFailures.length) releaseDecision = 'BLOCKED_EXTERNAL_EVIDENCE_REQUIRED';
  else if (layers.independentVerification !== 'PASS') releaseDecision = 'BLOCKED_INDEPENDENT_VERIFICATION_REQUIRED';
  else if (layers.evidenceFreshness !== 'CHECKED') releaseDecision = 'BLOCKED_FRESHNESS_POLICY_UNRESOLVED';
  else releaseDecision = 'EVIDENCE_COMPLETE_NOT_AN_APPROVAL';
  return { releaseDecision, layers, exitCode: releaseDecision === 'EVIDENCE_COMPLETE_NOT_AN_APPROVAL' ? 0 : 1 };
}
