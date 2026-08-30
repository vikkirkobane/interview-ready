-- Migration 025: Add Contact Messages Table for Support Inquiries
-- Stores contact form submissions sent to info@appinterviewready.top

CREATE TABLE IF NOT EXISTS public.contact_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT DEFAULT 'new' CHECK (status IN ('new', 'in_progress', 'resolved', 'spam')),
  source TEXT DEFAULT 'web_contact_form',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;

-- Allow anyone (including unauthenticated visitors) to submit contact messages
CREATE POLICY "Allow public contact message submission"
  ON public.contact_messages
  FOR INSERT
  WITH CHECK (true);

-- Authenticated users can view their own submitted messages
CREATE POLICY "Users can read own contact messages"
  ON public.contact_messages
  FOR SELECT
  USING (auth.uid() = user_id);

-- Create index for status and created_at
CREATE INDEX IF NOT EXISTS idx_contact_messages_created_at ON public.contact_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_contact_messages_email ON public.contact_messages(email);
