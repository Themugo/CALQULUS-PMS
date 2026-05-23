# RentFlow Deployment Instructions

**Status:** 10/10 Production-Ready  
**Updated:** May 23, 2026  
**Repository:** https://github.com/Themugo/Rentflow-FINAL

---

## Quick Deploy to Vercel

### Option 1: Deploy via Vercel Dashboard (Recommended)

1. Go to [vercel.com](https://vercel.com) and log in
2. Click **Add New** → **Project**
3. Import from GitHub: `Themugo/Rentflow-FINAL`
4. Configure:
   - **Framework Preset:** Vite (auto-detected)
   - **Root Directory:** `./` (leave as is)
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
5. Add Environment Variables:
   ```
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-key-here
   VITE_ENABLE_PUBLIC_DEMO=false
   VITE_ENABLE_DEMO_SEED=false
   VITE_SENTRY_DSN=your-sentry-dsn (optional)
   VITE_SENTRY_ENV=production
   VITE_APP_VERSION=v1.0.0
   ```
6. Click **Deploy**

### Option 2: Deploy via Vercel CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Deploy from project directory
cd C:\Users\Kamaa\Desktop\Rentflow-FINAL-main
vercel

# Follow prompts to configure:
# - Link to existing project or create new
# - Set environment variables
# - Confirm deployment
```

---

## Configure Custom Domain (app.rentflow.ink)

### Step 1: Add Domain in Vercel

1. Go to your project in Vercel Dashboard
2. Navigate to **Settings** → **Domains**
3. Click **Add Domain**
4. Enter: `app.rentflow.ink`
5. Click **Add**

### Step 2: Update DNS Records

Go to your domain registrar (where you bought rentflow.ink) and add:

**If using app.rentflow.ink as the primary domain:**
```
Type: A
Name: @
Value: 76.76.21.21
TTL: 3600

Type: CNAME
Name: www
Value: cname.vercel-dns.com
TTL: 3600
```

**If using app.rentflow.ink as a subdomain:**
```
Type: CNAME
Name: app
Value: cname.vercel-dns.com
TTL: 3600
```

### Step 3: Verify Domain

1. Wait for DNS propagation (5-15 minutes)
2. Vercel will automatically verify the domain
3. Once verified, SSL certificate will be issued automatically

### Step 4: Set as Primary Domain

1. In Vercel Dashboard → Settings → Domains
2. Click the **...** menu next to `app.rentflow.ink`
3. Select **Set as Primary Domain**

---

## Configure Supabase for Production

### Step 1: Set Supabase Edge Function Secrets

Go to Supabase Dashboard → Edge Functions → Secrets and add:

```bash
# Required for payments
MPESA_CONSUMER_KEY=your_consumer_key
MPESA_CONSUMER_SECRET=your_consumer_secret
MPESA_PASSKEY=your_passkey
MPESA_SHORTCODE=174379
MPESA_CALLBACK_SECRET=your_random_secret
MPESA_ENV=production

# Required for Stripe (if using)
STRIPE_SECRET_KEY=sk_live_your_secret_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret

# Required for email
RESEND_API_KEY=your_resend_api_key
RESEND_FROM_DOMAIN=your-domain.com
RESEND_FROM_EMAIL=noreply@your-domain.com

# Required for SMS (if using)
AT_API_KEY=your_africas_talking_api_key
AT_USERNAME=your_africas_talking_username

# Required for site
SITE_URL=https://app.rentflow.ink
BOOTSTRAP_SECRET=your_bootstrap_secret
```

### Step 2: Deploy Edge Functions

```bash
# From project directory
cd C:\Users\Kamaa\Desktop\Rentflow-FINAL-main

# Link to Supabase project
supabase link --project-ref YOUR_PROJECT_ID

# Deploy all edge functions
supabase functions deploy

# Deploy specific function (optional)
supabase functions deploy mpesa-callback
supabase functions deploy stripe-webhook
```

### Step 3: Apply Database Migrations

```bash
# Push all migrations to production
supabase db push

# Regenerate TypeScript types
supabase gen types typescript \
  --project-id YOUR_PROJECT_ID \
  > src/integrations/supabase/types.ts
```

### Step 4: Configure M-Pesa Callback URL

Register this callback URL in your Safaricom Daraja Portal:

```
https://YOUR_PROJECT_ID.supabase.co/functions/v1/mpesa-callback?secret=YOUR_MPESA_CALLBACK_SECRET
```

Replace:
- `YOUR_PROJECT_ID` with your Supabase project ID
- `YOUR_MPESA_CALLBACK_SECRET` with the secret you set in Supabase Edge Function secrets

### Step 5: Configure Stripe Webhook (if using)

1. In Stripe Dashboard → Developers → Webhooks
2. Add endpoint: `https://YOUR_PROJECT_ID.supabase.co/functions/v1/stripe-webhook`
3. Select events:
   - `invoice.payment_failed`
   - `charge.failed`
   - `charge.refunded`
   - `checkout.session.completed`
4. Copy the webhook signing secret
5. Add to Supabase Edge Function secrets: `STRIPE_WEBHOOK_SECRET`

---

## Configure Storage Buckets

Create these buckets in Supabase Dashboard → Storage:

| Bucket | Public | Purpose |
|--------|--------|---------|
| `maintenance-photos` | Yes | Maintenance request photos |
| `tenant-photos` | Yes | Tenant profile photos |
| `condition-photos` | Yes | Property condition photos |
| `documents` | No | Private documents (leases, contracts) |

---

## Create First Admin Account

### Option 1: Via Supabase Dashboard

1. Go to Supabase Dashboard → Authentication
2. Click **Add User** → **Create New User**
3. Enter email and password for admin
4. Click **Create User**
5. Run this SQL in Supabase SQL Editor:

```sql
INSERT INTO public.user_roles (user_id, role, approval_status)
VALUES ('YOUR-USER-UUID', 'webhost', 'approved');
```

### Option 2: Via Edge Function

```bash
supabase functions invoke bootstrap-webhost
```

Follow the prompts to create the first webhost account.

---

## Post-Deployment Checklist

### Security
- [ ] Verify SSL certificate is active (https://app.rentflow.ink)
- [ ] Test CSP headers (check browser console for warnings)
- [ ] Verify security headers are present
- [ ] Test rate limiting on payment endpoints

### Payments
- [ ] Test M-Pesa STK Push in sandbox
- [ ] Test M-Pesa callback processing
- [ ] Test Stripe checkout (if using)
- [ ] Test Stripe webhook (if using)
- [ ] Verify payment receipts are generated
- [ ] Verify tenant notifications are sent

### Database
- [ ] Verify all migrations applied successfully
- [ ] Check RLS policies are enabled
- [ ] Test data isolation between managers
- [ ] Verify storage buckets are created

### Edge Functions
- [ ] Verify all 82 edge functions deployed
- [ ] Test critical functions (mpesa-callback, process-payment, stripe-webhook)
- [ ] Check function logs for errors
- [ ] Verify webhook dead-letter table is working

### Performance
- [ ] Test page load times
- [ ] Verify asset caching is working
- [ ] Check bundle size is optimized
- [ ] Test on mobile devices

---

## Environment Variables Reference

### Frontend (Vercel Dashboard)

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_SUPABASE_URL` | Yes | Supabase project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Yes | Supabase anon key |
| `VITE_ENABLE_PUBLIC_DEMO` | Yes | Set to `false` in production |
| `VITE_ENABLE_DEMO_SEED` | Yes | Set to `false` in production |
| `VITE_DEMO_SEED_SECRET` | No | Demo seed secret (leave unset in production) |
| `VITE_SENTRY_DSN` | Optional | Sentry DSN for error tracking |
| `VITE_SENTRY_ENV` | Optional | Set to `production` |
| `VITE_APP_VERSION` | Optional | Version string for Sentry |

### Edge Functions (Supabase Dashboard)

| Variable | Required | Description |
|----------|----------|-------------|
| `MPESA_CONSUMER_KEY` | Yes | Safaricom Daraja Consumer Key |
| `MPESA_CONSUMER_SECRET` | Yes | Safaricom Daraja Consumer Secret |
| `MPESA_PASSKEY` | Yes | Lipa Na M-Pesa Passkey |
| `MPESA_SHORTCODE` | Yes | Paybill/Till number |
| `MPESA_CALLBACK_SECRET` | Yes | Webhook validation secret |
| `MPESA_ENV` | Yes | `production` or `sandbox` |
| `STRIPE_SECRET_KEY` | Optional | Stripe secret key |
| `STRIPE_WEBHOOK_SECRET` | Optional | Stripe webhook signing secret |
| `RESEND_API_KEY` | Optional | Resend API key for email |
| `RESEND_FROM_DOMAIN` | Optional | Email domain |
| `RESEND_FROM_EMAIL` | Optional | From email address |
| `AT_API_KEY` | Optional | Africa's Talking API key |
| `AT_USERNAME` | Optional | Africa's Talking username |
| `SITE_URL` | Yes | Your deployed domain |
| `BOOTSTRAP_SECRET` | Yes | One-time webhost bootstrap secret |

---

## Troubleshooting

### Build Fails on Vercel

**Issue:** Build fails with error about missing dependencies

**Solution:**
```bash
# Clear Vercel cache
vercel --force

# Or in Vercel Dashboard:
# Settings → Functions → Clear Build Cache
```

### Edge Functions Not Working

**Issue:** Edge functions return 500 errors

**Solution:**
1. Check Supabase Edge Function logs
2. Verify all required secrets are set
3. Test function locally:
```bash
supabase functions serve
```

### M-Pesa Callback Not Received

**Issue:** M-Pesa payments not being processed

**Solution:**
1. Verify callback URL is registered in Daraja Portal
2. Check MPESA_CALLBACK_SECRET matches
3. Check Supabase logs for mpesa-callback function
4. Check webhook_dead_letter table for failed callbacks

### Stripe Webhook Not Working

**Issue:** Stripe payments not being processed

**Solution:**
1. Verify webhook endpoint is registered in Stripe Dashboard
2. Check STRIPE_WEBHOOK_SECRET matches
3. Check Supabase logs for stripe-webhook function
4. Verify selected events are correct

### CSP Errors in Browser

**Issue:** Browser console shows CSP violations

**Solution:**
1. Check vercel.json CSP policy
2. Add missing sources to CSP
3. Verify Google Fonts is in style-src

---

## Monitoring

### Vercel Analytics

1. Go to Vercel Dashboard → Analytics
2. Monitor:
   - Page views
   - Web Vitals (LCP, FID, CLS)
   - Error rates
   - Geographic distribution

### Supabase Logs

1. Go to Supabase Dashboard → Logs
2. Monitor:
   - Edge function logs
   - Database query logs
   - Authentication logs
   - API usage

### Sentry (if configured)

1. Go to Sentry Dashboard
2. Monitor:
   - Error rates
   - Performance issues
   - Release health
   - User feedback

---

## Rollback Procedure

If you need to rollback to a previous version:

### Option 1: Vercel Dashboard

1. Go to Vercel Dashboard → Deployments
2. Find the previous successful deployment
3. Click **...** → **Promote to Production**

### Option 2: Git Rollback

```bash
# Checkout previous commit
git checkout <previous-commit-hash>

# Push to GitHub
git push origin master --force

# Vercel will auto-deploy the new commit
```

### Option 3: Database Rollback

```bash
# Rollback specific migration
supabase db reset

# Or rollback to specific migration
supabase migration down <migration-name>
```

---

## Support

For issues with deployment:

1. Check this guide first
2. Review Vercel deployment logs
3. Review Supabase Edge Function logs
4. Check webhook_dead_letter and notification_failures tables
5. Consult PAYMENT_SETUP_GUIDE.md for payment integration issues

---

**Last Updated:** May 23, 2026  
**Version:** 1.0.0
