// @vitest-environment node
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { passwordSchema, isPasswordStrong } from "@/shared/lib/validations";
import { sanitizeAuthError } from "@/features/auth/lib/authFlow";

const root = process.cwd();
const read = (p: string) => readFileSync(resolve(root, p), "utf8");
const fnDir = resolve(root, "supabase/functions");
const fnIndex = (name: string) => read(`supabase/functions/${name}/index.ts`);

describe("server: caller identity cannot be overridden by user metadata", () => {
  it.each(["_shared/middleware.ts", "_shared/auth.ts"])("%s spreads user_metadata before id/email", (f) => {
    const src = read(`supabase/functions/${f}`);
    const spread = src.indexOf("...userData.user.user_metadata") >= 0
      ? src.indexOf("...userData.user.user_metadata")
      : src.indexOf("...user.user_metadata");
    expect(spread).toBeGreaterThan(-1);
    const after = src.slice(spread, spread + 200);
    expect(after).toMatch(/id:/);
    expect(after).toMatch(/email:/);
  });
  it("does not log the user's email on every request", () => {
    expect(read("supabase/functions/_shared/middleware.ts")).not.toMatch(/User authenticated",\s*\{[^}]*email/);
  });
});

describe("server: registration hardening", () => {
  it("claim-tenant requires an approved manager", () => {
    expect(fnIndex("claim-tenant")).toMatch(/\.eq\("approval_status", "approved"\)/);
  });
  it("self-register-tenant no longer SMSes an unverified number", () => {
    expect(fnIndex("self-register-tenant")).not.toContain("send-sms-notification");
  });
  it("activate-account consumes the token before setting the password", () => {
    const src = fnIndex("activate-account");
    expect(src.indexOf("use_activation_token")).toBeGreaterThan(-1);
    expect(src.indexOf("use_activation_token")).toBeLessThan(src.indexOf("updateUserById"));
  });
  it("secrets are compared in constant time", () => {
    expect(read("supabase/functions/_shared/assertCaller.ts")).toContain("timingSafeEqual");
    expect(fnIndex("bootstrap-webhost")).toContain("timingSafeEqual");
  });
  it("tenant invitation escapes interpolated values and reads the property name from the database", () => {
    const src = fnIndex("send-tenant-invitation");
    expect(src).toContain("escapeHtml(tenantName)");
    expect(src).toContain("escapeHtml(propertyName)");
    expect(src).toMatch(/select\("manager_id, name"\)/);
  });
  it("notify-new-manager-signup never auto-approves a self-service role", () => {
    const src = fnIndex("notify-new-manager-signup");
    expect(src).not.toMatch(/role === "landlord" \? "approved"/);
  });
});

describe("migration: signup trigger role derivation", () => {
  const sql = read("supabase/migrations/20260908000001_signup_trigger_role_derivation.sql");
  it("maps independent tenants to the tenant role", () => {
    expect(sql).toContain("independent_tenant");
    expect(sql).toContain("v_role := 'tenant'");
  });
  it("no longer self-assigns an approved landlord role", () => {
    expect(sql).toMatch(/IF v_role IN \('manager', 'tenant', 'agency'\)/);
    expect(sql).not.toMatch(/IN \('manager', 'tenant', 'landlord', 'agency'\)/);
  });
  it("is a new, uniquely versioned file", () => {
    const same = readdirSync(resolve(root, "supabase/migrations")).filter((n) => n.startsWith("20260908000001_"));
    expect(same).toHaveLength(1);
  });
  it("notification_dedup migration is idempotent and service-role only", () => {
    const d = read("supabase/migrations/20260908000002_notification_dedup.sql");
    expect(d).toContain("CREATE TABLE IF NOT EXISTS public.notification_dedup");
    expect(d).toContain("ENABLE ROW LEVEL SECURITY");
    expect(d).toMatch(/REVOKE ALL ON TABLE public\.notification_dedup FROM PUBLIC, anon, authenticated/);
  });
});

describe("communications hardening", () => {
  const indexes = readdirSync(fnDir, { withFileTypes: true })
    .filter((e) => e.isDirectory() && existsSync(resolve(fnDir, e.name, "index.ts")))
    .map((e) => e.name);

  it("no function hard-codes the Resend sandbox sender", () => {
    const offenders = indexes.filter((n) => /resend\.dev/.test(fnIndex(n)));
    expect(offenders).toEqual([]);
  });
  it("the shared sender helper exists and reads RESEND_FROM_EMAIL", () => {
    expect(read("supabase/functions/_shared/email.ts")).toContain("RESEND_FROM_EMAIL");
  });
  it.each([
    "send-receipt-email", "send-payment-confirmation", "send-receipt-status-notification",
    "send-deposit-refund-notification", "send-invoice-email", "send-sms-notification",
  ])("%s restricts recipients to the caller's own tenants", (n) => {
    expect(fnIndex(n)).toContain("callerOwnsTenantContact");
  });
  it("property-assignment emails are restricted to the caller's submanagers", () => {
    expect(fnIndex("send-property-assignment-notification")).toContain("callerOwnsSubmanagerEmail");
  });
  it.each([
    "send-welcome-email", "send-receipt-status-notification", "send-deposit-refund-notification",
    "send-property-assignment-notification", "send-receipt-email", "send-payment-confirmation",
    "send-invoice-email", "send-overdue-notifications",
  ])("%s escapes interpolated values", (n) => {
    expect(fnIndex(n)).toContain("escapeHtml");
  });
  it.each(["process-due-invoice-notifications", "send-payment-reminders", "send-overdue-notifications"])(
    "%s de-duplicates daily sends", (n) => {
      expect(fnIndex(n)).toContain("claimNotification");
    },
  );
  it("landlord preference helper reads the real column names", () => {
    const src = read("supabase/functions/_shared/landlordPreferences.ts");
    expect(src).toContain("landlord_user_id");
    expect(src).toContain("email_enabled");
  });
});

describe("client: shared password policy and neutral errors", () => {
  it("rejects weak passwords and accepts strong ones", () => {
    for (const bad of ["aaaaaaaa", "Password1", "password1!", "PASSWORD1!", "Aa1!", "A".repeat(73) + "a1!"]) {
      expect(passwordSchema.safeParse(bad).success).toBe(false);
    }
    expect(isPasswordStrong("Str0ng!pass")).toBe(true);
  });
  it("ResetPassword and tenant pages use the shared policy", () => {
    for (const f of ["src/features/auth/pages/ResetPassword.tsx", "src/features/auth/pages/TenantSelfRegister.tsx"]) {
      expect(read(f)).toMatch(/isPasswordStrong|passwordSchema|getPasswordChecks/);
    }
  });
  it("sanitizeAuthError does not reveal whether an account exists", () => {
    for (const m of ["User already registered", "User not found"]) {
      expect(sanitizeAuthError(m).toLowerCase()).not.toMatch(/already registered|not found|exists/);
    }
  });
  it("tenant signups send role 'tenant'", () => {
    expect(read("src/features/auth/pages/TenantAuth.tsx")).toContain("role: 'tenant'");
    expect(read("src/features/auth/pages/TenantSelfRegister.tsx")).toContain("role: 'tenant'");
  });
  it("signup forms record terms acceptance", () => {
    for (const f of ["Auth", "TenantAuth", "TenantSelfRegister"]) {
      expect(read(`src/features/auth/pages/${f}.tsx`)).toContain("termsMetadata");
    }
  });
});

describe("client: onboarding verification is derived from the auth provider", () => {
  it("uses email_confirmed_at, not a client-written flag", () => {
    const src = read("src/features/onboarding/hooks/useManagerOnboardingState.ts");
    expect(src).toContain("email_confirmed_at");
    expect(src).not.toContain("onboarding?.verifiedEmail");
    expect(src).toContain("manager_submanagers");
  });
  it("sets a no-referrer policy so invite tokens do not leak", () => {
    expect(read("index.html")).toContain('name="referrer" content="no-referrer"');
  });
});
