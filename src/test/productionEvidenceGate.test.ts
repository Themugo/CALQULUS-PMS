// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

// Regression tests for B-003: the production evidence gate must fail closed.
// All fixtures live in a temp directory; the real docs/audits/* files are never touched.

const REPO = process.cwd();
const SCRIPT = path.join(REPO, "scripts", "audit-production-evidence.mjs");
const SHA = "0123456789abcdef0123456789abcdef01234567";
const OTHER_SHA = "fedcba9876543210fedcba9876543210fedcba98";

const validEvidence = () => ({
  releaseCommit: SHA,
  stagingMigrationRun: { timestamp: "2026-10-01T08:00:00Z", target: "staging-eu", operator: "ops-a", outcome: "PASS" },
  stagingSmokeRun: { timestamp: "2026-10-01T09:00:00Z", target: "staging-eu", operator: "ops-a", outcome: "PASS" },
  stagingRestoreRun: { timestamp: "2026-10-01T10:00:00Z", recoveryPoint: "2026-10-01T07:30:00Z", restoreTarget: "restore-drill-1", operator: "ops-b", outcome: "PASS" },
  productionApproval: { timestamp: "2026-10-02T08:00:00Z", approver: "owner", decision: "APPROVED" },
});

let dir: string;
beforeEach(() => { dir = fs.mkdtempSync(path.join(os.tmpdir(), "evidence-gate-")); });
afterEach(() => { fs.rmSync(dir, { recursive: true, force: true }); });

function run(evidence: unknown | undefined, extra: string[] = [], opts: { raw?: string; smoke?: unknown } = {}) {
  const evidencePath = path.join(dir, "evidence.json");
  const smokePath = path.join(dir, "smoke.json");
  const outPath = path.join(dir, "gate.json");
  if (opts.raw !== undefined) fs.writeFileSync(evidencePath, opts.raw);
  else if (evidence !== undefined) fs.writeFileSync(evidencePath, JSON.stringify(evidence));
  if (opts.smoke !== undefined) fs.writeFileSync(smokePath, JSON.stringify(opts.smoke));
  const args = [SCRIPT, "--evidence", evidencePath, "--smoke", smokePath, "--out", outPath, "--expected-commit", SHA, ...extra];
  const r = spawnSync(process.execPath, args, { cwd: dir, encoding: "utf8" });
  const report = fs.existsSync(outPath) ? JSON.parse(fs.readFileSync(outPath, "utf8")) : null;
  return { code: r.status, out: r.stdout + r.stderr, report };
}

const expectBlocked = (r: ReturnType<typeof run>, ...fragments: string[]) => {
  expect(r.code).toBe(1);
  expect(r.out).toContain("production-evidence-gate: BLOCKED");
  expect(r.report?.status).toBe("BLOCKED");
  for (const f of fragments) expect(r.out).toContain(f);
};

