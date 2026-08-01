-- Add difficulty column to mock_interviews so user-selected difficulty
-- (BEGINNER / INTERMEDIATE / SENIOR) is persisted and used by the
-- interviews-message and interviews-feedback prompts.
ALTER TABLE public.mock_interviews
  ADD COLUMN IF NOT EXISTS difficulty TEXT DEFAULT 'INTERMEDIATE';
