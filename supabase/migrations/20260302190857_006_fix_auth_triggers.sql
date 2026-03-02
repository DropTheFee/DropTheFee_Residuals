/*
  # Fix Authentication Triggers
  
  ## Problem
  - Multiple conflicting triggers on auth.users
  - Old trigger references non-existent 'profiles' table
  - No users being created in public.users table
  
  ## Solution
  1. Remove old conflicting trigger and function
  2. Keep only the correct trigger that creates users with agency_id
  3. Ensure trigger works properly for new signups
*/

-- Drop the old conflicting trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Drop the old function that references non-existent profiles table
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Ensure the correct function exists
CREATE OR REPLACE FUNCTION public.handle_new_user_signup()
RETURNS trigger AS $$
DECLARE
  default_agency_id uuid;
BEGIN
  -- Generate a default agency_id
  default_agency_id := gen_random_uuid();
  
  -- Insert into users table
  INSERT INTO public.users (auth_id, email, role, agency_id, full_name, created_at)
  VALUES (
    NEW.id,
    NEW.email,
    'sales_rep',
    default_agency_id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NOW()
  )
  ON CONFLICT (auth_id) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure trigger exists
DROP TRIGGER IF EXISTS on_auth_user_signup ON auth.users;
CREATE TRIGGER on_auth_user_signup
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_signup();