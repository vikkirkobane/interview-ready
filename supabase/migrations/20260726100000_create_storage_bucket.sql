-- Create a storage bucket for user uploads
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'interview-ready-files',
  'interview-ready-files',
  true,
  52428800,
  ARRAY['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'image/png', 'image/jpeg']::text[]
)
ON CONFLICT (id) DO NOTHING;

-- Set up storage policies to allow authenticated users to manage their own files
-- Policy for inserting (uploading) objects
CREATE POLICY "Users can upload their own files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'interview-ready-files'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy for selecting (downloading) objects
CREATE POLICY "Users can view their own files"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'interview-ready-files'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy for updating objects
CREATE POLICY "Users can update their own files"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'interview-ready-files'
  AND (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'interview-ready-files'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy for deleting objects
CREATE POLICY "Users can delete their own files"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'interview-ready-files'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
