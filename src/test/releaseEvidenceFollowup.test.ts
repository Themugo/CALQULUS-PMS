// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

// Phase 2B.1 regression tests: ingestion gate, promotion-lock revision authority, certificate wording.
// Temp fixtures only; the real docs/audits/* files are never read or written.

const REPO = process.cwd();
const S = (f: string) => path.join(REPO, "scripts", f);
const SHA = "0123456789abcdef0123456789abcdef01234567";
const OTHER = "fedcba9876543210fedcba9876543210fedcba98";

const cleanEnv = () => {
  const e = { ...process.env } as Record<string, string | undefined>;
  for (const k of Object.keys(e)) if (/^(RELEASE_|PRODUCTION_EVIDENCE|EVIDENCE_MAX)/.test(k)) delete e[k];
  return e as NodeJS.ProcessEnv;
};
let dir: string;
beforeEach(() => { dir = fs.mkdtempSync(path.join(os.tmpdir(), "evidence-followup-")); });
afterEach(() => { fs.rmSync(dir, { recursive: true, force: true }); });
const node = (script: string, args: string[], env: Record<string, string> = {}, cwd = dir) => {
  const r = spawnSync(process.execPath, [S(script), ...args], { cwd, encoding: "utf8", env: { ...cleanEnv(), ...env } });
  return { code: r.status, out: r.stdout + r.stderr };
};
const validBundle = () => ({
  releaseCommit: SHA, stagingMigrationRun: "mig-run-77", stagingSmokeRun: "smoke-run-78", stagingRestoreRun: "restore-run-79",
  productionApproval: "APPROVED", productionApprovalId: "APR-1", productionApprover: "owner", productionApprovedAt: "2026-10-02T08:00:00Z",
});

describe("production evidence ingestion (validates, not just parses)", () => {
  const ingest = (data: unknown, extra: string[] = [], raw?: string) => {
    const src = path.join(dir, "bundle.json");
    fs.writeFileSync(src, raw ?? JSON.stringify(data));
    const out = path.join(dir, "ingestion.json");
    const r = node("ingest-production-evidence.mjs", ["--source", src, "--out", out, "--expected-commit", SHA, ...extra]);
    return { ...r, report: fs.existsSync(out) ? JSON.parse(fs.readFileSync(out, "utf8")) : null, out_: out };
  };

  it("accepts a valid bundle (PASS marked validated, never an approval)", () => {
    const r = ingest(validBundle());
    expect(r.code).toBe(0);
    expect(r.report.status).toBe("PASS");
    expect(r.report.validation).toBe("VALIDATED_AGAINST_SHARED_CONTRACT");
    expect(r.report.approvalGranted).toBe(false);
    expect(r.report.freshnessPolicy).toBe("UNRESOLVED");
    expect(r.out).toContain("freshness policy is UNRESOLVED");
  });
  it("rejects an empty evidence object (previously PASS)", () => {
    const r = ingest({});
    expect(r.code).toBe(1);
    expect(r.report.status).toBe("FAIL");
    expect(r.out).toContain("releaseCommit: is missing or empty");
  });
  it("rejects empty strings, whitespace and placeholders", () => {
    const b = { ...validBundle(), stagingSmokeRun: "", stagingRestoreRun: "   ", productionApprover: "TBD" };
    const r = ingest(b);
    expect(r.code).toBe(1);
    expect(r.out).toContain("stagingSmokeRun: is empty");
    expect(r.out).toContain("stagingRestoreRun: is empty");
    expect(r.out).toContain("productionApprover: is a placeholder value");
  });
  it("rejects malformed and mismatched commits", () => {
    expect(ingest({ ...validBundle(), releaseCommit: "abc" }).out).toContain("not a full 40-character git SHA");
    const m = ingest({ ...validBundle(), releaseCommit: OTHER });
    expect(m.code).toBe(1);
    expect(m.out).toContain("evidence is for fedcba987654 but assessed revision is 0123456789ab");
  });
  it("rejects negative results, bad timestamps and wrong types", () => {
    const r = ingest({ ...validBundle(), productionApproval: "REJECTED", productionApprovedAt: "soon", rollbackVerified: "yes" });
    expect(r.code).toBe(1);
    expect(r.out).toContain("records a negative result");
    expect(r.out).toContain("productionApprovedAt: is not an ISO-8601 timestamp");
    expect(r.out).toContain("rollbackVerified: must be a boolean");
  });
  it("rejects malformed JSON and structurally unsupported / secret fields", () => {
    expect(ingest(null, [], "{oops").code).toBe(1);
    expect(ingest({ ...validBundle(), db_password: "x" }).code).toBe(1);
    expect(ingest({ ...validBundle(), surprise: 1 }).code).toBe(1);
  });
  it("applies an optional max age (stale evidence fails)", () => {
    const r = ingest(validBundle(), ["--max-age-days", "1"]);
    expect(r.code).toBe(1);
    expect(r.out).toContain("productionApprovedAt: older than 1 day(s)");
  });
  it("without a source stays EXTERNAL_REQUIRED, and the audit treats that as NOT a pass", () => {
    const out = path.join(dir, "ingestion.json");
    node("ingest-production-evidence.mjs", ["--out", out]);
    const rep = JSON.parse(fs.readFileSync(out, "utf8"));
    expect(rep.status).toBe("EXTERNAL_REQUIRED");
    const a = node("audit-production-evidence-ingestion.mjs", ["--report", out]);
    expect(a.code).toBe(1);
    expect(a.out).toContain("not a pass");
  });
  it("audit passes only a validated PASS; empty-evidence FAIL and unmarked PASS are rejected", () => {
    const ok = ingest(validBundle());
    expect(node("audit-production-evidence-ingestion.mjs", ["--report", ok.out_]).code).toBe(0);
    const bad = ingest({});
    expect(node("audit-production-evidence-ingestion.mjs", ["--report", bad.out_]).code).toBe(1);
    const forged = path.join(dir, "forged.json");
    fs.writeFileSync(forged, JSON.stringify({ status: "PASS", findings: [] }));
    const f = node("audit-production-evidence-ingestion.mjs", ["--report", forged]);
    expect(f.code).toBe(1);
    expect(f.out).toContain("UNVALIDATED_PASS");
    expect(node("audit-production-evidence-ingestion.mjs", ["--report", path.join(dir, "nope.json")]).code).toBe(1);
  });
});

