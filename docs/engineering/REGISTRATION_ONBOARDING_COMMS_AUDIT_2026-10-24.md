# CALQULUS PMS — Registration, Onboarding & Communications Audit
Date: 2026-10-24 · Scope: source review of `CALQULUS-PMS-main` (read-only). No live database, Supabase project, email/SMS provider or deployment was contacted. Anything that depends on live configuration is marked UNVERIFIED.

Method: three parallel source reviews (client auth/onboarding; registration edge functions + migrations; communications functions), then I re-checked the headline findings (S1, S2, S3, C-sender, C-inject) directly in source. Line numbers are approximate; function/file names are reliable.
Not covered: send-maintenance-notification, send-signature-notification, send-manager-invoice-notification, send-monthly-report, send-overdue-notifications, notify-manager-payment, notify-manager-receipt-upload beyond auth gates; PushNotificationSettings.tsx; RLS beyond the migrations read; live Supabase Auth settings (confirmation, password policy, rate limits).

## Summary
| Sev | # | Headline |
|---|---|---|
| High | 7 | metadata spread overrides caller id; tenant signups get manager role; self-assigned landlord role; manager can claim any orphan tenant; send-to-anyone email/SMS with forged content; sandbox sender; no consent/opt-out |
| Medium | 14 | verification UX, cosmetic onboarding step, password policy drift, HTML injection, token storage, duplicate sends, etc. |
| Low/Info | 15+ | PII in logs, a11y, branding, error leakage |

## HIGH

**H1 — Caller identity can be overridden by user-editable metadata** (verified in source)
`supabase/functions/_shared/middleware.ts` (~L185) and `_shared/auth.ts` (~L121): `user = { id, email, ...user_metadata }`. Metadata is spread *after* id/email, and users can write their own `user_metadata`. A key `id` (or `email`) in metadata replaces the real value, which then feeds role checks, rate limits and ownership checks in every `withMiddleware` function; `send-bulk-sms` and the role-check skip also special-case `id === "service-role"`. Exploitation not exercised (UNVERIFIED), but the code path is plain.
Fix: `{ ...user_metadata, id, email }`, or do not spread metadata and read roles only from `user_roles`.

**H2 — Tenant signups receive a pending `manager` role** (verified: trigger default)
`20260811000003_auth_privileged_action_hardening.sql`: `v_role := COALESCE(raw_user_meta_data->>'role','manager')`. `TenantAuth.tsx`, `TenantSelfRegister.tsx`, `create-tenant-account`, `backfill-tenant-accounts` send no `role`, so tenants get a manager/pending row. `self_register_tenant_atomic` and `create-tenant-account` then refuse ("non-tenant role"), so registration fails or leaves stray rows; invited tenants end with manager+tenant roles; `PendingApproval` (`.maybeSingle()`) breaks on multiple roles. Impact depends on whether live DB differs from migrations (UNVERIFIED).
Fix: server-side — map `account_type='independent_tenant'`/explicit tenant to tenant; never default unknown signups to manager; send `role:'tenant'` from tenant flows.

**H3 — Self-assigned, auto-approved landlord/tenant roles**
`AuthContext.tsx` sends client-chosen `role` in signup metadata; the trigger blocks only webhost/platform_admin/submanager. `landlord` is approved immediately (also via `notify-new-manager-signup` upsert). Anyone calling the public signup API can obtain an approved landlord role without invitation. Real privilege depends on RLS (UNVERIFIED).
Fix: gate landlord behind approval or grant only through `accept_landlord_invitation`.

**H4 — Any manager (even unapproved) can take over a self-registered tenant by email** (verified)
`claim-tenant/index.ts`: role check is only "has a manager row" (ignores `approval_status`); it finds `tenants.manager_id IS NULL AND email = X` and assigns it to the caller. The tenant never consents. Self-registered tenants are exactly such orphans.
Fix: require approved manager; require tenant-side acceptance (token) or a matching invitation.

**H5 — Arbitrary-recipient email/SMS/WhatsApp with forged content from the platform sender**
`send-sms-notification` (any manager → any number, free text; 10/hour), `send-receipt-email`, `send-payment-confirmation` (fabricated "payment received" amounts to any email/phone), `send-receipt-status-notification`, `send-deposit-refund-notification`, `send-property-assignment-notification`, `send-invoice-email` (any recipient/subject/PDF, no size/type limit). Several interpolate request fields unescaped into HTML. Code comments admit the tenant relationship isn't verified.
Fix: accept tenant/invoice IDs, load recipient and amounts from DB, verify manager scope, escape everything, cap attachment size/type.

**H6 — Default sender is Resend's sandbox address** (~27 function files contain `resend.dev`)
`onboarding@resend.dev` / `noreply@resend.dev` used in welcome, invitations, notices, etc. As far as I know Resend delivers this address only to the account owner until a domain is verified (not tested). `send-receipt-email` reports "domain not verified" as `success:true, skipped:true`, hiding undelivered receipts.
Fix: verify a domain, single `RESEND_FROM_EMAIL`, treat domain errors as failures.

**H7 — No consent capture, preference enforcement, or opt-out**
No terms/privacy consent at signup (client). `landlord_notification_preferences` is written by the UI and read by no edge function; no STOP/unsubscribe, no `List-Unsubscribe`, no quiet hours. Relevant to the Kenya Data Protection Act (not a legal assessment).

