-- Migration 016: Fix handle_new_user to support LinkedIn OAuth metadata
--
-- Problem: LinkedIn OIDC sends user metadata with different field names than
-- email/password or Google signups:
--   • Name:   'given_name' / 'family_name' (not 'first_name' / 'last_name')
--   • Full:   'full_name' or 'name'
--   • Avatar: 'picture' (not 'avatar_url')
--
-- This migration updates handle_new_user() to check all variants so that
-- LinkedIn users get their name and avatar stored correctly on signup.
--
-- Also adds ON CONFLICT DO NOTHING to guard against duplicate-insert races
-- (e.g., webhook firing at the same time as the trigger).

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_first_name TEXT;
  v_last_name  TEXT;
  v_avatar_url TEXT;
  v_full_name  TEXT;
  v_name_parts TEXT[];
BEGIN
  -- ── 1. Resolve first_name ────────────────────────────────────────────────
  -- Try explicit first_name → LinkedIn's given_name → split full_name/name
  v_first_name := COALESCE(
    NULLIF(NEW.raw_user_meta_data->>'first_name', ''),
    NULLIF(NEW.raw_user_meta_data->>'given_name', ''),
    NULL
  );

  -- ── 2. Resolve last_name ─────────────────────────────────────────────────
  v_last_name := COALESCE(
    NULLIF(NEW.raw_user_meta_data->>'last_name', ''),
    NULLIF(NEW.raw_user_meta_data->>'family_name', ''),
    NULL
  );

  -- ── 3. Fallback: split full_name or name ─────────────────────────────────
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

  -- ── 4. Resolve avatar_url ────────────────────────────────────────────────
  -- LinkedIn sends 'picture'; Google/email send 'avatar_url'
  v_avatar_url := COALESCE(
    NULLIF(NEW.raw_user_meta_data->>'avatar_url', ''),
    NULLIF(NEW.raw_user_meta_data->>'picture', '')
  );

  -- ── 5. Insert user row ───────────────────────────────────────────────────
  INSERT INTO public.users (id, email, first_name, last_name, avatar_url, ai_credits, credit_balance)
  VALUES (
    NEW.id,
    NEW.email,
    v_first_name,
    v_last_name,
    v_avatar_url,
    10,
    10
  )
  ON CONFLICT (id) DO NOTHING;  -- guard against duplicate-trigger races

  -- ── 6. Insert empty profile row ──────────────────────────────────────────
  INSERT INTO public.user_profiles (user_id, profile_completeness)
  VALUES (NEW.id, 0)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
