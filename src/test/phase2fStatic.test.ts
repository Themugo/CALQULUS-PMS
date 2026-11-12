import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const read = (p: string) => readFileSync(resolve(root, p), "utf8");
const fns = readdirSync(resolve(root, "supabase/functions"), { withFileTypes: true })
  .filter((e) => e.isDirectory() && existsSync(resolve(root, "supabase/functions", e.name, "index.ts")))
  .map((e) => e.name);

const MIGRATIONS = [
  "20260909000001_notification_dedup_leases.sql",
  "20260909000002_comms_consent_and_optouts.sql",
  "20260909000003_tenant_claim_consent.sql",
  "20260909000004_token_hash_storage.sql",
  "20260909000005_auth_user_email_lookup.sql",
  "20260909000006_tenant_invitation_token_hash.sql",
  "20260909000007_oauth_signup_role_completion.sql",
];

describe("Phase 2F migrations (unapplied, additive, least-privilege)", () => {
  it.each(MIGRATIONS)("%s exists and never drops data", (m) => {
    const sql = read(`supabase/migrations/${m}`);
    expect(sql).not.toMatch(/\bDROP\s+TABLE\b/i);
    expect(sql).not.toMatch(/\bTRUNCATE\b/i);
    expect(sql).not.toMatch(/\bDELETE\s+FROM\s+public\.(?!tenant_claim_requests|communication|notification_dedup)/i);
  });
  it("migration versions are unique", () => {
    const v = readdirSync(resolve(root, "supabase/migrations")).filter((f) => f.endsWith(".sql")).map((f) => f.split("_")[0]);
    for (const m of MIGRATIONS) expect(v.filter((x) => x === m.split("_")[0]).length).toBe(1);
  });
  it("every SECURITY DEFINER function pins search_path", () => {
    for (const m of MIGRATIONS) {
      const sql = read(`supabase/migrations/${m}`);
      const defs = sql.split(/CREATE (?:OR REPLACE )?FUNCTION/i).slice(1).filter((b) => /SECURITY DEFINER/i.test(b.split(/\$\$|\$fn\$|\$body\$/)[0] ?? ""));
      for (const d of defs) expect(d).toMatch(/SET search_path/i);
    }
  });
  it("dedup + opt-out + request + lookup RPCs are service_role only", () => {
    const grants = [
      ["20260909000001_notification_dedup_leases.sql", ["claim_notification", "complete_notification", "release_notification"]],
      ["20260909000002_comms_consent_and_optouts.sql", ["record_comms_opt_out", "clear_comms_opt_out", "is_comms_opted_out"]],
      ["20260909000003_tenant_claim_consent.sql", ["request_tenant_claim"]],
      ["20260909000004_token_hash_storage.sql", ["issue_account_activation", "consume_activation_token", "validate_activation_token", "use_activation_token"]],
      ["20260909000005_auth_user_email_lookup.sql", ["find_auth_user_id_by_email"]],
    ] as const;
    for (const [file, names] of grants) {
      const sql = read(`supabase/migrations/${file}`);
      for (const n of names) {
        expect(sql).toMatch(new RegExp(`REVOKE ALL ON FUNCTION public\\.${n}[^;]*FROM PUBLIC, anon, authenticated`));
        expect(sql).toMatch(new RegExp(`GRANT EXECUTE ON FUNCTION public\\.${n}[^;]*TO service_role`));
      }
    }
  });
  it("no earlier migration was edited: new ones are the only 20260909* files", () => {
    const f = readdirSync(resolve(root, "supabase/migrations")).filter((x) => x.startsWith("20260909"));
    expect(f.sort()).toEqual([...MIGRATIONS, "20260909000008_payment_self_credit_lockdown.sql", "20260909000009_tenant_credit_recall.sql", "20260909000010_credit_application_mode.sql", "20260909000011_credit_ledger_write_lockdown.sql", "20260909000012_revive_failed_payment_on_confirmed_money.sql", "20260909000013_payment_trace_end_to_end.sql", "20260909000014_payment_destination_snapshot.sql", "20260909000015_company_settings_partial_save.sql", "20260909000016_collection_destination_routing.sql", "20260909000017_property_management_handover.sql", "20260909000018_departed_operator_archive_access.sql", "20260909000019_complete_pending_stk_multi_tenant.sql", "20260909000020_payer_destination_visibility.sql", "20260909000021_confirmed_payment_protection.sql", "20260909000022_bank_matching_and_announcements.sql", "20260909000023_manual_payment_payer_and_balance.sql", "20260909000024_payer_share_enforcement.sql", "20260909000025_public_tier_description_accuracy.sql", "20260909000026_landlord_collection_account.sql", "20260909000027_manual_payment_destination_consistency.sql"].sort());
  });
});

