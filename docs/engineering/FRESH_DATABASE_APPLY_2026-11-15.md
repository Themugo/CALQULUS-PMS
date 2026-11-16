# Applying the full schema to the (empty) CALQULUS PMS Supabase project

State found 2026-11-15: project `hmgpltrjlsescfquqxeg` restored and healthy, but `public` had 0 tables,
0 auth users, 3 stub migration rows and 0 edge functions.

## What was done in the repo
* All 284 migrations replayed in order on a throwaway Postgres 16 with Supabase stand-ins
  (auth, storage, cron, net, vault): result 232 tables, 611 functions, 384 RLS policies, RLS on
  every table, signup trigger creates profile + pending role, admin SQL verified.
* Versions are now unique and strictly ordered (140 files renumbered, none had been applied anywhere),
  so the Supabase CLI accepts the directory.
* Real defects found by the replay and fixed in the (never-applied) files: param order in
  `create_invoice_atomic_v2`; drop-before-recreate where return types changed; wrong function name in a grant;
  `::admin_level` cast of a non-existent type; unbalanced brackets and bare `day`/`month` aliases in 6 finance
  functions; `LIMIT` inside aggregates; `properties.agency_id` (dropped in 20260603) still used;
  contracts policies using columns that do not exist; invalid RAISE format; hardening grants naming
  stale signatures.
* Tables/columns that only ever existed in the old hand-built database were added as `IF NOT EXISTS`
  baselines: insurance (3 tables), contractors/work orders, workflows, utilities, `invoices.invoice_type`.

## Onboarding bugs found by running real flows on the replayed database (all fixed)
* Webhost could not approve ANY manager: protection trigger read a non-existent `manager_profiles.tier_id`.
* No new manager could create a property: default tier `starter` had no `property_tier_limits` rows.
* No landlord invitation could be accepted: `ON CONFLICT (property_id)` but the key is `(property_id, landlord_user_id)`.
Also found by cross-checking every .rpc()/.from() in src and edge functions against the schema:
`check_ip_rate_limit` (IP throttling silently did nothing), `idempotency_keys`, `mpesa_settings`,
`other_charges`, `contractors`, `financial_partners`, `utility_providers` were never created (migration 30);
five internal functions were callable by anyone with the public key, e.g. `get_trusted_devices(user_id)`
and `check_rate_limit(user_id)` (migration 31).
Verified end to end on the scratch DB: signup (email, Google, agency, tenant), role-escalation attempts
rejected, manager approval, property creation, landlord invite + accept (wrong account rejected), tenant
invite + claim (replay rejected), agency approval + property.
Not yet exercised: edge-function flows (emails, STK push, admin invitations) - they need deployment first.

## Apply (Windows cmd, repo root)
PHASE_2D_1_MIGRATION_EXECUTION_SAFEGUARDS: the duplicate-version blocker is resolved; this targets an EMPTY project only.
Never run these against a project that already holds data.
```
npx supabase login
npx supabase link --project-ref hmgpltrjlsescfquqxeg
npx supabase migration repair --status reverted 20260904064824 20260904065349 20260904090738
npx supabase db push
```
`repair` clears the three empty stub rows so the history matches the repo. `db push` asks for the
database password (Dashboard -> Project Settings -> Database).
Check afterwards: `npx supabase migration list` shows every row Local = Remote.

## Edge functions and secrets
```
npx supabase functions deploy
npx supabase secrets set SITE_URL=https://<app domain> ADMIN_SITE_URL=https://admin.<domain> ^
  RESEND_API_KEY=... RESEND_FROM_EMAIL="CALQULUS <noreply@<domain>>" CRON_SECRET=<long random> ^
  ALLOWED_ORIGINS=https://<app domain>,https://admin.<domain>
```
Add as needed for the features you use: `MPESA_*` (set in the Payments settings screens / functions),
`PAYSTACK_SECRET_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `AFRICASTALKING_USERNAME`,
`AFRICASTALKING_API_KEY`, `SMS_PROVIDER`, `TWILIO_*`, `WHATSAPP_ACCESS_TOKEN`.
Do NOT set `ENVIRONMENT=development` or `BOOTSTRAP_SECRET` on production.
Schedule `retry-confirmed-payments` and `send-overdue-notifications` (Dashboard -> Integrations -> Cron).

## Auth settings (Dashboard -> Authentication)
* URL Configuration: Site URL = your app domain; Redirect URLs include the app and admin domains
  (`/**` wildcard) and `http://localhost:5173/**` for local work.
* Providers: Email on; Google on with your OAuth client if you use Google sign-in.
* Email: configure custom SMTP (Resend) - the built-in sender is rate limited to a few emails an hour.

## Then
Create your admin with `ADMIN_ACCESS_AND_LOGIN_RUNBOOK_2026-11-15.md`, and confirm Vercel has
`VITE_SUPABASE_URL=https://hmgpltrjlsescfquqxeg.supabase.co` and the publishable key; redeploy.
