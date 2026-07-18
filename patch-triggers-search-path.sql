-- Patch handle_new_user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, email, first_name, last_name, ai_credits, credit_balance)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'first_name',
    NEW.raw_user_meta_data->>'last_name',
    10,
    10
  );

  INSERT INTO public.user_profiles (user_id, profile_completeness)
  VALUES (NEW.id, 0);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Patch auto_generate_referral_code
CREATE OR REPLACE FUNCTION public.auto_generate_referral_code()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.referral_code IS NULL THEN
    NEW.referral_code := public.generate_referral_code(NEW.id, NEW.first_name);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Patch prevent_referral_column_tampering
CREATE OR REPLACE FUNCTION public.prevent_referral_column_tampering()
RETURNS TRIGGER AS $$
BEGIN
  IF current_setting('app.referral_lock', true) = 'unlocked' THEN
    RETURN NEW;
  END IF;

  IF OLD.referral_code IS DISTINCT FROM NEW.referral_code THEN
    RAISE EXCEPTION 'Cannot modify referral_code directly. Use the referral system.';
  END IF;

  IF OLD.referred_by IS DISTINCT FROM NEW.referred_by THEN
    RAISE EXCEPTION 'Cannot modify referred_by directly. Use the referral system.';
  END IF;

  IF OLD.total_referrals IS DISTINCT FROM NEW.total_referrals THEN
    RAISE EXCEPTION 'Cannot modify total_referrals directly. Use the referral system.';
  END IF;

  IF OLD.referral_credits_earned IS DISTINCT FROM NEW.referral_credits_earned THEN
    RAISE EXCEPTION 'Cannot modify referral_credits_earned directly. Use the referral system.';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
