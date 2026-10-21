import fs from 'node:fs';
import path from 'node:path';

// Gate over PRODUCTION_EVIDENCE_INGESTION.json. Fail-closed: only a PASS produced by the validating
// ingestion script passes. EXTERNAL_REQUIRED / NOT_RECORDED / FAIL / unknown all exit non-zero.
// (Previously EXTERNAL_REQUIRED exited 0.) --report <file> overrides the report location.
const args = process.argv.slice(2);
const i = args.indexOf('--report');
const p = path.resolve(process.cwd(), i >= 0 ? (args[i + 1] ?? '') : path.join('docs', 'audits', 'PRODUCTION_EVIDENCE_INGESTION.json'));
let r = null; try { r = JSON.parse(fs.readFileSync(p, 'utf8')); } catch {}
let status = r?.status || 'NOT_RECORDED';
// A PASS that was not produced by the validating ingestion (no validation marker) is not trusted.
if (status === 'PASS' && r?.validation !== 'VALIDATED_AGAINST_SHARED_CONTRACT') status = 'UNVALIDATED_PASS';
console.log(`production-evidence-ingestion-audit: ${status}`);
if (status === 'UNVALIDATED_PASS') console.log('- report lacks validation marker; re-run npm run ingest:production-evidence');
for (const f of r?.findings || []) console.log(`- ${f}`);
if (status === 'EXTERNAL_REQUIRED') console.log('- no production evidence has been ingested; this is not a pass');
if (r?.status === 'PASS') console.log('- note: validated evidence is not independent verification or release approval');
if (status !== 'PASS') process.exitCode = 1;
