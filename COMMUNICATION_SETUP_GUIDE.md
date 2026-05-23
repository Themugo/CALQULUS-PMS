# Communication Setup Guide

**Purpose:** Configure email confirmation, SMS/WhatsApp registration, and payment receipts  
**Updated:** May 23, 2026

---

## Overview

RentFlow supports multiple communication channels:
- **Email:** Primary communication for receipts, confirmations, notifications
- **SMS:** Via Africa's Talking for Kenya
- **WhatsApp:** Via Africa's Talking for Kenya

---

## Step 1: Add Supabase Environment Variables to Vercel

**Critical:** This fixes the login loop issue. Complete this first.

Follow the guide in `VERCEL_ENV_SETUP.md` to add:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_ENABLE_PUBLIC_DEMO` = false
- `VITE_ENABLE_DEMO_SEED` = false

Then redeploy in Vercel.

---

## Step 2: Configure Email Confirmation in Supabase

### Enable Email Verification

1. Go to [supabase.com/dashboard](https://supabase.com/dashboard)
2. Select your RentFlow project
3. Click **Authentication** → **Providers**
4. Under **Email**, configure:
   - **Confirm email:** Enable (toggle on)
   - **Secure email change:** Enable
   - **Enable email confirmations:** Enable
   - **Email change security level:** Set to "High"

### Configure Email Templates

1. In Supabase Dashboard → Authentication → Providers → Email
2. Click **Email Templates**
3. Customize templates:
   - **Confirm signup:** Add company branding
   - **Reset password:** Add company branding
   - **Email change:** Add company branding

### Set Up Email Service

**Option A: Resend (Recommended)**
1. Go to Supabase Dashboard → Edge Functions → Secrets
2. Add these secrets:
   ```
   RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxx
   RESEND_FROM_DOMAIN=your-domain.com
   RESEND_FROM_EMAIL=noreply@your-domain.com
   ```

**Option B: SendGrid**
1. Go to Supabase Dashboard → Edge Functions → Secrets
2. Add these secrets:
   ```
   SENDGRID_API_KEY=SG.xxxxxxxxxxxxxxxxxxxxxx
   SENDGRID_FROM_EMAIL=noreply@your-domain.com
   ```

---

## Step 3: Configure SMS/WhatsApp for Registration Confirmation

### Set Up Africa's Talking

1. Go to [africastalking.com](https://africastalking.com)
2. Sign up or log in
3. Get your API credentials:
   - **API Key** (from Dashboard → API Settings)
   - **Username** (your account username)

### Add Africa's Talking Secrets to Supabase

1. Go to Supabase Dashboard → Edge Functions → Secrets
2. Add these secrets:
   ```
   AFRICASTALKING_API_KEY=your_api_key_here
   AFRICASTALKING_USERNAME=your_username_here
   ```

### Configure Communication Preference in Settings

The system needs a way for landlords/managers/agencies to choose their preferred communication method. This is configured in the `receipt_settings` table.

**SQL to add communication preference:**
```sql
-- Add communication preference column to receipt_settings
ALTER TABLE public.receipt_settings 
ADD COLUMN communication_preference TEXT DEFAULT 'email' 
CHECK (communication_preference IN ('email', 'sms', 'whatsapp', 'both'));

-- Update existing records
UPDATE public.receipt_settings 
SET communication_preference = 'email' 
WHERE communication_preference IS NULL;
```

---

## Step 4: Configure Payment Receipts

### Current Implementation

The system already has:
- **Email receipts:** Sent via `send-receipt-email` function
- **SMS receipts:** Sent via `send-sms-notification` function
- **Receipt storage:** Stored in `payment_receipts` table

### Receipt Settings Configuration

**SQL to check current receipt settings:**
```sql
SELECT 
  manager_user_id,
  auto_send_receipts,
  send_sms_receipt,
  communication_preference,
  primary_color,
  secondary_color,
  footer_message
