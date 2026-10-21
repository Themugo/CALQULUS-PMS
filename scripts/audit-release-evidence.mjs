import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {REQUIRED_EVIDENCE,validateLiveReleaseEvidence} from './lib/release-evidence-contract.mjs';
const root=process.cwd();
const file=path.join(root,'docs','audits','LIVE_RELEASE_EVIDENCE.json');
let evidence=null; let readError='';
try{evidence=JSON.parse(fs.readFileSync(file,'utf8'));}catch(e){readError=e?.code==='ENOENT'?'evidence file not found':'evidence file is not valid JSON';}
const required=REQUIRED_EVIDENCE;
let expectedCommit=String(process.env.RELEASE_COMMIT_EXPECTED||'').trim();
if(!expectedCommit){try{expectedCommit=execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8',stdio:['ignore','pipe','ignore']}).trim();}catch{}}
const check=evidence===null?{failures:[{message:`evidence: ${readError||'evidence is not a JSON object'}`}],failedKeys:required}:validateLiveReleaseEvidence(evidence,{expectedCommit:expectedCommit||null});
const missing=check.failedKeys;
const auto=(evidence&&evidence.automatedEvidence)||{};
const autoChecks={migrationReconciliation:auto.migrationReconciliation?.status||'NOT_RECORDED',stagingSmoke:auto.stagingSmoke?.status||'NOT_RECORDED',stagingE2E:auto.stagingE2E?.status||'NOT_RECORDED',stagingRoleCertification:auto.stagingRoleCertification?.status||'NOT_RECORDED',liveSecurity:auto.liveSecurity?.status||'NOT_RECORDED'};
const forbiddenKeys=/(^|\")((?:[^\"]*password[^\"]*)|(?:[^\"]*secret[^\"]*)|(?:[^\"]*access_token[^\"]*)|(?:database_url|supabase_db_url))(\"|\s*:)/i;
let raw='';try{raw=fs.readFileSync(file,'utf8');}catch{}
const secretLeak=forbiddenKeys.test(raw);
const report={generatedAt:new Date().toISOString(),status:missing.length||secretLeak?'BLOCKED':'PASS',requiredEvidence:required,missingEvidence:missing,failures:check.failures.map(f=>f.message),automatedChecks:autoChecks,secretLeakDetected:secretLeak,rule:'External evidence must be explicitly recorded; repository automation never invents staging, recovery, or production approval evidence.'};
fs.writeFileSync(path.join(root,'docs','audits','RELEASE_EVIDENCE_GATE.json'),JSON.stringify(report,null,2)+'\n');
console.log(`release-evidence-audit: ${report.status}`);
if(missing.length){console.log(`- missing or invalid: ${missing.join(', ')}`);for(const f of check.failures)console.log(`  - ${f.message}`);}
if(secretLeak) console.log('- possible credential/token field detected in evidence');
if(report.status!=='PASS') process.exit(1);
