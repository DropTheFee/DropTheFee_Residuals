/*
  # Add MID and Payout Date to Commission Results

  ## Changes
  
  1. Add `mid` column to `commission_results` table
    - Stores the merchant MID (merchant ID number) for display on statements
    - Type: text (nullable)
    - This is separate from merchant_id which is the UUID reference
  
  2. Add `payout_date` column to `commission_results` table
    - Stores the payout date for NAB bonuses
    - Type: date (nullable)
  
  ## Notes
  
  - MID is the actual merchant account number displayed on statements
  - merchant_id remains as the UUID foreign key to the merchants table
  - These columns are nullable since not all commission results are merchant-based
*/

-- Add mid column to commission_results
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'commission_results' AND column_name = 'mid'
  ) THEN
    ALTER TABLE commission_results ADD COLUMN mid text;
  END IF;
END $$;

-- Add payout_date column to commission_results
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'commission_results' AND column_name = 'payout_date'
  ) THEN
    ALTER TABLE commission_results ADD COLUMN payout_date date;
  END IF;
END $$;