FROM public.receipt_settings;
```

**SQL to configure receipt settings for a manager:**
```sql
INSERT INTO public.receipt_settings (
  manager_user_id,
  auto_send_receipts,
  send_sms_receipt,
  communication_preference,
  primary_color,
  secondary_color,
  footer_message
) VALUES (
  'MANAGER-USER-ID-HERE',
  true,  -- auto_send_receipts
  true,  -- send_sms_receipt
  'both',  -- communication_preference (email + sms)
  '#16a34a',  -- primary_color
  '#1e293b',  -- secondary_color
  'Thank you for your payment!'
)
ON CONFLICT (manager_user_id) 
DO UPDATE SET
  auto_send_receipts = EXCLUDED.auto_send_receipts,
  send_sms_receipt = EXCLUDED.send_sms_receipt,
  communication_preference = EXCLUDED.communication_preference,
  primary_color = EXCLUDED.primary_color,
  secondary_color = EXCLUDED.secondary_color,
  footer_message = EXCLUDED.footer_message;
```

### Receipt Content

**Email Receipt Includes:**
- Tenant name and email
- Invoice number and amount
- Payment date and due date
- Property and unit details
- Payment method and reference
- Outstanding balance
- Company branding (colors, logo, footer message)

**SMS Receipt Includes:**
- Company name
- Amount received
- Unit number
- Invoice number
- Payment reference
- Payment date
- Outstanding balance

---

## Step 5: Configure WhatsApp (Optional)

### Set Up Africa's Talking WhatsApp

1. In Africa's Talking Dashboard → WhatsApp
2. Enable WhatsApp for your account
3. Get WhatsApp sandbox credentials (for testing)
4. Get WhatsApp production credentials (for live)

### Add WhatsApp Secrets to Supabase

1. Go to Supabase Dashboard → Edge Functions → Secrets
2. Add these secrets:
   ```
   AFRICASTALKING_WHATSAPP_API_KEY=your_whatsapp_api_key
   AFRICASTALKING_WHATSAPP_USERNAME=your_whatsapp_username
   ```

### Create WhatsApp Notification Function

The system currently uses SMS. To add WhatsApp, create a new edge function:

**File:** `supabase/functions/send-whatsapp-notification/index.ts`

```typescript
/**
 * send-whatsapp-notification/index.ts
 * Send WhatsApp notifications via Africa's Talking
 */
import { getCorsHeaders, preflightResponse } from "../_shared/cors.ts";
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") return preflightResponse(req);
  
  const { phoneNumber, message } = await req.json();
  
  const apiKey = Deno.env.get("AFRICASTALKING_WHATSAPP_API_KEY");
  const username = Deno.env.get("AFRICASTALKING_WHATSAPP_USERNAME");
  
  // Send via Africa's Talking WhatsApp API
  const response = await fetch("https://api.africastalking.com/version1/messaging", {
    method: "POST",
    headers: {
      apiKey,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      username,
      to: phoneNumber,
      message,
      channel: "whatsapp",  // Specify WhatsApp channel
    }),
  });
  
  return new Response(JSON.stringify({ success: response.ok }), {
    headers: { ...getCorsHeaders(req), "Content-Type": "application/json" }
  });
});
```

---

## Step 6: Configure Registration Confirmation

### Current Registration Flow

The current registration flow:
1. User signs up via Auth.tsx
2. Supabase sends email confirmation (if enabled)
3. User clicks confirmation link
4. User can log in

### Add SMS/WhatsApp Confirmation Option

To add SMS/WhatsApp confirmation based on landlord/manager/agency choice:

**1. Add communication preference to user_roles table:**
```sql
ALTER TABLE public.user_roles 
ADD COLUMN communication_preference TEXT 
CHECK (communication_preference IN ('email', 'sms', 'whatsapp', 'both'));
```

**2. Create registration confirmation function:**

**File:** `supabase/functions/send-registration-confirmation/index.ts`

```typescript
/**
 * send-registration-confirmation/index.ts
 * Sends registration confirmation via email, SMS, or WhatsApp
 */
