# Registration, Onboarding, Identity & Communications — Phase 2F Residual Risk Closure

Date: 2026-10-28. Scope: hardening only, no redesign. Nothing was committed, pushed, deployed or applied. No remote service (Supabase, Resend, Twilio, Africa's Talking, M-Pesa) was contacted. Release status: **BLOCKED** (see "Remaining release blockers").

## 1. Baseline
- Working tree had no git metadata. Its contents were identical to `CALQULUS-PMS-main-2026-10-25.zip`; the prior hardening report and its tests were present. No Phase 2E artifacts were found in the tree.
- Baseline before Phase 2F: tsc clean, lint 0 errors, vitest 1701 pass (this session's earlier run), build OK.
- Existing migration files are byte-for-byte unchanged. Only new files were added: `20260908000001/2` (previous hardening) and `20260909000001`–`05` (this phase). All are **unapplied**.

## 2. Findings from the previous hardening report — status

| ID | Finding | Status | Notes |
|---|---|---|---|
| H1 | user_metadata overrides caller id | FIXED | Earlier phase; test-covered |
| H2/H3 | signup role derivation | FIXED in code, awaiting migration | `20260908000001`. Behaviour change: landlord self-signup no longer auto-approved; agency-created landlords get an explicit approved role from `create-agency-landlord-account` |
| H4 | any manager can claim orphan tenant | FIXED in code, awaiting migration | `claim-tenant` is now a consent request; tenant accepts via `/tenant/claim#t=…`; RPCs in `20260909000003` |
| H5 | arbitrary-recipient sends | PARTIALLY FIXED | Recipient/amount scoping done for functions fixed earlier plus WhatsApp and SMS; see inventory CSV for per-function state; remaining functions authorised by relation checks (notifyAuthz) |
| H6 | sandbox sender | FIXED in code | No `resend.dev` or invented-domain fallback remains in any function; missing/placeholder/sandbox sender fails closed. **Requires administrator action** to set `RESEND_FROM_EMAIL` to a verified domain |
| H7 | consent / opt-out | FIXED in code, awaiting migration | Server-side consent (`user_consents`), opt-outs, unsubscribe endpoint, SMS STOP webhook |
| M1/M2 | verification UX | PARTIALLY FIXED | Onboarding verification derived from `email_confirmed_at`; resend available on onboarding pages. Pre-session "resend verification" screen is OPEN (needs product decision) |
| M3 | password policy drift | PARTIALLY FIXED | `activate-account` and admin accept enforce 8–72 with classes server-side. Supabase Auth server policy cannot be set from the repo: **Requires administrator action** |
| M4/M13 | HTML injection | FIXED | Added escaping to receipt, invoice, monthly-report and rent-report senders this phase |
| M5 | plaintext invite tokens | PARTIALLY FIXED | `account_activations` and `admin_invitations` hash-at-rest with legacy fallback. `tenant_invitations` stay plaintext **by design today**: the manager UI (InvitationTracker) re-displays and copies the invite link and `send-tenant-invitation` re-sends it, so hashing needs a product change (resend = rotate token; no re-display). Mitigated by pending/expiry/email-match checks. OPEN; `landlord_invitations` not re-reviewed |
| M6 | activate-account | FIXED | Atomic `consume_activation_token`; password set only after consume; rate-limit first; validate grant restricted to service_role |
| M7 | self-register-tenant SMS | FIXED | Earlier phase |
| M8 | create-tenant-account invitee path | VERIFIED (source review) | Invitee path already requires a valid JWT, rate limit (fail closed), invitation looked up server-side, pending/unexpired check, and email match between invitation and the auth user; client-supplied property/rent values are ignored. No change needed |
| M9 | create-agency-landlord-account | FIXED | Approved agencies only; no 409 existence leak; no linking of existing accounts without consent (generic response, no link created); activation emailed to the landlord, never returned; body `portalUrl` ignored |
| M10 | bootstrap-webhost | PARTIALLY FIXED | Refuses outside local development; service-role + secret required. Check-then-create race remains theoretical (single operator, local only). Recommend deleting the function from deployments |
| M11 | duplicate sends | FIXED in code, awaiting migration | Lease-based dedup (see §3) |
| M12 | `.single()` on user_roles | NOT VERIFIED | Not re-reviewed |
| M14 | accept-admin-invitation swallows errors | FIXED (Phase 2F, round 2) | Invitation is now claimed atomically (pending→used with expiry check) BEFORE any account/role change; platform_admins/admin_permissions failures are fatal and revert the claim; per-client rate limit (fail closed); token shape check accepts 64-hex and legacy UUID tokens so existing invites keep working; password 10–72 with character classes; generic errors |
| — | `findAuthUserByEmail` paging | FIXED in code, awaiting migration | Indexed RPC `20260909000005`; falls back to paging only if the RPC is missing |
| — | `mpesa-callback` ResultDesc | FIXED | Earlier phase; static test added |

## 3. Notification dedup — delivery guarantee
Claim → send → complete/release using `claim_notification` / `complete_notification` / `release_notification` (service_role only). Outcomes: `claimed`, `duplicate_sent`, `duplicate_in_flight`, `error`. Any dedup error (missing table/function 42P01/42883/PGRST*, permission 42501, network) **skips the send** (fail closed).
- Provider accepted → claim marked sent. Definite rejection or config failure → claim released so a retry may send.
- Timeout / network error / 5xx after the request may have left → claim **kept until the lease expires** (default 15 min), then a retry may send.
- **Guarantee: at-most-one concurrent sender per key, at-least-once across ambiguous failures. It is not exactly-once.** A message may be delivered twice only after an ambiguous failure plus lease expiry.
- Local test: 12 parallel claims → exactly one `claimed`; in-memory model tests cover 20 concurrent senders, retry after rejection, lease expiry.

## 4. Changes by area (files)
Shared modules (`supabase/functions/_shared`): `notificationDedup.ts`, `emailConfig.ts` (new), `email.ts`, `commsPolicy.ts`, `commsGate.ts`, `channelSend.ts`, `unsubscribeToken.ts`, `unsubscribe.ts`, `inboundSms.ts`, `phone.ts`, `tokens.ts` (all new except email/dedup rewrites), `sms.ts` (central opt-out gate), `authUsers.ts` (RPC lookup).
Edge functions changed: `claim-tenant`, `activate-account`, `create-agency-landlord-account`, `create-tenant-account`, `backfill-tenant-accounts`, `send-admin-invitation`, `accept-admin-invitation`, `send-sms-notification`, `send-bulk-sms`, `send-tenant-invitation` (also removed an import of a non-existent export that would fail module load), `send-overdue-notifications`, `send-payment-reminders`, `process-due-invoice-notifications`, `send-whatsapp-notification`, `auto-send-rent-report`, `send-manager-receipt-email`, `send-manager-invoice-notification`, `send-monthly-report`; new `unsubscribe`, `sms-inbound-webhook` (+ `config.toml` entries with `verify_jwt=false`, authenticated by signature/secret).
Migrations (new, unapplied): `20260909000001` dedup leases; `…02` consent + opt-outs; `…03` tenant claim consent; `…04` token hash storage; `…05` auth email lookup.
Client: `TenantClaimConsent.tsx` + `/tenant/claim` routes; `consentPersistence.ts` + `AuthContext.tsx`; `ActivateAccount.tsx` (validation via edge function); `AgencyClients.tsx` (no activation link shown); `termsMetadata.ts`.
Tests: `phase2fCommsCore.test.ts` (42), `phase2fStatic.test.ts` (29), updated stale assertions in `registrationCommsHardening.test.ts` and `agencyLandlordAccountWorkspace.test.ts` (updated to the new behaviour, not weakened).

## 5. Token transition plan (no invalidation of existing invites)
1. Apply `20260909000004` first (adds `token_hash`, backfills, dual lookup: hash, or legacy raw when hash is NULL; same RPC names).
2. Then deploy the new edge functions. Existing links keep working; new links store hash only (`token` NULL).
3. After the longest invite lifetime has passed (activation 24 h, admin 72 h, plus margin) an operator may run, in a reviewed later migration, `UPDATE … SET token = NULL WHERE token_hash IS NOT NULL` and drop the legacy lookup. Not done here.
4. `tenant_invitations` / `landlord_invitations` still store raw tokens (OPEN); the same pattern should be applied in a follow-up.

## 6. Behaviour changes to expect
- Landlord self-signup no longer receives an auto-approved role.
- Agency-created landlord accounts receive the activation email directly; the agency never sees the link. If email is not configured the account exists but `activationEmailSent=false` and the landlord must use password reset.
- WhatsApp → SMS fallback is OFF unless `WHATSAPP_SMS_FALLBACK=true`.
- Marketing sends need explicit consent; reminders honour opt-out (all channels) and quiet hours on SMS/WhatsApp/push **only when** `COMMS_TIMEZONE`, `COMMS_QUIET_START`, `COMMS_QUIET_END` are all set and valid. No business timezone is assumed.
- Rent reports no longer advance `last_sent_at` if nothing was delivered.

## 7. New findings this phase
- `send-tenant-invitation` imported `validateRequired` from `middleware.ts`, which does not export it (module-load failure in Deno). Fixed.
- Sender validation rejected the valid `Name <address>` form (found by new tests). Fixed.
- `auto-send-rent-report` used an invented fallback sender (`reports@calqulus.site`) and advanced its schedule even when nothing was sent. Fixed.
- Four senders interpolated data into HTML unescaped. Fixed.
- Reviewed in round 2 (source only): `process-payment` receipts go through `send-receipt-email`/`send-sms-notification`/`send-whatsapp-notification` as service-role callers, so SMS/WhatsApp pass the STOP gate; `retry-notification-failure` replays server-written payloads (users have no insert/update policy on `notification_failures`; retry is reserved by an atomic RPC) and is acceptable; `seed-demo-data` is service-role only with `verify_jwt=true` and covered by the existing attack-matrix test; `execute-payout`/`resolve-dispute` only send in-app push via `send-push-notification` (scope-checked; push has no opt-out table — quiet hours apply to reminder pushes only). Round-2 finding: `accept-admin-invitation` ordering/rate-limit gaps (fixed).

## 8. Verification (actual results, in an isolated copy)
- `tsc --noEmit`: exit 0. `npm run lint`: exit 0 (0 errors, 7 pre-existing warnings). `npm run build`: exit 0.
- `vitest run` (full): final run: 238 test files passed (1 skipped), 1801 tests passed (2 skipped), 0 failed; `test:financial`, `test:isolation`, `test:integration`, `test:api-contracts`, `test:regression`, `test:property-based`, `test:edge-cases`: all exit 0.
- `audit:security-boundary`: PASS; `audit:cross-role`: PASS. `audit:migration-chain`: exit 1 — pre-existing duplicate versions (20260904000001, 20260905000001, 20260906000007), unrelated to Phase 2F and tracked by Phase 2D.
- Migrations 1–4 were executed on a throwaway local Postgres 16 with stub tables (idempotence, grants, concurrency: 12 parallel claims → 1; 8 concurrent accepts → 1; 6 concurrent consumes → 1). Migration 5 was also run (idempotent; authenticated role denied).
- **Deno tests: NOT RUN (Deno unavailable).** Edge functions were checked by static tests, lint, and an import/export-name script, not executed in Deno.
- Real Supabase, Resend, Twilio, Africa's Talking were not exercised.

## 9. Remaining release blockers
1. Phase 2D migration-chain reconciliation (duplicate versions) unresolved; new migrations must not be applied until the chain is reconciled and ordering reviewed.
2. Migrations 20260908000001/2 and 20260909000001–05 not applied anywhere; edge functions depend on them (apply before deploying functions).
3. `RESEND_FROM_EMAIL` verified domain not configured (email sends fail closed until it is).
4. Deno runtime tests not run; no live verification of unsubscribe/STOP webhooks, Resend delivery, or claim flow.
5. Supabase Auth settings (password policy, email confirmation, rate limits) unverified.
6. `tenant_invitations`/`landlord_invitations` plaintext tokens OPEN.

## 10. Round 3 — functional audit of registration and onboarding flows (2026-10-29)
Traced every signup path against the code. Defects that would break or silently degrade onboarding, all fixed in code (tests in `registrationFlowsPhase2f.test.ts`):
1. **Landlord invitation: stale role after accept.** Since the signup trigger no longer pre-grants `landlord`, the role appears only when `accept_landlord_invitation` runs; the session still held "no role". Added `refreshRoles()` to `AuthContext`; the invitation page awaits it before entering the portal.
2. **Tenant invitation signup breaks when email confirmation is on.** `claim_tenant_invitation_atomic` needs an authenticated caller but `signUp` returns no session, so the user saw "Invitation could not be linked". The token is now remembered for this browser (7 days) and claimed on first sign-in after verification (`pendingInvitationClaim.ts`); the RPC still checks token, expiry and email match. The manager notice is sent after the claim.
3. **Landlord invitation with confirmation on** claimed to link "automatically" but the token was scrubbed from the URL and lost. Same deferred-claim mechanism (landlord RPC).
4. **Welcome email never arrived / failed** for new managers: it was called without a session when confirmation is on (401), compared emails case-sensitively (403 for mixed-case addresses), linked to a non-existent `/dashboard` route, hard-coded the site URL, and ignored provider errors. Now: case-insensitive own-address check, server-side once-per-user dedup, real routes (`/auth`, `/agency/login`, `/tenant/login`), `SITE_URL`, classified failure result; it is re-sent on first sign-in.
5. **Admin was never told about a new manager/agency** when confirmation is on (authenticated call without a session). Re-issued on first sign-in of a still-pending manager/agency (`pendingSignupNotice.ts`); the server de-duplicates per user. The function also used the Resend SDK at module level (load crash if the key is missing, errors ignored while reporting `notified:true`); now uses the shared sender.
6. **Approval/rejection/suspension email** used a hard-coded `notifications@calqulus.site` sender and the Resend SDK, ignored failures, and interpolated the user-controlled profile name and admin free text unescaped. Now shared fail-closed sender, escaped, failures reported (503 config / 502 provider).
7. **Manager-created tenant accounts** (`create-tenant-account`, `backfill-tenant-accounts`) sent no `role` metadata, so the signup trigger also created a pending *manager* role for every invited tenant. Now `role: "tenant"`.
8. **New admin accounts** created by `accept-admin-invitation` kept the trigger's default pending manager row next to `webhost`. Removed for newly created accounts only.

Round 4 (2026-10-30) closed the items above that were open:
- **Google sign-in** — migration `20260909000007`: OAuth users start with no role; `complete_oauth_signup(p_role)` registers manager/agency (pending approval) or tenant, only for role-less accounts, using the portal remembered across the redirect. Landlord/webhost/submanager/payer cannot be self-assigned. The landlord portal does not self-register (invitation-only). Behaviour change: a Google user who arrives without a remembered portal gets no role instead of a pending manager row.
- **Tenant invitation tokens** — migration `20260909000006`: hash-at-rest with legacy fallback in `validate_invitation_token`, `invitation_token_state`, `claim_tenant_invitation_atomic`, and `create-tenant-account`. New invitations store only the hash. Product change: the manager UI can no longer re-display a link; "copy / SMS / WhatsApp" calls `rotate_tenant_invitation_token`, which issues a new link and invalidates the earlier one. `landlord_invitations` remains plaintext (OPEN, not re-reviewed).
- **bootstrap-webhost** now removes the default pending manager row.
- Migration tests were run on a throwaway local Postgres (idempotent; hash backfill; legacy token works until rotated; rotation owner-only and invalidates old link; OAuth user gets no role; completion rejects landlord/webhost; second call is a no-op).

Still OPEN: live verification (see `REGISTRATION_COMMS_LIVE_VERIFICATION.md` — not executed), Phase 2D duplicate migration versions (must be reconciled by the Phase 2D owner; renaming already-applied migrations is not safe to do blind), migrations unapplied, sender/secret configuration, `landlord_invitations` tokens.
