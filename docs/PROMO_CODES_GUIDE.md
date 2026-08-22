# Interview Ready: Promotional Codes & Marketing Operations Playbook

This guide details all available promotional campaign codes (ranging from **20 up to 150 bonus credits**), their **Tier-Based Redemption Policy (One Code Per Tier Per Account)**, strategic application in email marketing, and operational database management for **Interview Ready**.

---

## 1. Tier-Based Redemption Policy (Strict 1-Per-Tier Rule)

To prevent code stacking abuse while allowing users to benefit across distinct campaign phases (e.g. initial onboarding vs. later masterclass attendance):

- **Per-Tier Limit**: A user can redeem **at most ONE promo code per Tier** across the lifetime of their account.
- **Same Tier Rejection**: If a user attempts to enter another code from the same tier (e.g., they already redeemed `LINKEDIN20` from Tier 1, and later try `WELCOME20` or `EMAIL25`), the system automatically rejects it with a clear, helpful message:  
  `"You have already redeemed a promotional code from this tier (TIER_1). Each promo tier can only be redeemed once per account."`
- **Cross-Tier Eligibility**: Users can still participate in promotions from higher tiers (e.g., a Tier 1 user can later redeem a Tier 2 webinar code `WELCOME50` or a Tier 3 masterclass code `CAREERPRO100`).
- **Database-Level Enforcement**: Enforced via composite unique constraint `uq_user_tier_redemption UNIQUE (user_id, tier)` on `public.promo_code_redemptions`.

---

## 2. Active Promo Code Catalog by Tier (20 to 150 Credits)

| Tier | Code | Credits | Target Segment / Campaign | Strategy & Channel |
| :--- | :--- | :---: | :--- | :--- |
| **`TIER_1`** | **`WELCOME20`** | **20** | New signups | Default welcome email & in-app onboarding prompt |
| **`TIER_1`** | **`LINKEDIN20`** | **20** | LinkedIn followers & creators | Social media bio links & carousel post CTAs |
| **`TIER_1`** | **`TWITTER20`** | **20** | X / Twitter tech community | X threads & giveaway campaigns |
| **`TIER_1`** | **`REDDIT20`** | **20** | Reddit r/cscareerquestions, r/jobs | Organic community discussions & AMA sessions |
| **`TIER_1`** | **`EMAIL25`** | **25** | Email newsletter subscribers | Substack / newsletter welcome sequence |
| **`TIER_1`** | **`NEWSLETTER25`** | **25** | Weekly job alert readers | Bi-weekly career advice email blasts |
| **`TIER_1`** | **`COMMUNITY30`** | **30** | Discord & Slack members | Developer & job-seeker community announcements |
| **`TIER_1`** | **`CAREER35`** | **35** | University & bootcamp graduates | Career center & bootcamp graduation perks |
| **`TIER_2`** | **`FASTTRACK40`** | **40** | Re-engagement email blast | Dormant user re-activation campaigns |
| **`TIER_2`** | **`WELCOME50`** | **50** | Product Hunt & launch event | High-visibility launch events |
| **`TIER_2`** | **`PRO2026`** | **50** | Early adopter tech cohort | Tech conferences & podcast sponsorship mentions |
| **`TIER_2`** | **`INTERVIEW50`** | **50** | Mock interview practice drive | Mid-week interview prep focus emails |
| **`TIER_2`** | **`RESUME50`** | **50** | ATS resume optimization campaign | Resume audit marketing funnels |
| **`TIER_2`** | **`BOOST60`** | **60** | Mid-career job changers | Career transition webinar attendees |
| **`TIER_3`** | **`SUMMER75`** | **75** | Seasonal quarterly drive | Summer/Fall hiring season promotions |
| **`TIER_3`** | **`VIP80`** | **80** | VIP newsletter segment | High-intent prospective pro users |
| **`TIER_3`** | **`LAUNCH100`** | **100** | Major platform milestone / launch | Flagship launch milestone celebrations |
| **`TIER_3`** | **`CAREERPRO100`** | **100** | Masterclass & workshop attendees | Live workshop & career coaching attendee gift |
| **`TIER_3`** | **`HIRINGSEASON100`**| **100** | Q1/Q3 peak hiring blast | Peak hiring surge marketing push |
| **`TIER_4`** | **`EXCLUSIVE120`** | **120** | Premier influencer partner program | Key influencer & YouTuber audience special |
| **`TIER_4`** | **`SPECIAL125`** | **125** | University bootcamp co-brand | Co-branded bootcamp cohort agreements |
| **`TIER_4`** | **`POWERUSER140`** | **140** | High-velocity job seekers | Intensive 30-day job hunt challenge |
| **`TIER_4`** | **`ULTIMATE150`** | **150** | Executive VIP & premium blast | Full platform trial experience (Max Tier) |
| **`TIER_4`** | **`EXECUTIVE150`** | **150** | Senior leadership & exec candidates| Senior tech leadership transition program |

