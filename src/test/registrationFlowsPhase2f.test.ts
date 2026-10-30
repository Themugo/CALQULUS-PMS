import { describe, it, expect, vi, beforeEach } from "vitest";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const rpc = vi.fn();
const invoke = vi.fn(() => Promise.resolve({ error: null }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { rpc: (...a: unknown[]) => rpc(...a), functions: { invoke: (...a: unknown[]) => invoke(...(a as [])) } } }));

import { rememberPendingInvitationClaim, claimPendingInvitationIfAny } from "@/features/auth/lib/pendingInvitationClaim";
import { rememberOauthPortal, completeOauthSignupIfNeeded } from "@/features/auth/lib/oauthSignup";
import { maybeNotifyPendingSignup } from "@/features/auth/lib/pendingSignupNotice";

const user = (email: string, id = "u1") => ({ id, email, user_metadata: { full_name: "Jo" } }) as never;
const root = process.cwd();
const read = (p: string) => readFileSync(resolve(root, p), "utf8");

beforeEach(() => { localStorage.clear(); rpc.mockReset(); invoke.mockClear(); });

describe("deferred invitation claim (email confirmation on)", () => {
  it("does nothing when nothing is pending or the email differs", async () => {
    expect(await claimPendingInvitationIfAny(user("a@b.co"))).toBe(false);
    rememberPendingInvitationClaim("tok", "a@b.co");
    expect(await claimPendingInvitationIfAny(user("other@b.co"))).toBe(false);
    expect(rpc).not.toHaveBeenCalled();
  });
  it("claims a tenant invitation on first sign-in (case-insensitive email), notifies the manager once and clears it", async () => {
    rpc.mockResolvedValue({ error: null });
    rememberPendingInvitationClaim("tok", "A@B.co", { managerId: "m1", tenantName: "Jo", propertyName: "P", unit: "1" });
    expect(await claimPendingInvitationIfAny(user("a@b.CO"))).toBe(true);
    expect(rpc).toHaveBeenCalledWith("claim_tenant_invitation_atomic", { p_token: "tok" });
    expect(invoke).toHaveBeenCalledWith("notify-manager-tenant-signup", expect.anything());
    expect(await claimPendingInvitationIfAny(user("a@b.co"))).toBe(false);
  });
  it("uses the landlord RPC for landlord invitations and sends no manager notice", async () => {
    rpc.mockResolvedValue({ error: null });
    rememberPendingInvitationClaim("tok", "l@b.co", undefined, "landlord");
    expect(await claimPendingInvitationIfAny(user("l@b.co"))).toBe(true);
    expect(rpc).toHaveBeenCalledWith("accept_landlord_invitation", { p_token: "tok" });
    expect(invoke).not.toHaveBeenCalled();
  });
  it("drops permanently-failed tokens but keeps the claim after a transient error", async () => {
    rememberPendingInvitationClaim("tok", "a@b.co");
    rpc.mockResolvedValueOnce({ error: { message: "Invitation is invalid or expired" } });
    expect(await claimPendingInvitationIfAny(user("a@b.co"))).toBe(false);
    expect(localStorage.getItem("calqulus_pending_invitation_claim")).toBeNull();
    rememberPendingInvitationClaim("tok2", "a@b.co");
    rpc.mockResolvedValueOnce({ error: { message: "network down" } });
    expect(await claimPendingInvitationIfAny(user("a@b.co"))).toBe(false);
    expect(localStorage.getItem("calqulus_pending_invitation_claim")).not.toBeNull();
  });
  it("discards claims older than 7 days", async () => {
    localStorage.setItem("calqulus_pending_invitation_claim", JSON.stringify({ kind: "tenant", token: "t", email: "a@b.co", at: Date.now() - 8 * 864e5 }));
    expect(await claimPendingInvitationIfAny(user("a@b.co"))).toBe(false);
    expect(rpc).not.toHaveBeenCalled();
  });
});

describe("pending manager/agency first sign-in notices", () => {
  it("fires welcome + admin notice only for pending managers/agencies, once per browser after success", async () => {
    maybeNotifyPendingSignup(user("m@b.co"), { role: "tenant", approval_status: "approved" });
    maybeNotifyPendingSignup(user("m@b.co"), { role: "manager", approval_status: "approved" });
    expect(invoke).not.toHaveBeenCalled();
    maybeNotifyPendingSignup(user("m@b.co"), { role: "manager", approval_status: "pending" });
    await new Promise((r) => setTimeout(r, 0));
    const names = invoke.mock.calls.map((c) => (c as unknown as string[])[0]);
    expect(names).toEqual(expect.arrayContaining(["send-welcome-email", "notify-new-manager-signup"]));
    invoke.mockClear();
    maybeNotifyPendingSignup(user("m@b.co"), { role: "manager", approval_status: "pending" });
    expect(invoke).not.toHaveBeenCalled();
  });
});

