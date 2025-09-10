-- Migration: Create allowed_users table for email-based access control
-- Date: 2025-09-10
-- Description: This table stores the list of email addresses that are allowed to access the application

CREATE TABLE IF NOT EXISTS public.allowed_users (
  email TEXT PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  added_by TEXT DEFAULT 'system'
);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_allowed_users_updated_at BEFORE UPDATE
  ON allowed_users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE public.allowed_users ENABLE ROW LEVEL SECURITY;

-- Create policy for service role access
CREATE POLICY "Service role can manage allowed_users" ON public.allowed_users
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');

-- IMPORTANT: Create policy for anon users to read the allowlist
-- This is required for the middleware to check if users are allowed
CREATE POLICY "Anon users can read allowed_users" ON public.allowed_users
  FOR SELECT USING (true);

-- Add initial admin users (replace with actual admin emails)
INSERT INTO public.allowed_users (email) VALUES 
  ('stevenjiangnz@gmail.com'),
  ('stevenjiangchat@gmail.com')
ON CONFLICT (email) DO NOTHING;