---

## 3. Strategic Email Marketing Copy Templates

Use these pre-crafted email templates in your marketing automation tool (e.g., Resend, Mailchimp, Customer.io, Klaviyo).

### Template A: Tier 1 (25–35 Credits) Welcome & Activation
```text
Subject: 🎁 Here are {{credits}} free AI credits for your job search

Hi {{first_name}},

Land your next dream role with AI-powered resume tailoring and realistic mock interviews.

We’ve added an exclusive promotion for you:
👉 Promo Code: {{promo_code}}
👉 Bonus Value: {{credits}} Free AI Credits (Tier 1 Welcome Perk)

How to claim in 30 seconds:
1. Open Interview Ready (https://appinterviewready.top)
2. In the onboarding referral screen, enter: {{promo_code}}
3. Your {{credits}} credits will be credited immediately to your balance!

Use your credits to:
• Generate 1-page ATS resumes matching exact job postings
• Run interactive mock interviews with real-time feedback
• Audit your LinkedIn profile score

Start here: https://appinterviewready.top

Best regards,
The Interview Ready Team
```

---

### Template B: Tier 3 (75–100 Credits) Masterclass & Event Follow-Up
```text
Subject: ⭐ Exclusive: 100 Free Credits to Accelerate Your Career

Hi {{first_name}},

Thank you for attending our career masterclass! As promised, here is your Tier 3 VIP bonus code.

Claim your 100-credit bonus:
🎟️ Code: CAREERPRO100 (or LAUNCH100)
✨ Value: 100 Full AI Credits (Enough for 20 Mock Interview Sessions or 30+ Resumes)

Redeem now at https://appinterviewready.top

Note: Tier 3 promo codes can only be redeemed once per account.

Rooting for your success,
Interview Ready Team
```

---

### Template C: Tier 4 (120–150 Credits) Ultimate Executive Partner Gift
```text
Subject: 🚀 You've unlocked the Ultimate Career Pack (150 Credits Inside)

Hi {{first_name}},

We’ve partnered with leading tech mentors to give you the ultimate unfair advantage in this hiring season.

Here is your exclusive Tier 4 promotional code:
🔥 Code: ULTIMATE150
💎 Value: 150 AI Credits

With 150 credits, you can:
✅ Generate and download unlimited ATS-tailored DOCX & PDF resumes
✅ Practice full 5-question mock interview simulations with detailed scorecards
✅ Get customized LinkedIn profile headline & summary rewrites
✅ Generate comprehensive company research intelligence briefs

👉 Claim your 150 credits now: https://appinterviewready.top

Let’s get you interview ready!
```

---

## 4. How to Manage Promo Codes in Supabase SQL

### Adding a New Promo Code with Tier:
```sql
INSERT INTO public.promo_codes (code, description, credits_granted, tier, is_active)
VALUES ('PODCAST75', 'Podcast Sponsorship - 75 Credits', 75, 'TIER_3', true)
ON CONFLICT (code) DO UPDATE SET
  credits_granted = EXCLUDED.credits_granted,
  tier = EXCLUDED.tier,
  is_active = true;
```

### Adding a Code with a Maximum User Limit (e.g., First 200 Users):
```sql
INSERT INTO public.promo_codes (code, description, credits_granted, tier, max_uses, is_active)
VALUES ('EARLYBIRD100', 'First 200 Fast Users - 100 Credits', 100, 'TIER_3', 200, true);
```

### Deactivating a Code:
```sql
UPDATE public.promo_codes
SET is_active = false, updated_at = NOW()
WHERE code = 'SUMMER75';
```

---

## 5. Performance Analytics & Tracking Queries

### 1. Redemptions by Tier:
```sql
SELECT 
  tier,
  COUNT(*) AS total_redemptions,
  SUM(credits_granted) AS total_credits_granted,
  COUNT(DISTINCT user_id) AS unique_users
FROM public.promo_code_redemptions
GROUP BY tier
ORDER BY tier;
```

### 2. View Top Performing Campaigns by Redemptions:
```sql
SELECT 
  p.code,
  p.tier,
  p.description,
  p.credits_granted,
  p.current_uses,
  p.max_uses,
  p.is_active,
  p.created_at
FROM public.promo_codes p
ORDER BY p.current_uses DESC;
```
