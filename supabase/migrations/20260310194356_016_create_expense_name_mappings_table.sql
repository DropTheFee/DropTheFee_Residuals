/*
  # Create expense_name_mappings table

  1. New Tables
    - `expense_name_mappings`
      - `id` (uuid, primary key)
      - `agency_id` (uuid, foreign key to agencies)
      - `expense_source` (text) - e.g., 'Dejavoo'
      - `expense_name` (text) - The original expense name from the file
      - `merchant_id` (uuid, foreign key to merchants)
      - `created_at` (timestamptz)
  
  2. Security
    - Enable RLS on `expense_name_mappings` table
    - Add policy for authenticated users to read their agency's mappings
    - Add policy for authenticated users to insert mappings for their agency
    - Add policy for authenticated users to update their agency's mappings
    - Add policy for authenticated users to delete their agency's mappings

  3. Indexes
    - Add index on (agency_id, expense_source, expense_name) for fast lookups
*/

CREATE TABLE IF NOT EXISTS expense_name_mappings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES agencies(id),
  expense_source text NOT NULL,
  expense_name text NOT NULL,
  merchant_id uuid NOT NULL REFERENCES merchants(id),
  created_at timestamptz DEFAULT now(),
  UNIQUE(agency_id, expense_source, expense_name)
);

ALTER TABLE expense_name_mappings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own agency's expense mappings"
  ON expense_name_mappings FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.agency_id = expense_name_mappings.agency_id
    )
  );

CREATE POLICY "Users can insert expense mappings for own agency"
  ON expense_name_mappings FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.agency_id = expense_name_mappings.agency_id
    )
  );

CREATE POLICY "Users can update own agency's expense mappings"
  ON expense_name_mappings FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.agency_id = expense_name_mappings.agency_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.agency_id = expense_name_mappings.agency_id
    )
  );

CREATE POLICY "Users can delete own agency's expense mappings"
  ON expense_name_mappings FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.agency_id = expense_name_mappings.agency_id
    )
  );

CREATE INDEX IF NOT EXISTS idx_expense_name_mappings_lookup 
  ON expense_name_mappings(agency_id, expense_source, expense_name);
