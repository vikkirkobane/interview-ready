# Paystack Setup Checklist

**Version:** 3.0.0  
**Date:** July 1, 2026  
**Payment Structure:** USD Primary (Card/Bank) + Kenya M-Pesa Secondary

---

## Overview

This checklist guides you through setting up Paystack payment integration for Interview Ready with:
- **Primary:** International USD payments (Card & Bank)
- **Secondary:** Kenya M-Pesa payments (KES)

**Estimated Time:** 30-45 minutes

---

## Prerequisites

- [ ] Supabase project set up and running
- [ ] Expo/React Native app configured
- [ ] Access to Supabase dashboard
- [ ] Access to deploy Supabase Edge Functions

---

## Step 1: Paystack Account Setup (10 min)

### 1.1 Create Paystack Account
- [ ] Go to [https://paystack.com](https://paystack.com)
- [ ] Sign up for a new account
- [ ] Verify your email address
- [ ] Complete business profile (optional for test mode)

### 1.2 Get API Keys
- [ ] Log in to Paystack dashboard
- [ ] Navigate to **Settings → API Keys & Webhooks**
- [ ] Copy **Test Secret Key** (starts with `sk_test_`)
- [ ] Copy **Test Public Key** (starts with `pk_test_`)
- [ ] Save keys securely (you'll need them in Step 3)

**Note:** Test keys work for both USD and KES currencies.

---

## Step 2: Database Setup (5 min)

### 2.1 Run Migrations

**Option A: Using Supabase CLI (Recommended)**
```bash
# Link to your project
npx supabase link --project-ref your-project-ref

# Push migrations
npx supabase db push
```

**Option B: Manual via Dashboard**
1. [ ] Open Supabase Dashboard → SQL Editor
2. [ ] Copy contents of `supabase/migrations/003_add_paystack_support.sql`
3. [ ] Execute the SQL
4. [ ] Copy contents of `supabase/migrations/004_add_kenya_pricing.sql`
5. [ ] Execute the SQL

### 2.2 Verify Database Setup
```sql
-- Check USD plans (primary)
SELECT plan_code, name, amount, currency, interval 
FROM paystack_plans 
WHERE currency = 'USD' AND is_active = true
ORDER BY amount;

-- Check KES plans (secondary - M-Pesa)
SELECT plan_code, name, amount, currency, interval 
FROM paystack_plans 
WHERE currency = 'KES' AND is_active = true
ORDER BY amount;
```

**Expected Results:**
- [ ] 4 USD plans visible (Premium & Premium Plus, Monthly & Yearly)
- [ ] 4 KES plans visible (Premium & Premium Plus, Monthly & Yearly)
- [ ] All plans have `is_active = true`

---

## Step 3: Environment Configuration (5 min)

### 3.1 Set Supabase Secrets

```bash
# Set Paystack keys
npx supabase secrets set PAYSTACK_SECRET_KEY=sk_test_your_key_here
npx supabase secrets set PAYSTACK_PUBLIC_KEY=pk_test_your_key_here

# Set app URL
npx supabase secrets set APP_URL=interviewready://
```

### 3.2 Verify Secrets
```bash
npx supabase secrets list
```

**Expected Output:**
- [ ] `PAYSTACK_SECRET_KEY` is set
- [ ] `PAYSTACK_PUBLIC_KEY` is set
- [ ] `APP_URL` is set

### 3.3 Update Local Environment (Optional)

Create `.env.local` in project root:
```bash
PAYSTACK_SECRET_KEY=sk_test_your_key_here
PAYSTACK_PUBLIC_KEY=pk_test_your_key_here
APP_URL=interviewready://
```

---

## Step 4: Deploy Edge Functions (5 min)

### 4.1 Deploy Functions

```bash
# Deploy payment initialization
npx supabase functions deploy payments-initialize

# Deploy payment verification
npx supabase functions deploy payments-verify

# Deploy webhook handler
npx supabase functions deploy payments-webhook
```

### 4.2 Verify Deployment
- [ ] Check Supabase Dashboard → Edge Functions
- [ ] Confirm all 3 functions are deployed
- [ ] Check function logs for any errors

**Function URLs:**
```
https://your-project.supabase.co/functions/v1/payments-initialize
https://your-project.supabase.co/functions/v1/payments-verify
https://your-project.supabase.co/functions/v1/payments-webhook
```

---

## Step 5: Configure Webhook (5 min)

### 5.1 Set Up Webhook in Paystack

1. [ ] Go to Paystack Dashboard → Settings → API Keys & Webhooks
2. [ ] Scroll to **Webhook URL** section
3. [ ] Enter webhook URL:
   ```
   https://your-project.supabase.co/functions/v1/payments-webhook
   ```
4. [ ] Click **Save Changes**

### 5.2 Select Events

Enable these webhook events:
- [ ] `charge.success`
- [ ] `subscription.create`
- [ ] `subscription.disable`
- [ ] `invoice.payment_failed`
- [ ] `invoice.update`
- [ ] `subscription.not_renew`

### 5.3 Test Webhook (Optional)

- [ ] Click **Test Webhook** in Paystack dashboard
- [ ] Check Supabase Edge Function logs
- [ ] Verify webhook received successfully

---

## Step 6: Test International Payments (USD) - PRIMARY (10 min)

### 6.1 Test Card Payment

1. [ ] Open app and navigate to pricing screen
2. [ ] Verify "International" mode is selected by default
3. [ ] Verify USD pricing is displayed
4. [ ] Select a plan (e.g., Premium Monthly - $5)
5. [ ] Click subscribe
6. [ ] Use test card: `4084084084084081`
7. [ ] CVV: `408`, Expiry: Any future date
8. [ ] Complete payment
9. [ ] Verify redirect to callback screen
10. [ ] Check subscription created in database

**Verify in Database:**
```sql
SELECT * FROM payment_transactions 
WHERE currency = 'USD' 
ORDER BY created_at DESC 
LIMIT 5;

SELECT * FROM subscriptions 
WHERE status = 'ACTIVE' 
ORDER BY created_at DESC 
LIMIT 5;
```

### 6.2 Expected Results
- [ ] Payment status: `success`
- [ ] Currency: `USD`
- [ ] Payment method: `card`
- [ ] Subscription created with correct plan
- [ ] User can access premium features

---

## Step 7: Test Kenya M-Pesa Payments (KES) - SECONDARY (10 min)

### 7.1 Test M-Pesa Payment

1. [ ] Open app and navigate to pricing screen
2. [ ] Switch to "Kenya (M-Pesa)" mode
3. [ ] Verify KES pricing is displayed
4. [ ] Select a plan (e.g., Premium Monthly - KES 1,500)
5. [ ] Click subscribe
6. [ ] Choose M-Pesa payment method
7. [ ] Use test phone: `254708374149`
8. [ ] Paystack simulates STK push (auto-completes in test mode)
9. [ ] Verify redirect to callback screen
10. [ ] Check subscription created in database

**Verify in Database:**
```sql
SELECT * FROM payment_transactions 
WHERE currency = 'KES' 
ORDER BY created_at DESC 
LIMIT 5;

SELECT * FROM subscriptions 
WHERE status = 'ACTIVE' 
ORDER BY created_at DESC 
LIMIT 5;
```

### 7.2 Expected Results
- [ ] Payment status: `success`
- [ ] Currency: `KES`
- [ ] Country code: `KE`
- [ ] Payment method: `mobile_money`
- [ ] Subscription created with correct plan
- [ ] User can access premium features

---

## Step 8: Production Deployment (When Ready)

### 8.1 Switch to Live Keys

1. [ ] Get live API keys from Paystack dashboard
   - Live Secret Key (starts with `sk_live_`)
   - Live Public Key (starts with `pk_live_`)

2. [ ] Update Supabase secrets:
```bash
npx supabase secrets set PAYSTACK_SECRET_KEY=sk_live_your_key_here
npx supabase secrets set PAYSTACK_PUBLIC_KEY=pk_live_your_key_here
```

3. [ ] Redeploy edge functions:
```bash
npx supabase functions deploy payments-initialize
npx supabase functions deploy payments-verify
npx supabase functions deploy payments-webhook
```

### 8.2 Production Testing

**Test International Payment (PRIMARY):**
- [ ] Use real card with small amount ($1)
- [ ] Verify payment completes
- [ ] Check subscription created
- [ ] Verify webhook received

**Test M-Pesa Payment (SECONDARY):**
- [ ] Use real M-Pesa number with small amount (KES 50)
- [ ] Complete STK push on phone
- [ ] Verify payment completes
- [ ] Check subscription created
- [ ] Verify webhook received

### 8.3 Monitoring Setup

- [ ] Set up error monitoring (e.g., Sentry)
- [ ] Configure payment alerts
- [ ] Monitor webhook delivery
- [ ] Set up daily payment reports

---

## Troubleshooting

### Common Issues

#### Payment initialization fails
```bash
# Check secrets are set
npx supabase secrets list

# Check function logs
npx supabase functions logs payments-initialize

# Verify plans exist
SELECT * FROM paystack_plans WHERE is_active = true;
```

#### Webhook not receiving events
- [ ] Verify webhook URL is correct in Paystack dashboard
- [ ] Check edge function logs for errors
- [ ] Test webhook manually from Paystack dashboard
- [ ] Verify events are enabled

#### M-Pesa payment not working
- [ ] Verify payment mode is set to 'KES'
- [ ] Check phone number format (254XXXXXXXXX)
- [ ] Ensure M-Pesa is enabled in Paystack account
- [ ] Check if using test phone number in test mode

#### Currency mismatch
```sql
-- Check plan currency
SELECT plan_code, currency, amount FROM paystack_plans;

-- Check transaction currency
SELECT reference, currency, amount, country_code 
FROM payment_transactions 
ORDER BY created_at DESC;
```

---

## Support Resources

- **Paystack Docs:** https://paystack.com/docs
- **M-Pesa Integration:** https://paystack.com/docs/payments/mobile-money
- **Paystack Support:** support@paystack.com
- **Interview Ready Support:** support@interviewready.app

---

## Completion Checklist

### Test Mode (Development)
- [ ] Paystack account created
- [ ] Test API keys obtained
- [ ] Database migrations run successfully
- [ ] Environment variables configured
- [ ] Edge functions deployed
- [ ] Webhook configured
- [ ] USD card payment tested (PRIMARY)
- [ ] KES M-Pesa payment tested (SECONDARY)
- [ ] Subscriptions created successfully
- [ ] Webhook events received

### Production Mode (When Ready)
- [ ] Live API keys obtained
- [ ] Production secrets updated
- [ ] Functions redeployed with live keys
- [ ] Real USD payment tested ($1)
- [ ] Real KES M-Pesa payment tested (KES 50)
- [ ] Monitoring and alerts configured
- [ ] Error tracking set up
- [ ] Payment reports configured

---

**Status:** ✅ Setup Complete  
**Payment Structure:** USD Primary (Card/Bank) + Kenya M-Pesa Secondary  
**Last Updated:** July 1, 2026
