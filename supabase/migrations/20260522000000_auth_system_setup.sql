-- 20260522000000_auth_system_setup.sql
-- Create users table if not exists with all required columns
CREATE TABLE IF NOT EXISTS public.users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_name text NOT NULL,
  email text UNIQUE NOT NULL,
  location text,
  created_at timestamptz DEFAULT now() NOT NULL,
  auth_user_id uuid UNIQUE REFERENCES auth.users (id) ON DELETE CASCADE
);

-- Ensure auth_user_id column is added if the users table already exists
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS auth_user_id uuid UNIQUE REFERENCES auth.users (id) ON DELETE CASCADE;

-- Enable Row Level Security (RLS) on users table
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Policy 1: Allow authenticated inserts (used on signup verification callback)
DROP POLICY IF EXISTS "Allow authenticated inserts for signup" ON public.users;
CREATE POLICY "Allow authenticated inserts for signup" 
  ON public.users FOR INSERT 
  TO authenticated
  WITH CHECK (auth.uid() = auth_user_id);

-- Policy 2: Allow authenticated users to view their own profile details
DROP POLICY IF EXISTS "Allow users to view their own profile" ON public.users;
CREATE POLICY "Allow users to view their own profile" 
  ON public.users FOR SELECT 
  TO authenticated
  USING (auth.uid() = auth_user_id);
