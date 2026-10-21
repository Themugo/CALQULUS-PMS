import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { REQUIRED_EVIDENCE, validateLiveReleaseEvidence, resolveMaxAgeDays, FRESHNESS_POLICY_UNRESOLVED } from './lib/release-evidence-contract.mjs';

// Production evidence gate (fail-closed). See docs/engineering/RELEASE_BLOCKER_REGISTER.md (B-003).
// Options (all optional, defaults preserve the previous CLI behaviour):
//   --evidence <file>         default docs/audits/LIVE_RELEASE_EVIDENCE.json
//   --smoke <file>            default docs/audits/STAGING_SMOKE_EVIDENCE.json
//   --expected-commit <sha>   default $RELEASE_COMMIT_EXPECTED, else `git rev-parse HEAD`
//   --max-age-days <n>        optional staleness bound (no repository policy exists; off by default)
//   --out <file>              default docs/audits/PRODUCTION_EVIDENCE_GATE.json
//   --no-write                do not write a report file
const root = process.cwd();
const args = process.argv.slice(2);
const opt = name => {
  const i = args.findIndex(a => a === `--${name}` || a.startsWith(`--${name}=`));
  if (i < 0) return null;
  return args[i].includes('=') ? args[i].slice(args[i].indexOf('=') + 1) : (args[i + 1] ?? '');
};
const resolve = p => path.resolve(root, p);
const evidencePath = resolve(opt('evidence') ?? path.join('docs', 'audits', 'LIVE_RELEASE_EVIDENCE.json'));
const smokePath = resolve(opt('smoke') ?? path.join('docs', 'audits', 'STAGING_SMOKE_EVIDENCE.json'));
const outPath = resolve(opt('out') ?? path.join('docs', 'audits', 'PRODUCTION_EVIDENCE_GATE.json'));
const noWrite = args.includes('--no-write');

const failures = [];
let evidence = null;
let loaded = false;
let smoke = null;
let smokeStatus = 'NOT_RECORDED';
let expectedCommit = '';
let maxAgeDays = null;

try {
  if (!fs.existsSync(evidencePath)) {
    failures.push({ field: 'evidence', code: 'FILE_MISSING', message: `evidence: file not found (${path.relative(root, evidencePath)})` });
  } else {
    try { evidence = JSON.parse(fs.readFileSync(evidencePath, 'utf8')); loaded = true; }
    catch { failures.push({ field: 'evidence', code: 'INVALID_JSON', message: 'evidence: file is not valid JSON' }); }
  }
  if (fs.existsSync(smokePath)) {
    try { smoke = JSON.parse(fs.readFileSync(smokePath, 'utf8')); smokeStatus = smoke?.status || 'NOT_RECORDED'; }
    catch { failures.push({ field: 'smokeEvidence', code: 'INVALID_JSON', message: 'smokeEvidence: staging smoke evidence file is not valid JSON' }); }
  }

  expectedCommit = (opt('expected-commit') ?? process.env.RELEASE_COMMIT_EXPECTED ?? '').trim();
  if (!expectedCommit) { try { expectedCommit = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim(); } catch { /* unresolved -> fail closed in validator */ } }

  const age = resolveMaxAgeDays(opt('max-age-days'));
  maxAgeDays = age.value;
  if (age.error) failures.push({ field: 'maxAgeDays', code: 'BAD_OPTION', message: age.error });

  if (loaded) failures.push(...validateLiveReleaseEvidence(evidence, { expectedCommit: expectedCommit || null, smokeEvidence: smoke, maxAgeDays }).failures);
} catch (e) {
  failures.push({ field: 'audit', code: 'AUDIT_ERROR', message: `audit: could not determine evidence validity (${e?.message || e})` });
}

const missingEvidence = REQUIRED_EVIDENCE.filter(k => failures.some(f => f.field === k || f.field.startsWith(`${k}.`)) || !loaded);
const status = failures.length === 0 ? 'PASS' : 'BLOCKED';
const report = {
  generatedAt: new Date().toISOString(),
  status,
  requiredEvidence: REQUIRED_EVIDENCE,
  missingEvidence,
  failures,
  assessedCommit: expectedCommit || null,
  smokeEvidenceStatus: smokeStatus,
  freshnessPolicy: maxAgeDays === null ? 'UNRESOLVED' : `MAX_AGE_${maxAgeDays}_DAYS`,
  limitations: maxAgeDays === null ? [FRESHNESS_POLICY_UNRESOLVED] : [],
  scope: 'Checks that recorded release evidence is complete, well-formed, bound to the assessed commit and internally consistent.',
  notProofOf: 'PASS does not prove that staging runs, restore drills or approvals occurred, nor production readiness, authorization/tenant isolation or financial integrity. Those need independent verification of the referenced external records.',
  goLiveRule: 'Never infer live deployment success from repository audits alone.',
};
if (!noWrite) {
  try { fs.mkdirSync(path.dirname(outPath), { recursive: true }); fs.writeFileSync(outPath, JSON.stringify(report, null, 2) + '\n'); }
  catch (e) { console.error(`production-evidence-gate: could not write report (${e?.message || e})`); process.exitCode = 1; }
}
console.log(`production-evidence-gate: ${status}`);
for (const f of failures) console.log(`- ${f.message}`);
if (maxAgeDays === null) console.log(`- warning: ${FRESHNESS_POLICY_UNRESOLVED}`);
if (status === 'PASS') console.log('- note: recorded evidence is well-formed and consistent; this is not independent verification or release approval.');
if (status !== 'PASS') process.exitCode = 1;
