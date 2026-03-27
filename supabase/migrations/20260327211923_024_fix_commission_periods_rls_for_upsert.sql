/*
  # Fix Commission Periods RLS for Upsert Operations

  ## Problem
  The existing RLS policy on commission_periods uses `FOR ALL` with only a `USING` clause,
  which causes issues with UPSERT operations that need both `USING` (for UPDATE) and 
  `WITH CHECK` (for INSERT) clauses.

  ## Changes
  1. Drop the existing broad "FOR ALL" policy
  2. Create separate policies for each operation type:
     - SELECT policy with USING clause
     - INSERT policy with WITH CHECK clause
     - UPDATE policy with USING and WITH CHECK clauses
     - DELETE policy with USING clause

  ## Security
  - All policies maintain the same security requirements: user must be superadmin 
    and their agency_id must match the row's agency_id
  - This ensures proper access control while allowing UPSERT operations to work correctly
*/

-- Drop the existing broad policy
DROP POLICY IF EXISTS "SuperAdmin can manage commission periods" ON commission_periods;

-- Create separate policies for each operation
CREATE POLICY "SuperAdmin can view commission periods"
  ON commission_periods FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'superadmin'
      AND users.agency_id = commission_periods.agency_id
    )
  );

CREATE POLICY "SuperAdmin can insert commission periods"
  ON commission_periods FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'superadmin'
      AND users.agency_id = commission_periods.agency_id
    )
  );

CREATE POLICY "SuperAdmin can update commission periods"
  ON commission_periods FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'superadmin'
      AND users.agency_id = commission_periods.agency_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'superadmin'
      AND users.agency_id = commission_periods.agency_id
    )
  );

CREATE POLICY "SuperAdmin can delete commission periods"
  ON commission_periods FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'superadmin'
      AND users.agency_id = commission_periods.agency_id
    )
  );