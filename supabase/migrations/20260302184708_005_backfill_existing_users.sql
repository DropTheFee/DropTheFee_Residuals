/*
  # Backfill Existing Users
  
  ## Changes Made
  
  1. **Create users table entries for existing auth users**
     - Insert into users table for any auth.users that don't have a corresponding entry
     - Use a default agency_id for each user
     - Set default role to 'superadmin' for the first user, 'sales_rep' for others
*/

-- Backfill users table with existing auth users
INSERT INTO public.users (auth_id, email, role, agency_id, full_name, created_at)
SELECT 
  au.id,
  au.email,
  CASE 
    WHEN NOT EXISTS (SELECT 1 FROM public.users) THEN 'superadmin'
    ELSE 'sales_rep'
  END as role,
  gen_random_uuid() as agency_id,
  COALESCE(au.raw_user_meta_data->>'full_name', au.email) as full_name,
  au.created_at
FROM auth.users au
LEFT JOIN public.users u ON u.auth_id = au.id
WHERE u.id IS NULL
ON CONFLICT (auth_id) DO NOTHING;