/*
  # Fix test user creation

  1. Clean up existing test user data
  2. Create new test user with proper error handling
  3. Add proper constraints and indexes
*/

-- First clean up any existing test user data
DO $$ 
BEGIN
  -- Delete from profiles first due to foreign key constraint
  DELETE FROM public.profiles WHERE id IN (
    SELECT id FROM auth.users WHERE email = 'test@example.com'
  );
  
  -- Then delete from users
  DELETE FROM auth.users WHERE email = 'test@example.com';
END $$;

-- Create test user with proper error handling
DO $$ 
DECLARE
  test_user_id uuid;
BEGIN
  -- Generate new UUID for test user
  test_user_id := gen_random_uuid();

  -- Insert test user with explicit ID
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
    test_user_id,
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
  );

  -- Create corresponding profile with same ID
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

EXCEPTION WHEN others THEN
  -- Log error details
  RAISE WARNING 'Error creating test user: %', SQLERRM;
  -- Rollback any partial changes
  RAISE EXCEPTION 'Failed to create test user';
END $$;

-- Add additional indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_role ON auth.users(role);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);

-- Add constraint to ensure role values match
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check 
  CHECK (role IN ('admin', 'user'));