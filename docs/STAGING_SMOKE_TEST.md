# RentFlow Staging Smoke Test

Run this on a clean staging Supabase project and the deployed staging frontend before promoting to production.

## Setup

- Apply all migrations to staging.
- Set frontend env vars from `config/production-env.json`.
- Set Supabase Edge Function secrets from `config/production-env.json`.
- Disable public demo mode unless the staging test explicitly needs it.
- Run `npm run verify` locally before deploying.
- Run `SMOKE_BASE_URL=https://staging-domain.example npm run smoke:deploy` after deploying.

## Webhost

- Sign in as a webhost.
- Open the dashboard and confirm manager accounts load.
- Approve or reject a test manager signup.
- Confirm audit/activity entries are visible for the approval action.

## Manager

- Sign in as a manager.
- Create a test property and unit.
- Invite a tenant with email enabled.
- Create an invoice for the tenant.
- Confirm payment settings render the correct callback URL for the staging Supabase project.
- Generate a receipt or statement PDF.

## Tenant

- Open the tenant invite link.
- Confirm the invite page uses the current staging domain.
- Complete tenant signup.
- View invoices, statement, documents, and maintenance.
- Upload a receipt or maintenance photo.

## Landlord

- Sign in as a landlord.
- Confirm assigned properties and payout settings are isolated to the landlord account.
- View landlord statement or property summary.

## Submanager

- Sign in as a submanager.
- Confirm only assigned properties are visible.
- Create or update an allowed record.
- Confirm restricted manager-only actions are blocked.

## Payments And Notifications

- Run M-Pesa sandbox STK push.
- Confirm callback updates invoice/payment status.
- Send one email notification through Resend.
- Send one SMS or WhatsApp notification if the provider is enabled in staging.
- Confirm failed provider calls produce visible logs and do not corrupt invoice state.

## Security Checks

- Try loading manager-only data from tenant and landlord accounts.
- Confirm private document links are not publicly readable.
- Confirm `/demo` is inaccessible when `VITE_ENABLE_PUBLIC_DEMO=false`.
- Confirm old Lovable or Netlify production domains do not appear in generated links.

## Release Decision

Promote only when every role path above passes and `npm run verify` plus `npm run smoke:deploy` are green.
