# Registration, onboarding & communications hardening — 2026-10-25

Implements fixes for `REGISTRATION_ONBOARDING_COMMS_AUDIT_2026-10-24.md`. Source-level only: nothing was deployed, no live project was contacted, and the release decision remains BLOCKED.

## Fixed in code
| Audit | Change |
|---|---|
| H1 | `_shared/middleware.ts`, `_shared/auth.ts`: `user_metadata` is spread *before* `id`/`email`; per-request email log removed. |
| H2/H3 | New migration `20260908000001_signup_trigger_role_derivation.sql` (tenant mapping; no self-assigned landlord). Tenant pages send `role:'tenant'`. `notify-new-manager-signup` no longer auto-approves any role. |
| H4 | `claim-tenant`: approved managers only; email matched lowercase. |
| H5 | Recipient scoping to the caller's own tenants/submanagers (`callerOwnsTenantContact`, `callerOwnsSubmanagerEmail`) in receipt, payment-confirmation, receipt-status, deposit-refund, invoice-email, SMS and property-assignment senders; HTML/subject escaping; attachment size cap; strict +254 normalisation. |
| H6 | `_shared/email.ts` `getFromAddress()`; no hard-coded `resend.dev` sender remains; "domain not verified" is now a failure. |
| H7 | Terms/privacy checkbox + `terms_accepted_at`/`terms_version` in signup metadata (client record; not yet persisted server-side). `_shared/landlordPreferences.ts` helper reads the real preference columns for future landlord senders. |
| M1 | "Check your email" panel with resend after manager signup; resend on "email not confirmed". |
| M2 | Onboarding verification derived from `email_confirmed_at`; team count from `manager_submanagers`. |
| M3 | One shared password policy (8–72, upper/lower/digit/special) incl. reset, tenant, activation (server too), admin (≥10 plus classes). |
| M4/M13 | Invitation, welcome and other emails escape interpolated values; invitation property name comes from the database. |
| M5 | `?token=` scrubbed from the URL after read; `Referrer-Policy: no-referrer` meta. |
| M6/M7 | `activate-account` consumes the token before setting the password; rate-limit key no longer the client-appendable first `x-forwarded-for` hop. `self-register-tenant` no longer SMSes an unverified number. |
| M10 | `bootstrap-webhost` and service/cron secrets compared in constant time. |
| M11 | `notification_dedup` (migration `20260908000002`) used by due-invoice, payment-reminder and overdue senders (fails open if the table is absent). |
| Other | Raw error text no longer shown; neutral account-exists messaging; a11y labels; `PendingApproval` handles multiple roles. Pre-existing bug fixed: `mpesa-callback` referenced `ResultDesc` (undefined) instead of `resultDesc`, which threw on failed payments. |

## Configuration required (not done here)
1. Verify a sending domain with Resend and set `RESEND_FROM_EMAIL` (e.g. `CALQULUS <notifications@your-domain>`) in the Edge Function secrets. Without it the sandbox sender is used and a warning is logged.
2. Apply `20260908000001` and `20260908000002` **only after** Phase 2D reconciliation is complete and approved for the target project. Until `20260908000001` is applied, tenant signups still receive the old default role server-side.
3. Set Supabase Auth password policy to match the shared client policy and review confirmation/rate-limit settings (not in `config.toml`).
4. Remove `bootstrap-webhost` from the deployed function set once the first webhost exists.

## Not done / residual
- Tenant-side consent for `claim-tenant` (claim still keyed by email; approved-manager check added).
- Invite/activation tokens remain stored in plaintext (needs a migration and RPC changes).
- Unsubscribe/STOP handling, quiet hours and server-side persistence of consent are not implemented; no landlord marketing sender exists yet, and bank-detail alerts are intentionally not preference-gated.
- `create-agency-landlord-account` consent/enumeration, `findAuthUserByEmail` paging, `validate_activation_token` grant to `authenticated`, and token-hash storage remain open.
- Edge functions were checked with eslint and a TypeScript name/syntax pass, not run under Deno.

---
## Addendum — 2026-10-28 (Phase 2F)
The sections above are unchanged history. Phase 2F superseded several statements:
- Notification dedup was rewritten from a simple insert-key claim (which failed open when the table was missing) to a lease-based, fail-closed claim with explicit outcomes; the guarantee is at-most-one concurrent sender and at-least-once across ambiguous failures, not exactly-once.
- `claim-tenant` no longer reassigns tenants directly; it issues a tenant consent request.
- The sandbox-sender fallback was removed everywhere; email fails closed without a verified `RESEND_FROM_EMAIL`.
- Activation/admin tokens are hash-stored with a legacy fallback.
See `REGISTRATION_COMMS_PHASE_2F_REMEDIATION.md` for status of every finding.
