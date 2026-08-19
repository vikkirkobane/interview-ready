-- Migration 022: Add Extended Seed Promo Codes & Ensure Robust Case-Insensitive Matching

INSERT INTO public.promo_codes (code, description, credits_granted, is_active)
VALUES
  ('WELCOME', 'Welcome Community Special - 20 Credits', 20, true),
  ('WELCOME50', 'Welcome Launch Special - 50 Credits', 50, true),
  ('LAUNCH100', 'Official Launch VIP Bonus - 100 Credits', 100, true),
  ('PRO2026', 'Pro Member Promo - 50 Credits', 50, true),
  ('INTERVIEWREADY', 'Interview Ready Exclusive - 30 Credits', 30, true),
  ('BONUS20', 'Bonus Campaign - 20 Credits', 20, true),
  ('REDDIT20', 'Reddit Community Bonus - 20 Credits', 20, true),
  ('TWITTER20', 'Twitter / X Community Bonus - 20 Credits', 20, true)
ON CONFLICT (code) DO UPDATE SET
  credits_granted = EXCLUDED.credits_granted,
  is_active = true;
