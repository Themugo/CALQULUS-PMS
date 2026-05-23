# RentFlow Production Checklist

Use this before promoting a release to production.

## Recommended Host

Use Vercel for the primary frontend deployment and keep Netlify as a ready fallback. The app is a Vite SPA with Supabase doing the backend work, so both hosts can serve it well. Vercel is the better primary choice for high-production operation because its deployment limits, function scaling model, preview workflow, and enterprise path are stronger for growth. Netlify remains useful as a secondary deployment target because the project already has matching redirects and headers.

## Local Release Gate

Run:

```bash
npm run verify
```

This runs lint, tests, production build, dependency audit, and the RentFlow production audit.

After deploying, run:

```bash
SMOKE_BASE_URL=https://your-production-domain.com npm run smoke:deploy
```

This checks SPA routing, static assets, and required security headers on the live deployment.

## Supabase

- Apply migrations to a fresh staging project before production.
- Confirm `supabase db push` completes without manual SQL edits.
- Regenerate TypeScript types after migrations.
- Confirm critical tables have RLS and policies with `npm run audit:prod`.
- Test manager, tenant, landlord, submanager, and webhost data isolation with real accounts.
- Confirm storage bucket privacy:
  - `maintenance-photos`: public
  - `tenant-photos`: public
  - `condition-photos`: public
  - `documents`: private

## Required Secrets

The source of truth for required frontend variables and Supabase secrets is [config/production-env.json](config/production-env.json).

Set these in Supabase Edge Function secrets:

- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_ANON_KEY`
- `RESEND_API_KEY`
- `RESEND_FROM_DOMAIN`
- `RESEND_FROM_EMAIL`
- `SITE_URL`
- `DEMO_SECRET`
- `MPESA_CONSUMER_KEY`
- `MPESA_CONSUMER_SECRET`
- `MPESA_PASSKEY`
- `MPESA_SHORTCODE`
- `MPESA_CALLBACK_SECRET`
- `MPESA_ENV`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `PAYSTACK_SECRET_KEY`
- `LOVABLE_API_KEY`
- `BOOTSTRAP_SECRET`
- `AFRICASTALKING_API_KEY`
- `AFRICASTALKING_USERNAME`
- `AT_API_KEY`
- `AT_USERNAME`
- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_WHATSAPP_FROM`
- `META_WHATSAPP_TOKEN`
- `META_PHONE_NUMBER_ID`
- `WHATSAPP_ACCESS_TOKEN`
- `PHONE_NUMBER_ID`
- `SENDGRID_API_KEY`
- `APP_URL`

Set these in the frontend host:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_ENABLE_PUBLIC_DEMO=false`
- `VITE_ENABLE_DEMO_SEED=false`
- leave `VITE_DEMO_SEED_SECRET` unset in production
- `VITE_SENTRY_DSN` (optional but recommended — see Error Tracking section)
- `VITE_SENTRY_ENV=production`
- `VITE_APP_VERSION` (use the commit SHA or release tag — used by Sentry to group errors by release)

## Payment Smoke Tests

- M-Pesa STK push starts successfully in sandbox.
- M-Pesa callback validates `MPESA_CALLBACK_SECRET`.
- M-Pesa callback secret comparison is constant-time (cannot be probed by timing).
- Invoice status updates after callback.
- Receipt generation uses the correct tenant, unit, property, and manager.
- Stripe checkout and webhook are tested if platform billing is enabled.
- Stripe webhook is idempotent: re-sending the same `event.id` does NOT double-mark an invoice paid.
- Bank webhook authenticates via `x-webhook-secret` header (URL `?secret=` is logged for legacy migration only).

## Webhook Dead-Letter Queue

The `webhook_dead_letter` table captures M-Pesa / bank / Stripe events that succeeded upstream (money moved) but failed inside our handlers. Triage:

```sql
-- See unresolved entries
SELECT id, source, external_ref, error, created_at
FROM webhook_dead_letter
WHERE status = 'pending'
ORDER BY created_at DESC;

-- After fixing, mark resolved
UPDATE webhook_dead_letter
SET status = 'resolved', resolved_at = now(), resolved_by = auth.uid(), notes = '...'
WHERE id = '...';
```

Operators should watch this table from the webhost dashboard; a backlog usually means a downstream function (e.g. `process-payment`) is failing.

## Notification Failures

The `notification_failures` table records every email / SMS / WhatsApp / manager-notification dispatch that `process-payment` could not deliver. The payment itself was recorded; the tenant just didn't hear about it.

```sql
-- A manager sees their own:
SELECT id, channel, error, created_at
FROM notification_failures
WHERE manager_id = auth.uid()
  AND status = 'pending'
ORDER BY created_at DESC;

-- A webhost sees everything:
SELECT id, manager_id, channel, error, created_at
FROM notification_failures
WHERE status = 'pending'
ORDER BY created_at DESC;
```

The `payload` column holds the original request body so retry is just a re-invocation of the same edge function with the same payload.

## Payment Idempotency

`payment_transactions` has a `UNIQUE` index on `(tenant_id, bank_reference)` (where `bank_reference IS NOT NULL`). `process-payment` relies on this — a duplicate-key error from Postgres is treated as a successful idempotent replay. If you ever need to insert a row that legitimately shares a reference with another tenant's payment, use a synthetic reference like `<ref>:<tenant>` or scope per manager.

## Error Tracking (Sentry)

Sentry is optional but strongly recommended for any release that handles real payments. To enable:

1. `npm install @sentry/browser` (only when you actually plan to use it).
2. Set `VITE_SENTRY_DSN`, `VITE_SENTRY_ENV`, `VITE_APP_VERSION` on the host.
3. Source maps are emitted as `hidden` by `vite.config.ts` — upload them to Sentry after each build:

   ```bash
   npx @sentry/cli sourcemaps inject ./dist
   npx @sentry/cli sourcemaps upload --release "$VITE_APP_VERSION" ./dist
   ```

4. Confirm `*.sentry.io` is in `connect-src` of the CSP in `netlify.toml` / `vercel.json` (already done).

## Rate Limiter Behaviour

The shared rate limiter (`supabase/functions/_shared/rateLimit.ts`) fails **closed** for money-moving and bulk-messaging endpoints (M-Pesa init, SMS, WhatsApp, AI parsing) — if the rate-limit table is unreachable these endpoints deny rather than allow. All other endpoints fail open. Verify `api_rate_limits` table exists and the `check_rate_limit` RPC works before deploying.

## Operations

- Confirm backups and point-in-time recovery for Supabase.
- Confirm error log visibility in `activity_logs` or external monitoring.
- Confirm rollback path for frontend deployment and Supabase migrations.
- Keep Vercel and Netlify configs aligned for redirects and security headers.
- Keep Supabase CORS allowlist focused on `https://rentflow.ink`, `https://www.rentflow.ink`, and local development origins unless a staging domain is intentionally added.
