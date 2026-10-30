# External Configuration Checklist (Phase 2F)

No value below is invented; operators must supply their own. Nothing here has been applied or verified against a live service.

Status buckets: **A** Implemented and locally tested · **B** Prepared but awaiting migration · **C** Requires administrator action · **D** Requires live verification · **E** Blocked by Phase 2D.

| Item | Bucket | Detail |
|---|---|---|
| `RESEND_API_KEY` secret | C, D | Supabase Edge Function secret. Missing → email fails closed (`config` class) |
| `RESEND_FROM_EMAIL` | C, D | `Name <address@your-verified-domain>`. Domain must be verified in Resend (SPF/DKIM). Sandbox/placeholder domains are rejected by code (A) |
| `SITE_URL` | C | Base URL for links in emails (claim, activation) |
| `UNSUBSCRIBE_SIGNING_SECRET` | C | ≥16 chars random. Without it, unsubscribe links/headers are omitted with a warning (A) |
| `unsubscribe` endpoint | A, D | Public (`verify_jwt=false`), signed token; GET confirms, POST persists (one-click). Live link test needed |
| `SMS_INBOUND_SECRET` (Africa's Talking) / `TWILIO_AUTH_TOKEN` + `SMS_INBOUND_PUBLIC_URL` (Twilio) | C, D | Configure the provider's inbound webhook to `/functions/v1/sms-inbound-webhook`. Africa's Talking sends no signature, so the shared secret must be supplied by the operator as the provider allows |
| `COMMS_TIMEZONE`, `COMMS_QUIET_START`, `COMMS_QUIET_END` | C | IANA timezone and `HH:MM`. All three required; otherwise quiet hours are disabled and reported. No default timezone is assumed |
| `WHATSAPP_SMS_FALLBACK` | C | `true` to allow SMS fallback; default off |
| Migrations `20260908000001/2`, `20260909000001–07` | B, E | Unapplied. Apply only after Phase 2D chain reconciliation; apply `…04` before deploying new edge functions, `…01` before functions using dedup, `…02` before sends that check opt-outs, `…05` optional (function falls back to paging) |
| Supabase Auth: password policy, email confirmation, rate limits, redirect URLs | C, D | Not in repo (`config.toml` has no `[auth]`); set ≥8 chars with upper/lower/digit/symbol to match server code |
| Delete/disable `bootstrap-webhost` after first admin exists | C | Already refuses outside local development |
| Provider callbacks (Resend bounces/complaints → opt-out) | C, D | Not implemented; recommended follow-up |
| Edge function deployment of changed functions | E | Not performed |
| Legacy raw token cleanup (`token` column) | B, C | Later migration after invite lifetimes pass (see remediation §5) |
| `tenant_invitations` / `landlord_invitations` hashing | — | OPEN |
| Live verification of registration/onboarding | D | Follow `REGISTRATION_COMMS_LIVE_VERIFICATION.md` on staging |
| Supabase redirect allow-list for `/auth`, `/tenant/login`, `/agency/login`, `/landlord/login` | C, D | Required for verification links and Google sign-in |
| Google provider enabled in Supabase Auth | C, D | Required for Google sign-in |
