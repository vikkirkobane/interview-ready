-- ─── PROFILE COMPLETENESS TRIGGER ───────────────────────────────────────────
-- Single source of truth for user_profiles.profile_completeness.
--
-- A BEFORE INSERT/UPDATE trigger recomputes the score from the row being
-- written, so the value stays correct no matter which code path persists the
-- profile: the profile-update edge function, the Zustand store's direct
-- .update() calls (inline work-history/education/skills edits), LinkedIn
-- imports, or anything else. Previously, only the profile-update edge function
-- recalculated — every other write left the column stale, so the home-screen
-- Completeness card didn't move when users added work history or education
-- via the inline modals.
--
-- Scoring mirrors calculateProfileCompleteness() in
-- supabase/functions/profile-get/index.ts — keep them in sync.

-- ─── Scoring function ───────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.calculate_profile_completeness(profile public.user_profiles)
RETURNS INT
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  score INT := 0;
  work_count INT;
  edu_count INT;
  proj_count INT;
  cert_count INT;
  award_count INT;
  total_skills INT;
  skills_score INT;
BEGIN
  -- Contact info (10%)
  IF COALESCE(profile.phone, '') <> '' THEN score := score + 2; END IF;
  IF COALESCE(profile.location, '') <> '' THEN score := score + 2; END IF;
  IF COALESCE(profile.linkedin_url, '') <> '' THEN score := score + 3; END IF;
  IF COALESCE(profile.portfolio_url, '') <> '' THEN score := score + 3; END IF;

  -- Work history (30%): 5 pts per entry, capped at 30
  work_count := COALESCE(jsonb_array_length(COALESCE(profile.work_history, '[]'::jsonb)), 0);
  IF work_count > 0 THEN
    score := score + LEAST(work_count * 5, 30);
  END IF;

  -- Skills (20%): >=5 skills = full marks, else proportional (total / 5 * 20)
  total_skills := COALESCE(array_length(COALESCE(profile.technical_skills, ARRAY[]::TEXT[]), 1), 0)
                + COALESCE(array_length(COALESCE(profile.soft_skills, ARRAY[]::TEXT[]), 1), 0);
  IF total_skills >= 5 THEN
    score := score + 20;
  ELSIF total_skills > 0 THEN
    skills_score := ROUND((total_skills::numeric / 5) * 20)::INT;
    score := score + skills_score;
  END IF;

  -- Education (15%)
  edu_count := COALESCE(jsonb_array_length(COALESCE(profile.education, '[]'::jsonb)), 0);
  IF edu_count > 0 THEN score := score + 15; END IF;

  -- Projects / Portfolio (15%)
  proj_count := COALESCE(jsonb_array_length(COALESCE(profile.projects, '[]'::jsonb)), 0);
  IF proj_count > 0 OR COALESCE(profile.portfolio_url, '') <> '' THEN
    score := score + 15;
  END IF;

  -- Additional (10%): certifications + awards
  cert_count := COALESCE(jsonb_array_length(COALESCE(profile.certifications, '[]'::jsonb)), 0);
  IF cert_count > 0 THEN score := score + 5; END IF;
  award_count := COALESCE(jsonb_array_length(COALESCE(profile.awards, '[]'::jsonb)), 0);
  IF award_count > 0 THEN score := score + 5; END IF;

  RETURN LEAST(score, 100);
END;
$$;

-- ─── Trigger function ──────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.set_profile_completeness()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Recompute on every write; ignore any value the client tried to set
  -- directly so the score can never be spoofed or left stale.
  NEW.profile_completeness := public.calculate_profile_completeness(NEW);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_profile_completeness ON public.user_profiles;
CREATE TRIGGER trg_set_profile_completeness
  BEFORE INSERT OR UPDATE ON public.user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.set_profile_completeness();

-- ─── Backfill existing rows ─────────────────────────────────────────────────
-- Recalculate for every profile already in the DB so the card is correct
-- immediately on deploy. (The UPDATE fires the trigger, which recomputes
-- from the full row — the value we set here is just to force the write.)
UPDATE public.user_profiles
  SET profile_completeness = public.calculate_profile_completeness(user_profiles);