import { getCorsHeaders, preflightResponse } from "../_shared/cors.ts";
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  if (req.method === "OPTIONS") return preflightResponse(req);
  
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );
  
  const { userId, email, phone, communicationPreference } = await req.json();
  
  // Get confirmation link from Supabase
  const { data: { user } } = await supabase.auth.admin.generateLink({
    type: 'signup',
    email,
  });
  
  const confirmationLink = user?.action_link;
  
  // Send based on preference
  if (communicationPreference === 'email' || communicationPreference === 'both') {
    // Send email via Resend/SendGrid
    await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/send-email`, {
      method: "POST",
      body: JSON.stringify({
        to: email,
        subject: "Confirm your RentFlow account",
        html: `Click here to confirm: ${confirmationLink}`,
      }),
    });
  }
  
  if (communicationPreference === 'sms' || communicationPreference === 'both') {
    // Send SMS via Africa's Talking
    await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/send-sms-notification`, {
      method: "POST",
      body: JSON.stringify({
        phoneNumber: phone,
        message: `Confirm your RentFlow account: ${confirmationLink}`,
      }),
    });
  }
  
  if (communicationPreference === 'whatsapp') {
    // Send WhatsApp via Africa's Talking
    await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/send-whatsapp-notification`, {
      method: "POST",
      body: JSON.stringify({
        phoneNumber: phone,
        message: `Confirm your RentFlow account: ${confirmationLink}`,
      }),
    });
  }
  
  return new Response(JSON.stringify({ success: true }), {
    headers: { ...getCorsHeaders(req), "Content-Type": "application/json" }
  });
});
```

---

## Step 7: Test Configuration

### Test Email Confirmation

1. Create a test user
2. Check email for confirmation link
3. Click confirmation link
4. Verify user can log in

### Test SMS Receipt

1. Make a test payment
2. Check if SMS is received
3. Verify receipt content includes:
   - Amount
   - Invoice number
   - Payment reference
   - Outstanding balance

### Test WhatsApp Receipt (if configured)

1. Make a test payment
2. Check if WhatsApp message is received
3. Verify receipt content

---

## Communication Preference by Role

### Manager Settings

Managers can configure their communication preference in Settings → Receipt Settings:
- **Email only:** Send receipts via email
- **SMS only:** Send receipts via SMS
- **WhatsApp only:** Send receipts via WhatsApp
- **Both:** Send via email and SMS

### Tenant Settings

Tenants receive receipts based on manager's settings. Tenants can also set their notification preferences in their profile.

### Landlord Settings

Landlords receive payment notifications based on their configured preferences.

---

## Troubleshooting

### Email Not Sending

**Check:**
1. Resend/SendGrid API key is set in Supabase secrets
2. Email domain is verified (for Resend)
3. Email templates are configured
4. Check Supabase logs for errors

### SMS Not Sending

**Check:**
1. Africa's Talking API key is set in Supabase secrets
2. Phone number is in correct format (+254...)
3. Africa's Talking account has sufficient credits
4. Check Supabase logs for errors

### Receipts Not Being Sent

**Check:**
1. `auto_send_receipts` is enabled in receipt_settings
2. `send_sms_receipt` is enabled in receipt_settings
3. Tenant has valid email and phone
4. Check `notification_failures` table for failed notifications

---

## SQL Queries for Verification

### Check Receipt Settings
```sql
SELECT * FROM public.receipt_settings;
```

### Check Notification Failures
```sql
SELECT * FROM public.notification_failures
ORDER BY created_at DESC
LIMIT 10;
```

### Check Payment Receipts
```sql
SELECT 
  pr.id,
  pr.amount,
  pr.created_at,
  pr.invoice_id,
  i.invoice_number,
  t.name as tenant_name,
  t.email as tenant_email,
  t.phone as tenant_phone
FROM public.payment_receipts pr
LEFT JOIN public.invoices i ON pr.invoice_id = i.id
LEFT JOIN public.tenants t ON pr.tenant_id = t.id
ORDER BY pr.created_at DESC
LIMIT 10;
```

---

## Next Steps

1. **Add Supabase environment variables to Vercel** (CRITICAL - fixes login loop)
2. **Configure email confirmation in Supabase Dashboard**
3. **Set up email service (Resend or SendGrid)**
4. **Set up Africa's Talking for SMS**
5. **Configure receipt settings for managers**
6. **Test email confirmation**
7. **Test SMS receipts**
8. **Configure WhatsApp (optional)**
9. **Test all communication channels**

---

**Note:** All configuration is done via Supabase Dashboard and environment variables. No code changes required for basic email and SMS functionality.
