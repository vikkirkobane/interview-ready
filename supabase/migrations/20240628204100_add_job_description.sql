-- Add job_description column to mock_interviews
ALTER TABLE public.mock_interviews 
ADD COLUMN job_description TEXT;