describe("Phase 2F: edge functions", () => {
  it("no function carries a sandbox or invented sender fallback", () => {
    for (const n of fns) {
      const src = read(`supabase/functions/${n}/index.ts`);
      expect(src, n).not.toMatch(/@resend\.dev/);
      expect(src, n).not.toMatch(/@calqulus\.site["'`]/);
    }
  });
  it("getFromAddress has no fallback", () => {
    const src = read("supabase/functions/_shared/email.ts");
    expect(src).not.toMatch(/resend\.dev/);
    expect(src).toContain("resolveSender");
  });
  it("activation links are never returned to callers", () => {
    for (const n of ["create-agency-landlord-account", "create-tenant-account", "backfill-tenant-accounts"]) {
      const src = read(`supabase/functions/${n}/index.ts`);
      expect(src, n).not.toMatch(/activationUrl\s*[:,]/);
    }
  });
  it("create-agency-landlord-account ignores body portalUrl and does not reveal existing accounts", () => {
    const src = read("supabase/functions/create-agency-landlord-account/index.ts");
    expect(src).not.toMatch(/body\.portalUrl/);
    expect(src).not.toContain("already exists for this email");
    expect(src).toContain("pendingLandlordConsent");
    expect(src).toMatch(/from\("user_roles"\)\.upsert/);
  });
  it("activation tokens are stored hash-only for new invitations", () => {
    const inv = read("supabase/functions/send-admin-invitation/index.ts");
    expect(inv).toMatch(/token_hash/);
    expect(inv).toMatch(/token:\s*null/);
    const act = read("supabase/functions/activate-account/index.ts");
    expect(act).toContain("consume_activation_token");
    expect(act).toContain("isWellFormedToken");
  });
  it("auth user lookup uses the indexed RPC and only falls back when it is missing", () => {
    const src = read("supabase/functions/_shared/authUsers.ts");
    expect(src).toContain("find_auth_user_id_by_email");
    expect(src).toMatch(/42883/);
  });
  it("opt-out surfaces are public but authenticated by signature/secret", () => {
    const cfg = read("supabase/config.toml");
    expect(cfg).toMatch(/\[functions\.unsubscribe\]\s*\nverify_jwt = false/);
    expect(cfg).toMatch(/\[functions\.sms-inbound-webhook\]\s*\nverify_jwt = false/);
    expect(read("supabase/functions/unsubscribe/index.ts")).toContain("verifyUnsubscribeToken");
    const sms = read("supabase/functions/sms-inbound-webhook/index.ts");
    expect(sms).toMatch(/verifyTwilioSignature/);
    expect(sms).toMatch(/verifySharedSecret/);
  });
  it("SMS and WhatsApp sends go through the policy gate", () => {
    expect(read("supabase/functions/_shared/sms.ts")).toContain("checkSendAllowed");
    expect(read("supabase/functions/send-whatsapp-notification/index.ts")).toMatch(/checkSendAllowed|evaluateSendPolicy|sendChannelOnce/);
  });
  it("bootstrap-webhost stays disabled outside local development", () => {
    const src = read("supabase/functions/bootstrap-webhost/index.ts");
    expect(src).toMatch(/disabled outside local development/);
    expect(src).toContain("timingSafeEqual");
  });
  it("financial callback: M-Pesa callback reads resultDesc (camelCase) and acknowledges with Daraja shape", () => {
    const src = read("supabase/functions/mpesa-callback/index.ts");
    expect(src).toMatch(/resultDesc/);
    expect(src).not.toMatch(/const \{[^}]*\bResultDesc\b[^}]*\} =/);
    expect(src).toMatch(/ResultCode:\s*0,\s*ResultDesc:\s*"Accepted"/);
  });
});

describe("Phase 2F: HTML escaping in report/receipt senders", () => {
  it.each(["send-manager-receipt-email", "send-manager-invoice-notification", "send-monthly-report", "auto-send-rent-report"])(
    "%s escapes interpolated values", (n) => { expect(read(`supabase/functions/${n}/index.ts`)).toContain("escapeHtml("); },
  );
  it("rent report uses the shared sender and only advances the schedule after a delivery", () => {
    const src = read("supabase/functions/auto-send-rent-report/index.ts");
    expect(src).not.toMatch(/api\.resend\.com|REPORT_FROM_EMAIL/);
    expect(src).toMatch(/if \(sentCount > 0\)/);
  });
});

