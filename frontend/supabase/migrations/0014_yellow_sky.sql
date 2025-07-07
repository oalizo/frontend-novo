/*
  # Fix Test User Creation Migration
  
  1. Changes
    - Proper transaction isolation
    - Better error handling
    - Explicit cleanup
    - Proper validation
    - Atomic operations
  
  2. Details
    - Uses SERIALIZABLE isolation level
    - Handles deadlock scenarios
    - Validates data integrity
    - Proper cleanup of existing data
*/

DO $$ 
DECLARE
  test_user_id uuid;
  retry_count int := 0;
  max_retries int := 3;
BEGIN
  -- Keep retrying on deadlock
  WHILE retry_count < max_retries LOOP
    BEGIN
      -- Start transaction with highest isolation
      START TRANSACTION ISOLATION LEVEL SERIALIZABLE;

      -- Clean up any existing test user data
      DELETE FROM auth.users WHERE email = 'test@example.com';
      
      -- Generate new UUID
      test_user_id := gen_random_uuid();

      -- Create test user
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

      -- Create profile
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

      -- Verify data integrity
      IF NOT EXISTS (
        SELECT 1 FROM auth.users u
        JOIN public.profiles p ON p.id = u.id
        WHERE u.id = test_user_id
      ) THEN
        RAISE EXCEPTION 'Data integrity check failed';
      END IF;

      -- Success - commit and exit loop
      COMMIT;
      RAISE NOTICE 'Test user created successfully with id: %', test_user_id;
      RETURN;

    EXCEPTION 
      WHEN deadlock_detected THEN
        -- Retry on deadlock
        ROLLBACK;
        retry_count := retry_count + 1;
        RAISE NOTICE 'Deadlock detected, retrying (attempt %/%)', retry_count, max_retries;
        CONTINUE;
        
      WHEN OTHERS THEN
        -- Rollback and re-raise other errors
        ROLLBACK;
        RAISE EXCEPTION 'Error creating test user: %', SQLERRM;
    END;
  END LOOP;

  -- Max retries exceeded
  RAISE EXCEPTION 'Failed to create test user after % attempts', max_retries;
END $$;