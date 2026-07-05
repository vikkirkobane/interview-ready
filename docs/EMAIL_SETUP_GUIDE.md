# Email System Setup Guide - Quick Start

**Version:** 1.0.0  
**Date:** July 4, 2026  
**Estimated Time:** 15 minutes

---

## Overview

This guide will help you set up the complete email system for Interview Ready, including:
- ✅ Transactional emails (payments, subscriptions, referrals)
- ✅ Email verification for authentication
- ✅ Professional email templates
- ✅ Email tracking and logging

---

## Prerequisites

- [ ] Supabase project set up
- [ ] App deployed or in development
- [ ] Access to Supabase dashboard

---

## Step 1: Get Resend API Key (5 min)

### 1.1 Sign Up for Resend

1. Go to [https://resend.com](https://resend.com)
2. Click **Sign Up** (free tier: 100 emails/day)
3. Verify your email address
4. Complete onboarding

### 1.2 Get API Key

1. In Resend dashboard, go to **API Keys**
2. Click **Create API Key**
3. Name it: `Interview Ready Production`
4. Copy the key (starts with `re_`)
5. **Save it securely** - you'll need it in Step 2

### 1.3 Add Domain (Optional but Recommended)

**Without Domain (Quick Start):**
- Use sender: `onboarding@resend.dev`
- Limited to 100 emails/day
- May go to spam

**With Domain (Production):**
1. Go to **Domains** in Resend dashboard
2. Click **Add Domain**
3. Enter your domain: `interviewready.app`
4. Add DNS records as shown:
   ```
   Type: TXT
   Name: @
   Value: [provided by Resend]
   
   Type: TXT
   Name: resend._domainkey
   Value: [provided by Resend]
   ```
5. Wait for verification (5-30 minutes)
6. Use sender: `noreply@interviewready.app`

---

## Step 2: Configure Supabase Secrets (2 min)

```bash
# Navigate to project directory
cd "C:\Users\victo\Desktop\Gemini Projects\interview-ready"

# Set Resend API key
npx supabase secrets set RESEND_API_KEY=re_your_api_key_here

# Set sender email
# Without domain (quick start):
npx supabase secrets set RESEND_FROM_EMAIL="Interview Ready <onboarding@resend.dev>"

# With domain (production):
npx supabase secrets set RESEND_FROM_EMAIL="Interview Ready <noreply@interviewready.app>"

# Verify secrets are set
npx supabase secrets list
```

**Expected Output:**
```
RESEND_API_KEY
RESEND_FROM_EMAIL
PAYSTACK_SECRET_KEY
PAYSTACK_PUBLIC_KEY
APP_URL
```

---

## Step 3: Deploy Database Migration (1 min)

```bash
npx supabase db push
```

This creates:
- ✅ `email_logs` table - Tracks all sent emails
- ✅ `email_templates` table - Stores 7 default templates
- ✅ Email logging functions
- ✅ Email statistics functions

**Verify Migration:**
```sql
-- Check templates exist
SELECT template_key, name FROM email_templates;
```

**Expected:** 7 templates (payment_success, payment_failed, subscription_created, etc.)

---

## Step 4: Deploy Edge Function (1 min)

```bash
npx supabase functions deploy email-send
```

**Verify Deployment:**
```bash
npx supabase functions list
```

**Expected:** `email-send` appears in the list

---

## Step 5: Configure Supabase Auth Emails (5 min)

### 5.1 Enable Email Confirmation

1. Open Supabase Dashboard
2. Go to **Authentication → Settings**
3. Scroll to **Email Auth**
4. Enable **Email Confirmations**
5. Set **Confirmation URL**: `interviewready://auth/confirm`

### 5.2 Customize Email Templates

1. Go to **Authentication → Email Templates**
2. Update each template:

**Confirm Signup:**
```html
<h2>Confirm your signup</h2>
<p>Hi there,</p>
<p>Welcome to Interview Ready! Click below to confirm your email:</p>
<p><a href="{{ .ConfirmationURL }}">Confirm Email</a></p>
<p>This link expires in 24 hours.</p>
<p>Best regards,<br>Interview Ready Team</p>
```

**Reset Password:**
```html
<h2>Reset your password</h2>
<p>Hi there,</p>
<p>Click below to reset your password:</p>
<p><a href="{{ .ConfirmationURL }}">Reset Password</a></p>
<p>This link expires in 1 hour.</p>
<p>Best regards,<br>Interview Ready Team</p>
```

**Magic Link:**
```html
<h2>Your magic link</h2>
<p>Hi there,</p>
<p>Click below to sign in:</p>
<p><a href="{{ .ConfirmationURL }}">Sign In</a></p>
<p>This link expires in 1 hour.</p>
<p>Best regards,<br>Interview Ready Team</p>
```

3. Click **Save** for each template

---

## Step 6: Test Email System (5 min)

### Test 1: Send Test Email

```typescript
// In your app or via Supabase SQL Editor
import { useEmail } from '@/hooks/useEmail';

const { sendEmail } = useEmail();

await sendEmail({
  to: 'your-email@example.com',
  subject: 'Test Email from Interview Ready',
  html: '<h1>Test Successful!</h1><p>Email system is working.</p>',
  text: 'Test Successful! Email system is working.',
  emailType: 'test',
});
```

### Test 2: Test Template Email

```typescript
await sendEmail({
  to: 'your-email@example.com',
  subject: 'Welcome to Interview Ready',
  templateKey: 'welcome',
  templateVariables: {
    user_name: 'Test User',
    credits: '10',
  },
  emailType: 'welcome',
});
```

### Test 3: Test Auth Email

1. Create a new account in your app
2. Check email for verification link
3. Click link to verify
4. Confirm account is verified

### Verify Email Logs

```sql
-- Check sent emails
SELECT 
  email_to,
  email_type,
  subject,
  status,
  created_at
FROM email_logs
ORDER BY created_at DESC
LIMIT 5;
```

**Expected:** Your test emails appear with status `sent`

---

## Integration Examples

### Send Payment Success Email

```typescript
import { EmailHelpers } from '@/hooks/useEmail';

// After successful payment
await EmailHelpers.sendPaymentSuccess({
  to: user.email,
  userName: user.first_name,
  amount: '5.00',
  currency: 'USD',
  planName: 'Premium',
  transactionId: transaction.reference,
});
```

### Send Referral Reward Email

```typescript
// After successful referral
await EmailHelpers.sendReferralReward({
  to: referrer.email,
  userName: referrer.first_name,
  referredUser: newUser.first_name,
  credits: '10',
  referralCode: referrer.referral_code,
  totalReferrals: stats.total_referrals.toString(),
});
```

### Send Welcome Email

```typescript
// After signup
await EmailHelpers.sendWelcome({
  to: newUser.email,
  userName: newUser.first_name,
  credits: '10',
});
```

---

## Monitoring

### View Email Logs

```sql
-- Recent emails
SELECT * FROM email_logs ORDER BY created_at DESC LIMIT 20;

-- Failed emails
SELECT * FROM email_logs WHERE status = 'failed';

-- Email statistics
SELECT 
  email_type,
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE status = 'sent') as sent,
  COUNT(*) FILTER (WHERE status = 'failed') as failed
FROM email_logs
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY email_type;
```

### View Edge Function Logs

```bash
npx supabase functions logs email-send --tail
```

---

## Troubleshooting

### Issue: Emails not sending

**Check:**
```bash
# Verify secrets
npx supabase secrets list

# Check function logs
npx supabase functions logs email-send --tail

# Test Resend API key
curl https://api.resend.com/emails \
  -H "Authorization: Bearer re_your_key" \
  -H "Content-Type: application/json" \
  -d '{"from":"onboarding@resend.dev","to":"test@example.com","subject":"Test","html":"<p>Test</p>"}'
```

### Issue: Emails going to spam

**Solutions:**
1. Verify domain with Resend
2. Add SPF, DKIM, DMARC records
3. Use verified sender email
4. Avoid spam trigger words

### Issue: Template variables not replaced

**Check:**
- Variable names match exactly (case-sensitive)
- Using `{{variable_name}}` syntax
- All required variables provided

---

## Production Checklist

- [ ] Resend API key configured
- [ ] Domain verified (recommended)
- [ ] Sender email configured
- [ ] Database migration deployed
- [ ] Edge function deployed
- [ ] Auth email templates customized
- [ ] Test emails sent successfully
- [ ] Email logs working
- [ ] Integration tested (payment, referral, welcome)
- [ ] Monitoring set up

---

## Cost Estimation

### Resend Free Tier
- 100 emails/day
- 3,000 emails/month
- Perfect for development and small apps

### Typical Usage (per user/month)
- Welcome: 1 email
- Payments: 1-2 emails
- Subscriptions: 1-2 emails
- Referrals: 0-5 emails
- Notifications: 2-10 emails

**Total:** 5-20 emails per user per month

### Scaling
- **1,000 users:** 5,000-20,000 emails/month → Free tier
- **5,000 users:** 25,000-100,000 emails/month → Pro plan ($20/month)
- **10,000+ users:** 50,000+ emails/month → Business plan ($80/month)

---

## Quick Reference

### Send Email
```typescript
const { sendEmail } = useEmail();
await sendEmail({
  to: 'user@example.com',
  subject: 'Subject',
  templateKey: 'template_name',
  templateVariables: { key: 'value' },
  emailType: 'notification',
});
```

### Helper Functions
```typescript
EmailHelpers.sendPaymentSuccess({ ... });
EmailHelpers.sendReferralReward({ ... });
EmailHelpers.sendWelcome({ ... });
```

### View Logs
```sql
SELECT * FROM email_logs ORDER BY created_at DESC LIMIT 10;
```

---

## Support Resources

- **Resend Docs:** https://resend.com/docs
- **Supabase Auth:** https://supabase.com/docs/guides/auth
- **Email System Docs:** `docs/EMAIL_SYSTEM.md`

---

**Status:** ✅ Setup Complete  
**Next Steps:** Integrate email sending into your app workflows  
**Last Updated:** July 4, 2026
