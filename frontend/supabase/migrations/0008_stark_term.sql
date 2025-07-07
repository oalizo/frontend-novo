/*
  # Add test user

  1. Creates a test user with encrypted password
  2. Adds corresponding profile
  3. Sets up proper role and permissions
*/

-- Create test user with encrypted password
INSERT INTO auth.users (
  email,
  encrypted_password,
  email_confirmed_at,
  raw_user_meta_data,
  role
) VALUES (
  'test@example.com',
  auth.hash_password('test123'),
  now(),
  jsonb_build_object(
    'name', 'Test User',
    'role', 'admin'
  ),
  'admin'
) ON CONFLICT (email) DO NOTHING;

-- Ensure profile exists for test user
INSERT INTO public.profiles (
  id,
  name,
  role,
  created_at,
  updated_at
)
SELECT 
  id,
  raw_user_meta_data->>'name',
  role,
  created_at,
  updated_at
FROM auth.users 
WHERE email = 'test@example.com'
ON CONFLICT (id) DO NOTHING;