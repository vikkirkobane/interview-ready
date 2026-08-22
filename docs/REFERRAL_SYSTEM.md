# Referral System Documentation

**Version:** 1.0.0  
**Date:** July 4, 2026  
**Status:** ✅ Implementation Complete

---

## Table of Contents

1. [Overview](#overview)
2. [How It Works](#how-it-works)
3. [Database Schema](#database-schema)
4. [API Reference](#api-reference)
5. [React Hook](#react-hook)
6. [UI Implementation](#ui-implementation)
7. [Deployment](#deployment)

---

## Overview

The referral system allows users to invite friends and earn credits. Both the referrer and the referred user receive rewards when a new user signs up using a referral code.

### Key Features

- ✅ Automatic unique referral code generation for each user
- ✅ 10 credits for referrer when someone signs up with their code
- ✅ 10 credits for new user who uses a referral code
- ✅ Referral tracking and statistics
- ✅ Share functionality (copy code or share via native share)
- ✅ Prevention of self-referrals and duplicate referrals

### Rewards Structure

| Action / Category | Referrer Gets | Referred User Gets | Notes |
|---|---|---|---|
| **Peer Referral Code** | 10 credits | 10 credits | Mutual reward for inviting a friend |
| **Tier 1 Promo Code** (20–35 credits) | — | 20–35 credits | Welcome & Community (`WELCOME20`, `LINKEDIN20`, `EMAIL25`, etc.) |
| **Tier 2 Promo Code** (40–60 credits) | — | 40–60 credits | Growth & Fast-Track (`FASTTRACK40`, `WELCOME50`, `BOOST60`, etc.) |
| **Tier 3 Promo Code** (75–100 credits) | — | 75–100 credits | VIP & Milestone (`SUMMER75`, `VIP80`, `LAUNCH100`, etc.) |
| **Tier 4 Promo Code** (120–150 credits) | — | 120–150 credits | Executive & Partners (`EXCLUSIVE120`, `ULTIMATE150`, etc.) |

> **Note on Promo Codes**: Users can redeem **at most 1 promo code per tier** across their account lifetime. Full operations, email templates, and SQL guide are documented in [`docs/PROMO_CODES_GUIDE.md`](./PROMO_CODES_GUIDE.md).

---

## How It Works

### 1. Referral Code Generation

When a user signs up, a unique referral code is automatically generated:
- Format: `[FIRST_NAME_4_CHARS][4_RANDOM_DIGITS]`
- Example: `ALEX1234`, `JOHN5678`
- Stored in `users.referral_code` column

### 2. Applying a Referral Code

New users can apply a referral code during or after signup:
1. User enters referral code
2. System validates the code
3. System checks for self-referral and duplicate referrals
4. Credits are granted to both users
5. Referral relationship is recorded

### 3. Tracking Referrals

All referral relationships are tracked in the `referrals` table with:
- Referrer ID
- Referred user ID
- Referral code used
- Credits granted
- Timestamp

---

## Database Schema

### Users Table (Extended)

```sql
ALTER TABLE public.users 
ADD COLUMN referral_code TEXT UNIQUE,
ADD COLUMN referred_by UUID REFERENCES public.users(id),
ADD COLUMN total_referrals INTEGER DEFAULT 0,
ADD COLUMN referral_credits_earned INTEGER DEFAULT 0;
```

### Referrals Table

```sql
CREATE TABLE public.referrals (
  id UUID PRIMARY KEY,
  referrer_id UUID REFERENCES users(id),
  referred_id UUID REFERENCES users(id),
  referral_code TEXT NOT NULL,
  credits_granted_to_referrer INTEGER DEFAULT 10,
  credits_granted_to_referred INTEGER DEFAULT 10,
  status TEXT DEFAULT 'completed',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(referred_id) -- Each user can only be referred once
);
```

### Database Functions

#### 1. `generate_referral_code(p_user_id UUID)`

Generates a unique referral code for a user.

**Returns:** `TEXT` - The generated referral code

#### 2. `apply_referral_code(p_referred_user_id UUID, p_referral_code TEXT)`

Applies a referral code and grants credits to both users.

**Parameters:**
- `p_referred_user_id`: UUID of the user applying the code
- `p_referral_code`: The referral code to apply

**Returns:** `JSONB`
```json
{
  "success": true,
  "referral_id": "uuid",
  "credits_granted": 10,
  "referrer_credits": 10
}
```

**Error Cases:**
- Invalid referral code
- Self-referral attempt
- User already referred

#### 3. `get_referral_stats(p_user_id UUID)`

Gets referral statistics for a user.

**Returns:** `JSONB`
```json
{
  "referral_code": "ALEX1234",
  "total_referrals": 5,
  "credits_earned": 50,
  "referrals": [
    {
      "id": "uuid",
      "referred_user": {
        "first_name": "John",
        "last_name": "Doe",
        "email": "john@example.com"
      },
      "credits_granted": 10,
      "created_at": "2026-07-04T08:00:00Z"
    }
  ]
}
```

---

## API Reference

### Get Referral Stats

**Endpoint:** `POST /functions/v1/referral-stats`

**Headers:**
```
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Response:**
```json
{
  "success": true,
  "data": {
    "referral_code": "ALEX1234",
    "total_referrals": 5,
    "credits_earned": 50,
    "referrals": [...]
  }
}
```

### Apply Referral Code

**Endpoint:** `POST /functions/v1/referral-apply`

**Headers:**
```
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Request:**
```json
{
  "referralCode": "ALEX1234"
}
```

**Success Response:**
```json
{
  "success": true,
  "data": {
    "referral_id": "uuid",
    "credits_granted": 10,
    "message": "Success! You received 10 credits!"
  }
}
```

**Error Response:**
```json
{
  "success": false,
  "error": "Invalid referral code"
}
```

---

## React Hook

### `useReferral()`

Custom hook for managing referral operations.

```typescript
import { useReferral } from '@/hooks/useReferral';

function ReferralComponent() {
  const { 
    stats,              // Referral statistics
    loading,            // Loading state
    error,              // Error state
    applyReferralCode,  // Function to apply a code
    refreshStats        // Function to refresh stats
  } = useReferral();

  // Apply a referral code
  const handleApply = async () => {
    const result = await applyReferralCode('ALEX1234');
    if (result.success) {
      console.log(result.message);
    } else {
      console.error(result.error);
    }
  };

  return (
    <View>
      <Text>Your Code: {stats?.referralCode}</Text>
      <Text>Total Referrals: {stats?.totalReferrals}</Text>
      <Text>Credits Earned: {stats?.creditsEarned}</Text>
    </View>
  );
}
```

---

## UI Implementation

The referral screen (`app/(tabs)/referral.tsx`) provides:

1. **Hero Section**
   - Gift icon
   - "Give 10, Get 10" headline
   - Explanation of the program

2. **Referral Code Card**
   - Display user's unique code
   - Copy button for easy sharing

3. **Share Button**
   - Native share functionality
   - Pre-formatted message with code and app link

4. **Stats Card** (shown when user has referrals)
   - Total referrals count
   - Total credits earned

5. **How It Works Section**
   - Step-by-step explanation
   - Visual indicators

---

## Deployment

### 1. Run Database Migration

```bash
npx supabase db push --include-all
```

This will apply migration `006_add_referral_system.sql` which:
- Adds referral columns to users table
- Creates referrals table
- Creates database functions
- Sets up RLS policies
- Creates auto-generation trigger

### 2. Deploy Edge Functions

```bash
npx supabase functions deploy referral-stats
npx supabase functions deploy referral-apply
```

### 3. Test the System

#### Test Referral Code Generation
1. Create a new user account
2. Check that a referral code is automatically generated
3. Verify code format (e.g., `ALEX1234`)

#### Test Referral Application
1. Copy referral code from User A
2. Create new account (User B)
3. Apply User A's referral code
4. Verify both users receive 10 credits
5. Check referral appears in User A's stats

#### Test Error Cases
1. Try to use own referral code (should fail)
2. Try to apply referral code twice (should fail)
3. Try invalid referral code (should fail)

---

## Integration with Signup Flow

To integrate referral codes into the signup flow:

### Option 1: During Signup

Add referral code input to signup form:

```typescript
// app/(auth)/signup.tsx
const [referralCode, setReferralCode] = useState('');

// After successful signup
if (referralCode.trim()) {
  const result = await applyReferralCode(referralCode);
  if (result.success) {
    // Show success message
  }
}
```

### Option 2: After Signup

Show a modal or screen after signup asking if user has a referral code:

```typescript
// Show modal after first login
if (isFirstLogin && !user.referred_by) {
  showReferralCodeModal();
}
```

---

## Best Practices

### 1. Clear Communication

Always clearly communicate the rewards:
- "Give 10, Get 10"
- "You both get 10 credits"
- Show exact credit amounts

### 2. Easy Sharing

Provide multiple sharing options:
- Copy code button
- Native share functionality
- Pre-formatted message

### 3. Track Performance

Monitor referral metrics:
- Total referrals per user
- Conversion rate
- Credits distributed
- Most active referrers

### 4. Prevent Abuse

The system includes protections against:
- Self-referrals
- Duplicate referrals
- Invalid codes

---

## Future Enhancements

Potential improvements:

1. **Tiered Rewards**
   - More credits for premium plan referrals
   - Bonus for multiple referrals

2. **Referral Leaderboard**
   - Show top referrers
   - Gamification elements

3. **Custom Codes**
   - Allow users to customize their code
   - Vanity codes for premium users

4. **Referral Analytics**
   - Track referral sources
   - Conversion funnel
   - Time to conversion

5. **Expiring Codes**
   - Limited-time bonus codes
   - Seasonal promotions

---

## Support

For questions or issues with the referral system:
- **Documentation**: This file
- **Support Email**: support@interviewready.app
- **Developer**: Check Supabase logs for edge function errors

---

**Last Updated:** July 4, 2026  
**Status:** ✅ Production Ready