## MEDIUM
- **M1 Manager signup has no verification step** (`Auth.tsx`): toast then `navigate('/')`; with confirmation on the user is bounced to login with no explanation and no resend link (`ResendVerificationButton` only on onboarding pages, which need a session).
- **M2 Onboarding "Verify your email" is cosmetic**: Continue/Skip both just advance; `brand_config.onboarding.verifiedEmail` is never written; `invitedTeamCount` hardcoded 0 — completion threshold can't be reached. Derive from `email_confirmed_at` and real data.
- **M3 Password policy drift**: signup schema (8–72, upper/lower/digit/special) vs ResetPassword (length ≥ 8 only) vs TenantSelfRegister/ActivateAccount (no special char; no 72 cap) vs admin invite (≥ 10, no classes). Server policy not in repo (`config.toml` has no `[auth]`) — UNKNOWN. Use one shared schema + set server policy.
- **M4 HTML injection in tenant invitation** (verified): `send-tenant-invitation` interpolates `tenantName`, `managerName`, `propertyName`, `unit` unescaped; `propertyName` is client-supplied. `_shared/html.ts` `escapeHtml` exists. Same text goes to SMS/WhatsApp. Rate limit fails open.
- **M5 Invite tokens**: in URLs without scrubbing/Referrer-Policy; stored in plaintext (`account_activations`, `admin_invitations`, tenant invites) — store SHA-256.
- **M6 `activate-account`**: password set before token consumed (concurrent requests can both succeed); rate-limit key from first `x-forwarded-for`; `validate_activation_token` still granted to `authenticated`.
- **M7 `self-register-tenant`**: sends SMS with user-supplied name to an unverified phone (smishing/cost); RPC doesn't check `email_confirmed_at` or existing non-tenant roles.
- **M8 `create-tenant-account` invitee path**: skips JWT and rate limit; `userId` from client (token entropy mitigates).
- **M9 `create-agency-landlord-account`**: allows pending agencies; links to an existing landlord email without consent; 409 reveals email existence.
- **M10 `bootstrap-webhost`**: enabled by env name only, check-then-create race, non-constant-time secret compare; README says delete it but it ships.
- **M11 Duplicate sends**: `process-due-invoice-notifications`, `send-payment-reminders`, `send-overdue-notifications` have no sent-marker; overdue invoices re-notified every run. `logStep` is empty in the first two (no run log).
- **M12 `.single()/.maybeSingle()` on `user_roles`** in `send-invoice-email`, `create-tenant`, `PendingApproval` fails for multi-role users.
- **M13 Welcome email**: `fullName` unescaped in HTML and subject (recipient = caller, low impact).
- **M14 `accept-admin-invitation`** swallows `platform_admins`/`admin_permissions` upsert failures and still marks the invite used.

## LOW / INFO
- PII (emails) in logs: middleware info log on every call; bank-details, invoice-due push, manager-invoice, payment-confirmation.
- Raw `error.message` shown/returned: TenantSelfRegister, LandlordInvitationAccept, TenantAuth, create-tenant, claim-tenant, accept-admin-invitation, create-agency-landlord-account.
- `sanitizeAuthError` maps "already registered"/"user not found" to account-specific messages (enumeration if server returns them); TenantAuth relies on it.
- `findAuthUserByEmail` pages all users per call (perf/DoS).
- Payer signup (`PayerPortalAuth`) gets no role (UNVERIFIED if provisioned elsewhere).
- Placeholder emails `phone-…@placeholder.calqulusrms` stored as real emails; tenant invite resend doesn't reset `expires_at`; dedupe on non-lowercased email.
- `sendSms` +254 normalisation doesn't validate digits/length; WhatsApp silently falls back to SMS.
- Push subscriptions never pruned on 404/410; `===` secret comparisons in `assertCaller`; display-name spoofing via `companyName`.
- Branding inconsistent (CALQULUS RMS / PMS / Platform).
- Accessibility: unlabeled show-password toggles, missing `required`, no live region for password rules.
- CORS allowlist includes localhost ports in production.
- No open redirect found (fixed internal paths; `?portal=` whitelisted). Resend button has a 60 s client-only cooldown.

## Controls confirmed working
Invite tokens single-use with status guard; email-match check on tenant invites; admin invites fixed to webhost with 72 h expiry and audit log, content escaped; no temporary passwords emailed (activation links); `protect_user_roles_changes` blocks self-grant of webhost/submanager and forces manager/agency to pending; `send-bulk-sms` scopes to own tenants; `send-tenant-notice`, `send-push-notification`, `send-bank-details-notification`, `send-manager-approval-notification` check scope; `retry-notification-failure` reserves retries atomically; cron-only functions gated.

## Suggested fix order
1. H1 (one-line middleware/auth fix, high leverage), then H2/H3 (trigger + tenant metadata).
2. H4, H5 (scope recipients/amounts to DB records; escape HTML).
3. H6 sender domain; M11 dedup markers.
4. M1/M2 verification UX; M3 shared password schema.
5. H7 consent + preference enforcement + unsubscribe.
Each change touching `supabase/migrations/` requires a new migration (existing files must stay unchanged) and the Phase 2D reconciliation caveats still apply.
