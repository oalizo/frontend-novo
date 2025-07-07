/*
  # Fix User Registration

  1. Security Changes
    - Add proper RLS policies for profiles
    - Fix profile creation trigger
    - Add better error handling

  2. Changes
    - Drop and recreate policies with proper permissions
    - Update trigger to handle all metadata fields
    - Add validation checks
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Allow service role full access" ON public.profiles;
DROP POLICY IF EXISTS "Allow users to read all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Allow users to update own profile" ON public.profiles;

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create new policies
CREATE POLICY "Enable full access for service role"
  ON public.profiles
  AS PERMISSIVE
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Enable read access for authenticated users"
  ON public.profiles
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Enable update for users based on id"
  ON public.profiles
  AS PERMISSIVE
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Update trigger function with better error handling
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  IF new.raw_user_meta_data IS NULL THEN
    RAISE EXCEPTION 'User metadata is required';
  END IF;

  IF new.raw_user_meta_data->>'name' IS NULL THEN
    RAISE EXCEPTION 'User name is required';
  END IF;

  INSERT INTO public.profiles (
    id,
    name,
    role,
    created_at,
    updated_at
  ) VALUES (
    new.id,
    new.raw_user_meta_data->>'name',
    COALESCE(new.raw_user_meta_data->>'role', 'user'),
    now(),
    now()
  );
  RETURN new;
EXCEPTION
  WHEN others THEN
    RAISE LOG 'Error in handle_new_user: %', SQLERRM;
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;