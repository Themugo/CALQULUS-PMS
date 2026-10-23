// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { spawnSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

// Phase 2D.1 regression tests: migration execution must be fail closed.
// Every command is a stub on a temp PATH. No network, credentials or database are used,
// and the real supabase/migrations directory is only ever hashed, never written.

const REPO = process.cwd();
const APPLY = path.join(REPO, "scripts", "apply-pending-migrations.mjs");
const GATE = path.join(REPO, "scripts", "deployment-reconciliation-gate.mjs");
const DRILL = path.join(REPO, "scripts", "restore-migrations-drill.sh");
const LIB = path.join(REPO, "scripts", "lib", "migration-execution-guard.mjs");
const AUDIT = path.join(REPO, "scripts", "audit-migration-chain.mjs");
const REF_A = "a".repeat(20);
const REF_B = "b".repeat(20);
const SECRETS = {
  SUPABASE_ACCESS_TOKEN: "sbp_TOPSECRETTOKEN0123456789abcdef",
  SUPABASE_DB_PASSWORD: "hunter2-SUPER-secret-db-password",
  DATABASE_URL: "postgres://postgres:URLPASSWORD-9f8e7d@db.example.invalid:5432/postgres",
  SUPABASE_SERVICE_ROLE_KEY: "eyJSERVICEROLEKEYSECRETVALUE",
  PGPASSWORD: "PGPASSWORD-secret-value",
};
const posix = process.platform !== "win32";
// The stale nested copy was removed from the tree in the Phase 2D.1 follow-up; a local checkout may still have it.
const NESTED = path.join(REPO, "CALQULUS-PMS");
const hasNested = fs.existsSync(path.join(NESTED, "scripts"));

let dir: string;
let bin: string;
let log: string;
beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), "mig-guard-"));
  bin = path.join(dir, "bin");
  log = path.join(dir, "calls.log");
  fs.mkdirSync(bin);
  if (posix) {
    for (const cmd of ["npx", "supabase", "psql", "pg_dump", "pg_restore", "pg_dumpall"]) {
      fs.writeFileSync(path.join(bin, cmd), `#!/bin/sh\necho "${cmd} $*" >> "${log}"\nexit 0\n`, { mode: 0o755 });
    }
  }
});
afterEach(() => { fs.rmSync(dir, { recursive: true, force: true }); });

const calls = () => (fs.existsSync(log) ? fs.readFileSync(log, "utf8").split("\n").filter(Boolean) : []);

type Fx = { files?: string[]; policy?: Record<string, unknown> | null; ref?: string | null };
function makeRoot(fx: Fx = {}, name = "root") {
  const root = path.join(dir, name);
  fs.mkdirSync(path.join(root, "supabase", "migrations"), { recursive: true });
  fs.mkdirSync(path.join(root, "config"), { recursive: true });
  for (const f of fx.files ?? ["20260101000000_a.sql", "20260101000001_b.sql"]) {
    fs.writeFileSync(path.join(root, "supabase", "migrations", f), "-- fixture\n");
  }
  if (fx.policy !== null) {
    fs.writeFileSync(
      path.join(root, "config", "migration-history-policy.json"),
      JSON.stringify(fx.policy ?? { knownDuplicateVersions: [], knownMalformedVersions: [], liveReconciliationRequired: false }),
    );
  }
  if (fx.ref !== null) fs.writeFileSync(path.join(root, "supabase", "config.toml"), `project_id = "${fx.ref ?? REF_A}"\n`);
  return root;
}
const env = (extra: Record<string, string> = {}) => ({
  ...process.env,
  ...SECRETS,
  PATH: `${bin}${path.delimiter}${process.env.PATH}`,
  ...extra,
});
function run(script: string, root: string, args: string[] = [], extra: Record<string, string> = {}) {
  const r = spawnSync(process.execPath, [script, ...args], { cwd: root, encoding: "utf8", env: env(extra) });
  return { code: r.status, out: `${r.stdout}${r.stderr}` };
}
async function lib() {
  return (await import(/* @vite-ignore */ LIB)) as typeof import("../../scripts/lib/migration-execution-guard.mjs");
}
// Reads each entry once (no stat-then-read), so there is no check/use race on the path.
const hashDir = (d: string) => {
  const h = crypto.createHash("sha256");
  for (const f of fs.readdirSync(d, { recursive: true }).map(String).sort()) {
    let data: Buffer;
    try { data = fs.readFileSync(path.join(d, f)); } catch (e) {
      if ((e as NodeJS.ErrnoException).code === "EISDIR") continue; // directory entry
      throw e;
    }
    h.update(f); h.update(data);
  }
  return h.digest("hex");
};

