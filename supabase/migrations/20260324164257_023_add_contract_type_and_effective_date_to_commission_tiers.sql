/*
  # Add contract_type and effective_date to commission_tiers

  ## Changes
  
  1. Schema Updates
    - Add `contract_type` column to commission_tiers table
      - Values: 'sr_sae', 'jr_ae', 'venture_apps', 'katlyn_flat', or NULL for legacy entries
    - Add `effective_date` column to commission_tiers table
      - Date when this tier configuration becomes active
      - Allows historical tracking of tier changes over time
  
  2. Notes
    - For venture_apps contract type, tiers will be looked up by matching contract_type 
      AND effective_date <= period_month
    - The most recent effective_date will be used when multiple rows match
    - Existing rows will have NULL contract_type (used for legacy hardcoded tiers)
    - This enables dynamic, date-based tier configurations for venture_apps merchants
*/

-- Add contract_type column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'commission_tiers' AND column_name = 'contract_type'
  ) THEN
    ALTER TABLE commission_tiers ADD COLUMN contract_type text CHECK (contract_type IN ('sr_sae', 'jr_ae', 'venture_apps', 'katlyn_flat'));
  END IF;
END $$;

-- Add effective_date column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'commission_tiers' AND column_name = 'effective_date'
  ) THEN
    ALTER TABLE commission_tiers ADD COLUMN effective_date date DEFAULT '2026-01-01';
  END IF;
END $$;

-- Add source column to track which source type (venture/rms) this tier applies to
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'commission_tiers' AND column_name = 'source'
  ) THEN
    ALTER TABLE commission_tiers ADD COLUMN source text;
  END IF;
END $$;

-- Create index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_commission_tiers_lookup 
  ON commission_tiers(contract_type, source, effective_date DESC) 
  WHERE contract_type IS NOT NULL;
