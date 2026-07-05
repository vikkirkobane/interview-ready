# Email System Documentation

**Version:** 1.0.0  
**Date:** July 4, 2026  
**Status:** ✅ Fully Implemented

---

## Overview

Interview Ready includes a comprehensive email system that:
- **Sends transactional emails** - Payment confirmations, subscription updates, referral rewards
- **Email verification** - Built-in Supabase Auth email verification
- **Custom templates** - Professional, branded email templates
- **Email tracking** - Logs all sent emails with status tracking
- **Resend integration** - Professional email delivery service

---

## Architecture

### Components

1. **Database Layer** (`008_add_email_system.sql`)
   - `email_logs` - Tracks all sent emails
   - `email_templates` - Stores email templates
   - Functions for logging and tracking

2. **Edge Function** (`email-send`)
   - Sends emails via Resend API
   - Renders templates with variables
   - Logs email attempts and results

3. **React Hook** (`useEmail.ts`)
   - Easy-to-use email sending interface
   - Helper functions for common emails
   - Email statistics

4. **Supabase Auth**
   - Built-in email verification
   - Password reset emails
   - Magic link authentication

---

## Setup Guide

### Step 1: Get Resend API Key

1. **Sign up for Resend**
   - Go to [https://resend.com](https://resend.com)
   - Create a free account (100 emails/day free)
   - Verify your email

2. **Get API Key**
   - Navigate to **API Keys** in dashboard
   - Click **Create API Key**
   - Copy the key (starts with `re_`)

3. **Add Domain (Optional but Recommended)**
   - Go to **Domains** in dashboard
   - Add your domain (e.g., `interviewready.app`)
   - Add DNS records as instructed
   - Verify domain

### Step 2: Configure Supabase Secrets

```bash
# Set Resend API key
npx supabase secrets set RESEND_API_KEY=re_your_api_key_here

# Set sender email (use verified domain)
npx supabase secrets set RESEND_FROM_EMAIL="Interview Ready <noreply@interviewready.app>"

# Verify secrets are set
npx supabase secrets list
```

**Important:** 
- Without verified domain, use: `onboarding@resend.dev`
- With verified domain, use: `noreply@yourdomain.com`

### Step 3: Deploy Database Migration

```bash
npx supabase db push
```

This creates:
- `email_logs` table
- `email_templates` table with default templates
- Email logging and tracking functions

### Step 4: Deploy Edge Function

```bash
npx supabase functions deploy email-send
```

### Step 5: Configure Supabase Auth Email Templates

1. **Open Supabase Dashboard**
   - Go to **Authentication → Email Templates**

2. **Customize Templates**

**Confirm Signup Template:**
```html
<h2>Confirm your signup</h2>
<p>Hi there,</p>
<p>Welcome to Interview Ready! Click the link below to confirm your email address:</p>
<p><a href="{{ .ConfirmationURL }}">Confirm your email</a></p>
<p>Or copy and paste this URL into your browser:</p>
<p>{{ .ConfirmationURL }}</p>
<p>This link expires in 24 hours.</p>
<p>If you didn't create an account, you can safely ignore this email.</p>
<p>Best regards,<br>The Interview Ready Team</p>
```

**Reset Password Template:**
```html
<h2>Reset your password</h2>
<p>Hi there,</p>
<p>We received a request to reset your password for Interview Ready.</p>
<p>Click the link below to reset your password:</p>
<p><a href="{{ .ConfirmationURL }}">Reset password</a></p>
<p>Or copy and paste this URL into your browser:</p>
<p>{{ .ConfirmationURL }}</p>
<p>This link expires in 1 hour.</p>
<p>If you didn't request a password reset, you can safely ignore this email.</p>
<p>Best regards,<br>The Interview Ready Team</p>
```

**Magic Link Template:**
```html
<h2>Your magic link</h2>
<p>Hi there,</p>
<p>Click the link below to sign in to Interview Ready:</p>
<p><a href="{{ .ConfirmationURL }}">Sign in</a></p>
<p>Or copy and paste this URL into your browser:</p>
<p>{{ .ConfirmationURL }}</p>
<p>This link expires in 1 hour.</p>
<p>If you didn't request this link, you can safely ignore this email.</p>
<p>Best regards,<br>The Interview Ready Team</p>
```

**Email Change Template:**
```html
<h2>Confirm email change</h2>
<p>Hi there,</p>
<p>Click the link below to confirm your new email address:</p>
<p><a href="{{ .ConfirmationURL }}">Confirm new email</a></p>
<p>Or copy and paste this URL into your browser:</p>
<p>{{ .ConfirmationURL }}</p>
<p>This link expires in 24 hours.</p>
<p>If you didn't request this change, please contact support immediately.</p>
<p>Best regards,<br>The Interview Ready Team</p>
```

3. **Configure SMTP Settings (Optional)**
   - By default, Supabase uses their SMTP
   - For custom domain, configure custom SMTP in **Project Settings → Auth**

---

## Email Templates

### Default Templates

The system includes 7 pre-configured templates:

1. **payment_success** - Payment confirmation
2. **payment_failed** - Payment failure notification
3. **subscription_created** - New subscription welcome
4. **subscription_cancelled** - Subscription cancellation
5. **credit_granted** - Credits added notification
6. **referral_reward** - Referral reward notification
7. **welcome** - Welcome email for new users

### Template Variables

Templates use `{{variable_name}}` syntax for dynamic content:

```html
<h1>Welcome {{user_name}}!</h1>
<p>You have {{credits}} credits available.</p>
```

### Managing Templates

**View Templates:**
```sql
SELECT template_key, name, subject, is_active
FROM email_templates
WHERE is_active = true;
```

**Update Template:**
```sql
UPDATE email_templates
SET 
  subject = 'New Subject',
  html_body = '<html>New HTML content with {{variables}}</html>',
  text_body = 'New text content with {{variables}}'
WHERE template_key = 'payment_success';
```

**Create Custom Template:**
```sql
INSERT INTO email_templates (
  template_key,
  name,
  subject,
  html_body,
  text_body,
  variables
)
VALUES (
  'custom_notification',
  'Custom Notification',
  'Important Update - {{title}}',
  '<html><body><h1>{{title}}</h1><p>{{message}}</p></body></html>',
  '{{title}}\n\n{{message}}',
  '["title", "message"]'::JSONB
);
```

---

## Usage Examples

### Basic Email Sending

```typescript
import { useEmail } from '@/hooks/useEmail';

function MyComponent() {
  const { sendEmail, isSending, error } = useEmail();

  const handleSendEmail = async () => {
    const result = await sendEmail({
      to: 'user@example.com',
      subject: 'Test Email',
      html: '<h1>Hello!</h1><p>This is a test email.</p>',
      text: 'Hello! This is a test email.',
      emailType: 'notification',
    });

    if (result.success) {
      console.log('Email sent!', result.message_id);
    } else {
      console.error('Failed to send:', result.error);
    }
  };

  return (
    <button onClick={handleSendEmail} disabled={isSending}>
      {isSending ? 'Sending...' : 'Send Email'}
    </button>
  );
}
```

### Using Templates

```typescript
import { useEmail } from '@/hooks/useEmail';

function PaymentSuccess() {
  const { sendEmail } = useEmail();

  const sendPaymentEmail = async () => {
    await sendEmail({
      to: 'user@example.com',
      subject: 'Payment Successful',
      templateKey: 'payment_success',
      templateVariables: {
        user_name: 'John Doe',
        amount: '5.00',
        currency: 'USD',
        plan_name: 'Premium',
        transaction_id: 'TXN_123456',
      },
      emailType: 'payment_success',
      metadata: {
        transaction_id: 'TXN_123456',
        plan: 'premium',
      },
    });
  };

  return <button onClick={sendPaymentEmail}>Send Payment Email</button>;
}
```

### Using Helper Functions

```typescript
import { EmailHelpers } from '@/hooks/useEmail';

// Send payment success email
await EmailHelpers.sendPaymentSuccess({
  to: 'user@example.com',
  userName: 'John Doe',
  amount: '5.00',
  currency: 'USD',
  planName: 'Premium',
  transactionId: 'TXN_123456',
});

// Send referral reward email
await EmailHelpers.sendReferralReward({
  to: 'user@example.com',
  userName: 'John Doe',
  referredUser: 'Jane Smith',
  credits: '10',
  referralCode: 'JOHN1234',
  totalReferrals: '5',
});

// Send welcome email
await EmailHelpers.sendWelcome({
  to: 'newuser@example.com',
  userName: 'New User',
  credits: '10',
});
```

### Get Email Statistics

```typescript
import { useEmail } from '@/hooks/useEmail';

function EmailStats() {
  const { getEmailStats } = useEmail();
  const [stats, setStats] = useState(null);

  useEffect(() => {
    const fetchStats = async () => {
      const data = await getEmailStats(30); // Last 30 days
      setStats(data);
    };
    fetchStats();
  }, []);

  return (
    <div>
      <h2>Email Statistics (Last 30 Days)</h2>
      <p>Total Sent: {stats?.total_sent}</p>
      <p>Total Failed: {stats?.total_failed}</p>
      <p>Total Pending: {stats?.total_pending}</p>
    </div>
  );
}
```

---

## Integration Examples

### Payment Success Email

```typescript
// In payment webhook handler
const { data: user } = await supabase
  .from('users')
  .select('email, first_name')
  .eq('id', userId)
  .single();

await EmailHelpers.sendPaymentSuccess({
  to: user.email,
  userName: user.first_name,
  amount: '5.00',
  currency: 'USD',
  planName: 'Premium',
  transactionId: transaction.reference,
});
```

### Referral Reward Email

```typescript
// After successful referral application
const { data: referrer } = await supabase
  .from('users')
  .select('email, first_name, referral_code')
  .eq('id', referrerId)
  .single();

const { data: stats } = await supabase.rpc('get_referral_stats', {
  p_user_id: referrerId,
});

await EmailHelpers.sendReferralReward({
  to: referrer.email,
  userName: referrer.first_name,
  referredUser: newUser.first_name,
  credits: '10',
  referralCode: referrer.referral_code,
  totalReferrals: stats.total_referrals.toString(),
});
```

### Welcome Email

```typescript
// In signup handler
const { data: user } = await supabase.auth.signUp({
  email: email,
  password: password,
  options: {
    data: {
      first_name: firstName,
      last_name: lastName,
    },
  },
});

// Send welcome email
await EmailHelpers.sendWelcome({
  to: email,
  userName: firstName,
  credits: '10',
});
```

---

## Email Verification Flow

### Enable Email Verification

1. **Supabase Dashboard**
   - Go to **Authentication → Settings**
   - Enable **Email Confirmations**
   - Set **Confirmation URL** to: `interviewready://auth/confirm`

2. **Handle Confirmation in App**

```typescript
// app/(auth)/confirm.tsx
import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';

export default function ConfirmEmail() {
  const router = useRouter();

  useEffect(() => {
    // Handle email confirmation
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session) {
          // Email confirmed, redirect to app
          router.replace('/(tabs)');
        }
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  return (
    <View>
      <Text>Confirming your email...</Text>
    </View>
  );
}
```

### Resend Verification Email

```typescript
import { supabase } from '@/lib/supabase';

async function resendVerificationEmail(email: string) {
  const { error } = await supabase.auth.resend({
    type: 'signup',
    email: email,
  });

  if (error) {
    console.error('Error resending verification:', error);
  } else {
    console.log('Verification email sent!');
  }
}
```

---

## Monitoring & Debugging

### View Email Logs

```sql
-- Recent emails
SELECT 
  email_to,
  email_type,
  subject,
  status,
  created_at
FROM email_logs
ORDER BY created_at DESC
LIMIT 20;

-- Failed emails
SELECT 
  email_to,
  email_type,
  subject,
  error_message,
  created_at
FROM email_logs
WHERE status = 'failed'
ORDER BY created_at DESC;

-- Emails by type
SELECT 
  email_type,
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE status = 'sent') as sent,
  COUNT(*) FILTER (WHERE status = 'failed') as failed
FROM email_logs
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY email_type;
```

### Check Edge Function Logs

```bash
# View email-send function logs
npx supabase functions logs email-send --tail

# Filter for errors
npx supabase functions logs email-send | grep -i error
```

### Test Email Sending

```bash
# Test via curl
curl -X POST https://YOUR_PROJECT.supabase.co/functions/v1/email-send \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "to": "test@example.com",
    "subject": "Test Email",
    "html": "<h1>Test</h1>",
    "emailType": "test"
  }'
```

---

## Troubleshooting

### Issue: Emails not sending

**Check:**
1. Resend API key is set correctly
2. Edge function is deployed
3. Sender email is verified (or using `onboarding@resend.dev`)

```bash
# Verify secrets
npx supabase secrets list

# Check function deployment
npx supabase functions list

# View logs
npx supabase functions logs email-send --tail
```

### Issue: Template variables not replaced

**Solution:**
- Ensure variable names match exactly (case-sensitive)
- Check template has correct `{{variable_name}}` syntax
- Verify `templateVariables` object has all required keys

```typescript
// Correct
templateVariables: {
  user_name: 'John',  // matches {{user_name}}
  amount: '5.00',     // matches {{amount}}
}

// Incorrect
templateVariables: {
  userName: 'John',   // doesn't match {{user_name}}
  Amount: '5.00',     // doesn't match {{amount}}
}
```

### Issue: Emails going to spam

**Solutions:**
1. **Verify domain with Resend**
   - Add SPF, DKIM, DMARC records
   - Use verified domain for sender

2. **Improve email content**
   - Avoid spam trigger words
   - Include unsubscribe link
   - Use proper HTML structure

3. **Warm up domain**
   - Start with low volume
   - Gradually increase sending

### Issue: Rate limiting

**Resend Free Tier Limits:**
- 100 emails/day
- 3,000 emails/month

**Solution:**
- Upgrade to paid plan
- Implement email queuing
- Batch non-critical emails

---

## Best Practices

### 1. Email Content
- ✅ Use clear, concise subject lines
- ✅ Include both HTML and text versions
- ✅ Make CTAs prominent and clear
- ✅ Include unsubscribe option
- ✅ Use responsive design

### 2. Sending Strategy
- ✅ Send transactional emails immediately
- ✅ Batch marketing emails
- ✅ Respect user preferences
- ✅ Monitor bounce rates
- ✅ Handle failures gracefully

### 3. Template Management
- ✅ Keep templates in database
- ✅ Version control template changes
- ✅ Test templates before deploying
- ✅ Use consistent branding
- ✅ Make templates mobile-friendly

### 4. Security
- ✅ Never expose API keys in frontend
- ✅ Validate email addresses
- ✅ Rate limit email sending
- ✅ Log all email attempts
- ✅ Monitor for abuse

---

## Cost Estimation

### Resend Pricing

**Free Tier:**
- 100 emails/day
- 3,000 emails/month
- All features included

**Paid Plans:**
- **Pro:** $20/month - 50,000 emails
- **Business:** $80/month - 250,000 emails
- **Enterprise:** Custom pricing

### Typical Usage

**Per User/Month:**
- Welcome email: 1
- Payment emails: 1-2
- Subscription emails: 1-2
- Referral emails: 0-5
- Notifications: 2-10

**Estimated:** 5-20 emails per user per month

**For 1,000 active users:** 5,000-20,000 emails/month

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

### Update Template
```sql
UPDATE email_templates 
SET html_body = '<html>...</html>' 
WHERE template_key = 'template_name';
```

---

**Status:** ✅ Email System Fully Implemented  
**Last Updated:** July 4, 2026
