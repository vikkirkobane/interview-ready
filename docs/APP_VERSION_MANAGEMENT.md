# App Version Management & Force Update System

**Version:** 1.0.0  
**Date:** July 4, 2026  
**Status:** ✅ Fully Implemented

---

## Overview

Interview Ready includes a robust app version management system that allows you to:
- **Enforce minimum app versions** - Block outdated apps from accessing the service
- **Notify users of updates** - Encourage users to update without blocking access
- **Force updates** - Require immediate updates for critical security or compatibility issues
- **Platform-specific control** - Set different version requirements for iOS and Android

---

## How It Works

### 1. Version Check Flow

```
App Launch → Check Version → Compare with Minimum → Show Update Screen (if needed)
```

**Detailed Flow:**
1. App starts and loads `_layout.tsx`
2. `useAppVersion` hook automatically checks current version against database
3. If version is outdated and `force_update = true`, shows `ForceUpdateScreen`
4. User must update to continue (or can skip if `force_update = false`)
5. After update, app functions normally

### 2. Version Comparison

Uses **semantic versioning** (semver) format: `MAJOR.MINOR.PATCH`

Examples:
- `1.0.0` - Initial release
- `1.1.0` - Minor update (new features)
- `1.0.1` - Patch update (bug fixes)
- `2.0.0` - Major update (breaking changes)

**Comparison Logic:**
- `1.0.0` < `1.0.1` (patch update needed)
- `1.0.1` < `1.1.0` (minor update needed)
- `1.1.0` < `2.0.0` (major update needed)

---

## Database Schema

### Table: `app_versions`

```sql
CREATE TABLE public.app_versions (
  id UUID PRIMARY KEY,
  platform TEXT NOT NULL,              -- 'ios', 'android', or 'all'
  minimum_version TEXT NOT NULL,       -- Minimum required version
  latest_version TEXT NOT NULL,        -- Latest available version
  force_update BOOLEAN DEFAULT false,  -- If true, blocks app access
  update_message TEXT,                 -- Custom message to users
  store_url TEXT,                      -- App Store/Play Store URL
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
```

### Functions

1. **`check_app_version(platform, current_version)`**
   - Compares current version with minimum required
   - Returns version status and update information

2. **`compare_versions(v1, v2)`**
   - Compares two semantic version strings
   - Returns -1 (v1 < v2), 0 (equal), or 1 (v1 > v2)

3. **`update_app_version_config(...)`**
   - Updates version requirements (admin only)
   - Deactivates old configs and creates new ones

---

## Managing App Versions

### Option 1: Using Supabase Dashboard (Recommended)

**Step 1: Navigate to Database**
1. Open Supabase Dashboard
2. Go to **Database → Tables**
3. Select `app_versions` table

**Step 2: Update Version Requirements**

For iOS:
```sql
-- Update iOS minimum version to 1.2.0 (force update)
SELECT update_app_version_config(
  'ios',                    -- platform
  '1.2.0',                  -- minimum_version
  '1.2.0',                  -- latest_version
  true,                     -- force_update
  'Critical security update required. Please update to continue using Interview Ready.',
  'https://apps.apple.com/app/interview-ready/id123456789'
);
```

For Android:
```sql
-- Update Android minimum version to 1.2.0 (optional update)
SELECT update_app_version_config(
  'android',
  '1.2.0',
  '1.2.0',
  false,                    -- force_update = false (optional)
  'A new version is available with improved features!',
  'https://play.google.com/store/apps/details?id=com.interviewready.app'
);
```

For Both Platforms:
```sql
-- Update both platforms at once
SELECT update_app_version_config(
  'all',
  '1.2.0',
  '1.2.0',
  true,
  'Critical update required for all users.',
  NULL  -- Will use platform-specific store URLs
);
```

### Option 2: Direct SQL Insert

```sql
-- Deactivate old configs
UPDATE app_versions 
SET is_active = false 
WHERE platform = 'ios' AND is_active = true;

-- Insert new config
INSERT INTO app_versions (
  platform,
  minimum_version,
  latest_version,
  force_update,
  update_message,
  store_url,
  is_active
)
VALUES (
  'ios',
  '1.2.0',
  '1.2.0',
  true,
  'Please update to the latest version.',
  'https://apps.apple.com/app/interview-ready/id123456789',
  true
);
```

---

## Update Scenarios

### Scenario 1: Optional Update (Soft Prompt)

**Use Case:** Minor bug fixes, performance improvements

**Configuration:**
```sql
SELECT update_app_version_config(
  'all',
  '1.1.0',      -- minimum_version
  '1.2.0',      -- latest_version
  false,        -- force_update = false
  'Version 1.2.0 is available with bug fixes and improvements!',
  NULL
);
```

