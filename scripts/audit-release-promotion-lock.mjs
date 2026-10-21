import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { SHA_PATTERN } from './lib/release-evidence-contract.mjs';

const root = process.cwd();
// The intended release revision is established independently of the evidence: --expected-commit or
// RELEASE_COMMIT_EXPECTED (the existing variable also used by the drift/provenance audits and the
// Phase 120 runbook). The evidence's own releaseCommit is only a claim to be checked, never the authority.
const argv = process.argv.slice(2);
const opt = n => { const i = argv.findIndex(a => a === `--${n}` || a.startsWith(`--${n}=`)); if (i < 0) return null; return argv[i].includes('=') ? argv[i].slice(argv[i].indexOf('=') + 1) : (argv[i + 1] ?? ''); };
const out = path.resolve(root, opt('out') ?? path.join('docs', 'audits', 'RELEASE_PROMOTION_LOCK.json'));
const read = p => { try { return JSON.parse(fs.readFileSync(path.join(root,p),'utf8')); } catch { return {}; } };
const env = k => String(process.env[k] || '').trim();
let commit = '';
try { commit = execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim(); } catch {}
const evidence = read('docs/audits/LIVE_RELEASE_EVIDENCE.json');
const reconciliation = read('docs/audits/RELEASE_RECONCILIATION.json');
const provenance = read('docs/audits/RELEASE_ARTIFACT_PROVENANCE.json');
const drift = read('docs/audits/DEPLOYMENT_DRIFT.json');
const rollback = read('docs/audits/ROLLBACK_READINESS.json');
const required = {
  authorizationId: env('RELEASE_AUTHORIZATION_ID'),
  authorizedBy: env('RELEASE_AUTHORIZED_BY'),
  authorizedAt: env('RELEASE_AUTHORIZED_AT'),
  scope: env('RELEASE_AUTHORIZATION_SCOPE'),
};
const validDate = required.authorizedAt ? !Number.isNaN(Date.parse(required.authorizedAt)) : false;
const scopeOk = required.scope.toLowerCase() === 'production';
const expected = String(opt('expected-commit') ?? env('RELEASE_COMMIT_EXPECTED')).trim();
const claimed = String(evidence.releaseCommit || '').trim();
const norm = v => String(v).toLowerCase();
const expectedProvided = Boolean(expected);
const expectedWellFormed = expectedProvided && SHA_PATTERN.test(expected);
const candidateWellFormed = SHA_PATTERN.test(commit);
const candidateMatchesExpected = expectedWellFormed && candidateWellFormed && norm(commit) === norm(expected);
const evidenceMatchesExpected = expectedWellFormed && SHA_PATTERN.test(claimed) && norm(claimed) === norm(expected);
const commitOk = candidateMatchesExpected && evidenceMatchesExpected;
const checks = {
  authorizationIdRecorded: Boolean(required.authorizationId),
  authorizedByRecorded: Boolean(required.authorizedBy),
  authorizationTimestampValid: validDate,
  authorizationScopeProduction: scopeOk,
  expectedCommitProvided: expectedProvided,
  expectedCommitWellFormed: expectedWellFormed,
  candidateCommitMatchesExpected: candidateMatchesExpected,
  evidenceCommitMatchesExpected: evidenceMatchesExpected,
  releaseCommitBound: commitOk,
  artifactProvenancePass: provenance.status === 'PASS',
  deploymentDriftPass: drift.status === 'PASS',
  rollbackReadinessPrepared: ['PASS','EXTERNAL_REQUIRED'].includes(rollback.status),
  reconciliationPass: reconciliation.status === 'PASS',
};
const missing = Object.entries(checks).filter(([,v]) => !v).map(([k]) => k);
const externalRequired = missing.some(k => ['authorizationIdRecorded','authorizedByRecorded','authorizationTimestampValid','authorizationScopeProduction','expectedCommitProvided','expectedCommitWellFormed','candidateCommitMatchesExpected','evidenceCommitMatchesExpected','releaseCommitBound','reconciliationPass'].includes(k));
const report = {
  generatedAt: new Date().toISOString(),
  status: missing.length ? (externalRequired ? 'EXTERNAL_REQUIRED' : 'BLOCKED') : 'PASS',
  authorization: {
    authorizationId: required.authorizationId || null,
    authorizedBy: required.authorizedBy || null,
    authorizedAt: required.authorizedAt || null,
    scope: required.scope || null,
    credentialsPersisted: false,
  },
  candidateReleaseCommit: commit || null,
  expectedReleaseCommit: expected || null,
  evidenceClaimedCommit: claimed || null,
  expectedCommitSource: opt('expected-commit') ? '--expected-commit' : (env('RELEASE_COMMIT_EXPECTED') ? 'RELEASE_COMMIT_EXPECTED' : 'NONE'),
  approvalGranted: false,
  checks,
  missing,
  rule: 'Production promotion requires explicit authorization bound to the exact certified release commit. Authorization credentials/secrets are never persisted by this audit.'
};
fs.mkdirSync(path.dirname(out),{recursive:true});
fs.writeFileSync(out,JSON.stringify(report,null,2)+'\n');
console.log(`release-promotion-lock: ${report.status}`);
for (const m of missing) console.log(`- failed: ${m}`);
// Fail closed: only PASS passes. EXTERNAL_REQUIRED (missing authorization / revision) is not a pass.
if (report.status !== 'PASS') process.exitCode = 1;
