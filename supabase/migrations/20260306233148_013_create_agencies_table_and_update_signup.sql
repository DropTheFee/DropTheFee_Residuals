/*
  # Create Agencies Table and Update Signup Function
  
  1. New Tables
    - `agencies`
      - `id` (uuid, primary key)
      - `name` (text, unique, not null)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
  
  2. Changes
    - Create agencies table with RLS enabled
    - Insert default 'RMSOK' agency
    - Update handle_new_user_signup function to assign RMSOK agency_id to new users
    - Add foreign key constraint from users.agency_id to agencies.id
  
  3. Security
    - Enable RLS on agencies table
    - Add policies for authenticated users to read agencies
    - Superadmins can manage agencies
*/

-- Create agencies table
CREATE TABLE IF NOT EXISTS agencies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE agencies ENABLE ROW LEVEL SECURITY;

-- Policies for agencies
CREATE POLICY "Authenticated users can read agencies"
  ON agencies FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Superadmins can insert agencies"
  ON agencies FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.auth_id = auth.uid()
      AND users.role = 'superadmin'
    )
  );

CREATE POLICY "Superadmins can update agencies"
  ON agencies FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.auth_id = auth.uid()
      AND users.role = 'superadmin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.auth_id = auth.uid()
      AND users.role = 'superadmin'
    )
  );

CREATE POLICY "Superadmins can delete agencies"
  ON agencies FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.auth_id = auth.uid()
      AND users.role = 'superadmin'
    )
  );

-- Insert RMSOK agency
INSERT INTO agencies (name) VALUES ('RMSOK')
ON CONFLICT (name) DO NOTHING;

-- Add foreign key constraint if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'users_agency_id_fkey'
    AND table_name = 'users'
  ) THEN
    ALTER TABLE users ADD CONSTRAINT users_agency_id_fkey
      FOREIGN KEY (agency_id) REFERENCES agencies(id);
  END IF;
END $$;

-- Update signup trigger to use RMSOK agency
CREATE OR REPLACE FUNCTION handle_new_user_signup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  rmsok_agency_id uuid;
  user_role text;
BEGIN
  -- Look up RMSOK agency
  SELECT id INTO rmsok_agency_id FROM agencies WHERE name = 'RMSOK';
  
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
    rmsok_agency_id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NOW()
  )
  ON CONFLICT (auth_id) DO NOTHING;
  
  RETURN NEW;
END;
$$;
