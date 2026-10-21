import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { validateIngestedEvidence, resolveMaxAgeDays, FRESHNESS_POLICY_UNRESOLVED } from './lib/release-evidence-contract.mjs';

const root = process.cwd();
const audits = path.join(root, 'docs', 'audits');
const argv = process.argv.slice(2);
const opt = n => { const i = argv.findIndex(a => a === `--${n}` || a.startsWith(`--${n}=`)); if (i < 0) return null; return argv[i].includes('=') ? argv[i].slice(argv[i].indexOf('=') + 1) : (argv[i + 1] ?? ''); };
const source = opt('source') ?? process.env.PRODUCTION_EVIDENCE_FILE ?? '';
const out = path.resolve(root, opt('out') ?? path.join('docs', 'audits', 'PRODUCTION_EVIDENCE_INGESTION.json'));
let expectedCommit = String(opt('expected-commit') ?? process.env.RELEASE_COMMIT_EXPECTED ?? '').trim();
if (!expectedCommit) { try { expectedCommit = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim(); } catch { /* validator fails closed */ } }
const age = resolveMaxAgeDays(opt('max-age-days'));
const allowed = new Set(['releaseCommit','deploymentId','deploymentTarget','deploymentAt','deploymentOperator','migrationRunId','migrationAppliedAt','migrationOperator','stagingMigrationRun','stagingSmokeRun','stagingRestoreRun','productionApproval','productionApprovalId','productionApprover','productionApprovedAt','rollbackExecutionId','rollbackExecutedAt','rollbackOperator','rollbackRestoreRunId','rollbackVerified']);
const forbidden = /(password|secret|access[_-]?token|database[_-]?url|supabase[_-]?db[_-]?url|private[_-]?key|api[_-]?key|credential)/i;
const read = p => JSON.parse(fs.readFileSync(p,'utf8'));
const sha256 = b => crypto.createHash('sha256').update(b).digest('hex');
const findings=[];
if (!source) { /* external evidence is optional locally; status remains EXTERNAL_REQUIRED */ }
else if (!fs.existsSync(source)) findings.push('Supplied production evidence file does not exist.');
let raw=null, data=null;
if (source && !findings.length) { try { raw=fs.readFileSync(source); data=JSON.parse(raw.toString('utf8')); } catch { findings.push('Supplied production evidence is not valid JSON.'); } }
const walk=(v, keys=[])=>{ if(!v||typeof v!=='object') return keys; return Object.entries(v).reduce((a,[k,x])=>a.concat(k,walk(x)),keys); };
if (data) {
  const keys=walk(data);
  if (keys.some(k=>forbidden.test(k))) findings.push('Evidence contains a forbidden credential/secret field name.');
  const unknown=keys.filter(k=>typeof k==='string' && !allowed.has(k) && !['status','generatedAt','source','evidenceVersion','notes'].includes(k));
  if (unknown.length) findings.push(`Evidence contains unsupported field(s): ${[...new Set(unknown)].slice(0,10).join(', ')}`);
  for (const k of ['releaseCommit','deploymentId','migrationRunId','productionApprovalId']) if (data[k] !== undefined && typeof data[k] !== 'string') findings.push(`${k} must be a string.`);
  for (const k of ['deploymentAt','migrationAppliedAt','productionApprovedAt','rollbackExecutedAt']) if (data[k] && Number.isNaN(Date.parse(data[k]))) findings.push(`${k} is not a valid timestamp.`);
}
if (age.error) findings.push(age.error);
if (data) findings.push(...validateIngestedEvidence(data, { expectedCommit: expectedCommit || null, maxAgeDays: age.value }).failures.map(f => f.message));
// PASS means: file parsed, allow-listed AND semantically valid against the shared contract. It is not an approval.
const status = findings.length ? 'FAIL' : data ? 'PASS' : 'EXTERNAL_REQUIRED';
const report={generatedAt:new Date().toISOString(),status,evidenceVersion:'1.0',sourceFileProvided:Boolean(source),assessedCommit:expectedCommit||null,validation:status==='PASS'?'VALIDATED_AGAINST_SHARED_CONTRACT':'NOT_VALIDATED',freshnessPolicy:age.value===null?'UNRESOLVED':`MAX_AGE_${age.value}_DAYS`,limitations:age.value===null?[FRESHNESS_POLICY_UNRESOLVED]:[],approvalGranted:false,sourceSha256:raw?sha256(raw):null,acceptedFields:[...allowed].sort(),findings,rule:'PASS here means the supplied evidence is well-formed, bound to the assessed commit and internally consistent; it is NOT independent verification or release approval. Production evidence ingestion accepts identifiers and timestamps only; secrets and unsupported fields are rejected. Raw external evidence is never copied into repository evidence.'};
fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,JSON.stringify(report,null,2)+'\n');
console.log(`production-evidence-ingestion: ${status}`);
for(const f of findings) console.log(`- ${f}`);
if(status==='PASS'&&age.value===null) console.log(`- warning: ${FRESHNESS_POLICY_UNRESOLVED}`);
if(status==='FAIL') process.exit(1);
