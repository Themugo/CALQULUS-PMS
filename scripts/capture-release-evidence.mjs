import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
const root=process.cwd();
const evidencePath=path.join(root,'docs','audits','LIVE_RELEASE_EVIDENCE.json');
const readJson=(file, fallback={})=>{try{return JSON.parse(fs.readFileSync(path.join(root,file),'utf8'));}catch{return fallback;}};
let evidence=readJson('docs/audits/LIVE_RELEASE_EVIDENCE.json',{});
let commit=process.env.RELEASE_COMMIT||''; try { if(!commit) commit=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(); } catch {}
if(commit) evidence.releaseCommit=commit;
const statusOnly=(file)=>{const v=readJson(file,{}); return {status:v.status||'NOT_RECORDED',generatedAt:v.generatedAt||null};};
evidence.automatedEvidence={
  capturedAt:new Date().toISOString(),
  migrationReconciliation:statusOnly('docs/audits/LIVE_MIGRATION_RECONCILIATION.json'),
  stagingSmoke:statusOnly('docs/audits/STAGING_SMOKE_EVIDENCE.json'),
  stagingE2E:statusOnly('docs/audits/STAGING_E2E_EVIDENCE.json'),
  disasterRecovery:statusOnly('docs/audits/DISASTER_RECOVERY_CERTIFICATE.json')
};
// Never copy credentials, tokens, database URLs, or full command output into the release evidence file.
delete evidence.automatedEvidence.migrationReconciliation.databaseUrl;
fs.writeFileSync(evidencePath,JSON.stringify(evidence,null,2)+'\n');
console.log(`release-evidence-captured: ${commit?'PASS':'EXTERNAL_REQUIRED'}`);
