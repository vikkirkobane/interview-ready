# Payment Setup Guide - Interview Ready

**Version:** 1.0.0  
**Date:** July 4, 2026  
**Status:** ✅ Fully Implemented

---

## Overview

Interview Ready uses **Paystack** for payment processing with:
- **Primary Market:** International (USD) - Card & Bank payments
- **Secondary Market:** Kenya (KES) - M-Pesa + Card payments

---

## Payment Functionality Status

### ✅ Fully Implemented Features

1. **Database Schema** (`003_add_paystack_support.sql`, `004_add_kenya_pricing.sql`)
   - Payment transactions table
   - Paystack plans table
   - Subscription management functions
   - RLS policies

2. **Edge Functions**
   - `payments-initialize` - Initialize payment with Paystack
   - `payments-verify` - Verify payment status
   - `payments-webhook` - Handle Paystack webhooks

3. **Frontend Integration** (`app/(tabs)/pricing.tsx`)
   - Country selector (50+ countries)
   - Dynamic pricing display (USD/KES)
   - Payment method routing (Card for international, M-Pesa+Card for Kenya)
   - Payment flow handling

4. **Pricing Structure**
   - **Premium:** $5/month, $50/year (KES 500/month, KES 5,000/year for Kenya)
   - **Premium Plus:** $10/month, $100/year (KES 1,000/month, KES 10,000/year for Kenya)

---

## Where to Configure API Keys

### Option 1: Supabase Secrets (Recommended for Production)

