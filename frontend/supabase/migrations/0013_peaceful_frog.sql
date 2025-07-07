/*
  # Fix Test User Creation

  1. Proper transaction handling
  2. Better error handling and validation
  3. Explicit ID generation
  4. Proper cleanup of existing data
*/

DO $$ 
DECLARE
  test_user_id uuid;
  existing_user_id uuid;
BEGIN
  -- Start explicit transaction
  BEGIN
    -- Check for existing test user first
    SELECT id INTO existing_user_id 
    FROM auth.users 
    WHERE email = 'test@example.com';

    -- If exists, clean up properly
    IF existing_user_id IS NOT NULL THEN
      -- Delete profile first (cascade will handle it, but being explicit)
      DELETE FROM public.profiles WHERE id = existing_user_id;
      -- Then delete user
      DELETE FROM auth.users WHERE id = existing_user_id;
      RAISE NOTICE 'Cleaned up existing test user with id: %', existing_user_id;
    END IF;

    -- Generate new UUID
    test_user_id := gen_random_uuid();
    
    -- Insert test user with proper validation
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

    -- Verify user was created
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = test_user_id) THEN
      RAISE EXCEPTION 'Failed to create test user in auth.users';
    END IF;

    -- Create profile with explicit reference
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

    -- Verify profile was created
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = test_user_id) THEN
      RAISE EXCEPTION 'Failed to create test user profile';
    END IF;

    -- Log success
    RAISE NOTICE 'Test user created successfully with id: %', test_user_id;
    
    -- Commit transaction
    COMMIT;

  EXCEPTION WHEN others THEN
    -- Rollback on any error
    ROLLBACK;
    RAISE WARNING 'Error creating test user: %', SQLERRM;
    RAISE EXCEPTION 'Failed to create test user: %', SQLERRM;
  END;
END $$;