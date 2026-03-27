/*
  # Allow All Users to View Commission Periods

  ## Problem
  The commission_periods SELECT policy only allows superadmin users to view periods,
  but all authenticated users need to view periods to use the Upload page period selector.

  ## Changes
  1. Drop the existing restrictive SELECT policy
  2. Create a new SELECT policy that allows all authenticated users to view periods
     from their own agency
  3. Keep the INSERT, UPDATE, and DELETE policies restricted to superadmin only

  ## Security
  - SELECT: Any authenticated user can view periods from their agency
  - INSERT/UPDATE/DELETE: Only superadmin users can modify periods
  - All policies verify agency_id match to prevent cross-agency access
*/

-- Drop the existing restrictive SELECT policy
DROP POLICY IF EXISTS "SuperAdmin can view commission periods" ON commission_periods;

-- Create new SELECT policy that allows all authenticated users in the agency
CREATE POLICY "Users can view their agency commission periods"
  ON commission_periods FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.agency_id = commission_periods.agency_id
    )
  );
