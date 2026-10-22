/**
 * apply-pending-migrations.mjs — DISABLED (Phase 2D.1, fail closed)
 *
 * This script previously ran `npx supabase db push` against whichever project
 * supabase/config.toml named. That is unsafe while migration reconciliation is
 * unresolved (duplicate versions, non-CLI filenames, a destructive base
 * migration, two conflicting project identities, unknown live state).
 *
 * It now NEVER executes a migration. It has no child-process capability.
 *
 *   node scripts/apply-pending-migrations.mjs             -> refuses, exit 1
 *   node scripts/apply-pending-migrations.mjs --dry-run   -> read-only report; exit 1 while preflight fails
 *   node scripts/apply-pending-migrations.mjs --target-ref <ref>
 *                                                         -> still refuses (no approved authorization mechanism)
 *
 * See docs/engineering/PHASE_2D_1_MIGRATION_EXECUTION_SAFEGUARDS.md.
 */
import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { evaluateMigrationPreflight, safeRef, GUIDE_DOC } from './lib/migration-execution-guard.mjs';

const root = process.cwd();
const args = process.argv.slice(2);

let dryRun = false;
let targetRef = null;
const usage = [];
for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (a === '--dry-run') { dryRun = true; continue; }
  if (a === '--target-ref') { targetRef = args[i + 1] ?? ''; i++; continue; }
  if (a.startsWith('--target-ref=')) { targetRef = a.slice('--target-ref='.length); continue; }
  usage.push(a); // never echoed: an argument may be a mistyped secret
}

// Historical, hand-maintained list. NOT a computed set of pending migrations.
const historicalPrefixes = [
  '20260812000000', '20260812000001', '20260812000002',
  '20260819000000', '20260819000001', '20260819000002', '20260819000003', '20260819000004', '20260819000005',
];

const result = evaluateMigrationPreflight({ root, targetRef });

if (dryRun) {
  let files = [];
  try {
    files = readdirSync(join(root, 'supabase', 'migrations')).filter(n => historicalPrefixes.some(p => n.startsWith(p))).sort();
  } catch { /* reported by preflight */ }
  console.log('Historical hard-coded migration list (informational only; NOT verified against any database):');
  for (const f of files) console.log(`  - ${f}`);
  console.log('\nDry run: nothing was executed and no database was contacted.');
}

console.error('\nMIGRATION EXECUTION REFUSED');
console.error('Migration reconciliation and explicit, reviewed authorization are required before any migration may be applied.');
if (usage.length) console.error(`${usage.length} unrecognised argument(s) ignored (not echoed).`);
if (targetRef !== null) console.error(`Supplied target: ${safeRef(targetRef)}`);
for (const r of result.refusals) console.error(`- [${r.code}] ${r.message}`);
console.error(`\nSee ${GUIDE_DOC}. This script has no execution path in this phase.`);
process.exit(1);