**User Experience:**
- App shows update notification
- User can choose to update or continue
- "Continue with Current Version" button available

### Scenario 2: Required Update (Force Update)

**Use Case:** Critical security fixes, breaking API changes

**Configuration:**
```sql
SELECT update_app_version_config(
  'all',
  '2.0.0',      -- minimum_version
  '2.0.0',      -- latest_version
  true,         -- force_update = true
  'Critical security update required. Please update immediately.',
  NULL
);
```

**User Experience:**
- App shows full-screen update prompt
- No "Continue" button available
- Must update to access app

### Scenario 3: Platform-Specific Update

**Use Case:** iOS has critical bug, Android is fine

**Configuration:**
```sql
-- Force update for iOS only
SELECT update_app_version_config(
  'ios',
  '1.2.1',
  '1.2.1',
  true,
  'Critical iOS bug fix. Please update immediately.',
  'https://apps.apple.com/app/interview-ready/id123456789'
);

-- Optional update for Android
SELECT update_app_version_config(
  'android',
  '1.2.0',
  '1.2.1',
  false,
  'New version available with improvements!',
  'https://play.google.com/store/apps/details?id=com.interviewready.app'
);
```

---

## Testing the Force Update System

### Test 1: Optional Update (No Force)

**Setup:**
```sql
SELECT update_app_version_config(
  'all',
  '1.0.0',      -- Current app version
  '1.1.0',      -- Latest version
  false,        -- No force update
  'Test optional update message',
  NULL
);
```

**Expected Behavior:**
- ✅ App loads normally
- ✅ No blocking screen shown
- ✅ User can access all features

**To Test Force Update:**
```sql
-- Change minimum version to higher than current
SELECT update_app_version_config(
  'all',
  '2.0.0',      -- Higher than current (1.0.0)
  '2.0.0',
  false,
  'Test optional update - you should see update prompt',
  NULL
);
```

**Expected Behavior:**
- ✅ App shows update screen
- ✅ "Continue with Current Version" button visible
- ✅ Can skip update and use app

### Test 2: Force Update (Blocking)

**Setup:**
```sql
SELECT update_app_version_config(
  'all',
  '2.0.0',      -- Higher than current
  '2.0.0',
  true,         -- Force update enabled
  'Test force update - you must update to continue',
  NULL
);
```

**Expected Behavior:**
- ✅ App shows full-screen update prompt
- ✅ No "Continue" button available
- ✅ Cannot access app without updating
- ✅ "Update on App Store/Play Store" button visible

### Test 3: Platform-Specific Update

**Setup:**
```sql
-- iOS force update
SELECT update_app_version_config(
  'ios',
  '2.0.0',
  '2.0.0',
  true,
  'iOS users must update',
  'https://apps.apple.com/app/interview-ready/id123456789'
);

-- Android optional update
SELECT update_app_version_config(
  'android',
  '1.0.0',
  '1.1.0',
  false,
  'Android users can update optionally',
  'https://play.google.com/store/apps/details?id=com.interviewready.app'
);
```

**Expected Behavior:**
- ✅ iOS: Shows force update screen
- ✅ Android: App works normally (or shows optional update)

### Test 4: Reset to Normal

**Setup:**
```sql
-- Reset to current version (no update needed)
SELECT update_app_version_config(
  'all',
  '1.0.0',      -- Same as current
  '1.0.0',
  false,
  'App is up to date',
  NULL
);
```

**Expected Behavior:**
- ✅ App loads normally
- ✅ No update screens shown
- ✅ Full access to all features

---

## Store URLs

### iOS App Store URL Format
```
https://apps.apple.com/app/interview-ready/id[APP_ID]
```

