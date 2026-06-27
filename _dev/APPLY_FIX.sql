-- ============================================================================
-- CRITICAL FIX: Apply this SQL in your Supabase Dashboard SQL Editor
-- ============================================================================
-- This fixes the "User profile not found" error by:
-- 1. Creating missing user_profiles for existing users
-- 2. Updating the trigger to always create profiles on signup
-- ============================================================================

-- Step 1: Backfill missing user_profiles for existing users
INSERT INTO public.user_profiles (user_id, profile_completeness)
SELECT u.id, 0
FROM public.users u
LEFT JOIN public.user_profiles up ON u.id = up.user_id
WHERE up.id IS NULL;

-- Step 2: Update the trigger to create both users AND user_profiles
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

-- Step 3: Verify the fix worked
DO $$
DECLARE
  total_users INT;
  users_with_profiles INT;
  missing_profiles INT;
BEGIN
  SELECT COUNT(*) INTO total_users FROM public.users;
  SELECT COUNT(*) INTO users_with_profiles 
  FROM public.users u
  INNER JOIN public.user_profiles up ON u.id = up.user_id;
  
  missing_profiles := total_users - users_with_profiles;
  
  RAISE NOTICE '===========================================';
  RAISE NOTICE 'Fix Verification Results:';
  RAISE NOTICE '===========================================';
  RAISE NOTICE 'Total users: %', total_users;
  RAISE NOTICE 'Users with profiles: %', users_with_profiles;
  RAISE NOTICE 'Missing profiles: %', missing_profiles;
  
  IF missing_profiles = 0 THEN
    RAISE NOTICE '✅ SUCCESS: All users now have profiles!';
  ELSE
    RAISE WARNING '⚠️  WARNING: Still have % users without profiles', missing_profiles;
  END IF;
  RAISE NOTICE '===========================================';
END $$;

-- ============================================================================
-- HOW TO APPLY THIS FIX:
-- ============================================================================
-- 1. Go to https://supabase.com/dashboard/project/rdxcvqcxgvdgvxvfkhlr/sql
-- 2. Copy and paste this entire SQL script
-- 3. Click "Run" button
-- 4. Check the output for verification results
-- 5. Test signup with a new user to confirm the fix works
-- ============================================================================