**Step 1: Get Paystack API Keys**
1. Go to [https://dashboard.paystack.com](https://dashboard.paystack.com)
2. Navigate to **Settings → API Keys & Webhooks**
3. Copy your keys:
   - **Test Mode:** `sk_test_...` and `pk_test_...`
   - **Live Mode:** `sk_live_...` and `pk_live_...`

**Step 2: Set Supabase Secrets**

```bash
# Navigate to your project directory
cd "C:\Users\victo\Desktop\Gemini Projects\interview-ready"

# Link to your Supabase project (if not already linked)
npx supabase link --project-ref YOUR_PROJECT_REF

# Set Paystack secrets (use test keys for development)
npx supabase secrets set PAYSTACK_SECRET_KEY=sk_test_your_secret_key_here
npx supabase secrets set PAYSTACK_PUBLIC_KEY=pk_test_your_public_key_here

# Set app callback URL
npx supabase secrets set APP_URL=interviewready://

# Verify secrets are set
npx supabase secrets list
```

**Expected Output:**
```
PAYSTACK_SECRET_KEY
PAYSTACK_PUBLIC_KEY
APP_URL
SUPABASE_URL
SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
```

### Option 2: Local Environment File (For Local Testing)

Create `.env.local` in project root:

```bash
# Paystack API Keys
PAYSTACK_SECRET_KEY=sk_test_your_secret_key_here
PAYSTACK_PUBLIC_KEY=pk_test_your_public_key_here

# App Configuration
APP_URL=interviewready://

# Supabase Configuration (already in .env)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

**Note:** `.env.local` is for local development only. Production uses Supabase secrets.

---

## How to Test Payment Functionality

### Prerequisites

1. **Database Migrations Applied**
   ```bash
   npx supabase db push --include-all
   ```

2. **Edge Functions Deployed**
   ```bash
   npx supabase functions deploy payments-initialize
   npx supabase functions deploy payments-verify
   npx supabase functions deploy payments-webhook
   ```

3. **API Keys Configured** (see above)

### Test 1: International Payment (USD - Card)

**Test Card Details:**
- Card Number: `4084084084084081`
- CVV: `408`
- Expiry: Any future date (e.g., `12/28`)
- PIN: `0000` (if prompted)

**Steps:**
1. Open app and navigate to Pricing screen
2. Verify "International" is selected by default
3. Verify USD pricing is displayed:
   - Premium: $5/month, $50/year
   - Premium Plus: $10/month, $100/year
4. Select a plan (e.g., Premium Monthly - $5)
5. Click "Subscribe" button
6. Enter test card details
7. Complete payment
8. Verify redirect to success screen
9. Check database for transaction

**Verify in Database:**
```sql
-- Check payment transaction
SELECT 
  reference,
  amount,
  currency,
  status,
  payment_method,
  created_at
FROM payment_transactions 
WHERE currency = 'USD' 
ORDER BY created_at DESC 
LIMIT 5;

-- Check subscription created
SELECT 
  id,
  user_id,
  plan,
  status,
  current_period_start,
  current_period_end
FROM subscriptions 
WHERE status = 'ACTIVE' 
ORDER BY created_at DESC 
LIMIT 5;
```

**Expected Results:**
- ✅ Payment status: `success`
- ✅ Currency: `USD`
- ✅ Payment method: `card`
- ✅ Subscription created with correct plan
- ✅ User's plan updated to Premium/Premium Plus

### Test 2: Kenya Payment (KES - M-Pesa)

**Test M-Pesa Details:**
- Phone Number: `254708374149` (Paystack test number)
- In test mode, payment auto-completes

**Steps:**
1. Open app and navigate to Pricing screen
2. Select "Kenya" from country selector
3. Verify KES pricing is displayed:
   - Premium: KES 500/month, KES 5,000/year
   - Premium Plus: KES 1,000/month, KES 10,000/year
4. Select a plan (e.g., Premium Monthly - KES 500)
5. Click "Subscribe" button
6. Choose "M-Pesa" payment method
7. Enter test phone number
8. Payment auto-completes in test mode
9. Verify redirect to success screen
10. Check database for transaction

**Verify in Database:**
```sql
-- Check payment transaction
SELECT 
  reference,
  amount,
  currency,
  status,
  payment_method,
  country_code,
  created_at
FROM payment_transactions 
WHERE currency = 'KES' 
ORDER BY created_at DESC 
LIMIT 5;

-- Check subscription created
SELECT 
  id,
  user_id,
  plan,
  status,
  current_period_start,
  current_period_end
FROM subscriptions 
WHERE status = 'ACTIVE' 
ORDER BY created_at DESC 
LIMIT 5;
```

**Expected Results:**
- ✅ Payment status: `success`
- ✅ Currency: `KES`
- ✅ Country code: `KE`
- ✅ Payment method: `mobile_money`
- ✅ Subscription created with correct plan
- ✅ User's plan updated to Premium/Premium Plus

---

## Payment Flow Architecture

### 1. User Selects Plan
```
User → Pricing Screen → Select Country → Select Plan → Click Subscribe
```

### 2. Payment Initialization
```
App → payments-initialize Edge Function → Paystack API → Returns authorization_url
```

**Request:**
```json
{
  "planCode": "PLN_premium_monthly",
  "callbackUrl": "interviewready://payment/callback",
  "countryCode": null  // or "KE" for Kenya
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "authorization_url": "https://checkout.paystack.com/...",
    "access_code": "...",
    "reference": "IR_1234567890_abc123"
  }
}
```

### 3. Payment Processing
```
User → Paystack Checkout → Enters Payment Details → Completes Payment
```

### 4. Payment Verification
```
App → payments-verify Edge Function → Paystack API → Verifies Payment
```

**Request:**
```json
{
  "reference": "IR_1234567890_abc123"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "status": "success",
    "amount": 500,
    "currency": "USD",
    "subscription_id": "uuid"
  }
}
```

### 5. Webhook Processing (Background)
```
Paystack → payments-webhook Edge Function → Updates Database
```

**Events Handled:**
- `charge.success` - Payment completed
- `subscription.create` - Subscription created
- `subscription.disable` - Subscription cancelled
- `invoice.payment_failed` - Payment failed

---

## Webhook Configuration

### Setup Webhook in Paystack Dashboard

1. Go to [https://dashboard.paystack.com/#/settings/developer](https://dashboard.paystack.com/#/settings/developer)
2. Scroll to **Webhook URL** section
3. Enter your webhook URL:
   ```
   https://YOUR_PROJECT_REF.supabase.co/functions/v1/payments-webhook
   ```
4. Enable these events:
   - ✅ `charge.success`
   - ✅ `subscription.create`
   - ✅ `subscription.disable`
   - ✅ `invoice.payment_failed`
   - ✅ `invoice.update`
   - ✅ `subscription.not_renew`
5. Click **Save Changes**

### Test Webhook

```bash
# Check webhook logs
npx supabase functions logs payments-webhook --tail
```

---

## Troubleshooting

### Issue: "Missing PAYSTACK_SECRET_KEY"

**Solution:**
```bash
# Verify secrets are set
npx supabase secrets list

