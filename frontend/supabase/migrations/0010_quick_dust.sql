/*
  # Fix test user creation and authentication

  1. Drop and recreate test user with proper credentials
  2. Add proper indexes and constraints
  3. Update auth policies
*/

-- First clean up any existing test user data
DELETE FROM auth.users WHERE email = 'test@example.com';
DELETE FROM public.profiles WHERE name = 'Test User';

-- Create test user with proper credentials
DO $$ 
DECLARE
  test_user_id uuid;
BEGIN
  -- Insert test user
  INSERT INTO auth.users (
    id,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_user_meta_data,
    role,
    created_at,
    updated_at,
    is_super_admin
  ) VALUES (
    gen_random_uuid(),
    'test@example.com',
    crypt('test123', gen_salt('bf')),
    now(),
    jsonb_build_object(
      'name', 'Test User',
      'role', 'admin'
    ),
    'admin',
    now(),
    now(),
    true
  )
  RETURNING id INTO test_user_id;

  -- Create corresponding profile
  INSERT INTO public.profiles (
    id,
    name,
    role,
    created_at,
    updated_at
  ) VALUES (
    test_user_id,
    'Test User',
    'admin',
    now(),
    now()
  );

  -- Log success
  RAISE NOTICE 'Test user created successfully with id: %', test_user_id;
END $$;

-- Add missing indexes
CREATE INDEX IF NOT EXISTS users_email_idx ON auth.users(email);
CREATE INDEX IF NOT EXISTS users_created_at_idx ON auth.users(created_at);
CREATE INDEX IF NOT EXISTS profiles_created_at_idx ON public.profiles(created_at);

-- Update auth policies
DROP POLICY IF EXISTS "Users can view own data" ON auth.users;
DROP POLICY IF EXISTS "Users can update own data" ON auth.users;

CREATE POLICY "Enable read access for authenticated users"
  ON auth.users
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Enable update for users based on email"
  ON auth.users
  FOR UPDATE
  TO authenticated
  USING (auth.email() = email)
  WITH CHECK (auth.email() = email);