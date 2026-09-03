import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const dir = path.join(root, 'supabase', 'migrations');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.sql')).sort();
const versionMap = new Map();
for (const file of files) {
  const m = file.match(/^(\d+)_/);
  if (!m) continue;
  const version = m[1];
  if (!versionMap.has(version)) versionMap.set(version, []);
  versionMap.get(version).push(file);
}
const duplicateVersions = [...versionMap.entries()].filter(([, names]) => names.length > 1);
const malformed = files.filter(f => !/^\d+_[^/]+\.sql$/.test(f));
const failures = [];
if (malformed.length) failures.push(`Malformed migration filename(s): ${malformed.join(', ')}`);
for (const [version, names] of duplicateVersions) {
  failures.push(`Duplicate migration version ${version}: ${names.join(' | ')}`);
}
// Detect the most dangerous migration-order ambiguity: later phase-labelled files
// carrying an older version than a previously numbered phase migration.
const phaseEntries = files.map(file => {
  const v = file.match(/^(\d+)_/)?.[1];
  const p = file.match(/phase(\d+)(?:[-_](\d+))?/i);
  return v && p ? { file, version: BigInt(v), phase: Number(p[1]), phase2: p[2] ? Number(p[2]) : null } : null;
}).filter(Boolean);
const orderingWarnings = [];
for (let i=1;i<phaseEntries.length;i++) {
  const a=phaseEntries[i-1], b=phaseEntries[i];
  if (b.phase > a.phase && b.version < a.version) orderingWarnings.push(`${b.file} has migration version ${b.version} earlier than ${a.file} (${a.version})`);
}
console.log(`migration-chain-audit: ${files.length} SQL migrations inspected`);
if (duplicateVersions.length) console.error(`DUPLICATE VERSIONS: ${duplicateVersions.length}`);
if (orderingWarnings.length) console.warn(`ORDERING WARNINGS: ${orderingWarnings.length}`);
for (const w of orderingWarnings) console.warn(`  ${w}`);
if (failures.length) { console.error(failures.join('\n')); process.exit(1); }
console.log('migration-chain-audit: PASS');
