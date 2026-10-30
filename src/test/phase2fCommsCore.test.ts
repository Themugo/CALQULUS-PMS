import { describe, it, expect } from "vitest";
import {
  buildDedupKey, claimNotification, sendOnce, outcomeFromError, type RpcClient,
} from "../../supabase/functions/_shared/notificationDedup";
import { resolveSender, sendEmailViaResend, emailOutcome } from "../../supabase/functions/_shared/emailConfig";
import {
  evaluateSendPolicy, parseQuietHours, inQuietHours, parseInboundKeyword, normaliseAddress,
} from "../../supabase/functions/_shared/commsPolicy";
import { createUnsubscribeToken, verifyUnsubscribeToken } from "../../supabase/functions/_shared/unsubscribeToken";
import { verifyTwilioSignature, verifySharedSecret, parseInbound } from "../../supabase/functions/_shared/inboundSms";
import { generateToken, sha256Hex, isWellFormedToken, isWellFormedInviteToken } from "../../supabase/functions/_shared/tokens";
import { tryFormatPhoneNumber } from "../../supabase/functions/_shared/phone";

/** In-memory model of the claim/complete/release RPCs (single-threaded JS == atomic per call). */
function fakeDb(opts: { failWith?: { code: string } } = {}) {
  const rows = new Map<string, { status: "in_flight" | "sent"; lease: number }>();
  let now = 1000;
  const client: RpcClient = {
    async rpc(fn, args) {
      if (opts.failWith) return { data: null, error: opts.failWith };
      const key = String(args.p_key);
      const r = rows.get(key);
      if (fn === "claim_notification") {
        if (!r) { rows.set(key, { status: "in_flight", lease: now + Number(args.p_lease_seconds) }); return { data: "claimed", error: null }; }
        if (r.status === "sent") return { data: "duplicate_sent", error: null };
        if (r.lease > now) return { data: "duplicate_in_flight", error: null };
        r.lease = now + Number(args.p_lease_seconds);
        return { data: "reclaimed", error: null };
      }
      if (fn === "complete_notification") { if (r) r.status = "sent"; return { data: null, error: null }; }
      if (fn === "release_notification") { if (r?.status === "in_flight") rows.delete(key); return { data: null, error: null }; }
      return { data: null, error: { code: "42883" } };
    },
  };
  return { client, rows, advance: (s: number) => { now += s; } };
}

describe("dedup core", () => {
  it("builds validated keys", () => {
    expect(buildDedupKey({ type: "a", subject: "b", window: "2026-01-01" })).toBe("a:b:2026-01-01");
    expect(() => buildDedupKey({ type: "a b", subject: "x" })).toThrow();
  });
  it("20 concurrent senders -> exactly one send", async () => {
    const { client } = fakeDb();
    let sends = 0;
    const res = await Promise.all(Array.from({ length: 20 }, () => sendOnce(client, "k:1:w", async () => { sends++; return "sent"; })));
    expect(sends).toBe(1);
    expect(res.filter((r) => r.ran).length).toBe(1);
  });
  it("sent claims stay duplicate_sent", async () => {
    const { client } = fakeDb();
    await sendOnce(client, "k:2:w", async () => "sent");
    const again = await sendOnce(client, "k:2:w", async () => "sent");
    expect(again).toEqual({ ran: false, skipped: "duplicate_sent" });
  });
  it("definite rejection releases so a retry can send", async () => {
    const { client } = fakeDb();
    await sendOnce(client, "k:3:w", async () => "rejected");
    const retry = await sendOnce(client, "k:3:w", async () => "sent");
    expect(retry.ran && retry.outcome).toBe("sent");
  });
  it("unknown outcome keeps the claim until lease expiry, then permits retry (at-least-once)", async () => {
    const { client, advance } = fakeDb();
    await sendOnce(client, "k:4:w", async () => "unknown", 60);
    expect(await sendOnce(client, "k:4:w", async () => "sent", 60)).toEqual({ ran: false, skipped: "duplicate_in_flight" });
    advance(61);
    const later = await sendOnce(client, "k:4:w", async () => "sent", 60);
    expect(later.ran).toBe(true);
  });
  it("a throwing sender is treated as unknown", async () => {
    const { client } = fakeDb();
    const r = await sendOnce(client, "k:5:w", async () => { throw new Error("boom"); });
    expect(r).toMatchObject({ ran: true, outcome: "unknown" });
  });
  it.each([["42P01", "dedup_unavailable"], ["42883", "dedup_unavailable"], ["42501", "dedup_permission_denied"], ["XX000", "dedup_error"]])(
    "fails closed on %s without sending", async (code, reason) => {
      const { client } = fakeDb({ failWith: { code } });
      let sends = 0;
      const r = await sendOnce(client, "k:6:w", async () => { sends++; return "sent"; });
      expect(sends).toBe(0);
      expect(r).toEqual({ ran: false, skipped: "dedup_error", reason });
    },
  );
  it("network error on claim fails closed", async () => {
    const c: RpcClient = { rpc: () => { throw new Error("net"); } };
    expect(await claimNotification(c, "k:7:w")).toEqual({ status: "error", reason: "dedup_network_error" });
  });
  it("classifies thrown errors", () => {
    expect(outcomeFromError(Object.assign(new Error(), { name: "AbortError" }))).toBe("unknown");
    expect(outcomeFromError(new Error("x"))).toBe("rejected");
    expect(outcomeFromError({ sendOutcome: "sent" })).toBe("sent");
  });
});

