
-- TEST: Verify handle_new_user() function creates records correctly
BEGIN;

-- Insert a mock auth user to simulate signup
INSERT INTO auth.users (id, email, raw_user_meta_data, created_at, updated_at)
VALUES (
  'test-user-123',
  'test@example.com',
  '{"first_name": "Test", "last_name": "User", "avatar_url": "https://example.com/avatar.jpg"}'::jsonb,
  NOW(),
  NOW()
);

-- Verify that the trigger created corresponding records
DO $$
BEGIN
  -- Check if user was created in public.users
  IF NOT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = 'test-user-123'
    AND email = 'test@example.com'
    AND first_name = 'Test'
    AND last_name = 'User'
    AND ai_credits = 10  -- Default free tier credits
  ) THEN
    RAISE EXCEPTION 'User record not created in public.users';
  END IF;

  -- Check if profile was created in public.user_profiles
  IF NOT EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE user_id = 'test-user-123'
    AND profile_completeness = 0  -- Starts at 0%
  ) THEN
    RAISE EXCEPTION 'User profile not created in public.user_profiles';
  END IF;

  -- Verify RLS policies allow user to access own data
  SET ROLE test_user;
  SET request.jwt.claims.text = '{"sub":"test-user-123"}';

  -- User should be able to see own record
  IF NOT EXISTS (
    SELECT 1 FROM public.users WHERE id = 'test-user-123'
  ) THEN
    RAISE EXCEPTION 'RLS policy does not allow user to access own record';
  END IF;

  -- User should not be able to see other users' records
  IF EXISTS (
    SELECT 1 FROM public.users WHERE id != 'test-user-123'
  ) THEN
    RAISE EXCEPTION 'RLS policy allows user to access other records';
  END IF;

  RAISE NOTICE '✓ All database creation tests passed';
END $$;

ROLLBACK;
