# Live Verification Runbook (staging only)

Nothing below has been executed. Run it against a **staging** Supabase project after Phase 2D reconciliation, never production first. Record results (pass/fail, date, who) next to each step.

## 0. Prerequisites
1. Phase 2D chain reconciled; apply migrations in order: `20260908000001`, `…02`, `20260909000001`–`07`. Apply `…04` and `…06` before deploying edge functions that use hashing.
2. Secrets set: `RESEND_API_KEY`, `RESEND_FROM_EMAIL` (verified domain), `SITE_URL`, `UNSUBSCRIBE_SIGNING_SECRET`, SMS webhook secret(s); optional `COMMS_*`.
3. Deploy changed edge functions (see inventory CSV). Deno tests: `deno test` over `supabase/functions` (not run to date).
4. Supabase Auth: confirm-email ON in one pass and OFF in a second pass; password policy matches code; Site URL and redirect allow-list include `SITE_URL/auth`, `/tenant/login`, `/agency/login`, `/landlord/login`.

## 1. Sender and delivery
- Unset `RESEND_FROM_EMAIL` → welcome/approval/invite sends return 503/`email_not_configured`, nothing leaves. Set it → one real email arrives from the verified domain, SPF/DKIM pass, `List-Unsubscribe` present on reminders.
## 2. Manager signup (both confirmation modes)
- Sign up → (ON) "check your email" screen; verify link; first sign-in → exactly one welcome email and one admin "pending approval" email; second sign-in sends nothing more. (OFF) same, immediately.
- `user_roles` has exactly one row (`manager`, `pending`). Admin approves → approval email arrives; user reaches the dashboard.
## 3. Agency signup — as §2 with role `agency` and `/agency` portal.
## 4. Tenant invitation (confirmation ON, then OFF)
- Manager sends invitation. Tenant opens link in the SAME browser, signs up, verifies email, signs in → tenant linked to property/unit; manager gets one notice. Reopening the old link shows "used".
- Open link in a DIFFERENT browser after verifying: account exists but not linked → document the manual path (reopen the invitation link while signed in).
- Manager "copy link" issues a new link and the previous one stops working. DB check: `token IS NULL` and `token_hash` set for new invitations; legacy invitations (pre-migration) still open before rotation.
## 5. Landlord invitation — as §4 using `/landlord/invitation`; after accept the landlord portal opens without a refresh.
## 6. Agency-created landlord — landlord receives the activation email; agency UI shows only a notice; link works once; replay fails; existing email returns the generic message and links nothing.
## 7. Tenant consent claim (`claim-tenant`) — request, accept, decline, replay, expiry, wrong account.
## 8. Google sign-in (first time, each portal)
- Manager portal → pending manager row + admin notice; agency → pending agency; tenant → approved tenant row without tenant record; landlord portal → no role and "No active role" message. A second Google sign-in adds nothing.
## 9. Opt-out — email unsubscribe link (GET confirm, POST persists), SMS STOP/START webhook with real provider signature, reminder to opted-out address blocked, transactional email still sent, quiet hours (if configured).
## 10. Admin invitation — accept once; double-submit from two tabs → one wins; failure injection (revoke DB write on `platform_admins`) → invite stays usable.

## Cleanup step after all pending invitations have expired (operator-run, reviewed first)
```sql
-- tenant_invitations: drop legacy raw tokens (hash already stored)
UPDATE public.tenant_invitations SET token = NULL WHERE token_hash IS NOT NULL AND token IS NOT NULL;
```
Do this only after verifying §4 on staging, and repeat the equivalent for `account_activations` / `admin_invitations` (see remediation §5).
