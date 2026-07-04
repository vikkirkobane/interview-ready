# Paystack Payment Integration Guide

**Version:** 3.0.0  
**Date:** July 1, 2026  
**Status:** ✅ Implementation Complete - USD Primary, Kenya M-Pesa Secondary

---

## Table of Contents

1. [Overview](#overview)
2. [Features](#features)
3. [Payment Structure](#payment-structure)
4. [Architecture](#architecture)
5. [Setup Instructions](#setup-instructions)
6. [Database Schema](#database-schema)
7. [API Endpoints](#api-endpoints)
8. [Mobile App Integration](#mobile-app-integration)
9. [Testing Guide](#testing-guide)
10. [Deployment](#deployment)
11. [Webhook Configuration](#webhook-configuration)
12. [Troubleshooting](#troubleshooting)

---

## Overview

Interview Ready uses **Paystack** as the payment provider with a dual-market approach:

### 🌍 Primary Market: International (USD)
- **Card payments** (Visa, Mastercard, Amex)
- **Bank transfers**
- Pricing in **USD** (US Dollars)
- Default payment option for all users

### 🇰🇪 Secondary Market: Kenya (M-Pesa)
- **M-Pesa** (Mobile Money) - Primary for Kenyan users
- Card payments (Visa, Mastercard)
- Bank transfers
- Pricing in **KES** (Kenyan Shillings)
- Optional for users who prefer M-Pesa

---

## Features

### International Payments (Primary)

**Card & Bank Payments:**
- ✅ Visa, Mastercard, American Express
- ✅ Bank transfers (ACH, Wire)
- ✅ Secure 3D Secure authentication
- ✅ Instant payment confirmation
- ✅ Global currency support (USD)

### M-Pesa Integration (Secondary - Kenya Only)

**Seamless M-Pesa payments powered by Paystack:**

1. User selects "Kenya (M-Pesa)" payment mode
2. Chooses M-Pesa as payment method
3. Enters M-Pesa phone number (254XXXXXXXXX)
4. Receives STK push notification on phone
5. Enters M-Pesa PIN to complete payment
6. Instant confirmation and subscription activation

**M-Pesa Benefits:**
- ✅ Instant payments
- ✅ No card required
- ✅ Secure and trusted
- ✅ No additional fees
- ✅ Works with all Kenyan mobile networks

**M-Pesa Limits:**
- Minimum: KES 10
- Maximum: KES 150,000 per transaction

### Subscription Plans

#### 🌍 International Pricing (USD) - PRIMARY

| Plan | Monthly | Yearly | Features |
|------|---------|--------|----------|
| **Premium** | $5 | $50 | Unlimited AI credits, all templates, priority support |
| **Premium Plus** | $10 | $100 | Everything + priority queue, advanced analytics |

**Yearly plans save 2 months** (16.7% discount)

#### 🇰🇪 Kenya Pricing (KES) - SECONDARY (M-Pesa)

| Plan | Monthly | Yearly | Features |
|------|---------|--------|----------|
| **Premium** | KES 500 | KES 5,000 | Unlimited AI credits, all templates, priority support |
| **Premium Plus** | KES 3,000 | KES 30,000 | Everything + priority queue, advanced analytics |

**Exchange Rate:** ~KES 150 = $1 USD (approximate)

---

## Payment Structure

### Default Payment Mode: Kenya

The app defaults to Kenya with M-Pesa and Card payment options. Users can select any country from a comprehensive list.

### Country Selection Flow

1. User opens pricing screen (defaults to Kenya)
2. Can select their country from a searchable list of 50+ countries
3. Kenya users see pricing in KES with M-Pesa + Card options
4. All other countries see pricing in USD with Card payment only
5. Selects a plan and proceeds to payment
6. Paystack automatically shows relevant payment options based on country

### Payment Method Routing

```typescript
// Kenya - M-Pesa & Card
currency: 'KES'
channels: ['mobile_money', 'card']
countryCode: 'KE'

// All Other Countries - Card Only
currency: 'USD'
channels: ['card']
countryCode: null
```

---

## Architecture

```
Mobile App (Expo)
    │
    ├─→ Defaults to International (USD)
    │
    ├─→ POST /payments-initialize
    │   └─→ Returns Paystack payment URL
    │       ├─→ USD: Card/Bank channels
    │       └─→ KES: M-Pesa/Card/Bank channels
    │
    ├─→ User completes payment
    │   ├─→ International: Card or Bank
    │   └─→ Kenya: M-Pesa, Card, or Bank
    │
    ├─→ Redirect to app://payment/callback
    │
    ├─→ POST /payments-verify
    │   └─→ Verifies payment & creates subscription
    │
    └─→ Paystack Webhook
        └─→ POST /payments-webhook
            └─→ Handles subscription events
```

---

## Setup Instructions

### 1. Get Paystack API Keys

1. Sign up at [https://paystack.com](https://paystack.com)
2. Navigate to **Settings → API Keys & Webhooks**
3. Copy your **Test Secret Key** (starts with `sk_test_`)
4. Copy your **Test Public Key** (starts with `pk_test_`)

**Note:** Paystack supports both USD and KES with the same API keys.

### 2. Configure Environment Variables

Create a `.env.local` file in the project root:

```bash
# Paystack Keys
PAYSTACK_SECRET_KEY=sk_test_your_secret_key_here
PAYSTACK_PUBLIC_KEY=pk_test_your_public_key_here

# App Configuration
APP_URL=interviewready://

# Supabase (if not already configured)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Expo Public Variables
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 3. Run Database Migrations

```bash
# Link to your Supabase project
npx supabase link --project-ref your-project-ref

# Run both migrations
npx supabase db push

# Or apply manually via Supabase Dashboard → SQL Editor
# 1. Copy contents of: supabase/migrations/003_add_paystack_support.sql
# 2. Copy contents of: supabase/migrations/004_add_kenya_pricing.sql
# 3. Execute both SQL scripts
```

### 4. Deploy Edge Functions

```bash
# Set environment variables in Supabase
npx supabase secrets set PAYSTACK_SECRET_KEY=sk_test_xxx
npx supabase secrets set PAYSTACK_PUBLIC_KEY=pk_test_xxx
npx supabase secrets set APP_URL=interviewready://

# Deploy functions
npx supabase functions deploy payments-initialize
npx supabase functions deploy payments-verify
npx supabase functions deploy payments-webhook
```

### 5. Verify Plans in Database

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

Expected output:
- 4 plans in USD (International) - PRIMARY
- 4 plans in KES (Kenya M-Pesa) - SECONDARY

---

## Database Schema

### New Tables

#### `payment_transactions`
Stores all payment records with payment method tracking.

```sql
CREATE TABLE payment_transactions (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  subscription_id UUID REFERENCES subscriptions(id),
  reference TEXT UNIQUE NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  currency TEXT DEFAULT 'USD', -- USD for international, KES for Kenya
  country_code TEXT, -- NULL for international, 'KE' for Kenya
  payment_method TEXT DEFAULT 'card', -- 'card', 'bank', 'mobile_money'
  status TEXT CHECK (status IN ('pending', 'success', 'failed', 'abandoned')),
  payment_provider TEXT CHECK (payment_provider IN ('stripe', 'paystack')),
  provider_reference TEXT,
  metadata JSONB,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### `paystack_plans`
Stores plans for multiple currencies.

```sql
CREATE TABLE paystack_plans (
  id UUID PRIMARY KEY,
  plan_code TEXT UNIQUE NOT NULL,
  plan_type plan_enum NOT NULL,
  name TEXT NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  currency TEXT DEFAULT 'USD', -- USD or KES
  interval billing_interval_enum NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE
);
```

**Plan Codes:**
- International (Primary): `PLN_premium_monthly`, `PLN_premium_yearly`, etc.
- Kenya M-Pesa (Secondary): `PLN_premium_monthly_kes`, `PLN_premium_yearly_kes`, etc.

---

## API Endpoints

### 1. Initialize Payment

**Endpoint:** `POST /payments-initialize`

**Request (International - Default):**
```json
{
  "planCode": "PLN_premium_monthly",
  "callbackUrl": "interviewready://payment/callback",
  "countryCode": null
}
```

**Request (Kenya M-Pesa):**
```json
{
  "planCode": "PLN_premium_monthly_kes",
  "callbackUrl": "interviewready://payment/callback",
  "countryCode": "KE"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "authorization_url": "https://checkout.paystack.com/xxx",
    "access_code": "xxx",
    "reference": "IR_1234567890_abc",
    "amount": 10,
    "currency": "USD",
    "country": "INTERNATIONAL",
    "plan": {
      "code": "PLN_premium_monthly",
      "name": "Premium",
      "type": "PREMIUM",
      "interval": "MONTHLY"
    }
  }
}
```

### 2. Verify Payment

**Endpoint:** `POST /payments-verify`

**Request:**
```json
{
  "reference": "IR_1234567890_abc"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "status": "success",
    "reference": "IR_1234567890_abc",
    "amount": 10,
    "currency": "USD",
    "paid_at": "2026-07-01T12:00:00Z",
    "gateway_response": "Successful",
    "channel": "card"
  }
}
```

---

## Mobile App Integration

### Default to International (USD)

The pricing screen defaults to international USD payments:

```typescript
// Default to USD (international) as primary payment mode
const [selectedMode, setSelectedMode] = useState<'USD' | 'KES'>('USD');
```

### Payment Mode Selection UI

Users can switch between International and Kenya M-Pesa:

```typescript
const PAYMENT_MODES: PaymentModeConfig[] = [
  {
    code: 'USD',
    name: 'International',
    currency: 'USD',
    flag: '🌍',
    paymentMethods: ['Card', 'Bank Transfer'],
    description: 'Pay with card or bank transfer',
  },
  {
    code: 'KES',
    name: 'Kenya (M-Pesa)',
    currency: 'KES',
    flag: '🇰🇪',
    paymentMethods: ['M-Pesa', 'Card', 'Bank Transfer'],
    description: 'Pay with M-Pesa, card, or bank',
  },
];
```

---

## Testing Guide

### Test Mode Setup

1. Use test API keys (starting with `sk_test_` and `pk_test_`)
2. Use Paystack test credentials:

#### International Card Test (PRIMARY)

| Card Number | CVV | Expiry | Result |
|-------------|-----|--------|--------|
| 4084084084084081 | 408 | Any future | Success |
| 5060666666666666666 | 123 | Any future | Success |

**Card Test Flow:**
1. App defaults to International (USD)
2. Select a plan
3. Choose card payment method
4. Enter test card details
5. Complete 3D Secure (if prompted)
6. Payment completes

#### Kenya M-Pesa Test (SECONDARY)

| Phone Number | Result |
|--------------|--------|
| 254708374149 | Success |
| 254708374150 | Failed |

**M-Pesa Test Flow:**
1. Switch to "Kenya (M-Pesa)" mode
2. Select a plan
3. Choose M-Pesa payment method
4. Enter test phone number: 254708374149
5. Paystack simulates STK push
6. Payment completes automatically in test mode

### Testing Checklist

- [ ] Test card payment (USD) - PRIMARY
- [ ] Test bank transfer (USD)
- [ ] Test M-Pesa payment (KES) - SECONDARY
- [ ] Test card payment (KES)
- [ ] Verify subscription creation
- [ ] Test webhook events
- [ ] Verify correct currency stored (USD/KES)
- [ ] Test payment mode switching in UI

---

## Deployment

### Production Checklist

- [ ] Switch to live API keys (`sk_live_` and `pk_live_`)
- [ ] Update environment variables in Supabase
- [ ] Deploy edge functions to production
- [ ] Configure webhook URL on Paystack dashboard
- [ ] **Test with real card payment (USD $1)** - PRIORITY
- [ ] Test with real M-Pesa payment (KES 50) - SECONDARY
- [ ] Monitor webhook events
- [ ] Set up error alerts (Sentry)

### Production Testing

```bash
# Test international payment first (primary)
# Use small amounts for initial tests
# Card minimum: $0.50
# Recommended test: $1.00

# Then test M-Pesa (secondary)
# M-Pesa minimum: KES 10
# Recommended test: KES 50
```

---

## Webhook Configuration

### Webhook URL

```
https://your-project.supabase.co/functions/v1/payments-webhook
```

### Events to Listen To

- ✅ charge.success
- ✅ subscription.create
- ✅ subscription.disable
- ✅ invoice.payment_failed
- ✅ invoice.update
- ✅ subscription.not_renew

**Note:** Webhook handles both USD and KES payments automatically.

---

## Troubleshooting

### International Payment Issues (PRIMARY)

#### 1. Card declined

**Error:** Payment failed with card

**Solution:**
- Verify card has sufficient funds
- Check if 3D Secure is enabled
- Try different card
- Contact card issuer

#### 2. Currency mismatch

**Error:** Wrong currency displayed

**Solution:**
```sql
-- Verify plan currency
SELECT plan_code, currency, amount 
FROM paystack_plans 
WHERE plan_code = 'YOUR_PLAN_CODE';

-- Check transaction currency
SELECT reference, currency, amount, country_code
FROM payment_transactions 
WHERE reference = 'YOUR_REFERENCE';
```

### M-Pesa Specific Issues (SECONDARY)

#### 1. M-Pesa not showing as payment option

**Solution:**
- Verify payment mode is set to 'KES'
- Check that `mobile_money` is in channels array
- Ensure Paystack account has M-Pesa enabled

#### 2. M-Pesa payment timeout

**Error:** User doesn't receive STK push

**Solution:**
- Verify phone number format: 254XXXXXXXXX (no +)
- Check phone has M-Pesa registered
- Ensure phone has network coverage
- Try again after 1 minute

### General Issues

#### Payment initialization fails

```bash
# Verify environment variables
npx supabase secrets list

# Check USD plans exist (primary)
SELECT * FROM paystack_plans WHERE currency = 'USD';

# Check KES plans exist (secondary)
SELECT * FROM paystack_plans WHERE currency = 'KES';
```

#### Payment mode not persisting

```sql
-- Check payment method in transaction
SELECT reference, payment_method, currency, country_code
FROM payment_transactions 
WHERE user_id = 'YOUR_USER_ID'
ORDER BY created_at DESC;
```

---

## Support

### Resources

- **Paystack Documentation:** https://paystack.com/docs
- **M-Pesa Integration:** https://paystack.com/docs/payments/mobile-money
- **Paystack Support:** support@paystack.com
- **Interview Ready Support:** support@interviewready.app

### Payment-Specific Support

- **International (Primary):** support@interviewready.app
- **Kenya M-Pesa (Secondary):** +254 709 983 000

---

## Changelog

### Version 3.0.0 (July 1, 2026)
- ✅ USD set as primary payment method (international)
- ✅ Card and bank transfers as primary payment options
- ✅ Kenya M-Pesa as secondary payment option
- ✅ App defaults to international USD pricing
- ✅ Added payment mode selector (USD/KES)
- ✅ Updated payment initialization with mode routing
- ✅ Added payment method tracking in transactions

### Version 2.0.0 (July 1, 2026)
- ✅ Kenya set as primary market
- ✅ M-Pesa integration optimized for Kenya
- ✅ Added multi-country support

### Version 1.0.0 (July 1, 2026)
- ✅ Initial Paystack integration
- ✅ Card, Bank Transfer, USSD payments

---

**Last Updated:** July 1, 2026  
**Status:** ✅ Production Ready - USD Primary, Kenya M-Pesa Secondary