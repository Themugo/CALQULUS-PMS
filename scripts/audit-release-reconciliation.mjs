import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const root = process.cwd();
const out = path.join(root, 'docs', 'audits', 'RELEASE_RECONCILIATION.json');
const evidencePath = path.join(root, 'docs', 'audits', 'LIVE_RELEASE_EVIDENCE.json');
const read = (p) => { try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return {}; } };
const evidence = read(evidencePath);
const required = ['releaseCommit', 'stagingMigrationRun', 'stagingSmokeRun', 'stagingRestoreRun', 'productionApproval'];
const automated = evidence.automatedEvidence || {};
const forbidden = /(password|secret|access[_-]?token|database[_-]?url|supabase[_-]?db[_-]?url)/i;
const raw = fs.existsSync(evidencePath) ? fs.readFileSync(evidencePath, 'utf8') : '';
const missing = required.filter(k => {
  const v = evidence[k];
  if (v == null || v === '') return true;
  if (typeof v === 'string') return !v.trim();
  return Object.values(v).some(x => !String(x ?? '').trim());
});
const autoStatuses = Object.fromEntries([
  'migrationReconciliation','stagingSmoke','stagingE2E','stagingRoleCertification','liveSecurity','rollbackExecution','artifactProvenance','deploymentDrift','rollbackReadiness'
].map(k => [k, automated[k]?.status || 'NOT_RECORDED']));
const migration = read(path.join(root, 'docs', 'audits', 'LIVE_MIGRATION_RECONCILIATION.json'));
const security = read(path.join(root, 'docs', 'audits', 'LIVE_SECURITY_EVIDENCE.json'));
const rollback = read(path.join(root, 'docs', 'audits', 'ROLLBACK_EXECUTION_EVIDENCE.json'));
const provenance = read(path.join(root, 'docs', 'audits', 'RELEASE_ARTIFACT_PROVENANCE.json'));
const drift = read(path.join(root, 'docs', 'audits', 'DEPLOYMENT_DRIFT.json'));
const rollbackReadiness = read(path.join(root, 'docs', 'audits', 'ROLLBACK_READINESS.json'));
const report = {
  generatedAt: new Date().toISOString(),
  status: 'BLOCKED',
  requiredExternalEvidence: required,
  missingExternalEvidence: missing,
  automatedChecks: autoStatuses,
  liveMigration: migration.status || 'NOT_RECORDED',
  liveSecurity: security.status || 'NOT_RECORDED',
  rollbackExecution: rollback.status || 'NOT_RECORDED',
  artifactProvenance: provenance.status || 'NOT_RECORDED',
  deploymentDrift: drift.status || 'NOT_RECORDED',
  rollbackReadiness: rollbackReadiness.status || 'NOT_RECORDED',
  evidenceSecretScan: forbidden.test(raw) ? 'FAIL' : 'PASS',
  evidenceSha256: fs.existsSync(evidencePath) ? crypto.createHash('sha256').update(raw).digest('hex') : null,
  rule: 'External deployment, restore, and approval evidence must be explicit. Repository automation cannot manufacture production proof.'
};
if (!missing.length && report.evidenceSecretScan === 'PASS' && migration.status === 'PASS' && security.status === 'PASS' && rollback.status === 'PASS' && provenance.status === 'PASS' && drift.status === 'PASS' && rollbackReadiness.status === 'PASS') report.status = 'PASS';
fs.writeFileSync(out, JSON.stringify(report, null, 2) + '\n');
console.log(`release-reconciliation: ${report.status}`);
if (report.status !== 'PASS') process.exit(1);