**How to Get:**
1. Go to [App Store Connect](https://appstoreconnect.apple.com)
2. Select your app
3. Copy the App Store URL from app details

### Android Play Store URL Format
```
https://play.google.com/store/apps/details?id=com.interviewready.app
```

**How to Get:**
1. Go to [Google Play Console](https://play.google.com/console)
2. Select your app
3. Copy the package name (e.g., `com.interviewready.app`)
4. Format: `https://play.google.com/store/apps/details?id=[PACKAGE_NAME]`

---

## Deployment Checklist

### Initial Setup

- [ ] Run database migration: `npx supabase db push`
- [ ] Deploy edge function: `npx supabase functions deploy app-version-check`
- [ ] Verify default configs exist in database
- [ ] Update store URLs with actual App Store/Play Store links

### Before Each Release

- [ ] Update version in `app.json` (e.g., `"version": "1.2.0"`)
- [ ] Build and submit to App Store/Play Store
- [ ] Wait for app review approval
- [ ] Once approved, update database version config
- [ ] Test with older app version to verify force update works

### Emergency Force Update

If critical bug or security issue discovered:

1. **Immediate Action:**
   ```sql
   SELECT update_app_version_config(
     'all',
     '[NEXT_VERSION]',
     '[NEXT_VERSION]',
     true,
     'Critical security update required. Please update immediately.',
     NULL
   );
   ```

2. **Build and Submit:**
   - Create hotfix branch
   - Fix critical issue
   - Bump patch version (e.g., 1.2.0 → 1.2.1)
   - Submit expedited review to stores

3. **Monitor:**
   - Check update adoption rate
   - Monitor error logs
   - Verify issue is resolved

---

## Monitoring & Analytics

### Check Current Version Distribution

```sql
-- See what versions users are running (requires user_devices table)
SELECT 
  app_version,
  COUNT(*) as user_count,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentage
FROM user_devices
WHERE last_seen > NOW() - INTERVAL '7 days'
GROUP BY app_version
ORDER BY user_count DESC;
```

### Check Active Version Configs

```sql
SELECT 
  platform,
  minimum_version,
  latest_version,
  force_update,
  update_message,
  created_at
FROM app_versions
WHERE is_active = true
ORDER BY platform;
```

### Version Check Logs

```bash
# View edge function logs
npx supabase functions logs app-version-check --tail
```

---

## Troubleshooting

### Issue: Update screen not showing

**Check:**
1. Verify version config is active:
   ```sql
   SELECT * FROM app_versions WHERE is_active = true;
   ```

2. Check edge function is deployed:
   ```bash
   npx supabase functions list
   ```

3. Verify app version in `app.json` matches current version

4. Check edge function logs for errors:
   ```bash
   npx supabase functions logs app-version-check
   ```

### Issue: Users stuck on update screen

**Solution:**
```sql
-- Temporarily disable force update
UPDATE app_versions
SET force_update = false
WHERE is_active = true;

-- Or reset to current version
SELECT update_app_version_config(
  'all',
  '1.0.0',  -- Current version
  '1.0.0',
  false,
  'App is up to date',
  NULL
);
```

### Issue: Wrong store URL

**Solution:**
```sql
-- Update store URL for specific platform
UPDATE app_versions
SET store_url = 'https://correct-url-here'
WHERE platform = 'ios' AND is_active = true;
```

---

## Best Practices

### 1. Version Numbering
- **Major (X.0.0):** Breaking changes, major features
- **Minor (1.X.0):** New features, backward compatible
- **Patch (1.0.X):** Bug fixes, minor improvements

### 2. Force Update Strategy
- ✅ **Use force update for:**
  - Critical security vulnerabilities
  - Breaking API changes
  - Data corruption bugs
  - Payment/billing issues

- ❌ **Don't use force update for:**
  - Minor UI improvements
  - New features
  - Performance optimizations
  - Non-critical bug fixes

### 3. Communication
- Write clear, user-friendly update messages
- Explain why update is needed
- Provide estimated update time
- Thank users for updating

### 4. Rollout Strategy
1. Release to small percentage (5-10%)
2. Monitor for issues
3. Gradually increase rollout
4. Enable force update only after stable

### 5. Testing
- Always test force update flow before enabling
- Test on both iOS and Android
- Verify store URLs work correctly
- Test with different version scenarios

---

## Files Reference

### Database
- `supabase/migrations/007_add_app_version_management.sql` - Schema and functions

### Edge Functions
- `supabase/functions/app-version-check/index.ts` - Version check API

### Frontend
- `src/hooks/useAppVersion.ts` - React hook for version checking
- `src/components/features/ForceUpdateScreen.tsx` - Update UI screen
- `app/_layout.tsx` - Integration point

### Documentation
- `docs/APP_VERSION_MANAGEMENT.md` - This file

---

## Quick Reference Commands

```bash
# Deploy edge function
npx supabase functions deploy app-version-check

# Check active configs
npx supabase db execute "SELECT * FROM app_versions WHERE is_active = true"

# Force update for all platforms
npx supabase db execute "SELECT update_app_version_config('all', '2.0.0', '2.0.0', true, 'Update required', NULL)"

# Optional update
npx supabase db execute "SELECT update_app_version_config('all', '1.0.0', '1.1.0', false, 'Update available', NULL)"

# Reset to current version
npx supabase db execute "SELECT update_app_version_config('all', '1.0.0', '1.0.0', false, 'Up to date', NULL)"

# View logs
npx supabase functions logs app-version-check --tail
```

---

**Status:** ✅ Force Update System Fully Implemented  
**Last Updated:** July 4, 2026
