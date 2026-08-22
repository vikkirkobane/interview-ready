-- Migration 022: Add Extended Promotional Campaign Codes (20 to 150 Credits)
-- Purpose: Enable granular email marketing, social campaigns, partner perks, and event promotions

INSERT INTO public.promo_codes (code, description, credits_granted, is_active)
VALUES
  -- ── 20 Credits: Social & Community Tiers ──
  ('WELCOME20', 'Welcome Onboarding Bonus - 20 Credits', 20, true),
  ('LINKEDIN20', 'LinkedIn Community Special - 20 Credits', 20, true),
  ('LINKEDIN', 'LinkedIn Referral Special - 20 Credits', 20, true),
  ('PROMO20', 'General Promotional Bonus - 20 Credits', 20, true),
  ('BONUS20', 'Community Member Bonus - 20 Credits', 20, true),
  ('TWITTER20', 'Twitter / X Community Special - 20 Credits', 20, true),
  ('REDDIT20', 'Reddit Community Special - 20 Credits', 20, true),

  -- ── 25–35 Credits: Newsletter & Starter Campaigns ──
  ('EMAIL25', 'Email Newsletter Welcome Bonus - 25 Credits', 25, true),
  ('NEWSLETTER25', 'Monthly Newsletter Reader Bonus - 25 Credits', 25, true),
  ('COMMUNITY30', 'Discord & Slack Community Invite - 30 Credits', 30, true),
  ('INTERVIEWREADY', 'Interview Ready Brand Special - 30 Credits', 30, true),
  ('CAREER35', 'Career Starter Sprint - 35 Credits', 35, true),

  -- ── 40–60 Credits: Growth, Fast-Track & Webinars ──
  ('FASTTRACK40', 'Fast-Track Job Seeker Campaign - 40 Credits', 40, true),
  ('WELCOME50', 'Welcome Launch Special - 50 Credits', 50, true),
  ('PRO2026', 'Pro Member Promotion - 50 Credits', 50, true),
  ('INTERVIEW50', 'Mock Interview Sprint Promo - 50 Credits', 50, true),
  ('RESUME50', 'ATS Resume Makeover Promo - 50 Credits', 50, true),
  ('BOOST60', 'Career Acceleration Boost - 60 Credits', 60, true),

  -- ── 75–100 Credits: Seasonal, VIP & High-Impact Events ──
  ('SUMMER75', 'Seasonal Promotion - 75 Credits', 75, true),
  ('VIP80', 'VIP Email Marketing Campaign - 80 Credits', 80, true),
  ('LAUNCH100', 'Official Launch VIP Bonus - 100 Credits', 100, true),
  ('CAREERPRO100', 'Career Pro Masterclass Attendee - 100 Credits', 100, true),
  ('HIRINGSEASON100', 'Peak Hiring Season Special - 100 Credits', 100, true),

  -- ── 120–150 Credits: Executive, Bootcamp & Partner Tier ──
  ('EXCLUSIVE120', 'Exclusive Partner Perks - 120 Credits', 120, true),
  ('SPECIAL125', 'Special Partnership & Bootcamp Promo - 125 Credits', 125, true),
  ('POWERUSER140', 'Power User Executive Campaign - 140 Credits', 140, true),
  ('ULTIMATE150', 'Ultimate All-Access VIP Promotion - 150 Credits', 150, true),
  ('EXECUTIVE150', 'Executive Job Search Program - 150 Credits', 150, true)
ON CONFLICT (code) DO UPDATE SET
  credits_granted = EXCLUDED.credits_granted,
  description = EXCLUDED.description,
  is_active = true;
