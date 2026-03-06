/*
  # Fix SuperAdmin RLS Policies

  1. Updates
    - Modify users table SELECT policy to allow superadmins to see all users
    - Modify processor_mappings to allow superadmins to see all mappings
    - Modify reports to allow superadmins to see all reports
    - Modify merchants to allow superadmins to see all merchants
  
  2. Security
    - Superadmins bypass agency restrictions
    - Regular users still restricted to their agency
*/

-- Drop existing users SELECT policy
DROP POLICY IF EXISTS "Users can view users in their agency" ON users;

-- Create new policy that allows superadmins to see all, others see their agency
CREATE POLICY "Users can view users in their agency or superadmin sees all"
  ON users FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.auth_id = auth.uid()
      AND (
        u.role = 'superadmin'
        OR u.agency_id = users.agency_id
      )
    )
  );

-- Update processor_mappings SELECT policy
DROP POLICY IF EXISTS "Users can view their agency's processor mappings" ON processor_mappings;

CREATE POLICY "Users can view their agency's processor mappings or superadmin sees all"
  ON processor_mappings FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.auth_id = auth.uid()
      AND (
        users.role = 'superadmin'
        OR users.agency_id = processor_mappings.agency_id
      )
    )
  );

-- Update reports SELECT policy if it exists
DO $$
BEGIN
  -- Drop existing report policies
  DROP POLICY IF EXISTS "Users can view their own reports" ON reports;
  DROP POLICY IF EXISTS "Users can view reports in their agency" ON reports;
  
  -- Create new policy for reports
  CREATE POLICY "Users can view their agency reports or superadmin sees all"
    ON reports FOR SELECT
    TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM users
        WHERE users.auth_id = auth.uid()
        AND (
          users.role = 'superadmin'
          OR users.agency_id = reports.agency_id
        )
      )
    );
END $$;

-- Update merchants SELECT policy if it exists
DO $$
BEGIN
  -- Drop existing merchant policies
  DROP POLICY IF EXISTS "Users can view merchants in their agency" ON merchants;
  
  -- Create new policy for merchants
  CREATE POLICY "Users can view their agency merchants or superadmin sees all"
    ON merchants FOR SELECT
    TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM users
        WHERE users.auth_id = auth.uid()
        AND (
          users.role = 'superadmin'
          OR users.agency_id = merchants.agency_id
        )
      )
    );
END $$;
