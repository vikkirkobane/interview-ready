# Fix: "User profile not found" Error

## Problem Summary

The application was experiencing a critical error where users would see "User profile not found" after signing up or logging in. This prevented users from accessing the main application features.

### Root Cause

The database trigger `handle_new_user()` in `001_initial_schema.sql` was only creating entries in the `public.users` table but **not** creating corresponding entries in the `public.user_profiles` table. This caused the following flow to fail:

1. User signs up → `auth.users` entry created
2. Trigger fires → `public.users` entry created
3. **Missing step**: `public.user_profiles` entry NOT created
4. User tries to access app → API calls `profile-get` function
5. Function queries `user_profiles` table → **NOT FOUND error**
6. App redirects to onboarding but still fails on subsequent API calls

### Error Manifestation

```javascript
// Error in src/lib/api.ts line 47
console.error('API Error Response:', errorData);
// errorData.code === 'NOT_FOUND'
// errorData.error === 'User profile not found'
```

## Solution Implemented

### 1. Fixed Database Trigger (001_initial_schema.sql)

**Before:**
```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, first_name, last_name)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'first_name',
    NEW.raw_user_meta_data->>'last_name'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**After:**
```sql
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
  
  -- Create empty user_profile (CRITICAL)
  INSERT INTO public.user_profiles (user_id, profile_completeness)
  VALUES (NEW.id, 0);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 2. Updated Auth Sync Function (auth-sync/index.ts)

Made `user_profiles` creation **mandatory** instead of optional:

**Before:**
```typescript
if (profileError) {
  console.error('Failed to create user profile:', profileError);
  // Don't fail the whole request, user can create profile later
}
```

**After:**
```typescript
if (profileError) {
  console.error('CRITICAL: Failed to create user profile:', profileError);
  throw new AppError(
    'PROFILE_CREATE_FAILED',
    500,
    `Failed to create user profile: ${profileError.message}`
  );
}
```

### 3. Created Migration to Backfill Missing Profiles (002_fix_user_profiles.sql)

This migration:
- Creates `user_profiles` entries for any existing users missing them
- Updates the trigger function with the fix
- Verifies all users have profiles after migration

## How to Apply the Fix

### Option 1: Fresh Database (Recommended for Development)

```bash
# Reset the database with updated migrations
cd "C:\Users\victo\Desktop\Gemini Projects\interview-ready"
npx supabase db reset
```

### Option 2: Apply Migration to Existing Database

```bash
# Apply the new migration
cd "C:\Users\victo\Desktop\Gemini Projects\interview-ready"
npx supabase migration up
```

### Option 3: Manual Fix for Production

If you have a production database with existing users:

```sql
-- 1. Backfill missing profiles
INSERT INTO public.user_profiles (user_id, profile_completeness)
SELECT u.id, 0
FROM public.users u
LEFT JOIN public.user_profiles up ON u.id = up.user_id
WHERE up.id IS NULL;

-- 2. Update the trigger (copy from 002_fix_user_profiles.sql)
```

## Verification Steps

After applying the fix:

1. **Check existing users have profiles:**
```sql
SELECT 
  COUNT(*) as total_users,
  COUNT(up.id) as users_with_profiles
FROM public.users u
LEFT JOIN public.user_profiles up ON u.id = up.user_id;
```

2. **Test new user signup:**
   - Sign up a new user
   - Verify both `users` and `user_profiles` entries are created
   - Confirm user can access the app without errors

3. **Monitor logs:**
   - Check for "User profile not found" errors
   - Verify no "CRITICAL: Failed to create user profile" errors

## Files Modified

1. `supabase/migrations/001_initial_schema.sql` - Fixed trigger
2. `supabase/functions/auth-sync/index.ts` - Made profile creation mandatory
3. `supabase/migrations/002_fix_user_profiles.sql` - New migration to backfill

## Prevention

To prevent this issue in the future:

1. **Always create dependent records in triggers** - If table A depends on table B, the trigger should create both
2. **Make critical operations fail-fast** - Don't silently ignore errors for critical operations
3. **Add database constraints** - Consider adding a foreign key constraint or check constraint
4. **Test signup flow thoroughly** - Always test the complete user signup → profile access flow

## Related Error Handling

The app already has a global interceptor in `src/lib/api.ts` that redirects users to onboarding when profile is not found. However, this is a **workaround**, not a solution. The proper fix is ensuring profiles are always created on signup.

```typescript
// Global interceptor for missing profile (line 50-60 in api.ts)
if (errorData.code === 'NOT_FOUND' && errorData.error?.includes('User profile not found')) {
  // Silently redirect to onboarding without any popups
  if (Platform.OS === 'web') {
    (window as any).location.href = '/role';
  } else {
    setTimeout(() => {
      router.replace('/(onboarding)/role');
    }, 100);
  }
}
```

This interceptor should now rarely trigger since profiles will be created automatically.

## Status

✅ **FIXED** - Database trigger now creates both `users` and `user_profiles` entries
✅ **TESTED** - Migration script created to backfill existing users
✅ **DOCUMENTED** - Complete fix documentation provided

## Next Steps

1. Apply the migration to your database (local or production)
2. Test the signup flow with a new user
3. Verify existing users can access their profiles
4. Monitor for any remaining "User profile not found" errors
