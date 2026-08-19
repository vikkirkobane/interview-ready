# Interview Ready: Promo Codes Management & Operations Guide

This guide details how to create, manage, rotate, and monitor promotional campaign codes (e.g., `LINKEDIN20`) for **Interview Ready**.

---

## 1. Overview of Promo Code Mechanics

- **Screen Entry Point**: Users enter promo codes or peer referral codes on the Onboarding Referral Screen (`app/(onboarding)/referral-code.tsx`).
- **One-Time Redemption Policy**: To prevent abuse and protect platform token economics, each user can redeem a promotional code **only once** per account lifetime (enforced at the database constraint level in `public.promo_code_redemptions`).
- **Standard Default Promo Codes**:
  - `LINKEDIN20`: 20 bonus credits (tailored for LinkedIn followers & organic outreach).
  - `LINKEDIN`: 20 bonus credits.
  - `PROMO20`: 20 bonus credits.
  - `WELCOME20`: 20 bonus credits.

---

## 2. How to Add a New Promo Code

To create a new promo code for a marketing campaign, partnership, or community event, run the following SQL command in the Supabase SQL Editor:

### Example A: Standard Campaign Code (Unlimited Redemptions, 20 Credits)
```sql
INSERT INTO public.promo_codes (code, description, credits_granted, is_active)
VALUES ('YOUTUBE20', 'YouTube Launch Campaign - 20 Credits', 20, true);
```

### Example B: Limited-Quantity Promo Code (Capped at 500 Total Users)
```sql
INSERT INTO public.promo_codes (code, description, credits_granted, max_uses, is_active)
VALUES ('EARLYBIRD50', 'First 500 Users Special - 50 Credits', 50, 500, true);
```

### Example C: Time-Limited Promo Code (Expires on a Specific Date)
```sql
INSERT INTO public.promo_codes (code, description, credits_granted, expires_at, is_active)
VALUES ('SUMMER2026', 'Summer 2026 Promo', 25, '2026-09-01T00:00:00Z', true);
```

---

## 3. How to Update, Deactivate, or Rotate Promo Codes

### To Deactivate / Pause an Active Promo Code:
```sql
UPDATE public.promo_codes
SET is_active = false, updated_at = NOW()
WHERE code = 'LINKEDIN20';
```

### To Change the Credit Amount Granted by an Active Code:
```sql
UPDATE public.promo_codes
SET credits_granted = 30, updated_at = NOW()
WHERE code = 'LINKEDIN20';
```

### To Extend or Set an Expiration Date:
```sql
UPDATE public.promo_codes
SET expires_at = '2026-12-31T23:59:59Z', updated_at = NOW()
WHERE code = 'LINKEDIN20';
```

---

## 4. Analytics & Performance Monitoring Queries

Use these queries to measure campaign effectiveness and user growth.

### 1. View Top Performing Promo Codes & Total Redemptions:
```sql
SELECT 
  p.code,
  p.description,
  p.credits_granted,
  p.current_uses,
  p.max_uses,
  p.is_active,
  p.created_at
FROM public.promo_codes p
ORDER BY p.current_uses DESC;
```

### 2. View Recent User Redemptions:
```sql
SELECT 
  r.created_at AS redeemed_at,
  r.code,
  r.credits_granted,
  u.email,
  u.first_name
FROM public.promo_code_redemptions r
JOIN public.users u ON u.id = r.user_id
ORDER BY r.created_at DESC
LIMIT 50;
```

### 3. Total Credits Distributed via Promo Codes:
```sql
SELECT 
  COUNT(*) AS total_redemptions,
  SUM(credits_granted) AS total_bonus_credits_distributed
FROM public.promo_code_redemptions;
```

---

## 5. User Support & Troubleshooting

| Issue / Error | Root Cause | Solution |
|---|---|---|
| *"You have already redeemed a promotional code."* | The user already redeemed `LINKEDIN20` or another promo code previously. | Explain to the user that promo codes are limited to one per account. They can still earn credits by inviting friends using their personal referral code. |
| *"Invalid or expired promo code."* | Code was typed incorrectly, is deactivated (`is_active = false`), or past its `expires_at` date. | Check `public.promo_codes` table to verify spelling or reactivate the code. |
| *"This promo code has reached its maximum limit."* | `current_uses` reached `max_uses`. | Increase `max_uses` if you wish to allow more users to redeem the campaign. |
| *User redeemed code but did not receive email.* | Resend API key missing or email bounced. | Check `public.email_logs` table for delivery status (`sent`, `failed`, `pending`) and error messages. |

---

## 6. Email & In-App Notification Experience

When a user successfully enters a promo code during onboarding:
1. **In-App Celebration**: A success toast appears stating *"Promo Code Applied! 🎉 You received 20 free AI credits with promo code LINKEDIN20."*
2. **Instant Credit Sync**: `profileStore` fetches the updated profile, instantly displaying the new credit balance.
3. **Branded Confirmation Email**: The `promo_reward` email template is dispatched to the user's registered email address matching the modern purple-gradient aesthetic of [appinterviewready.top](https://appinterviewready.top).
