/*
  # Fix User Creation and RLS Policies

  ## Changes Made
  
  1. **Auto-create users table entry**
     - Create trigger to automatically insert into users table when auth user signs up
     - Generate a default agency_id for new users
     - Set default role to 'sales_rep'
  
  2. **Fix RLS Policies**
     - Update policies to use auth_id instead of id when checking auth.uid()
     - Ensure policies work correctly with the users table structure
  
  3. **Add full_name column to users**
     - Add full_name column to users table to match the User type
*/

-- Add full_name column to users table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'full_name'
  ) THEN
    ALTER TABLE public.users ADD COLUMN full_name text;
  END IF;
END $$;

-- Create or replace function to auto-create user entry on signup
CREATE OR REPLACE FUNCTION public.handle_new_user_signup()
RETURNS trigger AS $$
DECLARE
  default_agency_id uuid;
BEGIN
  -- Generate a default agency_id (you can modify this logic as needed)
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

-- Drop existing trigger if it exists and create new one
DROP TRIGGER IF EXISTS on_auth_user_signup ON auth.users;
CREATE TRIGGER on_auth_user_signup
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_signup();

-- Update RLS policies to use auth_id instead of id when comparing with auth.uid()

-- Fix users table policies
DROP POLICY IF EXISTS "Users can view users in their agency" ON public.users;
CREATE POLICY "Users can view users in their agency"
  ON public.users FOR SELECT
  TO authenticated
  USING (
    agency_id = (
      SELECT agency_id FROM public.users WHERE auth_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Admins can manage users in their agency" ON public.users;
CREATE POLICY "Admins can manage users in their agency"
  ON public.users FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE auth_id = auth.uid()
      AND role IN ('superadmin', 'admin')
      AND agency_id = public.users.agency_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE auth_id = auth.uid()
      AND role IN ('superadmin', 'admin')
      AND agency_id = public.users.agency_id
    )
  );

-- Fix reports table policies
DROP POLICY IF EXISTS "Users can view reports in their agency" ON public.reports;
CREATE POLICY "Users can view reports in their agency"
  ON public.reports FOR SELECT
  TO authenticated
  USING (
    agency_id = (
      SELECT agency_id FROM public.users WHERE auth_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can create reports in their agency" ON public.reports;
CREATE POLICY "Users can create reports in their agency"
  ON public.reports FOR INSERT
  TO authenticated
  WITH CHECK (
    agency_id = (
      SELECT agency_id FROM public.users WHERE auth_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Admins can manage reports in their agency" ON public.reports;
CREATE POLICY "Admins can manage reports in their agency"
  ON public.reports FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE auth_id = auth.uid()
      AND role IN ('superadmin', 'admin')
      AND agency_id = public.reports.agency_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE auth_id = auth.uid()
      AND role IN ('superadmin', 'admin')
      AND agency_id = public.reports.agency_id
    )
  );

-- Fix merchants table policies
DROP POLICY IF EXISTS "Users can view merchants in their agency" ON public.merchants;
CREATE POLICY "Users can view merchants in their agency"
  ON public.merchants FOR SELECT
  TO authenticated
  USING (
    agency_id = (
      SELECT agency_id FROM public.users WHERE auth_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can create merchants in their agency" ON public.merchants;
CREATE POLICY "Users can create merchants in their agency"
  ON public.merchants FOR INSERT
  TO authenticated
  WITH CHECK (
    agency_id = (
      SELECT agency_id FROM public.users WHERE auth_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can update merchants in their agency" ON public.merchants;
CREATE POLICY "Users can update merchants in their agency"
  ON public.merchants FOR UPDATE
  TO authenticated
  USING (
    agency_id = (
      SELECT agency_id FROM public.users WHERE auth_id = auth.uid()
    )
  )
  WITH CHECK (
    agency_id = (
      SELECT agency_id FROM public.users WHERE auth_id = auth.uid()
    )
  );

-- Fix merchant_history table policies
DROP POLICY IF EXISTS "Users can view merchant history in their agency" ON public.merchant_history;
CREATE POLICY "Users can view merchant history in their agency"
  ON public.merchant_history FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.merchants
      WHERE merchants.id = merchant_history.merchant_id
      AND merchants.agency_id = (
        SELECT agency_id FROM public.users WHERE auth_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "Users can create merchant history in their agency" ON public.merchant_history;
CREATE POLICY "Users can create merchant history in their agency"
  ON public.merchant_history FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.merchants
      WHERE merchants.id = merchant_history.merchant_id
      AND merchants.agency_id = (
        SELECT agency_id FROM public.users WHERE auth_id = auth.uid()
      )
    )
  );

-- Add unique constraint on auth_id if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'users_auth_id_key'
  ) THEN
    ALTER TABLE public.users ADD CONSTRAINT users_auth_id_key UNIQUE (auth_id);
  END IF;
END $$;