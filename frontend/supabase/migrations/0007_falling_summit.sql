/*
  # Create Profiles Table
  
  1. Schema Changes
    - Create profiles table for user metadata
    - Add necessary columns and constraints
    - Set up RLS policies
  
  2. Security
    - Enable RLS on profiles table
    - Create secure policies for data access
*/

-- Create profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  name text NOT NULL,
  role text DEFAULT 'user' CHECK (role IN ('admin', 'user')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Enable read access for all authenticated users" 
  ON public.profiles
  FOR SELECT 
  TO authenticated 
  USING (true);

CREATE POLICY "Enable insert access for service role only" 
  ON public.profiles
  FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Enable update for users based on id" 
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Create indexes
CREATE INDEX IF NOT EXISTS profiles_user_id_idx ON public.profiles(id);
CREATE INDEX IF NOT EXISTS profiles_role_idx ON public.profiles(role);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();