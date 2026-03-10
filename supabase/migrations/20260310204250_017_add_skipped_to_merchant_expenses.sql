/*
  # Add skipped flag to merchant_expenses

  1. Changes
    - Add `skipped` boolean column to `merchant_expenses` table
    - Default value is `false`
    - This allows marking cancelled/inactive merchants to exclude them from unmatched lists
  
  2. Notes
    - Skipped records remain in database for historical tracking
    - Skipped records don't count toward "unmatched" totals
    - Used for merchants that will never have a match (cancelled, out of business, etc.)
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'merchant_expenses' AND column_name = 'skipped'
  ) THEN
    ALTER TABLE merchant_expenses ADD COLUMN skipped boolean DEFAULT false NOT NULL;
  END IF;
END $$;