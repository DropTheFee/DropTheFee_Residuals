/*
  # Add SuperAdmin Helper Function

  1. New Functions
    - `create_superadmin_user` - Helper to manually create a superadmin user
    - Can be called to promote existing users to superadmin
  
  2. Usage
    - SELECT create_superadmin_user('user-auth-id', 'steve@dropthefee.com');
*/

CREATE OR REPLACE FUNCTION create_superadmin_user(
  user_auth_id uuid,
  user_email text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  user_id uuid;
  default_agency_id uuid;
BEGIN
  -- Create a default agency ID
  default_agency_id := gen_random_uuid();
  
  -- Insert or update the user
  INSERT INTO public.users (
    auth_id, 
    email, 
    role, 
    agency_id, 
    full_name, 
    created_at
  )
  VALUES (
    user_auth_id,
    user_email,
    'superadmin',
    default_agency_id,
    user_email,
    NOW()
  )
  ON CONFLICT (auth_id) DO UPDATE
  SET 
    role = 'superadmin',
    updated_at = NOW()
  RETURNING id INTO user_id;
  
  RETURN user_id;
END;
$$;

-- Update the signup trigger to check for specific emails that should be superadmin
CREATE OR REPLACE FUNCTION handle_new_user_signup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  default_agency_id uuid;
  user_role text;
BEGIN
  default_agency_id := gen_random_uuid();
  
  -- Determine role based on email
  IF NEW.email = 'steve@dropthefee.com' THEN
    user_role := 'superadmin';
  ELSE
    user_role := 'sales_rep';
  END IF;
  
  INSERT INTO public.users (auth_id, email, role, agency_id, full_name, created_at)
  VALUES (
    NEW.id,
    NEW.email,
    user_role,
    default_agency_id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NOW()
  )
  ON CONFLICT (auth_id) DO NOTHING;
  
  RETURN NEW;
END;
$$;