describe("email sender fail-closed", () => {
  it.each([undefined, "", "   "])("rejects missing sender %j", (v) => {
    expect(() => resolveSender(v)).toThrow(/not configured/);
  });
  it.each(["onboarding@resend.dev", "x@example.com", "Name <a@test>", "a@localhost", "not-an-email", "placeholder@acme.io"])(
    "rejects unsafe sender %s", (v) => { expect(() => resolveSender(v)).toThrow(); },
  );
  it("accepts a real-looking domain and sanitises the display name", () => {
    const s = resolveSender("Acme <noreply@mail.acme.co.ke>", 'Evil"<b>');
    expect(s.address).toBe("noreply@mail.acme.co.ke");
    expect(s.from).not.toMatch(/["<>]{2}/);
  });
  const env = { RESEND_API_KEY: "re_secret", RESEND_FROM_EMAIL: "noreply@mail.acme.co.ke" };
  const input = { to: ["a@b.co"], subject: "s", html: "<p>x</p>" };
  const mk = (status: number, body: unknown = {}) => (async () => new Response(JSON.stringify(body), { status })) as unknown as typeof fetch;
  it("never calls the provider when config is bad", async () => {
    let called = 0;
    const f = (async () => { called++; return new Response("{}"); }) as unknown as typeof fetch;
    expect(await sendEmailViaResend({ ...env, RESEND_FROM_EMAIL: "" }, input, f)).toMatchObject({ ok: false, kind: "config" });
    expect(await sendEmailViaResend({ ...env, RESEND_API_KEY: "" }, input, f)).toMatchObject({ ok: false, kind: "config" });
    expect(called).toBe(0);
  });
  it("classifies provider results", async () => {
    expect(await sendEmailViaResend(env, input, mk(200, { id: "1" }))).toEqual({ ok: true, id: "1" });
    const r4 = await sendEmailViaResend(env, input, mk(403, { message: "domain not verified re_abc123" }));
    expect(r4).toMatchObject({ ok: false, kind: "rejected", status: 403 });
    expect(JSON.stringify(r4)).not.toContain("re_abc123");
    expect(emailOutcome(r4)).toBe("rejected");
    expect(emailOutcome(await sendEmailViaResend(env, input, mk(429)))).toBe("rejected");
    expect(emailOutcome(await sendEmailViaResend(env, input, mk(503)))).toBe("unknown");
  });
  it("timeouts and network errors are ambiguous", async () => {
    const f = (async () => { throw new TypeError("net"); }) as unknown as typeof fetch;
    expect(emailOutcome(await sendEmailViaResend(env, input, f))).toBe("unknown");
  });
});

describe("comms policy", () => {
  const base = { channel: "sms", optedOut: false } as const;
  it("security always sends", () => {
    expect(evaluateSendPolicy({ ...base, category: "security", optedOut: true, lookupFailed: true }).allow).toBe(true);
  });
  it("transactional email ignores opt-out; transactional SMS honours it", () => {
    expect(evaluateSendPolicy({ channel: "email", category: "transactional", optedOut: true }).allow).toBe(true);
    expect(evaluateSendPolicy({ ...base, category: "transactional", optedOut: true })).toMatchObject({ allow: false, reason: "opted_out" });
  });
  it("lookup failure fails closed for non-security", () => {
    expect(evaluateSendPolicy({ ...base, category: "reminder", lookupFailed: true })).toMatchObject({ allow: false, reason: "opt_out_lookup_failed" });
  });
  it("marketing needs consent", () => {
    expect(evaluateSendPolicy({ channel: "email", category: "marketing", optedOut: false }).reason).toBe("no_marketing_consent");
    expect(evaluateSendPolicy({ channel: "email", category: "marketing", optedOut: false, marketingConsent: true }).allow).toBe(true);
  });
  it("quiet hours need full valid explicit config", () => {
    expect(parseQuietHours({})).toBeNull();
    expect(parseQuietHours({ COMMS_TIMEZONE: "Nope/Zone", COMMS_QUIET_START: "21:00", COMMS_QUIET_END: "07:00" })).toBeNull();
    expect(parseQuietHours({ COMMS_TIMEZONE: "UTC", COMMS_QUIET_START: "25:00", COMMS_QUIET_END: "07:00" })).toBeNull();
  });
  it("quiet hours wrap past midnight and apply to reminders on SMS only", () => {
    const q = parseQuietHours({ COMMS_TIMEZONE: "UTC", COMMS_QUIET_START: "21:00", COMMS_QUIET_END: "07:00" })!;
    expect(q).not.toBeNull();
    expect(inQuietHours(new Date("2026-01-01T23:00:00Z"), q)).toBe(true);
    expect(inQuietHours(new Date("2026-01-01T03:00:00Z"), q)).toBe(true);
    expect(inQuietHours(new Date("2026-01-01T12:00:00Z"), q)).toBe(false);
    const night = new Date("2026-01-01T23:00:00Z");
    const d = evaluateSendPolicy({ ...base, category: "reminder", quietHours: q, now: night });
    expect(d).toMatchObject({ allow: false, reason: "quiet_hours" });
    expect(d.retryAfter!.toISOString()).toBe("2026-01-02T07:00:00.000Z");
    expect(evaluateSendPolicy({ channel: "email", category: "reminder", optedOut: false, quietHours: q, now: night }).allow).toBe(true);
    expect(evaluateSendPolicy({ ...base, category: "transactional", quietHours: q, now: night }).allow).toBe(true);
  });
  it("parses STOP/START keywords strictly", () => {
    for (const w of ["STOP", " stop ", "Unsubscribe", "quit.", "END"]) expect(parseInboundKeyword(w)).toBe("stop");
    for (const w of ["START", "unstop"]) expect(parseInboundKeyword(w)).toBe("start");
    for (const w of ["please stop", "stopping", "", null]) expect(parseInboundKeyword(w)).toBe("none");
  });
  it("normalises addresses", () => {
    expect(normaliseAddress("email", " A@B.CO ")).toBe("a@b.co");
    expect(normaliseAddress("email", "bad")).toBeNull();
    expect(normaliseAddress("sms", "+254 712-345-678")).toBe("+254712345678");
    expect(normaliseAddress("sms", "0712345678")).toBeNull();
  });
});

describe("unsubscribe tokens", () => {
  const secret = "s".repeat(32);
  const p = { channel: "email", address: "a@b.co", scope: "reminders" } as const;
  it("round-trips", async () => {
    const t = await createUnsubscribeToken(secret, p, 1000);
    expect(await verifyUnsubscribeToken(secret, t, 2000)).toEqual({ valid: true, payload: p });
  });
  it("rejects tampering, wrong secret, expiry and junk", async () => {
    const t = await createUnsubscribeToken(secret, p, 1000);
    const [body, sig] = t.split(".");
    const forged = Buffer.from(JSON.stringify({ c: "email", a: "victim@b.co", s: "reminders", t: 1000 })).toString("base64url");
    expect(await verifyUnsubscribeToken(secret, `${forged}.${sig}`, 2000)).toMatchObject({ valid: false, reason: "bad_signature" });
    expect(await verifyUnsubscribeToken("x".repeat(32), t, 2000)).toMatchObject({ valid: false, reason: "bad_signature" });
    expect(await verifyUnsubscribeToken(secret, t, 1000 + 400 * 86400)).toMatchObject({ valid: false, reason: "expired" });
    for (const junk of ["", "a", "a.b.c", 5, null]) expect(await verifyUnsubscribeToken(secret, junk, 2000)).toMatchObject({ valid: false, reason: "malformed" });
    expect(body).toBeTruthy();
  });
  it("refuses to run without a strong secret", async () => {
    await expect(createUnsubscribeToken("short", p)).rejects.toThrow();
    expect(await verifyUnsubscribeToken("", "a.b")).toMatchObject({ valid: false });
  });
});

describe("inbound SMS authentication", () => {
  it("verifies Twilio signatures", async () => {
    const url = "https://x.example/fn"; const params = { From: "+254700000000", Body: "STOP" };
    const { createHmac } = await import("node:crypto");
    const sig = createHmac("sha1", "tok").update(url + "BodySTOPFrom+254700000000").digest("base64");
    expect(await verifyTwilioSignature("tok", url, params, sig)).toBe(true);
    expect(await verifyTwilioSignature("tok", url, { ...params, Body: "START" }, sig)).toBe(false);
    expect(await verifyTwilioSignature("tok", url, params, null)).toBe(false);
    expect(await verifyTwilioSignature("", url, params, sig)).toBe(false);
  });
  it("shared secret must be long and equal", () => {
    expect(verifySharedSecret("a".repeat(20), "a".repeat(20))).toBe(true);
    expect(verifySharedSecret("a".repeat(20), "b".repeat(20))).toBe(false);
    expect(verifySharedSecret("short", "short")).toBe(false);
    expect(verifySharedSecret("a".repeat(20), null)).toBe(false);
  });
  it("parses both providers and rejects garbage", () => {
    expect(parseInbound({ From: "+1", Body: "x" })?.provider).toBe("twilio");
    expect(parseInbound({ from: "+1", text: "x" })?.provider).toBe("africastalking");
    expect(parseInbound({})).toBeNull();
  });
});

describe("tokens and phone", () => {
  it("generates 64-hex tokens and validates shape", async () => {
    const t = generateToken();
    expect(isWellFormedToken(t)).toBe(true);
    expect(generateToken()).not.toBe(t);
    for (const bad of ["", "abc", "g".repeat(64), "A".repeat(64) + "x", 5, null, undefined]) expect(isWellFormedToken(bad)).toBe(false);
    expect(await sha256Hex("abc")).toBe("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
  });
  it("invite token shape accepts new 64-hex and legacy UUID tokens only", () => {
    expect(isWellFormedInviteToken(generateToken())).toBe(true);
    expect(isWellFormedInviteToken("123e4567-e89b-12d3-a456-426614174000")).toBe(true);
    for (const bad of ["", "abc", "x".repeat(64), "123e4567-e89b-12d3-a456-42661417400", "1 OR 1=1", null, 5]) expect(isWellFormedInviteToken(bad)).toBe(false);
  });
  it("normalises phones and rejects invalid", () => {
    expect(tryFormatPhoneNumber("0712345678")).toBe("+254712345678");
    expect(tryFormatPhoneNumber("+254712345678")).toBe("+254712345678");
    expect(tryFormatPhoneNumber("abc")).toBeNull();
    expect(tryFormatPhoneNumber("07123")).toBeNull();
  });
});
