/*
  # Update SüRJ table and Create Manual Expenses Table

  1. Changes to Existing Tables
    - Modify `surj_entries` table to add required columns for new functionality:
      - Add `rep_user_id` column (rename from user_id conceptually)
      - Add `entry_type` column
      - Add `merchant_name` column
      - Add `created_by` column
      - Change period_month to timestamptz
      - Remove notes column if exists
    
  2. New Tables
    - `expenses` table for manual rep expenses
      - `id` (uuid, primary key)
      - `agency_id` (uuid, foreign key to agencies)
      - `user_id` (uuid, foreign key to users) - the rep
      - `expense_type` (text) - 'manual' for manual entries
      - `amount` (decimal)
      - `description` (text)
      - `expense_date` (timestamptz)
      - `recurring` (boolean, default false)
      - `period_month` (timestamptz) - first day of month at noon
      - `status` (text, default 'active')
      - `created_at` (timestamptz)

  3. Security
    - Enable RLS on expenses table
    - Update RLS policies for surj_entries
    - SuperAdmin and Admin can view and manage entries for their agency
    - Reps can view their own entries only
*/

-- First, drop existing policies on surj_entries to recreate them
DROP POLICY IF EXISTS "SuperAdmin can view all surj_entries" ON surj_entries;
DROP POLICY IF EXISTS "Admin can view agency surj_entries" ON surj_entries;
DROP POLICY IF EXISTS "Reps can view own surj_entries" ON surj_entries;
DROP POLICY IF EXISTS "SuperAdmin can insert surj_entries" ON surj_entries;
DROP POLICY IF EXISTS "Admin can insert agency surj_entries" ON surj_entries;
DROP POLICY IF EXISTS "SuperAdmin can delete surj_entries" ON surj_entries;
DROP POLICY IF EXISTS "Admin can delete agency surj_entries" ON surj_entries;

-- Add new columns to surj_entries if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'surj_entries' AND column_name = 'rep_user_id'
  ) THEN
    ALTER TABLE surj_entries ADD COLUMN rep_user_id uuid REFERENCES users(id) ON DELETE CASCADE;
    UPDATE surj_entries SET rep_user_id = user_id WHERE rep_user_id IS NULL;
    ALTER TABLE surj_entries ALTER COLUMN rep_user_id SET NOT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'surj_entries' AND column_name = 'entry_type'
  ) THEN
    ALTER TABLE surj_entries ADD COLUMN entry_type text CHECK (entry_type IN ('Monthly Subscription', 'Setup Fee - Full Pay', 'Setup Fee - Split Pay Installment'));
    UPDATE surj_entries SET entry_type = 'Monthly Subscription' WHERE entry_type IS NULL;
    ALTER TABLE surj_entries ALTER COLUMN entry_type SET NOT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'surj_entries' AND column_name = 'merchant_name'
  ) THEN
    ALTER TABLE surj_entries ADD COLUMN merchant_name text;
    UPDATE surj_entries SET merchant_name = 'Unknown' WHERE merchant_name IS NULL;
    ALTER TABLE surj_entries ALTER COLUMN merchant_name SET NOT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'surj_entries' AND column_name = 'created_by'
  ) THEN
    ALTER TABLE surj_entries ADD COLUMN created_by uuid REFERENCES users(id);
  END IF;
END $$;

-- Alter period_month to timestamptz if it's text
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'surj_entries' 
    AND column_name = 'period_month' 
    AND data_type = 'text'
  ) THEN
    ALTER TABLE surj_entries ALTER COLUMN period_month TYPE timestamptz USING period_month::timestamptz;
  END IF;
END $$;

-- Create expenses table
CREATE TABLE IF NOT EXISTS expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expense_type text NOT NULL,
  amount decimal(10,2) NOT NULL,
  description text NOT NULL,
  expense_date timestamptz NOT NULL,
  recurring boolean DEFAULT false,
  period_month timestamptz NOT NULL,
  status text DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

-- RLS Policies for surj_entries

-- SuperAdmin can view all surj_entries
CREATE POLICY "SuperAdmin can view all surj_entries"
  ON surj_entries FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'superadmin'
    )
  );

-- Admin can view surj_entries for their agency
CREATE POLICY "Admin can view agency surj_entries"
  ON surj_entries FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.agency_id = surj_entries.agency_id
      AND users.role IN ('admin', 'superadmin')
    )
  );

-- Reps can view their own surj_entries
CREATE POLICY "Reps can view own surj_entries"
  ON surj_entries FOR SELECT
  TO authenticated
  USING (surj_entries.rep_user_id = auth.uid());

-- SuperAdmin can insert surj_entries
CREATE POLICY "SuperAdmin can insert surj_entries"
  ON surj_entries FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'superadmin'
    )
  );

-- Admin can insert surj_entries for their agency
CREATE POLICY "Admin can insert agency surj_entries"
  ON surj_entries FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.agency_id = agency_id
      AND users.role IN ('admin', 'superadmin')
    )
  );

-- SuperAdmin can delete surj_entries
CREATE POLICY "SuperAdmin can delete surj_entries"
  ON surj_entries FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'superadmin'
    )
  );

-- Admin can delete surj_entries for their agency
CREATE POLICY "Admin can delete agency surj_entries"
  ON surj_entries FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.agency_id = agency_id
      AND users.role IN ('admin', 'superadmin')
    )
  );

-- RLS Policies for expenses

-- SuperAdmin can view all expenses
CREATE POLICY "SuperAdmin can view all expenses"
  ON expenses FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'superadmin'
    )
  );

-- Admin can view expenses for their agency
CREATE POLICY "Admin can view agency expenses"
  ON expenses FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.agency_id = expenses.agency_id
      AND users.role IN ('admin', 'superadmin')
    )
  );

-- Reps can view their own expenses
CREATE POLICY "Reps can view own expenses"
  ON expenses FOR SELECT
  TO authenticated
  USING (expenses.user_id = auth.uid());

-- SuperAdmin can insert expenses
CREATE POLICY "SuperAdmin can insert expenses"
  ON expenses FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'superadmin'
    )
  );

-- Admin can insert expenses for their agency
CREATE POLICY "Admin can insert agency expenses"
  ON expenses FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.agency_id = agency_id
      AND users.role IN ('admin', 'superadmin')
    )
  );

-- SuperAdmin can delete expenses
CREATE POLICY "SuperAdmin can delete expenses"
  ON expenses FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'superadmin'
    )
  );

-- Admin can delete expenses for their agency
CREATE POLICY "Admin can delete agency expenses"
  ON expenses FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.agency_id = agency_id
      AND users.role IN ('admin', 'superadmin')
    )
  );

-- SuperAdmin can update expenses
CREATE POLICY "SuperAdmin can update expenses"
  ON expenses FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'superadmin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'superadmin'
    )
  );

-- Admin can update expenses for their agency
CREATE POLICY "Admin can update agency expenses"
  ON expenses FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.agency_id = agency_id
      AND users.role IN ('admin', 'superadmin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.agency_id = agency_id
      AND users.role IN ('admin', 'superadmin')
    )
  );

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_surj_entries_agency_period ON surj_entries(agency_id, period_month);
CREATE INDEX IF NOT EXISTS idx_surj_entries_rep_period ON surj_entries(rep_user_id, period_month);
CREATE INDEX IF NOT EXISTS idx_expenses_agency_period ON expenses(agency_id, period_month);
CREATE INDEX IF NOT EXISTS idx_expenses_user_period ON expenses(user_id, period_month);
CREATE INDEX IF NOT EXISTS idx_expenses_recurring ON expenses(recurring, period_month) WHERE recurring = true;