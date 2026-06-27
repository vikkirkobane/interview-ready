-- Migration to fix missing user_profiles and update trigger
-- This fixes the "User profile not found" error

-- Step 1: Create user_profiles for any existing users that don't have one
INSERT INTO public.user_profiles (user_id, profile_completeness)
SELECT u.id, 0
FROM public.users u
LEFT JOIN public.user_profiles up ON u.id = up.user_id
WHERE up.id IS NULL;

-- Step 2: Update the trigger to always create user_profiles
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Create user in public.users
  INSERT INTO public.users (id, email, first_name, last_name)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'first_name',
    NEW.raw_user_meta_data->>'last_name'
  );
  
  -- Create empty user_profile (CRITICAL - prevents "User profile not found" errors)
  INSERT INTO public.user_profiles (user_id, profile_completeness)
  VALUES (NEW.id, 0);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Verify the fix
DO $$
DECLARE
  missing_profiles INT;
BEGIN
  SELECT COUNT(*) INTO missing_profiles
  FROM public.users u
  LEFT JOIN public.user_profiles up ON u.id = up.user_id
  WHERE up.id IS NULL;
  
  IF missing_profiles > 0 THEN
    RAISE WARNING 'Still have % users without profiles after migration', missing_profiles;
  ELSE
    RAISE NOTICE 'All users now have profiles. Migration successful!';
  END IF;
END $$;
