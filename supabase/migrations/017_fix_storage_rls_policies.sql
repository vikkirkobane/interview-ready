-- Migration 017: Fix storage RLS policies
--
-- Problem: The INSERT/SELECT/UPDATE/DELETE policies check
--   (storage.foldername(name))[1] = auth.uid()
-- but upload paths are structured as:
--   jd-uploads/{user_id}/{filename}
-- so foldername(name)[1] = 'jd-uploads', NOT the user ID.
-- The user ID is at index [2], causing all uploads to fail with
-- "new row violates row-level security policy for table objects".
--
-- Fix: Check index [2] for the user ID across all four policies.

-- Drop old incorrect policies
DROP POLICY IF EXISTS "Users can upload their own files" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their own files" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own files" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own files" ON storage.objects;

-- Re-create with correct index [2] (the user ID segment)
CREATE POLICY "Users can upload their own files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'interview-ready-files'
  AND (storage.foldername(name))[2] = auth.uid()::text
);

CREATE POLICY "Users can view their own files"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'interview-ready-files'
  AND (storage.foldername(name))[2] = auth.uid()::text
);

CREATE POLICY "Users can update their own files"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'interview-ready-files'
  AND (storage.foldername(name))[2] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'interview-ready-files'
  AND (storage.foldername(name))[2] = auth.uid()::text
);

CREATE POLICY "Users can delete their own files"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'interview-ready-files'
  AND (storage.foldername(name))[2] = auth.uid()::text
);
