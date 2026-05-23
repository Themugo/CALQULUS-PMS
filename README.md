# RentFlow — Property Management Platform

Modern property management SaaS for Kenya and East Africa.  
**Stack:** React 18 + TypeScript + Vite + Supabase + Netlify/Vercel

---

## Deploy to Vercel (recommended)

1. Push code to GitHub (see bundle instructions below)
2. Go to [vercel.com](https://vercel.com) → New Project → Import from GitHub
3. Framework: **Vite** (auto-detected)
4. Add environment variables (see below)
5. Deploy — `vercel.json` handles SPA routing and security headers

## Deploy to Netlify

`netlify.toml` is pre-configured. Connect GitHub repo and it auto-builds.

## Push from git bundle

```bash
git clone rentflow-more-fixes.bundle rentflow-deploy
cd rentflow-deploy
git remote set-url origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git push origin main --force
```

---

## Environment Variables

**Frontend** (Vercel/Netlify dashboard):

| Variable | Value |
|----------|-------|
| `VITE_SUPABASE_URL` | `https://xxxx.supabase.co` |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase anon key |

**Edge Function Secrets** (Supabase Dashboard → Edge Functions → Secrets):

| Secret | Notes |
|--------|-------|
| `RESEND_API_KEY` | Email delivery (resend.com) |
| `MPESA_CONSUMER_KEY` | Safaricom Daraja |
| `MPESA_CONSUMER_SECRET` | Safaricom Daraja |
| `MPESA_PASSKEY` | STK Push passkey |
| `MPESA_SHORTCODE` | Paybill / Till number |
| `MPESA_CALLBACK_SECRET` | Any random secret string |
| `MPESA_ENV` | `production` or `sandbox` |
| `AT_API_KEY` | Africa's Talking SMS (optional) |
| `SITE_URL` | Your deployed domain |
| `DEMO_SECRET` | Change from default for production |

---

## Database Setup

```bash
supabase link --project-ref YOUR_PROJECT_ID
supabase db push                          # runs all 25 migrations
supabase functions deploy                 # deploys all 82 edge functions
supabase gen types typescript \
  --project-id YOUR_PROJECT_ID \
  > src/integrations/supabase/types.ts   # refresh types after migrations
```

---

## First Admin Account

```sql
-- Run in Supabase SQL Editor after creating the user in Dashboard → Auth
INSERT INTO public.user_roles (user_id, role, approval_status)
VALUES ('YOUR-USER-UUID', 'webhost', 'approved');
```

Or use the `bootstrap-webhost` edge function (see docs).

---

## Storage Buckets

Create in Supabase Dashboard → Storage:

| Bucket | Public |
|--------|--------|
| `maintenance-photos` | Yes |
| `tenant-photos` | Yes |
| `condition-photos` | Yes |
| `documents` | No |

---

## Safaricom Daraja Callback URL

Register this in your Daraja portal:
```
https://YOUR_PROJECT_ID.supabase.co/functions/v1/mpesa-callback?secret=YOUR_MPESA_CALLBACK_SECRET
```

---

## Demo

Visit `/demo` → click **▶ SEED DEMO DATA** → log in as any role.

| Role | Email | Password |
|------|-------|----------|
| Manager | demo.manager@rentflow.ink | Demo@2026 |
| Tenant (overdue) | demo.tenant1@rentflow.ink | Demo@2026 |
| Tenant (paid) | demo.tenant2@rentflow.ink | Demo@2026 |
| Orphan tenant | demo.tenant3@rentflow.ink | Demo@2026 |
| Landlord | demo.landlord@rentflow.ink | Demo@2026 |
| Agent | demo.agent@rentflow.ink | Demo@2026 |

---

## Stats

304 source files · 82 edge functions · 25 migrations · 86,000+ lines of code
