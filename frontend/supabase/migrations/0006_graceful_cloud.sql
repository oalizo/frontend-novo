/*
  # Authentication Schema Setup
  
  1. Schema Changes
    - Create auth schema for user management
    - Add necessary tables and functions
    - Set up RLS policies
  
  2. Security
    - Enable RLS on all tables
    - Create secure policies for data access
    - Set up proper role-based permissions
*/

-- Create auth schema if it doesn't exist
CREATE SCHEMA IF NOT EXISTS auth;

-- Create auth.users table
CREATE TABLE IF NOT EXISTS auth.users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  encrypted_password text NOT NULL,
  email_confirmed_at timestamptz,
  last_sign_in_at timestamptz,
  raw_app_meta_data jsonb,
  raw_user_meta_data jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  is_super_admin boolean,
  role text DEFAULT 'user' CHECK (role IN ('admin', 'user'))
);

-- Enable RLS
ALTER TABLE auth.users ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view own data" ON auth.users
  FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own data" ON auth.users
  FOR UPDATE
  USING (auth.uid() = id);

-- Create function to handle password hashing
CREATE OR REPLACE FUNCTION auth.hash_password(password text)
RETURNS text AS $$
BEGIN
  RETURN crypt(password, gen_salt('bf'));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;