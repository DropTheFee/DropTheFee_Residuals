/*
  # Create NAB Uploads Table and Update NAB Records Schema

  ## New Tables
  
  1. `nab_uploads` - Tracks NAB file uploads
    - `id` (uuid, primary key)
    - `agency_id` (uuid, references agencies)
    - `upload_date` (timestamptz)
    - `period_month` (text) - Format: YYYY-MM
    - `file_name` (text)
    - `uploaded_by` (uuid, references users)
    - `created_at` (timestamptz)

  ## Schema Updates
  
  - Add columns to `nab_records`:
    - `nab_upload_id` (uuid, references nab_uploads)
    - `office_code` (text)
    - `merchant_id_raw` (text)
    - `amount` (numeric) - replaces bonus_amount usage
  
  ## Security
  
  - Enable RLS on nab_uploads table
  - Create policies for SuperAdmin access
*/

-- Create nab_uploads table
CREATE TABLE IF NOT EXISTS nab_uploads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  upload_date timestamptz NOT NULL DEFAULT now(),
  period_month text NOT NULL,
  file_name text NOT NULL,
  uploaded_by uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE nab_uploads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "SuperAdmin can manage nab uploads"
  ON nab_uploads FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'superadmin'
      AND users.agency_id = nab_uploads.agency_id
    )
  );

-- Add new columns to nab_records
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'nab_records' AND column_name = 'nab_upload_id'
  ) THEN
    ALTER TABLE nab_records ADD COLUMN nab_upload_id uuid REFERENCES nab_uploads(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'nab_records' AND column_name = 'office_code'
  ) THEN
    ALTER TABLE nab_records ADD COLUMN office_code text;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'nab_records' AND column_name = 'merchant_id_raw'
  ) THEN
    ALTER TABLE nab_records ADD COLUMN merchant_id_raw text;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'nab_records' AND column_name = 'amount'
  ) THEN
    ALTER TABLE nab_records ADD COLUMN amount numeric DEFAULT 0;
  END IF;
END $$;
