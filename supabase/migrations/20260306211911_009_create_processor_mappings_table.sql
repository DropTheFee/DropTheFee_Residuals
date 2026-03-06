/*
  # Create Processor Mappings Table

  1. New Tables
    - `processor_mappings`
      - `id` (uuid, primary key) - Unique identifier for the mapping
      - `agency_id` (uuid) - Agency this mapping belongs to (matches users.agency_id)
      - `processor_name` (text, not null) - Name of the processor/ISO
      - `mid_column` (text) - Column name that contains the MID
      - `merchant_name_column` (text) - Column name that contains merchant name
      - `volume_column` (text) - Column name that contains volume
      - `residual_column` (text) - Column name that contains residual amount
      - `status_column` (text) - Column name that contains merchant status
      - `rep_payout_column` (text) - Column name that contains rep payout
      - `dba_column` (text) - Column name that contains DBA
      - `header_row_number` (integer, default 0) - Which row contains headers (0-indexed)
      - `created_at` (timestamptz) - When mapping was created
      - `updated_at` (timestamptz) - When mapping was last updated
      - `created_by` (uuid, foreign key) - User who created the mapping
  
  2. Security
    - Enable RLS on `processor_mappings` table
    - Add policies for authenticated users to manage their agency's mappings
  
  3. Indexes
    - Index on agency_id and processor_name for fast lookups
*/

CREATE TABLE IF NOT EXISTS processor_mappings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL,
  processor_name text NOT NULL,
  mid_column text,
  merchant_name_column text,
  volume_column text,
  residual_column text,
  status_column text,
  rep_payout_column text,
  dba_column text,
  header_row_number integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  UNIQUE(agency_id, processor_name)
);

ALTER TABLE processor_mappings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their agency's processor mappings"
  ON processor_mappings FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.auth_id = auth.uid()
      AND users.agency_id = processor_mappings.agency_id
    )
  );

CREATE POLICY "Users can insert processor mappings for their agency"
  ON processor_mappings FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.auth_id = auth.uid()
      AND users.agency_id = processor_mappings.agency_id
    )
  );

CREATE POLICY "Users can update their agency's processor mappings"
  ON processor_mappings FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.auth_id = auth.uid()
      AND users.agency_id = processor_mappings.agency_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.auth_id = auth.uid()
      AND users.agency_id = processor_mappings.agency_id
    )
  );

CREATE POLICY "Users can delete their agency's processor mappings"
  ON processor_mappings FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.auth_id = auth.uid()
      AND users.agency_id = processor_mappings.agency_id
    )
  );

CREATE INDEX IF NOT EXISTS idx_processor_mappings_agency_processor 
  ON processor_mappings(agency_id, processor_name);