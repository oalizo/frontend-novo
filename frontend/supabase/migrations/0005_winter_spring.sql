/*
  # Fix User Creation Trigger

  1. Changes
    - Improve error handling in trigger
    - Add better validation
    - Fix role handling
    - Add logging
*/

-- Update trigger function with improved error handling
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  user_role text;
BEGIN
  -- Log the incoming data
  RAISE LOG 'Creating new user profile with id: %, metadata: %', new.id, new.raw_user_meta_data;

  -- Set default role if not provided
  user_role := COALESCE(new.raw_user_meta_data->>'role', 'user');
  
  -- Validate role
  IF user_role NOT IN ('admin', 'user') THEN
    user_role := 'user';
  END IF;

  -- Create profile
  INSERT INTO public.profiles (
    id,
    name,
    role,
    created_at,
    updated_at
  ) VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'name', 'Anonymous User'),
    user_role,
    now(),
    now()
  );

  RAISE LOG 'Successfully created profile for user %', new.id;
  RETURN new;

EXCEPTION WHEN others THEN
  -- Log error but don't block user creation
  RAISE LOG 'Error creating profile for user %: %', new.id, SQLERRM;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;