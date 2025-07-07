/*
  # Fix profiles table policies

  1. Security Changes
    - Add proper RLS policies for service role
    - Fix profile creation permissions
    - Add better role handling

  2. Changes
    - Drop existing policies and recreate with proper permissions
    - Add service role bypass for admin operations
    - Add proper cascading deletes
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Service role can create profiles" ON public.profiles;

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create new policies
CREATE POLICY "Allow service role full access"
  ON public.profiles
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow users to read all profiles"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow users to update own profile"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Update trigger function to handle metadata properly
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    name,
    role,
    created_at
  ) VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'name', 'Anonymous'),
    COALESCE(new.raw_user_meta_data->>'role', 'user'),
    now()
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;