describe("Phase 2F: accept-admin-invitation (grants platform-admin role)", () => {
  const src = () => read("supabase/functions/accept-admin-invitation/index.ts");
  it("claims the invitation atomically before any account or role change", () => {
    const s = src();
    const claim = s.indexOf('.eq("status", "pending")');
    expect(claim).toBeGreaterThan(-1);
    expect(claim).toBeLessThan(s.indexOf("updateUserById"));
    expect(claim).toBeLessThan(s.indexOf('role: "webhost"'));
    expect(s).toContain("revertClaim");
  });
  it("does not swallow platform_admins / admin_permissions failures and is rate limited", () => {
    const s = src();
    expect(s).not.toMatch(/then\(\(\) => undefined, \(\) => undefined\);\s*\n\s*\/\/ Baseline/);
    expect(s).toContain("paError");
    expect(s).toContain("apError");
    expect(s).toContain("checkRateLimit");
    expect(s).toContain("isWellFormedInviteToken");
    expect(s).not.toMatch(/Failed to (set credentials|create account|grant admin role): \$\{/);
  });
});

describe("Phase 2F round 4: tenant token hashing + OAuth signup", () => {
  it("tenant invitation lookups accept the hash or a legacy raw token, and rotation is owner-only", () => {
    const sql = read("supabase/migrations/20260909000006_tenant_invitation_token_hash.sql");
    expect(sql).toContain("ALTER COLUMN token DROP NOT NULL");
    for (const fn of ["validate_invitation_token", "invitation_token_state", "claim_tenant_invitation_atomic"]) {
      expect(sql).toContain(`FUNCTION public.${fn}`);
    }
    expect((sql.match(/token_hash IS NULL AND/g) ?? []).length).toBeGreaterThanOrEqual(3);
    expect(sql).toMatch(/GRANT EXECUTE ON FUNCTION public\.rotate_tenant_invitation_token\(uuid\) TO authenticated/);
    expect(sql).toMatch(/REVOKE ALL ON FUNCTION public\.rotate_tenant_invitation_token\(uuid\) FROM PUBLIC, anon/);
    expect(sql).not.toMatch(/UPDATE public\.tenant_invitations\s+SET token = NULL\s+WHERE token_hash IS NOT NULL;/);
  });
  it("send-tenant-invitation stores only the hash and the manager UI no longer reads a stored token", () => {
    const fn = read("supabase/functions/send-tenant-invitation/index.ts");
    expect(fn).toContain("token_hash: await sha256Hex(");
    expect(fn).not.toMatch(/token=\$\{invitation\.token\}/);
    const ui = read("src/features/tenants/components/InvitationTracker.tsx");
    expect(ui).toContain("rotate_tenant_invitation_token");
    expect(ui).not.toMatch(/invitation\.token/);
  });
  it("create-tenant-account looks invitations up by hash with legacy fallback", () => {
    expect(read("supabase/functions/create-tenant-account/index.ts")).toMatch(/token_hash\.eq\.\$\{await sha256Hex\(invitationToken\)\}/);
  });
  it("OAuth users get no default role; completion RPC is limited to self-registration roles and role-less users", () => {
    const sql = read("supabase/migrations/20260909000007_oauth_signup_role_completion.sql");
    expect(sql).toContain("v_role := 'none'");
    expect(sql).toMatch(/v_role NOT IN \('manager', 'agency', 'tenant'\)/);
    expect(sql).toContain("already_registered");
    expect(sql).toMatch(/REVOKE ALL ON FUNCTION public\.complete_oauth_signup\(text\) FROM PUBLIC, anon/);
    expect(sql).not.toMatch(/'landlord'::public\.app_role|'webhost'::public\.app_role/);
  });
  it("Google buttons remember the portal; landlord portal does not self-register", () => {
    expect(read("src/features/auth/pages/Auth.tsx")).toContain("signInWithGoogle(undefined, 'manager')");
    expect(read("src/features/auth/pages/AgencyAuth.tsx")).toContain("signInWithGoogle(undefined, 'agency')");
    expect(read("src/features/auth/pages/TenantLogin.tsx")).toContain("signInWithGoogle(undefined, 'tenant')");
    expect(read("src/features/auth/pages/LandlordPortalAuth.tsx")).toContain("signInWithGoogle()");
    expect(read("src/features/auth/AuthContext.tsx")).toContain("completeOauthSignupIfNeeded");
  });
  it("bootstrap-webhost removes the default manager row", () => {
    expect(read("supabase/functions/bootstrap-webhost/index.ts")).toMatch(/\.eq\("role", "manager"\)\.eq\("approval_status", "pending"\)/);
  });
});

describe("Phase 2F: client", () => {
  it("claim page reads the token from the fragment and scrubs the URL", () => {
    const src = read("src/features/auth/pages/TenantClaimConsent.tsx");
    expect(src).toMatch(/location\.hash/);
    expect(src).toMatch(/replaceState/);
  });
  it("consent is persisted server-side via RPC, not only client metadata", () => {
    expect(read("src/features/auth/lib/consentPersistence.ts")).toContain("record_user_consent");
    expect(read("src/features/auth/AuthContext.tsx")).toContain("persistSignupConsent");
  });
  it("agency UI never displays or copies an activation link", () => {
    const src = read("src/features/agency/pages/AgencyClients.tsx");
    expect(src).not.toMatch(/activationUrl|clipboard/);
  });
});
