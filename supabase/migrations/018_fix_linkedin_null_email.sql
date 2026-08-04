-- Migration 018: Handle null email from LinkedIn OIDC
--
-- Problem: LinkedIn's OIDC userinfo response documents `email` and
-- `email_verified` as OPTIONAL fields. Users who have not verified their
-- email address with LinkedIn, or who have privacy settings that restrict
-- email sharing, will trigger handle_new_user() with NEW.email = NULL.
--
-- Since public.users.email is TEXT UNIQUE NOT NULL, a null value causes
-- the INSERT to fail with a NOT NULL violation. The user exists in
-- auth.users but never gets a row in public.users, so every subsequent
-- PostgREST query returns nothing or errors — the user is silently broken.
--
-- Fix: Use a deterministic placeholder when email is null so the row
-- always inserts. The placeholder format is:
--   linkedin_<user_id>@noemail.interviewready.app
--
-- This is recognisable in the DB, won't collide with real emails, and
-- satisfies the UNIQUE NOT NULL constraint. The app can prompt the user
-- to supply their real email later.
--
-- Also: add a DO UPDATE path so that if the user row already exists
-- (e.g. from a previous partial signup) and later LinkedIn returns the
-- real email, we backfill it.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_first_name TEXT;
  v_last_name  TEXT;
  v_avatar_url TEXT;
  v_full_name  TEXT;
  v_name_parts TEXT[];
  v_email      TEXT;
BEGIN
  -- ── 1. Resolve email ─────────────────────────────────────────────────────
  -- LinkedIn OIDC documents email as optional. Use a placeholder when absent
  -- so the NOT NULL constraint on public.users.email is always satisfied.
  v_email := COALESCE(
    NULLIF(NEW.email, ''),
    'linkedin_' || NEW.id::text || '@noemail.interviewready.app'
  );

  -- ── 2. Resolve first_name ────────────────────────────────────────────────
  -- Try explicit first_name → LinkedIn's given_name → split full_name/name
  v_first_name := COALESCE(
    NULLIF(NEW.raw_user_meta_data->>'first_name', ''),
    NULLIF(NEW.raw_user_meta_data->>'given_name', ''),
    NULL
  );

  -- ── 3. Resolve last_name ─────────────────────────────────────────────────
  v_last_name := COALESCE(
    NULLIF(NEW.raw_user_meta_data->>'last_name', ''),
    NULLIF(NEW.raw_user_meta_data->>'family_name', ''),
    NULL
  );

  -- ── 4. Fallback: split full_name or name ─────────────────────────────────
  IF v_first_name IS NULL THEN
    v_full_name := COALESCE(
      NULLIF(NEW.raw_user_meta_data->>'full_name', ''),
      NULLIF(NEW.raw_user_meta_data->>'name', '')
    );
    IF v_full_name IS NOT NULL THEN
      v_name_parts := string_to_array(trim(v_full_name), ' ');
      v_first_name := v_name_parts[1];
      IF array_length(v_name_parts, 1) > 1 THEN
        v_last_name := array_to_string(v_name_parts[2:], ' ');
      END IF;
    END IF;
  END IF;

  -- ── 5. Resolve avatar_url ────────────────────────────────────────────────
  -- LinkedIn sends 'picture'; Google/email send 'avatar_url'
  v_avatar_url := COALESCE(
    NULLIF(NEW.raw_user_meta_data->>'avatar_url', ''),
    NULLIF(NEW.raw_user_meta_data->>'picture', '')
  );

  -- ── 6. Insert (or update) user row ──────────────────────────────────────
  -- ON CONFLICT DO UPDATE: if the row already exists (e.g. from a previous
  -- failed signup attempt), backfill any fields that were missing before —
  -- most importantly the real email if it is now available.
  INSERT INTO public.users (id, email, first_name, last_name, avatar_url, ai_credits, credit_balance)
  VALUES (
    NEW.id,
    v_email,
    v_first_name,
    v_last_name,
    v_avatar_url,
    10,
    10
  )
  ON CONFLICT (id) DO UPDATE
    SET
      -- Only backfill email if the existing value is a placeholder
      email      = CASE
                     WHEN public.users.email LIKE '%@noemail.interviewready.app'
                       AND EXCLUDED.email NOT LIKE '%@noemail.interviewready.app'
                     THEN EXCLUDED.email
                     ELSE public.users.email
                   END,
      first_name = COALESCE(public.users.first_name, EXCLUDED.first_name),
      last_name  = COALESCE(public.users.last_name,  EXCLUDED.last_name),
      avatar_url = COALESCE(public.users.avatar_url, EXCLUDED.avatar_url);

  -- ── 7. Insert empty profile row ──────────────────────────────────────────
  INSERT INTO public.user_profiles (user_id, profile_completeness)
  VALUES (NEW.id, 0)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
