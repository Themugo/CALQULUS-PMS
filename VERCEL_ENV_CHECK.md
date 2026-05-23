# Vercel Environment Variables Checklist

**Issue:** Login loop on Vercel deployment  
**Deployment:** https://vercel.com/themugos-projects/rentflow-final

---

## Critical Environment Variables Required

The login loop is most likely caused by missing Supabase environment variables in Vercel. Without these, the Supabase client runs in "noop mode" and authentication doesn't work.

### Required Frontend Variables (Vercel Dashboard → Settings → Environment Variables)

| Variable | Required | Example Value | Description |
|----------|----------|---------------|-------------|
| `VITE_SUPABASE_URL` | **YES** | `https://xxxxx.supabase.co` | Your Supabase project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | **YES** | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` | Your Supabase anon/public key |
| `VITE_ENABLE_PUBLIC_DEMO` | YES | `false` | Set to `false` in production |
| `VITE_ENABLE_DEMO_SEED` | YES | `false` | Set to `false` in production |

### Optional Variables

| Variable | Required | Example Value | Description |
|----------|----------|---------------|-------------|
| `VITE_SENTRY_DSN` | No | `https://xxxxx@sentry.io/xxxxx` | Sentry DSN for error tracking |
| `VITE_SENTRY_ENV` | No | `production` | Sentry environment |
| `VITE_APP_VERSION` | No | `v1.0.0` | Version string for Sentry |

---

## How to Add Environment Variables in Vercel

### Step 1: Go to Vercel Dashboard

1. Navigate to [vercel.com/themugos-projects/rentflow-final](https://vercel.com/themugos-projects/rentflow-final)
2. Click **Settings** tab
3. Click **Environment Variables** in the left sidebar

### Step 2: Add Required Variables

For each variable:

1. Click **Add New**
2. Enter the variable name (e.g., `VITE_SUPABASE_URL`)
3. Enter the value (get from your Supabase Dashboard)
4. Select **All** environments (Production, Preview, Development)
5. Click **Save**

### Step 3: Redeploy

After adding environment variables:

1. Go to **Deployments** tab
2. Click the **...** menu on the latest deployment
3. Click **Redeploy**

---

## How to Get Your Supabase Credentials

### Step 1: Go to Supabase Dashboard

1. Navigate to [supabase.com/dashboard](https://supabase.com/dashboard)
2. Select your project

### Step 2: Get Project URL

1. Click **Settings** → **API**
2. Copy the **Project URL** (starts with `https://`)
3. This is your `VITE_SUPABASE_URL`

### Step 3: Get Publishable Key

1. On the same **API** page
2. Find **Project API keys** section
3. Copy the **anon** / **public** key
4. This is your `VITE_SUPABASE_PUBLISHABLE_KEY`

---

## Diagnostic Steps

### Check Browser Console

1. Open your Vercel deployment in browser
2. Open Developer Tools (F12)
3. Go to Console tab
4. Look for this warning:

```
[RentFlow] Missing Supabase env vars (VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY).
  The app will load but auth and data features will be unavailable.
  Copy .env.example to .env.local and fill in your Supabase project values.
```

If you see this warning, the environment variables are not set correctly in Vercel.

### Check Network Tab

1. Open Developer Tools → Network tab
2. Try to log in
3. Check if requests are being made to Supabase
4. If no Supabase requests appear, the client is in noop mode

---

## Common Issues

### Issue: Variables set but still not working

**Solution:**
1. Make sure variable names start with `VITE_` (Vite requirement)
2. Make sure you selected **All** environments when adding
3. Redeploy after adding variables
4. Clear browser cache and try again

### Issue: Variables disappear after deployment

**Solution:**
1. Check if you're looking at the correct environment (Production vs Preview)
2. Make sure variables are set for the correct environment
3. Check Vercel project settings for any variable overrides

### Issue: Still getting login loop after setting variables

**Solution:**
1. Check Supabase project is active
2. Verify the URL and key are correct
3. Check if user has a role in `user_roles` table
4. Check Supabase logs for authentication errors

---

## Quick Fix Script

If you have access to the Supabase Dashboard, run this SQL to check if users have roles:

```sql
-- Check if users have roles
SELECT 
  u.email,
  ur.role,
  ur.approval_status
FROM auth.users u
LEFT JOIN public.user_roles ur ON u.id = ur.user_id
ORDER BY u.created_at DESC
LIMIT 10;
```

If users don't have roles, they won't be able to log in. You need to insert roles:

```sql
-- Add role for a user (replace with actual user UUID)
INSERT INTO public.user_roles (user_id, role, approval_status)
VALUES ('USER-UUID-HERE', 'manager', 'approved');
```

---

## Next Steps

1. **Check Vercel Environment Variables** - Make sure `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` are set
2. **Redeploy** - After adding variables, redeploy the project
3. **Test Login** - Try logging in again
4. **Check Console** - Look for the missing env vars warning
5. **Check Database** - Verify users have roles in `user_roles` table

---

**Still having issues?**
- Check Vercel deployment logs
- Check Supabase logs
- Verify Supabase project is active
- Contact support with error details
