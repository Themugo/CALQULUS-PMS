# Payment Integration Setup Guide

Complete guide for setting up payment integrations for RentFlow. This guide covers M-Pesa, Stripe, and bank webhooks for landlords, managers, and agents.

---

## Table of Contents

1. [M-Pesa Integration](#mpesa-integration)
2. [Stripe Integration](#stripe-integration)
3. [Bank Webhook Integration](#bank-webhook-integration)
4. [Payment Setup Wizard](#payment-setup-wizard)
5. [Testing Payment Integrations](#testing-payment-integrations)
6. [Troubleshooting](#troubleshooting)

---

## M-Pesa Integration

### Prerequisites

- Active Safaricom Daraja API account
- Business Short Code (Paybill or Till Number)
- Consumer Key and Consumer Secret from Daraja Portal
- Lipa Na M-Pesa Online Passkey (for STK Push)
- Callback URL configured in Daraja Portal

### Step 1: Get Daraja API Credentials

1. Log in to [Safaricom Daraja Portal](https://developer.safaricom.co.ke/)
2. Navigate to **My Apps** → **Create New App**
3. Fill in app details:
   - App Name: `RentFlow - [Your Business Name]`
   - Description: `Property management payment collection`
4. After creation, note down:
   - **Consumer Key**
   - **Consumer Secret**

### Step 2: Get Lipa Na M-Pesa Online Passkey

1. In Daraja Portal, navigate to your app
2. Go to **Lipa Na M-Pesa Online** → **Test Credentials**
3. Copy the **Passkey** (for sandbox) or request production passkey

### Step 3: Configure Callback URL

Register this callback URL in your Daraja Portal:

```
https://your-project-id.supabase.co/functions/v1/mpesa-callback?secret=YOUR_MPESA_CALLBACK_SECRET
```

**Important:** Replace `YOUR_MPESA_CALLBACK_SECRET` with a strong random secret (minimum 32 characters).

### Step 4: Set Environment Variables in Supabase

Go to Supabase Dashboard → Edge Functions → Secrets and add:

```bash
MPESA_CONSUMER_KEY=your_consumer_key_here
MPESA_CONSUMER_SECRET=your_consumer_secret_here
MPESA_PASSKEY=your_passkey_here
MPESA_SHORTCODE=174379  # or your business short code
MPESA_CALLBACK_SECRET=your_random_secret_here
MPESA_ENV=production  # or 'sandbox' for testing
```

### Step 5: Configure M-Pesa Settings in RentFlow

1. Log in to RentFlow as a Manager
2. Navigate to **Settings** → **Payment Settings**
3. Click **Configure M-Pesa**
4. Fill in:
   - **Short Code**: Your Paybill/Till number
   - **Environment**: Production or Sandbox
5. Click **Test Connection** to verify
6. Click **Save Settings**

### Step 6: Test M-Pesa Integration

**Sandbox Testing:**
1. Use sandbox credentials from Daraja Portal
2. Set `MPESA_ENV=sandbox`
3. Test with sandbox phone number: `254700000000`

**Production Testing:**
1. Switch to production credentials
2. Set `MPESA_ENV=production`
3. Test with your actual phone number
4. Verify STK Push appears on your phone
5. Complete payment and check RentFlow dashboard

---

## Stripe Integration

### Prerequisites

- Active Stripe account
- Stripe API keys (Publishable and Secret)
- Stripe Webhook Endpoint configured
- Business details verified in Stripe

### Step 1: Get Stripe API Keys

1. Log in to [Stripe Dashboard](https://dashboard.stripe.com/)
2. Navigate to **Developers** → **API Keys**
3. Note down:
   - **Publishable Key** (starts with `pk_`)
   - **Secret Key** (starts with `sk_`)

### Step 2: Configure Webhook Endpoint

1. In Stripe Dashboard, go to **Developers** → **Webhooks**
2. Click **Add Endpoint**
3. Set endpoint URL:
   ```
   https://your-project-id.supabase.co/functions/v1/stripe-webhook
   ```
4. Select events to listen for:
   - `invoice.payment_failed`
   - `charge.failed`
   - `charge.refunded`
   - `checkout.session.completed`
5. Copy the **Webhook Signing Secret** (starts with `whsec_`)

### Step 3: Set Environment Variables in Supabase

Go to Supabase Dashboard → Edge Functions → Secrets and add:

```bash
STRIPE_SECRET_KEY=sk_live_your_secret_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here
STRIPE_PUBLISHABLE_KEY=pk_live_your_publishable_key_here
```

### Step 4: Configure Stripe in RentFlow

1. Log in to RentFlow as a Manager
2. Navigate to **Settings** → **Payment Settings**
3. Click **Configure Stripe**
4. Fill in:
   - **Publishable Key**: Your Stripe publishable key
   - **Currency**: KES (or your preferred currency)
5. Click **Test Connection** to verify
6. Click **Save Settings**

### Step 5: Test Stripe Integration

**Test Mode:**
1. Use Stripe test keys (starts with `pk_test_` and `sk_test_`)
2. Use Stripe test card numbers:
   - Success: `4242 4242 4242 4242`
   - Failure: `4000 0000 0000 0002`
3. Complete test checkout flow

**Production:**
1. Switch to live keys
2. Test with real payment method
3. Verify payment appears in RentFlow dashboard

---

## Bank Webhook Integration

### Prerequisites

- Bank account with webhook support
- Bank API credentials
- Webhook endpoint URL
- Bank-specific integration documentation

### Step 1: Get Bank Webhook Credentials

Contact your bank to obtain:
- **Webhook URL**: Where to send payment notifications
- **API Key/Secret**: For webhook authentication
- **Required Payload Format**: JSON structure expected

### Step 2: Configure Bank Webhook in Supabase

Go to Supabase Dashboard → Edge Functions → Secrets and add:

```bash
BANK_WEBHOOK_SECRET=your_bank_webhook_secret_here
BANK_API_KEY=your_bank_api_key_here
```

### Step 3: Register Webhook with Bank

Provide your bank with:
```
https://your-project-id.supabase.co/functions/v1/bank-webhook
```

**Authentication Method:**
- Header: `X-Webhook-Secret: YOUR_BANK_WEBHOOK_SECRET`
- Or URL parameter: `?secret=YOUR_BANK_WEBHOOK_SECRET` (legacy)

### Step 4: Configure Bank Integration in RentFlow

1. Log in to RentFlow as a Manager
2. Navigate to **Settings** → **Payment Settings**
3. Click **Configure Bank Webhook**
4. Fill in:
   - **Bank Name**: Your bank name
   - **Account Number**: Your bank account number
   - **Webhook Secret**: The secret you configured
5. Click **Test Connection** to verify
6. Click **Save Settings**

### Step 5: Test Bank Webhook

1. Initiate a test payment through your bank
2. Verify webhook is received in RentFlow
3. Check payment appears in dashboard
4. Verify receipt is generated

---

## Payment Setup Wizard

RentFlow includes a guided payment setup wizard that walks you through configuring payment methods.

### Accessing the Wizard

1. Log in as a Manager
2. Navigate to **Settings** → **Payment Settings**
3. Click **Start Payment Setup Wizard**

### Wizard Steps

**Step 1: Choose Payment Methods**
- Select which payment methods to enable:
  - M-Pesa (STK Push)
  - M-Pesa (Till Number)
  - Stripe
  - Bank Webhook
  - Cash/Manual Recording

**Step 2: Configure Selected Methods**
- For each selected method, fill in required credentials
- Use **Test Connection** to verify each configuration
- Wizard validates credentials before proceeding

**Step 3: Set Payment Rules**
- Configure default payment allocation rules:
  - Oldest invoice first
  - Specific invoice allocation
  - Credit balance handling
- Set receipt notification preferences

**Step 4: Test Payment Flow**
- Run a test payment through each configured method
- Verify payment appears in dashboard
- Confirm receipt generation

**Step 5: Go Live**
- Switch from test to production mode
- Finalize configuration
- Enable payment methods for tenants

---

## Testing Payment Integrations

### M-Pesa Testing Checklist

- [ ] Sandbox credentials configured
- [ ] Callback URL registered in Daraja Portal
- [ ] STK Push test successful
- [ ] Payment callback received
- [ ] Invoice marked as paid
- [ ] Receipt generated
- [ ] Tenant notification sent

### Stripe Testing Checklist

- [ ] Test mode keys configured
- [ ] Webhook endpoint registered
- [ ] Test card payment successful
- [ ] Webhook received
- [ ] Invoice marked as paid
- [ ] Receipt generated
- [ ] Tenant notification sent

### Bank Webhook Testing Checklist

- [ ] Bank webhook configured
- [ ] Authentication working
- [ ] Test payment received
- [ ] Payment recorded correctly
- [ ] Receipt generated
- [ ] Tenant notification sent

### End-to-End Testing

1. Create a test invoice
2. Initiate payment through configured method
3. Verify payment completion
4. Check invoice status updated
5. Confirm receipt generation
6. Verify tenant notification
7. Check payment history

---

## Troubleshooting

### M-Pesa Issues

**STK Push Not Triggered**
- Verify Consumer Key and Secret are correct
- Check MPESA_ENV matches your credentials
- Ensure Short Code is valid
- Check Supabase Edge Function logs

**Callback Not Received**
- Verify Callback URL is registered in Daraja Portal
- Check MPESA_CALLBACK_SECRET matches
- Ensure Supabase Edge Function is deployed
- Check Supabase logs for errors

**Payment Not Recorded**
- Verify process-payment function is working
- Check webhook_dead_letter table for failed callbacks
- Verify tenant and invoice exist
- Check Supabase logs for errors

### Stripe Issues

**Checkout Not Loading**
- Verify Stripe keys are correct
- Check Stripe account is active
- Ensure Publishable Key is for correct environment
- Check browser console for errors

**Webhook Not Received**
- Verify Webhook Secret is correct
- Check webhook endpoint is registered
- Ensure Stripe can reach Supabase
- Check Supabase logs for errors

**Payment Not Recorded**
- Verify Stripe webhook events are selected
- Check stripe_processed_events table
- Verify invoice exists
- Check Supabase logs for errors

### Bank Webhook Issues

**Webhook Not Received**
- Verify webhook URL is registered with bank
- Check authentication secret matches
- Ensure bank can reach Supabase
- Check Supabase logs for errors

**Authentication Failed**
- Verify BANK_WEBHOOK_SECRET is correct
- Check bank uses correct header or URL parameter
- Ensure secret is not URL-encoded incorrectly
- Check Supabase logs for errors

### General Issues

**Payment Stuck in Pending**
- Check webhook_dead_letter table
- Check notification_failures table
- Verify rate limits not exceeded
- Check Supabase Edge Function logs

**Receipt Not Generated**
- Verify tenant email is valid
- Check email service (Resend/SendGrid) is configured
- Check notification_failures table
- Verify auto-send-receipt function is working

**Tenant Not Notified**
- Verify tenant phone number is valid
- Check SMS service (Africa's Talking) is configured
- Check notification_failures table
- Verify notification functions are deployed

---

## Security Best Practices

1. **Never commit secrets to git**
   - Always use environment variables
   - Rotate secrets regularly
   - Use different secrets for production and staging

2. **Use strong callback secrets**
   - Minimum 32 characters
   - Include letters, numbers, and special characters
   - Generate using cryptographically secure random generator

3. **Monitor webhook failures**
   - Check webhook_dead_letter table regularly
   - Set up alerts for failed webhooks
   - Replay failed webhooks after fixing issues

4. **Test in sandbox first**
   - Always test with sandbox credentials
   - Verify end-to-end flow
   - Only switch to production after successful testing

5. **Keep credentials updated**
   - Rotate API keys quarterly
   - Update callback secrets if compromised
   - Monitor for unusual activity

---

## Support

For issues with payment integrations:

1. Check this guide first
2. Review Supabase Edge Function logs
3. Check webhook_dead_letter and notification_failures tables
4. Consult bank/payment provider documentation
5. Contact RentFlow support with error details

---

**Last Updated:** May 23, 2026  
**Version:** 1.0.0
