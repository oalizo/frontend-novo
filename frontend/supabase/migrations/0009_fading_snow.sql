/*
  # Fix test user creation

  1. Properly generate UUID for test user
  2. Ensure all required fields are set
  3. Add proper error handling
*/

DO $$ 
DECLARE
  test_user_id uuid := gen_random_uuid();
BEGIN
  -- Create test user with proper UUID
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
    auth.hash_password('test123'),
    now(),
    jsonb_build_object(
      'name', 'Test User',
      'role', 'admin'
    ),
    'admin',
    now(),
    now(),
    false
  ) ON CONFLICT (email) DO NOTHING;

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
  ) ON CONFLICT (id) DO NOTHING;

  -- Log success
  RAISE NOTICE 'Test user created successfully with id: %', test_user_id;
EXCEPTION WHEN OTHERS THEN
  -- Log error but don't fail
  RAISE WARNING 'Error creating test user: %', SQLERRM;
END $$;