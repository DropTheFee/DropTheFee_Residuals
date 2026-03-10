/*
  # Add agency_id to merchant_history and fix RLS

  ## Changes
  1. Add agency_id column to merchant_history table
  2. Backfill agency_id from merchants table for existing records
  3. Make agency_id NOT NULL after backfill
  4. Update RLS policies to use agency_id directly instead of joining through merchants
  5. Add index on (agency_id, report_date) for better query performance

  ## Rationale
  - Merchant history records were being filtered out if their merchant_id didn't exist in merchants table
  - This caused dashboard to show 171 merchants instead of actual 181
  - Direct agency_id allows independent querying without merchant table dependency
*/

-- Add agency_id column (nullable initially for backfill)
ALTER TABLE merchant_history ADD COLUMN IF NOT EXISTS agency_id uuid;

-- Backfill agency_id from merchants table
UPDATE merchant_history mh
SET agency_id = m.agency_id
FROM merchants m
WHERE mh.merchant_id = m.id AND mh.agency_id IS NULL;

-- Make agency_id NOT NULL after backfill
ALTER TABLE merchant_history ALTER COLUMN agency_id SET NOT NULL;

-- Add foreign key constraint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'merchant_history_agency_id_fkey'
  ) THEN
    ALTER TABLE merchant_history 
    ADD CONSTRAINT merchant_history_agency_id_fkey 
    FOREIGN KEY (agency_id) REFERENCES agencies(id);
  END IF;
END $$;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_merchant_history_agency_report 
ON merchant_history(agency_id, report_date DESC);

-- Drop old RLS policies
DROP POLICY IF EXISTS "Users can view merchant history in their agency" ON merchant_history;
DROP POLICY IF EXISTS "Users can insert merchant history in their agency" ON merchant_history;

-- Create new RLS policies using agency_id directly
CREATE POLICY "Users can view merchant history in their agency"
  ON merchant_history
  FOR SELECT
  TO authenticated
  USING (
    agency_id = (
      SELECT users.agency_id 
      FROM users 
      WHERE users.auth_id = auth.uid()
      LIMIT 1
    )
  );

CREATE POLICY "Users can insert merchant history in their agency"
  ON merchant_history
  FOR INSERT
  TO authenticated
  WITH CHECK (
    agency_id = (
      SELECT users.agency_id 
      FROM users 
      WHERE users.auth_id = auth.uid()
      LIMIT 1
    )
  );

CREATE POLICY "Users can update merchant history in their agency"
  ON merchant_history
  FOR UPDATE
  TO authenticated
  USING (
    agency_id = (
      SELECT users.agency_id 
      FROM users 
      WHERE users.auth_id = auth.uid()
      LIMIT 1
    )
  )
  WITH CHECK (
    agency_id = (
      SELECT users.agency_id 
      FROM users 
      WHERE users.auth_id = auth.uid()
      LIMIT 1
    )
  );