describe("release promotion lock (revision authority is independent of the evidence)", () => {
  const git = (...a: string[]) => spawnSync("git", a, { cwd: dir, encoding: "utf8", env: { ...cleanEnv(), GIT_AUTHOR_NAME: "t", GIT_AUTHOR_EMAIL: "t@t", GIT_COMMITTER_NAME: "t", GIT_COMMITTER_EMAIL: "t@t" } });
  const setup = (evidenceCommit: string | undefined) => {
    git("init", "-q"); fs.writeFileSync(path.join(dir, "f.txt"), "x"); git("add", "."); git("commit", "-q", "-m", "c");
    const head = git("rev-parse", "HEAD").stdout.trim();
    const audits = path.join(dir, "docs", "audits"); fs.mkdirSync(audits, { recursive: true });
    const w = (n: string, o: unknown) => fs.writeFileSync(path.join(audits, n), JSON.stringify(o));
    w("LIVE_RELEASE_EVIDENCE.json", evidenceCommit === undefined ? {} : { releaseCommit: evidenceCommit === "HEAD" ? head : evidenceCommit });
    for (const n of ["RELEASE_RECONCILIATION", "RELEASE_ARTIFACT_PROVENANCE", "DEPLOYMENT_DRIFT", "ROLLBACK_READINESS"]) w(`${n}.json`, { status: "PASS" });
    return head;
  };
  const auth = { RELEASE_AUTHORIZATION_ID: "A-1", RELEASE_AUTHORIZED_BY: "owner", RELEASE_AUTHORIZED_AT: "2026-10-02T08:00:00Z", RELEASE_AUTHORIZATION_SCOPE: "production" };
  const lock = (env: Record<string, string>, args: string[] = []) => {
    const out = path.join(dir, "lock.json");
    const r = node("audit-release-promotion-lock.mjs", ["--out", out, ...args], { ...auth, ...env });
    return { ...r, report: JSON.parse(fs.readFileSync(out, "utf8")) };
  };

  it("passes when candidate HEAD, expected revision and evidence all agree", () => {
    const head = setup("HEAD");
    const r = lock({ RELEASE_COMMIT_EXPECTED: head });
    expect(r.code).toBe(0);
    expect(r.report.status).toBe("PASS");
    expect(r.report.approvalGranted).toBe(false);
    expect(r.report.expectedCommitSource).toBe("RELEASE_COMMIT_EXPECTED");
  });
  it("accepts --expected-commit as the independent authority too", () => {
    const head = setup("HEAD");
    expect(lock({}, ["--expected-commit", head]).code).toBe(0);
  });
  it("FAILS CLOSED when no target revision is supplied, even though the evidence names a matching commit (old self-referential pass)", () => {
    setup("HEAD");
    const r = lock({});
    expect(r.code).toBe(1);
    expect(r.report.status).not.toBe("PASS");
    expect(r.report.missing).toContain("expectedCommitProvided");
  });
  it("rejects a malformed target revision", () => {
    const head = setup("HEAD");
    const r = lock({ RELEASE_COMMIT_EXPECTED: head.slice(0, 10) });
    expect(r.code).toBe(1);
    expect(r.report.missing).toContain("expectedCommitWellFormed");
  });
  it("rejects when the checked-out candidate differs from the intended revision", () => {
    setup(OTHER);
    const r = lock({ RELEASE_COMMIT_EXPECTED: OTHER });
    expect(r.code).toBe(1);
    expect(r.report.missing).toContain("candidateCommitMatchesExpected");
  });
  it("rejects when the evidence claims a different commit than the intended revision", () => {
    const head = setup(OTHER);
    const r = lock({ RELEASE_COMMIT_EXPECTED: head });
    expect(r.code).toBe(1);
    expect(r.report.missing).toContain("evidenceCommitMatchesExpected");
  });
  it("rejects when the evidence carries no commit", () => {
    const head = setup(undefined);
    const r = lock({ RELEASE_COMMIT_EXPECTED: head });
    expect(r.code).toBe(1);
    expect(r.report.missing).toContain("evidenceCommitMatchesExpected");
  });
  it("still requires explicit authorization", () => {
    const head = setup("HEAD");
    const r = node("audit-release-promotion-lock.mjs", ["--out", path.join(dir, "l.json")], { RELEASE_COMMIT_EXPECTED: head });
    expect(r.code).toBe(1);
  });
});