describe("Google sign-in portal completion", () => {
  beforeEach(() => sessionStorage.clear());
  it("does nothing without a remembered portal or with a tampered one", async () => {
    await completeOauthSignupIfNeeded(user("g@b.co"));
    sessionStorage.setItem("calqulus_oauth_portal_intent", "webhost");
    await completeOauthSignupIfNeeded(user("g@b.co"));
    expect(rpc).not.toHaveBeenCalled();
  });
  it("registers the remembered portal once and clears the intent", async () => {
    rpc.mockResolvedValue({ error: null });
    rememberOauthPortal("agency");
    await completeOauthSignupIfNeeded(user("g@b.co"));
    expect(rpc).toHaveBeenCalledWith("complete_oauth_signup", { p_role: "agency" });
    await completeOauthSignupIfNeeded(user("g@b.co"));
    expect(rpc).toHaveBeenCalledTimes(1);
  });
  it("keeps the intent after a transient failure", async () => {
    rpc.mockResolvedValue({ error: { message: "network down" } });
    rememberOauthPortal("manager");
    await completeOauthSignupIfNeeded(user("g@b.co"));
    expect(sessionStorage.getItem("calqulus_oauth_portal_intent")).toBe("manager");
  });
});

describe("registration flow wiring (static)", () => {
  it("manager-created tenant accounts carry role=tenant so the signup trigger does not add a manager row", () => {
    expect(read("supabase/functions/create-tenant-account/index.ts")).toMatch(/user_metadata:\s*\{[^}]*role:\s*"tenant"/);
    expect(read("supabase/functions/backfill-tenant-accounts/index.ts")).toMatch(/user_metadata:\s*\{[^}]*role:\s*"tenant"/);
  });
  it("new admin accounts do not keep the trigger's default pending manager row", () => {
    expect(read("supabase/functions/accept-admin-invitation/index.ts")).toMatch(/\.eq\("role", "manager"\)\s*\n\s*\.eq\("approval_status", "pending"\)/);
  });
  it("welcome email: case-insensitive own-address check, dedup, real routes, no raw error text", () => {
    const s = read("supabase/functions/send-welcome-email/index.ts");
    expect(s).toContain(".toLowerCase()");
    expect(s).toContain("sendOnce");
    expect(s).not.toContain('"/dashboard"');
    expect(s).not.toMatch(/error:\s*error\.message/);
  });
  it("no function uses the Resend SDK directly or a hard-coded sender domain anywhere in its source", () => {
    const dirs = readdirSync(resolve(root, "supabase/functions"), { withFileTypes: true }).filter((e) => e.isDirectory());
    for (const d of dirs) {
      const p = `supabase/functions/${d.name}/index.ts`;
      if (!existsSync(resolve(root, p))) continue;
      const s = read(p);
      expect(s, p).not.toMatch(/resend\/resend@/);
      expect(s, p).not.toMatch(/<[a-z-]+@calqulus\.site>/);
    }
  });
  it("approval email uses the shared sender and escapes admin/user text", () => {
    const s = read("supabase/functions/send-manager-approval-notification/index.ts");
    expect(s).toContain("sendEmail(");
    expect(s).toContain("escapeHtml(");
    expect(s).not.toMatch(/\$\{noteOrReason\}/);
  });
  it("signup notification is de-duplicated per user and uses the shared sender", () => {
    const s = read("supabase/functions/notify-new-manager-signup/index.ts");
    expect(s).toContain("sendOnce");
    expect(s).toContain("new-signup-webhost");
    expect(s).not.toContain("resend.emails.send");
  });
  it("tenant invitation signup defers the claim when there is no session", () => {
    const s = read("src/features/auth/pages/TenantAuth.tsx");
    expect(s.indexOf("rememberPendingInvitationClaim(")).toBeGreaterThan(-1);
    expect(s.indexOf("rememberPendingInvitationClaim(")).toBeLessThan(s.indexOf("claim_tenant_invitation_atomic"));
    expect(read("src/features/auth/AuthContext.tsx")).toContain("claimPendingInvitationIfAny");
  });
  it("landlord invitation: role reloaded after the RPC grants it, and claim deferred without a session", () => {
    const s = read("src/features/landlord/pages/LandlordInvitationAccept.tsx");
    expect(s).toContain("await refreshRoles()");
    expect(s).toContain("rememberPendingInvitationClaim(token");
    expect(read("src/features/auth/AuthContext.tsx")).toContain("refreshRoles");
  });
});
