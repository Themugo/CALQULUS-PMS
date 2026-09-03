import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const out = path.join(root, 'docs', 'audits', 'CI_RELEASE_GATE.json');
const read = (name) => { try { return JSON.parse(fs.readFileSync(path.join(root,'docs','audits',name),'utf8')); } catch { return null; } };
const dependency = read('DEPENDENCY_PROVENANCE.json');
const manifest = read('SIGNED_RELEASE_MANIFEST_AUDIT.json');
const dependencyManifest = read('DEPENDENCY_PROVENANCE.json');
const requiredFiles = [
  'scripts/audit-dependency-provenance.mjs',
  'scripts/audit-release-manifest.mjs',
  '.github/workflows/release-integrity-gate.yml'
];
const missingFiles = requiredFiles.filter(f => !fs.existsSync(path.join(root,f)));
const checks = {
  dependencyProvenance: dependencyManifest?.status || dependency?.status || 'NOT_RECORDED',
  releaseManifest: manifest?.status || 'NOT_RECORDED',
  workflowPresent: !missingFiles.length
};
let status = 'PASS';
if (missingFiles.length || dependency?.status === 'FAIL' || manifest?.status === 'FAIL') status = 'FAIL';
else if (dependency?.status === 'REVIEW_REQUIRED') status = 'REVIEW_REQUIRED';
const report = {
  generatedAt: new Date().toISOString(),
  status,
  checks,
  missingFiles,
  externalReleaseEvidenceRequired: true,
  rule: 'CI may certify repository integrity, but production promotion still requires the external release authorization, deployment, migration and rollback evidence gates.'
};
fs.mkdirSync(path.dirname(out), {recursive:true});
fs.writeFileSync(out, JSON.stringify(report,null,2)+'\n');
console.log(`ci-release-gate: ${status}`);
if (status === 'FAIL') process.exit(1);