describe("production evidence gate (B-003, fail closed)", () => {
  it("passes a complete, consistent, commit-bound evidence fixture (exit 0)", () => {
    const r = run(validEvidence());
    expect(r.code).toBe(0);
    expect(r.out).toContain("production-evidence-gate: PASS");
    expect(r.report?.failures).toEqual([]);
    expect(r.report?.notProofOf).toMatch(/does not prove/i);
  });

  it("blocks when the evidence file is missing", () => {
    expectBlocked(run(undefined), "file not found");
  });

  it("blocks invalid JSON and non-object roots", () => {
    expectBlocked(run(undefined, [], { raw: "{not json" }), "not valid JSON");
    expectBlocked(run([]), "not a JSON object");
    expectBlocked(run(null), "not a JSON object");
  });

  it("blocks an empty evidence object", () => {
    expectBlocked(run({}), "releaseCommit: is missing", "stagingMigrationRun: is missing", "productionApproval: is missing");
  });

  it("blocks the original false-pass: commit set, every other field present but empty", () => {
    const e = validEvidence();
    for (const k of ["stagingMigrationRun", "stagingSmokeRun", "stagingRestoreRun", "productionApproval"] as const) {
      for (const f of Object.keys(e[k])) (e[k] as Record<string, string>)[f] = "";
    }
    const r = run(e);
    expectBlocked(r, "stagingMigrationRun.timestamp: is empty", "productionApproval.approver: is empty");
    expect(r.report?.missingEvidence).toEqual(expect.arrayContaining(["stagingMigrationRun", "stagingSmokeRun", "stagingRestoreRun", "productionApproval"]));
  });

  it("blocks all-empty template-shaped evidence including empty releaseCommit", () => {
    const e = { releaseCommit: "", stagingMigrationRun: {}, stagingSmokeRun: {}, stagingRestoreRun: {}, productionApproval: {} };
    expectBlocked(run(e), "releaseCommit: is missing or empty");
  });

  it("blocks whitespace-only required values", () => {
    const e = validEvidence();
    e.stagingSmokeRun.operator = "   \t";
    e.releaseCommit = "  ";
    expectBlocked(run(e), "stagingSmokeRun.operator: is empty", "releaseCommit: is missing or empty");
  });

  it("blocks each individually missing required field", () => {
    const e0 = validEvidence();
    const keys: [string, string?][] = [
      ["releaseCommit"], ["stagingMigrationRun"], ["stagingSmokeRun"], ["stagingRestoreRun"], ["productionApproval"],
      ["stagingMigrationRun", "target"], ["stagingSmokeRun", "operator"], ["stagingRestoreRun", "recoveryPoint"],
      ["stagingRestoreRun", "restoreTarget"], ["productionApproval", "approver"], ["productionApproval", "decision"], ["productionApproval", "timestamp"],
    ];
    for (const [k, f] of keys) {
      const e = JSON.parse(JSON.stringify(e0));
      if (f) delete e[k][f]; else delete e[k];
      const r = run(e);
      expect(r.code, `${k}.${f ?? ""}`).toBe(1);
      expect(r.out).toContain(f ? `${k}.${f}: is missing` : `${k}: is missing`);
    }
  });

  it("blocks wrong types and malformed identifiers", () => {
    const e = validEvidence() as Record<string, unknown>;
    e.releaseCommit = 12345;
    e.stagingMigrationRun = "done";
    (e.stagingSmokeRun as Record<string, unknown>).target = ["staging"];
    (e.productionApproval as Record<string, unknown>).timestamp = "yesterday";
    expectBlocked(run(e), "releaseCommit: is missing or empty", "stagingMigrationRun: must be an object", "stagingSmokeRun.target: must be a string", "productionApproval.timestamp: is not an ISO-8601 timestamp");
    const short = validEvidence(); short.releaseCommit = "abc123";
    expectBlocked(run(short), "not a full 40-character git SHA");
  });

  it("blocks placeholder values", () => {
    const e = validEvidence();
    e.stagingRestoreRun.restoreTarget = "TBD";
    e.stagingMigrationRun.operator = "N/A";
    expectBlocked(run(e), "stagingRestoreRun.restoreTarget: is a placeholder value", "stagingMigrationRun.operator: is a placeholder value");
  });

  it("blocks evidence for a different commit than the one assessed", () => {
    const e = validEvidence(); e.releaseCommit = OTHER_SHA;
    expectBlocked(run(e), "releaseCommit: evidence is for fedcba987654 but assessed revision is 0123456789ab");
  });

  it("blocks when no expected commit can be determined (cannot validate)", () => {
    const evidencePath = path.join(dir, "evidence.json");
    fs.writeFileSync(evidencePath, JSON.stringify(validEvidence()));
    const env = { ...process.env, GIT_DIR: path.join(dir, "no-git"), RELEASE_COMMIT_EXPECTED: "" };
    const r = spawnSync(process.execPath, [SCRIPT, "--evidence", evidencePath, "--out", path.join(dir, "g.json")], { cwd: dir, encoding: "utf8", env });
    expect(r.status).toBe(1);
    expect(r.stdout).toContain("no expected commit available");
  });

  it("blocks non-passing outcomes and non-approving decisions", () => {
    const e = validEvidence();
    e.stagingSmokeRun.outcome = "FAILED";
    e.productionApproval.decision = "REJECTED";
    expectBlocked(run(e), "stagingSmokeRun.outcome", "not a recognised passing outcome", "productionApproval.decision", "not an approving decision");
  });

  it("blocks stale evidence only when a max age is supplied", () => {
    expect(run(validEvidence()).code).toBe(0);
    const r = run(validEvidence(), ["--max-age-days", "1"]);
    expectBlocked(r, "older than 1 day(s)");
    expect(r.report?.failures.some((f: { code: string }) => f.code === "STALE")).toBe(true);
  });

  it("blocks future-dated and out-of-order (contradictory) timestamps", () => {
    const e = validEvidence();
    e.stagingSmokeRun.timestamp = "2999-01-01T00:00:00Z";
    expectBlocked(run(e), "stagingSmokeRun.timestamp: is in the future");
    const o = validEvidence();
    o.productionApproval.timestamp = "2026-09-30T00:00:00Z";
    expectBlocked(run(o), "approval is dated before stagingMigrationRun");
  });

  it("blocks contradictions with other authoritative records", () => {
    const e = validEvidence() as Record<string, unknown>;
    e.automatedEvidence = { stagingE2E: { status: "FAIL" } };
    expectBlocked(run(e), "automatedEvidence.stagingE2E");
    expectBlocked(run(validEvidence(), [], { smoke: { status: "FAIL" } }), "STAGING_SMOKE_EVIDENCE.json reports FAIL");
  });

  it("treats EXTERNAL_REQUIRED automated records as informational, not a contradiction", () => {
    const e = validEvidence() as Record<string, unknown>;
    e.automatedEvidence = { stagingSmoke: { status: "EXTERNAL_REQUIRED" } };
    expect(run(e, [], { smoke: { status: "EXTERNAL_REQUIRED" } }).code).toBe(0);
  });

  it("allows optional fields to be omitted (automatedEvidence, smoke file, unrelated keys)", () => {
    const e = validEvidence() as Record<string, unknown>;
    expect("automatedEvidence" in e).toBe(false);
    expect(run(e).code).toBe(0);
  });

  it("rejects credential-like fields and credentialed URLs in evidence", () => {
    const e = validEvidence() as Record<string, unknown>;
    (e.stagingMigrationRun as Record<string, unknown>).database_url = "x";
    expectBlocked(run(e), "credential/secret-like field name");
    const u = validEvidence();
    u.stagingMigrationRun.target = "postgres://admin:hunter2@db.example.com/postgres";
    expectBlocked(run(u), "URL with embedded credentials");
  });

  it("rejects an invalid --max-age-days option rather than ignoring it", () => {
    expectBlocked(run(validEvidence(), ["--max-age-days", "abc"]), "maxAgeDays: must be a positive number");
  });

  it("--no-write produces no report file but still sets the exit code", () => {
    const r = run({}, ["--no-write"]);
    expect(r.code).toBe(1);
    expect(r.report).toBeNull();
  });
});

describe("related release gates share the same evidence contract", () => {
  const read = (f: string) => fs.readFileSync(path.join(REPO, "scripts", f), "utf8");
  it.each(["audit-production-evidence.mjs", "audit-release-evidence.mjs", "audit-go-live.mjs"])("%s validates via the shared contract and not by truthiness", (f) => {
    const src = read(f);
    expect(src).toContain("release-evidence-contract.mjs");
    expect(src).toContain("validateLiveReleaseEvidence");
    expect(src).not.toMatch(/filter\(k=>!evidence\[k\]\)/);
  });

  it("go-live cannot report GO while evidence is invalid", () => {
    expect(read("audit-go-live.mjs")).toMatch(/status:hardFailures\.length\|\|missingEvidence\.length\?'BLOCKED':'GO'/);
  });
});