describe("release certificate wording and decision layers", () => {
  it("never emits certification/approval wording and is not a GO", async () => {
    const src = fs.readFileSync(S("audit-release-certificate.mjs"), "utf8");
    expect(src).not.toMatch(/REPO_CERTIFIED/);
    expect(src).not.toMatch(/'GO'|CERTIFIED'/);
    expect(src).toContain("NOT A CERTIFICATE OF RELEASE");
  });
  it("decision function: every non-complete state is blocked with a non-zero exit", async () => {
    // @ts-expect-error plain .mjs module without types
    const { releaseCertificateDecision } = await import("../../scripts/lib/release-evidence-contract.mjs");
    const f = [{ field: "x", code: "c", message: "x: bad" }];
    expect(releaseCertificateDecision({ staticChecksPass: false })).toMatchObject({ releaseDecision: "BLOCKED_STATIC_CHECKS_FAILED", exitCode: 1 });
    // valid local checks, no external proof
    expect(releaseCertificateDecision({ staticChecksPass: true, evidenceFailures: f })).toMatchObject({ releaseDecision: "BLOCKED_EXTERNAL_EVIDENCE_REQUIRED", exitCode: 1 });
    // evidence validated but not independently verified
    expect(releaseCertificateDecision({ staticChecksPass: true, independentAttestation: "EXTERNAL_REQUIRED", maxAgeDays: 30 })).toMatchObject({ releaseDecision: "BLOCKED_INDEPENDENT_VERIFICATION_REQUIRED", exitCode: 1 });
    // everything but a freshness policy -> blocked, not silently complete
    const noPolicy = releaseCertificateDecision({ staticChecksPass: true, independentAttestation: "PASS" });
    expect(noPolicy).toMatchObject({ releaseDecision: "BLOCKED_FRESHNESS_POLICY_UNRESOLVED", exitCode: 1 });
    expect(noPolicy.layers.evidenceFreshness).toBe("UNRESOLVED_POLICY");
    // genuinely complete case
    const done = releaseCertificateDecision({ staticChecksPass: true, independentAttestation: "PASS", maxAgeDays: 30 });
    expect(done).toMatchObject({ releaseDecision: "EVIDENCE_COMPLETE_NOT_AN_APPROVAL", exitCode: 0 });
    expect(done.layers.approval).toBe("NOT_GRANTED_BY_THIS_TOOL");
  });
});

describe("evidence freshness policy", () => {
  it("is unresolved by default and visible in gate output; configured bound is honoured", () => {
    const e = path.join(dir, "e.json");
    fs.writeFileSync(e, JSON.stringify({
      releaseCommit: SHA,
      stagingMigrationRun: { timestamp: "2026-10-01T08:00:00Z", target: "s", operator: "o", outcome: "PASS" },
      stagingSmokeRun: { timestamp: "2026-10-01T09:00:00Z", target: "s", operator: "o", outcome: "PASS" },
      stagingRestoreRun: { timestamp: "2026-10-01T10:00:00Z", recoveryPoint: "r", restoreTarget: "t", operator: "o", outcome: "PASS" },
      productionApproval: { timestamp: "2026-10-02T08:00:00Z", approver: "a", decision: "APPROVED" },
    }));
    const base = ["--evidence", e, "--smoke", path.join(dir, "none.json"), "--expected-commit", SHA, "--no-write"];
    const a = node("audit-production-evidence.mjs", base);
    expect(a.code).toBe(0);
    expect(a.out).toContain("freshness policy is UNRESOLVED");
    const b = node("audit-production-evidence.mjs", base, { EVIDENCE_MAX_AGE_DAYS: "1" });
    expect(b.code).toBe(1);
    expect(b.out).toContain("older than 1 day(s)");
    const c = node("audit-production-evidence.mjs", base, { EVIDENCE_MAX_AGE_DAYS: "36500" });
    expect(c.code).toBe(0);
    expect(c.out).not.toContain("UNRESOLVED");
  });
});
