# Vercel Environment Variables Setup Guide

**Purpose:** Add Supabase environment variables to Vercel to fix login loop issue  
**Deployment:** https://vercel.com/themugos-projects/rentflow-final  
**Updated:** May 23, 2026

---

## Step-by-Step Instructions

### Step 1: Get Your Supabase Credentials

1. Go to [supabase.com/dashboard](https://supabase.com/dashboard)
2. Select your RentFlow project
3. Click **Settings** → **API**
4. Copy the **Project URL** (e.g., `https://xxxxx.supabase.co`)
5. Copy the **anon/public** key (starts with `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`)

### Step 2: Add Environment Variables to Vercel

1. Go to [vercel.com/themugos-projects/rentflow-final](https://vercel.com/themugos-projects/rentflow-final)
2. Click **Settings** tab
3. Click **Environment Variables** in the left sidebar
4. For each variable below, click **Add New** and enter:

#### Required Variables

**Variable 1:**
- Name: `VITE_SUPABASE_URL`
- Value: Your Supabase Project URL (from Step 1)
- Environments: Select **All** (Production, Preview, Development)
- Click **Save**

**Variable 2:**
- Name: `VITE_SUPABASE_PUBLISHABLE_KEY`
- Value: Your Supabase anon/public key (from Step 1)
- Environments: Select **All** (Production, Preview, Development)
- Click **Save**

**Variable 3:**
- Name: `VITE_ENABLE_PUBLIC_DEMO`
- Value: `false`
- Environments: Select **All**
- Click **Save**

**Variable 4:**
- Name: `VITE_ENABLE_DEMO_SEED`
- Value: `false`
- Environments: Select **All**
- Click **Save**

### Step 3: Redeploy to Vercel

1. Go to **Deployments** tab in Vercel
2. Find the latest deployment
3. Click the **...** menu (three dots)
4. Click **Redeploy**
5. Wait for deployment to complete (usually 1-2 minutes)

### Step 4: Test Login

1. Open your Vercel deployment URL
2. Open Developer Tools (F12) → Console tab
3. Try to log in with your credentials
4. You should NOT see this warning:
   ```
   [RentFlow] Missing Supabase env vars (VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY)
   ```
5. Login should work and redirect to dashboard

---

## Verification

### Check Browser Console

If environment variables are set correctly, you should NOT see the missing env vars warning.

### Check Network Tab

1. Open Developer Tools → Network tab
2. Try to log in
3. You should see requests to your Supabase project URL
4. If no Supabase requests appear, env vars are still missing

---

## Troubleshooting

### Issue: Still seeing missing env vars warning

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

### Issue: Login still loops after adding variables

**Solution:**
1. Verify the URL and key are correct
2. Check Supabase project is active
3. Check if users have roles in `user_roles` table
4. Check Supabase logs for authentication errors

---

## Environment Variables Reference

| Variable | Required | Example Value | Description |
|----------|----------|---------------|-------------|
| `VITE_SUPABASE_URL` | **YES** | `https://xxxxx.supabase.co` | Your Supabase project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | **YES** | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` | Your Supabase anon/public key |
| `VITE_ENABLE_PUBLIC_DEMO` | YES | `false` | Set to `false` in production |
| `VITE_ENABLE_DEMO_SEED` | YES | `false` | Set to `false` in production |

---

## Next Steps After Fixing Login Loop

1. **Configure Email Confirmation** (Supabase Dashboard)
2. **Configure SMS/WhatsApp Confirmation** (Supabase Edge Functions)
3. **Verify Payment Receipt Delivery** (Email + SMS)
4. **Test Registration Flow**
5. **Test Payment Receipt Delivery**

---

**Critical:** Complete this step first before proceeding with other configurations. The login loop must be fixed before testing other features.
