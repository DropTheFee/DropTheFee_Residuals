/*
  # Create SuperAdmin User and Backfill Auth Users

  1. Changes
    - Backfill existing auth.users into public.users table
    - Set steve@dropthefee.com as superadmin
    - Create default agency for users without one
  
  2. Security
    - Uses SECURITY DEFINER to bypass RLS during backfill
*/

-- Create a function to backfill existing auth users
CREATE OR REPLACE FUNCTION backfill_auth_users()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  auth_user RECORD;
  default_agency_id uuid;
BEGIN
  -- Create a default agency ID for all users
  default_agency_id := gen_random_uuid();
  
  -- Loop through all auth.users
  FOR auth_user IN 
    SELECT id, email, raw_user_meta_data, created_at
    FROM auth.users
  LOOP
    -- Insert into public.users if not exists
    INSERT INTO public.users (
      auth_id, 
      email, 
      role, 
      agency_id, 
      full_name, 
      created_at
    )
    VALUES (
      auth_user.id,
      auth_user.email,
      CASE 
        WHEN auth_user.email = 'steve@dropthefee.com' THEN 'superadmin'
        ELSE 'sales_rep'
      END,
      default_agency_id,
      COALESCE(auth_user.raw_user_meta_data->>'full_name', auth_user.email),
      auth_user.created_at
    )
    ON CONFLICT (auth_id) DO UPDATE
    SET 
      email = EXCLUDED.email,
      role = CASE 
        WHEN users.email = 'steve@dropthefee.com' THEN 'superadmin'
        ELSE users.role
      END,
      updated_at = NOW();
  END LOOP;
END;
$$;

-- Run the backfill function
SELECT backfill_auth_users();

-- Drop the function as it's only needed once
DROP FUNCTION backfill_auth_users();
