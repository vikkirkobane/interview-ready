CREATE OR REPLACE FUNCTION public.auto_generate_referral_code()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.referral_code IS NULL THEN
    -- Explicitly qualify with public. to avoid search_path issues during auth.signUp
    NEW.referral_code := public.generate_referral_code(NEW.id, NEW.first_name);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