describe("apply-pending-migrations.mjs refuses by default", () => {
  it.skipIf(!posix)("refuses on a fully clean, conforming fixture and returns nonzero (1, 8)", () => {
    const root = makeRoot();
    const r = run(APPLY, root);
    expect(r.code).toBe(1);
    expect(r.out).toContain("MIGRATION EXECUTION REFUSED");
    expect(r.out).toContain("EXECUTION_DISABLED");
    expect(r.out).toContain("AUTHORIZATION_MISSING");
    expect(calls()).toEqual([]);
  });

  it.skipIf(!posix)("still refuses with a matching explicit target (1, 6)", () => {
    const r = run(APPLY, makeRoot(), ["--target-ref", REF_A]);
    expect(r.code).toBe(1);
    expect(r.out).toContain("EXECUTION_DISABLED");
    expect(r.out).not.toContain("TARGET_UNVERIFIED");
    expect(calls()).toEqual([]);
  });

  it.skipIf(!posix)("refuses every execute-style flag with a nonzero exit and no command call (6, 8, 10)", () => {
    const root = makeRoot();
    for (const flag of ["--execute", "--apply", "--force", "--yes", "--confirm", "--push", "-y"]) {
      const r = run(APPLY, root, [flag, "--target-ref", REF_A]);
      expect(r.code, flag).toBe(1);
      expect(r.out).toContain("MIGRATION EXECUTION REFUSED");
    }
    expect(calls()).toEqual([]);
  });

  it.skipIf(!posix)("refuses even when a generic environment variable tries to enable it (8 / constraint 8)", () => {
    const root = makeRoot();
    const r = run(APPLY, root, ["--target-ref", REF_A], {
      CI: "true", FORCE: "1", YES: "1", CONFIRM: "yes", ALLOW_MIGRATIONS: "1", APPLY_MIGRATIONS: "true",
      CALQULUS_ALLOW_MIGRATIONS: "1", MIGRATION_EXECUTION_AUTHORIZED: "true", NODE_ENV: "production",
    });
    expect(r.code).toBe(1);
    expect(calls()).toEqual([]);
  });

  it.skipIf(!posix)("--dry-run is read-only and reports the failing preflight with a nonzero exit", () => {
    const r = run(APPLY, makeRoot({ files: ["20260101000000_a.sql", "20260101000000_dup.sql"] }), ["--dry-run"]);
    expect(r.code).toBe(1);
    expect(r.out).toContain("nothing was executed and no database was contacted");
    expect(r.out).toContain("DUPLICATE_VERSIONS");
    expect(calls()).toEqual([]);
  });

  it("has no child-process capability and never builds a db push command (7, 10)", () => {
    // Scan executable code only: the header comment legitimately describes the removed behaviour.
    const src = fs.readFileSync(APPLY, "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
    expect(src).not.toMatch(/child_process|execSync|execFile|spawn|exec\(/);
    expect(src).not.toMatch(/npx|db push|supabase (db|migration|functions)/i);
    const guard = fs.readFileSync(LIB, "utf8");
    const spawns = guard.match(/spawnSync\(/g) ?? [];
    expect(spawns).toHaveLength(1);
    expect(guard).toMatch(/spawnSync\(process\.execPath, \[AUDIT_SCRIPT\]/);
    expect(guard).not.toMatch(/spawnSync\((?!process\.execPath)/);
    expect(guard).not.toMatch(/execSync|execFileSync|exec\(|spawn\(/);
  });
});

describe("preflight conditions", () => {
  it.skipIf(!posix)("unresolved duplicate versions cause refusal even when the history policy lists them (2)", () => {
    const root = makeRoot({
      files: ["20260101000000_a.sql", "20260101000000_a_second.sql"],
      policy: { knownDuplicateVersions: ["20260101000000"], knownMalformedVersions: [], liveReconciliationRequired: false },
    });
    // The legacy auditor accepts it because the policy lists it ...
    expect(spawnSync(process.execPath, [AUDIT], { cwd: root, encoding: "utf8" }).status).toBe(0);
    // ... the executor does not.
    const r = run(APPLY, root, ["--target-ref", REF_A]);
    expect(r.code).toBe(1);
    expect(r.out).toContain("DUPLICATE_VERSIONS");
    expect(r.out).toContain("does not count as resolution");
  });

  it.skipIf(!posix)("nonconforming / unclassified filenames cause refusal (4)", () => {
    const root = makeRoot({
      files: ["20260101000000_a.sql", "20260101000001b_letter_suffix.sql", "not_a_migration.sql"],
      policy: { knownDuplicateVersions: [], knownMalformedVersions: ["20260101000001b"], liveReconciliationRequired: false },
    });
    const r = run(APPLY, root, ["--target-ref", REF_A]);
    expect(r.code).toBe(1);
    expect(r.out).toContain("NONCONFORMING_FILENAMES");
    expect(r.out).toContain("20260101000001b_letter_suffix.sql");
    expect(r.out).toContain("not_a_migration.sql");
  });

  it.skipIf(!posix)("a failing migration integrity audit causes refusal (3)", () => {
    const root = makeRoot({ policy: { knownDuplicateVersions: ["20990101000000"], knownMalformedVersions: [], liveReconciliationRequired: false } });
    expect(spawnSync(process.execPath, [AUDIT], { cwd: root, encoding: "utf8" }).status).toBe(1);
    const r = run(APPLY, root, ["--target-ref", REF_A]);
    expect(r.code).toBe(1);
    expect(r.out).toContain("AUDIT_FAILED");
  });

  it.skipIf(!posix)("a missing history policy / unreadable migrations dir causes refusal (3)", () => {
    const r1 = run(APPLY, makeRoot({ policy: null }), ["--target-ref", REF_A]);
    expect(r1.code).toBe(1);
    expect(r1.out).toContain("POLICY_UNREADABLE");
    const empty = path.join(dir, "empty");
    fs.mkdirSync(empty);
    const r2 = run(APPLY, empty);
    expect(r2.code).toBe(1);
    expect(r2.out).toContain("MIGRATIONS_UNREADABLE");
  });

  it.skipIf(!posix)("policy that still requires live reconciliation causes refusal", () => {
    const root = makeRoot({ policy: { knownDuplicateVersions: [], knownMalformedVersions: [], liveReconciliationRequired: true } });
    expect(run(APPLY, root, ["--target-ref", REF_A]).out).toContain("LIVE_RECONCILIATION_REQUIRED");
  });

  it("an unavailable or failing audit runner is a refusal, never a pass (3)", async () => {
    const { evaluateMigrationPreflight } = await lib();
    const root = makeRoot();
    const codes = (runAudit: (r: string) => unknown) =>
      evaluateMigrationPreflight({ root, targetRef: REF_A, runAudit: runAudit as never }).refusals.map((x) => x.code);
    expect(codes(() => ({ available: true, passed: false }))).toContain("AUDIT_FAILED");
    expect(codes(() => ({ available: false, passed: false }))).toContain("AUDIT_UNAVAILABLE");
    expect(codes(() => { throw new Error("boom"); })).toContain("AUDIT_UNAVAILABLE");
    expect(codes(() => undefined)).toContain("AUDIT_UNAVAILABLE");
    const ok = evaluateMigrationPreflight({ root, targetRef: REF_A, runAudit: () => ({ available: true, passed: true }) });
    expect(ok.refusals.map((x) => x.code)).not.toContain("AUDIT_FAILED");
    expect(ok.allowed).toBe(false); // still disabled
  });

  it("unknown, malformed or mismatched target identity causes refusal (5)", async () => {
    const { evaluateMigrationPreflight } = await lib();
    const root = makeRoot({ ref: REF_A });
    const pass = () => ({ available: true, passed: true });
    const codes = (targetRef: string | null) =>
      evaluateMigrationPreflight({ root, targetRef, runAudit: pass }).refusals.map((x) => x.code);
    expect(codes(null)).toContain("TARGET_UNVERIFIED");
    expect(codes("")).toContain("TARGET_UNVERIFIED");
    expect(codes("staging")).toContain("TARGET_UNVERIFIED");
    expect(codes("postgres://u:pw@h/db")).toContain("TARGET_UNVERIFIED");
    expect(codes(REF_B)).toContain("TARGET_MISMATCH");
    expect(codes(REF_A)).not.toContain("TARGET_MISMATCH");
    expect(codes(REF_A)).not.toContain("TARGET_UNVERIFIED");
    const noConfig = makeRoot({ ref: null }, "root-no-config");
    expect(evaluateMigrationPreflight({ root: noConfig, targetRef: REF_A, runAudit: pass }).refusals.map((x) => x.code)).toContain("TARGET_UNVERIFIED");
  });

  it("the configured project_id is never assumed, and neither production nor staging is inferred (5)", async () => {
    const { evaluateMigrationPreflight, remoteContactBlockers } = await lib();
    const root = makeRoot({ ref: REF_A });
    const r = evaluateMigrationPreflight({ root, runAudit: () => ({ available: true, passed: true }) });
    expect(r.refusals.map((x) => x.code)).toContain("TARGET_UNVERIFIED");
    expect(remoteContactBlockers({ root })).toContain("TARGET_UNVERIFIED");
    expect(remoteContactBlockers({ root, expectedRef: REF_B })).toContain("TARGET_MISMATCH");
    expect(remoteContactBlockers({ root, expectedRef: REF_A })).toEqual([]);
  });

  it("absent, incomplete, invalid or complete-looking authorization can never enable execution (6)", async () => {
    const { assessAuthorization, evaluateMigrationPreflight } = await lib();
    const complete = {
      targetRef: REF_A,
      reviewedPlanSha256: "0".repeat(64),
      preflightPassed: true,
      recoverability: { backupVerified: true, restoreRehearsalId: "drill-1" },
      operatorConfirmation: true,
    };
    for (const a of [undefined, null, {}, "yes", 1, true, { targetRef: REF_A }, { ...complete, preflightPassed: "true" }, { ...complete, reviewedPlanSha256: "abc" }, { ...complete, recoverability: { backupVerified: true } }]) {
      const v = assessAuthorization(a as never);
      expect(v.authorized).toBe(false);
      expect(v.missing.length).toBeGreaterThan(0);
    }
    expect(assessAuthorization(complete).authorized).toBe(false);
    expect(assessAuthorization(complete).missing).toEqual([]);
    const root = makeRoot();
    const r = evaluateMigrationPreflight({ root, targetRef: REF_A, authorization: complete, runAudit: () => ({ available: true, passed: true }) });
    expect(r.allowed).toBe(false);
    expect(r.refusals.map((x) => x.code)).toEqual(expect.arrayContaining(["EXECUTION_DISABLED", "AUTHORIZATION_MISSING"]));
  });
});

describe("logs and side effects", () => {
  it.skipIf(!posix)("no secret value or credential-bearing argument is ever printed (9)", () => {
    const root = makeRoot({ files: ["20260101000000_a.sql", "20260101000000_dup.sql"] });
    const outs = [
      run(APPLY, root).out,
      run(APPLY, root, ["--dry-run"]).out,
      run(APPLY, root, ["--target-ref", SECRETS.DATABASE_URL]).out,
      run(APPLY, root, [`--target-ref=${SECRETS.SUPABASE_ACCESS_TOKEN}`, `--${SECRETS.PGPASSWORD}`]).out,
      run(GATE, root).out,
    ].join("\n");
    for (const v of Object.values(SECRETS)) expect(outs).not.toContain(v);
    expect(outs).not.toContain("URLPASSWORD");
    expect(outs).not.toContain("hunter2");
    expect(calls()).toEqual([]);
  });

  it.skipIf(!posix)("the refusal path never touches supabase/migrations (7, 10)", () => {
    const before = hashDir(path.join(REPO, "supabase", "migrations"));
    run(APPLY, REPO);
    run(APPLY, REPO, ["--dry-run", "--target-ref", REF_A]);
    expect(hashDir(path.join(REPO, "supabase", "migrations"))).toBe(before);
    expect(calls()).toEqual([]);
  });

  it.skipIf(!posix)("on the real repository the executor is blocked and reports the known defects (1, 2, 4)", () => {
    const r = run(APPLY, REPO);
    expect(r.code).toBe(1);
    expect(r.out).toMatch(/DUPLICATE_VERSIONS/);
    expect(r.out).toMatch(/NONCONFORMING_FILENAMES/);
    expect(r.out).toContain("20260506000022b_unit_first_integrity.sql");
    expect(calls()).toEqual([]);
  });
});

describe("deployment-reconciliation-gate.mjs makes no remote contact unless explicitly allowed", () => {
  const report = (root: string) => JSON.parse(fs.readFileSync(path.join(root, "docs", "audits", "PRODUCTION_DEPLOYMENT_RECONCILIATION_GATE.json"), "utf8"));

  it.skipIf(!posix)("blocks with duplicates: no CLI call, not even --version (7, 10)", () => {
    const root = makeRoot({ files: ["20260101000000_a.sql", "20260101000000_dup.sql"] });
    const r = run(GATE, root, ["--expected-project-ref", REF_A]);
    expect(r.code).toBe(1);
    expect(report(root).status).toBe("BLOCKED");
    expect(report(root).remoteContact).toEqual({ attempted: false, blockedBy: ["DUPLICATE_VERSIONS"] });
    expect(calls()).toEqual([]);
  });

  it.skipIf(!posix)("blocks nonconforming filenames and an unnamed target (5)", () => {
    const root = makeRoot({ files: ["20260101000000_a.sql", "20260101000001b_x.sql"] });
    expect(run(GATE, root).code).toBe(1);
    expect(report(root).remoteContact.blockedBy).toEqual(expect.arrayContaining(["NONCONFORMING_FILENAMES", "TARGET_UNVERIFIED"]));
    expect(calls()).toEqual([]);
  });

  it.skipIf(!posix)("blocks a clean chain when no target is named or the target mismatches (5)", () => {
    const root = makeRoot();
    expect(run(GATE, root).code).toBe(1);
    expect(report(root).remoteContact.blockedBy).toEqual(["TARGET_UNVERIFIED"]);
    expect(run(GATE, root, ["--expected-project-ref", REF_B]).code).toBe(1);
    expect(report(root).remoteContact.blockedBy).toEqual(["TARGET_MISMATCH"]);
    expect(run(GATE, root, [], { CALQULUS_EXPECTED_PROJECT_REF: REF_B }).code).toBe(1);
    expect(calls()).toEqual([]);
  });

  it.skipIf(!posix)("when explicitly allowed it only runs read-only CLI commands, and db push only with --dry-run", () => {
    const root = makeRoot();
    const r = run(GATE, root, ["--expected-project-ref", REF_A]);
    expect(r.code).toBe(0);
    expect(report(root).remoteContact.attempted).toBe(true);
    const c = calls();
    expect(c.length).toBeGreaterThan(0);
    for (const line of c) {
      expect(line).toMatch(/^npx supabase (--version|projects list|migration list --project-ref|db push --dry-run --project-ref)/);
      if (/db push/.test(line)) expect(line).toContain("--dry-run");
    }
    expect(c.join("\n")).not.toMatch(/migration repair|db reset|migration up|functions deploy/);
  });

  it("the gate source cannot call db push without --dry-run", () => {
    const src = fs.readFileSync(GATE, "utf8");
    const pushes = src.match(/run\(\[[^\]]*'push'[^\]]*\]\)/g) ?? [];
    expect(pushes).toHaveLength(1);
    expect(pushes[0]).toContain("'--dry-run'");
    expect(src).not.toMatch(/'repair'|'reset'/);
  });
});

describe("restore-migrations-drill.sh only targets a local Postgres", () => {
  it.skipIf(!posix)("refuses a remote PGHOST before any psql call", () => {
    const r = spawnSync("bash", [DRILL], { encoding: "utf8", env: env({ PGHOST: "db.example.supabase.co" }) });
    expect(r.status).toBe(2);
    expect(r.stderr).toContain("REFUSED");
    expect(calls()).toEqual([]);
  });

  it.skipIf(!posix)("refuses service-file / hostaddr redirection before any psql call", () => {
    for (const v of ["PGSERVICE", "PGSERVICEFILE", "PGHOSTADDR"]) {
      const r = spawnSync("bash", [DRILL], { encoding: "utf8", env: env({ [v]: "x", PGHOST: "127.0.0.1" }) });
      expect(r.status, v).toBe(2);
    }
    expect(calls()).toEqual([]);
  });

  it("the guard precedes the first psql / dump / restore call in both copies", () => {
    for (const p of [DRILL, path.join(NESTED, "scripts", "restore-migrations-drill.sh")].filter((x) => fs.existsSync(x))) {
      const src = fs.readFileSync(p, "utf8");
      const guard = src.indexOf("PHASE 2D.1 SAFEGUARD");
      const firstCall = src.search(/^\s*(psql|pg_dump|pg_restore)\b/m);
      expect(guard, p).toBeGreaterThan(-1);
      expect(guard, p).toBeLessThan(firstCall);
    }
  });
});

describe("legacy scripts that rewrite migration files are disabled", () => {
  const legacy = ["fix-migration.cjs", "fix-migration.py", "apply_phases.py", "patch_phase10.py"];
  const ps1 = ["fix-migration.ps1", "fix-migration-simple.ps1", "fix-migration-v2.ps1", "fix-migration-complete.ps1"];

  it("exit nonzero and leave supabase/migrations byte-identical", () => {
    const before = hashDir(path.join(REPO, "supabase", "migrations"));
    for (const f of legacy) {
      const cmd = f.endsWith(".cjs") ? process.execPath : "python3";
      const r = spawnSync(cmd, [path.join(REPO, f)], { cwd: REPO, encoding: "utf8" });
      if (r.error) continue; // python3 absent: static check below still applies
      expect(r.status, f).not.toBe(0);
      expect(`${r.stderr}${r.stdout}`, f).toContain("REFUSED (Phase 2D.1)");
    }
    expect(hashDir(path.join(REPO, "supabase", "migrations"))).toBe(before);
  });

  it("every legacy script (root and nested copy, including PowerShell) starts with a refusal", () => {
    for (const base of [REPO, NESTED].filter((b) => fs.existsSync(path.join(b, "fix-migration.cjs")))) {
      for (const f of [...legacy, ...ps1]) {
        const head = fs.readFileSync(path.join(base, f), "utf8").split(/\r?\n/).slice(0, 4).join("\n");
        expect(head, `${base}/${f}`).toContain("PHASE 2D.1 SAFEGUARD");
        expect(head).toMatch(/process\.exit\(1\)|sys\.exit\(|exit 1/);
      }
    }
  });

  it.skipIf(!hasNested)("a leftover nested duplicate apply script cannot execute anything", () => {
    const p = path.join(NESTED, "scripts", "apply-pending-migrations.mjs");
    expect(fs.readFileSync(p, "utf8")).not.toMatch(/child_process|execSync|spawn/);
    expect(spawnSync(process.execPath, [p], { encoding: "utf8" }).status).toBe(1);
  });
});

describe("documentation no longer instructs operators to run unsafe migration commands", () => {
  const MARK = "PHASE_2D_1_MIGRATION_EXECUTION_SAFEGUARDS";
  const UNSAFE = /supabase (db (push|reset)|migration (repair|down|up))/;
  function walk(d: string, out: string[] = []) {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) { if (!["node_modules", ".git", "audits"].includes(e.name)) walk(p, out); }
      else if (e.name.endsWith(".md")) out.push(p);
    }
    return out;
  }
  it("every fenced block containing db push / db reset / migration repair carries the do-not-run warning (root and nested copy)", () => {
    const bases = [REPO, NESTED].filter((b) => fs.existsSync(path.join(b, "docs")));
    const files = bases.flatMap((b) => [
      ...fs.readdirSync(b).filter((n) => n.endsWith(".md")).map((n) => path.join(b, n)),
      ...walk(path.join(b, "docs")),
    ]).filter((p) => !/docs[\\/]engineering[\\/]PHASE_2/.test(p));
    expect(files.length).toBeGreaterThan(25);
    const offenders: string[] = [];
    for (const f of files) {
      const lines = fs.readFileSync(f, "utf8").split(/\r?\n/);
      let start = -1;
      lines.forEach((l, i) => {
        if (!l.trimStart().startsWith("```")) return;
        if (start < 0) { start = i; return; }
        const body = lines.slice(start + 1, i);
        if (body.some((x) => UNSAFE.test(x)) && !lines.slice(Math.max(0, start - 4), start).some((x) => x.includes(MARK))) {
          offenders.push(`${path.relative(REPO, f)}:${start + 1}`);
        }
        start = -1;
      });
    }
    expect(offenders).toEqual([]);
  });
});

describe("existing behaviour remains intact", () => {
  it.skipIf(!posix)("the migration-chain audit still passes a clean chain and fails new duplicates / malformed names", () => {
    const run1 = (fx: Fx) => spawnSync(process.execPath, [AUDIT], { cwd: makeRoot(fx), encoding: "utf8" });
    expect(run1({}).status).toBe(0);
    fs.rmSync(path.join(dir, "root"), { recursive: true, force: true });
    expect(run1({ files: ["20260101000000_a.sql", "20260101000000_b.sql"] }).status).toBe(1);
    fs.rmSync(path.join(dir, "root"), { recursive: true, force: true });
    expect(run1({ files: ["20260101000000_a.sql", "weird.sql"] }).status).toBe(1);
  });

  it("the Phase 2B release-evidence gate still fails closed on missing / empty / null evidence", async () => {
    const { validateLiveReleaseEvidence, REQUIRED_EVIDENCE } = await import(/* @vite-ignore */ path.join(REPO, "scripts", "lib", "release-evidence-contract.mjs"));
    for (const evidence of [null, undefined, {}, []]) {
      const res = validateLiveReleaseEvidence(evidence, { expectedCommit: "0".repeat(40) });
      expect(res.failures.length).toBeGreaterThan(0);
    }
    expect(REQUIRED_EVIDENCE.length).toBeGreaterThan(0);
    const out = path.join(dir, "gate.json");
    const r = spawnSync(process.execPath, [path.join(REPO, "scripts", "audit-production-evidence.mjs"), "--evidence", path.join(dir, "missing.json"), "--smoke", path.join(dir, "s.json"), "--out", out, "--expected-commit", "0".repeat(40)], { cwd: dir, encoding: "utf8" });
    expect(r.status).toBe(1);
    expect(JSON.parse(fs.readFileSync(out, "utf8")).status).toBe("BLOCKED");
  });
});