# If missing, set them
npx supabase secrets set PAYSTACK_SECRET_KEY=sk_test_your_key_here
npx supabase secrets set PAYSTACK_PUBLIC_KEY=pk_test_your_key_here

# Redeploy functions
npx supabase functions deploy payments-initialize
npx supabase functions deploy payments-verify
npx supabase functions deploy payments-webhook
```

### Issue: Payment initialization fails

**Check:**
1. API keys are correct (test vs live)
2. Plan exists in database
3. Edge function logs for errors

```bash
# Check function logs
npx supabase functions logs payments-initialize --tail

# Verify plans exist
npx supabase db execute "SELECT * FROM paystack_plans WHERE is_active = true"
```

### Issue: Webhook not receiving events

**Check:**
1. Webhook URL is correct in Paystack dashboard
2. Events are enabled
3. Edge function is deployed

```bash
# Test webhook manually
curl -X POST https://YOUR_PROJECT_REF.supabase.co/functions/v1/payments-webhook \
  -H "Content-Type: application/json" \
  -d '{"event":"charge.success","data":{"reference":"test"}}'

# Check logs
npx supabase functions logs payments-webhook --tail
```

### Issue: M-Pesa payment not working

**Check:**
1. Using Kenya-specific plan (currency = KES)
2. Phone number format is correct (254XXXXXXXXX)
3. M-Pesa is enabled in Paystack account
4. Using test phone number in test mode

---

## Production Deployment

### Switch to Live Mode

1. **Get Live API Keys**
   - Go to Paystack Dashboard → Settings → API Keys
   - Copy Live Secret Key (`sk_live_...`)
   - Copy Live Public Key (`pk_live_...`)

2. **Update Supabase Secrets**
   ```bash
   npx supabase secrets set PAYSTACK_SECRET_KEY=sk_live_your_key_here
   npx supabase secrets set PAYSTACK_PUBLIC_KEY=pk_live_your_key_here
   ```

3. **Redeploy Edge Functions**
   ```bash
   npx supabase functions deploy payments-initialize
   npx supabase functions deploy payments-verify
   npx supabase functions deploy payments-webhook
   ```

4. **Update Webhook URL**
   - Update webhook URL in Paystack dashboard to production URL

5. **Test with Real Payments**
   - Test with small amounts ($1 USD or KES 50)
   - Verify subscriptions are created
   - Monitor webhook events

---

## Payment Files Reference

### Database Migrations
- `supabase/migrations/003_add_paystack_support.sql` - Payment tables and functions
- `supabase/migrations/004_add_kenya_pricing.sql` - Kenya pricing and payment methods

### Edge Functions
- `supabase/functions/payments-initialize/index.ts` - Initialize payment
- `supabase/functions/payments-verify/index.ts` - Verify payment
- `supabase/functions/payments-webhook/index.ts` - Handle webhooks
- `supabase/functions/_shared/paystack-client.ts` - Paystack API client

### Frontend
- `app/(tabs)/pricing.tsx` - Pricing screen with country selector
- `src/constants/countries.ts` - Country list with payment methods

### Documentation
- `docs/PAYSTACK_INTEGRATION.md` - Complete integration guide
- `docs/PAYSTACK_SETUP_CHECKLIST.md` - Step-by-step setup guide

---

## Quick Start Checklist

- [ ] Get Paystack API keys (test mode)
- [ ] Set Supabase secrets
- [ ] Run database migrations
- [ ] Deploy edge functions
- [ ] Configure webhook in Paystack
- [ ] Test USD payment with test card
- [ ] Test KES payment with test M-Pesa
- [ ] Verify subscriptions created
- [ ] Check webhook events received

---

## Support

- **Paystack Docs:** https://paystack.com/docs
- **Paystack Support:** support@paystack.com
- **Interview Ready Support:** support@interviewready.app

---

**Status:** ✅ Payment System Fully Functional  
**Last Updated:** July 4, 2026
