import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { validateLiveReleaseEvidence, resolveMaxAgeDays, releaseCertificateDecision, FRESHNESS_POLICY_UNRESOLVED } from './lib/release-evidence-contract.mjs';

// NOT A CERTIFICATE OF RELEASE. This command reports four separate layers:
//   1. static repository checks   2. evidence file validation
//   3. independent verification   4. approval (never granted by this tool)
// It exits 0 only when all of layers 1-3 hold AND an evidence-age policy is configured; even then the
// decision is "EVIDENCE_COMPLETE_NOT_AN_APPROVAL". Options: --out <file>, --no-write.
const root = process.cwd();
const args = process.argv.slice(2);
const opt = n => { const i = args.findIndex(a => a === `--${n}` || a.startsWith(`--${n}=`)); if (i < 0) return null; return args[i].includes('=') ? args[i].slice(args[i].indexOf('=') + 1) : (args[i + 1] ?? ''); };
const checks = [
  ['production', 'npm', ['run', 'audit:prod']],
  ['security-boundary', 'npm', ['run', 'audit:security-boundary']],
  ['cross-role', 'npm', ['run', 'audit:cross-role']],
  ['final-security', 'npm', ['run', 'audit:final-security']],
  ['migration-chain', 'npm', ['run', 'audit:migration-chain']],
];
const results = [];
for (const [name, cmd, a] of checks) {
  try {
    execFileSync(cmd, a, { cwd: root, stdio: 'pipe', encoding: 'utf8' });
    results.push({ name, status: 'PASS' });
  } catch (error) {
    results.push({ name, status: 'FAIL', output: String(error.stdout || error.stderr || '').slice(-1500) });
  }
}
const readJson = f => { try { return JSON.parse(fs.readFileSync(path.join(root, f), 'utf8')); } catch { return null; } };
const plan = readJson('docs/audits/MIGRATION_REPAIR_PLAN.json') || { status: 'NOT_RECORDED', duplicateGroups: [] };

let expectedCommit = String(opt('expected-commit') ?? process.env.RELEASE_COMMIT_EXPECTED ?? '').trim();
if (!expectedCommit) { try { expectedCommit = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim(); } catch {} }
const evidence = readJson('docs/audits/LIVE_RELEASE_EVIDENCE.json');
const age = resolveMaxAgeDays(opt('max-age-days'));
const evidenceFailures = evidence === null
  ? [{ message: 'evidence: LIVE_RELEASE_EVIDENCE.json is missing or not valid JSON' }]
  : validateLiveReleaseEvidence(evidence, { expectedCommit: expectedCommit || null, smokeEvidence: readJson('docs/audits/STAGING_SMOKE_EVIDENCE.json'), maxAgeDays: age.value }).failures;
if (age.error) evidenceFailures.push({ message: age.error });
const attestation = readJson('docs/audits/INDEPENDENT_RELEASE_ATTESTATION.json')?.status || 'NOT_RECORDED';

const decision = releaseCertificateDecision({
  staticChecksPass: results.every(r => r.status === 'PASS'),
  evidenceFailures, independentAttestation: attestation, maxAgeDays: age.value,
});
const report = {
  generatedAt: new Date().toISOString(),
  notice: 'This report is NOT a release certification, authorization or approval. Release remains blocked until all layers below are satisfied and a human approval is recorded.',
  repositoryStaticChecks: results,
  migrationHistory: { status: plan.status, duplicateGroups: (plan.duplicateGroups || []).length },
  assessedCommit: expectedCommit || null,
  layers: decision.layers,
  evidenceFailures: evidenceFailures.map(f => f.message),
  limitations: age.value === null ? [FRESHNESS_POLICY_UNRESOLVED] : [],
  externalGatesStillRequiringIndependentProof: [
    'Live Supabase migration history reconciled against MIGRATION_REPAIR_PLAN.json',
    'Clean staging migration applied successfully',
    'Staging role-isolation smoke test completed',
    'Production deployment smoke test completed against the real URL',
  ],
  releaseDecision: decision.releaseDecision,
};
if (!args.includes('--no-write')) {
  const out = path.resolve(root, opt('out') ?? path.join('docs', 'audits', 'RELEASE_SECURITY_CERTIFICATE.json'));
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, JSON.stringify(report, null, 2) + '\n');
}
for (const result of results) console.log(`${result.status} ${result.name}`);
console.log(`RELEASE STATUS: ${report.releaseDecision} (not an approval)`);
for (const [k, v] of Object.entries(decision.layers)) console.log(`  ${k}: ${v}`);
for (const f of evidenceFailures) console.log(`  - ${f.message}`);
if (age.value === null) console.log(`  - ${FRESHNESS_POLICY_UNRESOLVED}`);
process.exitCode = decision.exitCode;
