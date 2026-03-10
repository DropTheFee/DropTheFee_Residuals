/*
  # Add processor column to merchants and seed processor mappings

  1. Changes
    - Add `processor` column to merchants table if it doesn't exist
    - Seed processor_mappings table with commonly used processors for existing agencies
    
  2. Processors Added
    - EPI Cygma
    - EPI Fiserv
    - Vivid Payments
    - Paysafe
    - PCS
    - Link2Pay
    - Payarc
    
  3. Security
    - No RLS changes needed (existing policies apply)
*/

-- Add processor column to merchants table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'merchants' AND column_name = 'processor'
  ) THEN
    ALTER TABLE merchants ADD COLUMN processor text;
  END IF;
END $$;

-- Seed processor mappings for all existing agencies
DO $$
DECLARE
  agency_record RECORD;
  processor_names TEXT[] := ARRAY[
    'EPI Cygma',
    'EPI Fiserv', 
    'Vivid Payments',
    'Paysafe',
    'PCS',
    'Link2Pay',
    'Payarc'
  ];
  proc_name TEXT;
BEGIN
  FOR agency_record IN SELECT id FROM agencies LOOP
    FOREACH proc_name IN ARRAY processor_names LOOP
      INSERT INTO processor_mappings (
        agency_id,
        processor_name,
        header_row_number
      )
      VALUES (
        agency_record.id,
        proc_name,
        0
      )
      ON CONFLICT (agency_id, processor_name) DO NOTHING;
    END LOOP;
  END LOOP;
END $$;
