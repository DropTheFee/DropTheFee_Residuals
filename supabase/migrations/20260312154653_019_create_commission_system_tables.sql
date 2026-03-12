/*
  # Create Commission System Tables

  This migration creates all required tables for the commission calculation system.

  ## New Tables
  
  1. `rep_contracts` - Stores contract type assignments for each rep
    - `id` (uuid, primary key)
    - `user_id` (uuid, references users) - The rep this contract applies to
    - `contract_type` (text) - Type: sr_sae, jr_ae, sae_override, katlyn_flat, venture_apps
    - `override_from_user_id` (uuid, nullable) - For sae_override, references the jr_ae being overridden
    - `created_at` (timestamptz)
    - `updated_at` (timestamptz)

  2. `commission_periods` - Tracks commission calculation periods
    - `id` (uuid, primary key)
    - `agency_id` (uuid, references agencies)
    - `period_month` (text) - Format: YYYY-MM (e.g., "2026-03")
    - `status` (text) - Values: open, calculated, finalized
    - `created_at` (timestamptz)
    - `updated_at` (timestamptz)

  3. `commission_results` - Stores calculated commission payouts
    - `id` (uuid, primary key)
    - `agency_id` (uuid, references agencies)
    - `period_month` (text)
    - `user_id` (uuid, references users) - The rep receiving payout
    - `merchant_id` (uuid, nullable, references merchants) - Null for SüRJ/NAB
    - `contract_type` (text)
    - `source_type` (text) - Values: merchant, surj, nab
    - `merchant_name` (text, nullable)
    - `processor` (text, nullable)
    - `total_volume` (numeric) - Rep's total volume for tier calculation
    - `monthly_volume` (numeric) - This merchant's volume
    - `gross_residual` (numeric)
    - `expenses` (numeric)
    - `net_residual` (numeric)
    - `tier_percentage` (numeric)
    - `payout_amount` (numeric)
    - `override_from_user_id` (uuid, nullable) - For sae_override tracking
    - `created_at` (timestamptz)
    - `updated_at` (timestamptz)

  4. `surj_entries` - Manual SüRJ platform entries
    - `id` (uuid, primary key)
    - `agency_id` (uuid, references agencies)
    - `user_id` (uuid, references users)
    - `period_month` (text)
    - `amount` (numeric)
    - `notes` (text, nullable)
    - `created_at` (timestamptz)

  5. `nab_records` - EPI New Account Bonus records
    - `id` (uuid, primary key)
    - `agency_id` (uuid, references agencies)
    - `rep_user_id` (uuid, references users)
    - `period_month` (text)
    - `merchant_name` (text)
    - `bonus_amount` (numeric)
    - `created_at` (timestamptz)

  ## Schema Updates
  
  - Add `venture_source` column to merchants table (values: 'rms' or 'venture')
  - Add `office_code` column to users table

  ## Security
  
  - Enable RLS on all new tables
  - Create policies for SuperAdmin and agency-level access
*/

-- Add missing columns to existing tables
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'merchants' AND column_name = 'venture_source'
  ) THEN
    ALTER TABLE merchants ADD COLUMN venture_source text CHECK (venture_source IN ('rms', 'venture'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'office_code'
  ) THEN
    ALTER TABLE users ADD COLUMN office_code text;
  END IF;
END $$;

-- Create rep_contracts table
CREATE TABLE IF NOT EXISTS rep_contracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  contract_type text NOT NULL CHECK (contract_type IN ('sr_sae', 'jr_ae', 'sae_override', 'katlyn_flat', 'venture_apps')),
  override_from_user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE rep_contracts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "SuperAdmin can manage all rep contracts"
  ON rep_contracts FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'superadmin'
    )
  );

-- Create commission_periods table
CREATE TABLE IF NOT EXISTS commission_periods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  period_month text NOT NULL,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'calculated', 'finalized')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(agency_id, period_month)
);

ALTER TABLE commission_periods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "SuperAdmin can manage commission periods"
  ON commission_periods FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'superadmin'
      AND users.agency_id = commission_periods.agency_id
    )
  );

-- Create commission_results table
CREATE TABLE IF NOT EXISTS commission_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  period_month text NOT NULL,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  merchant_id uuid REFERENCES merchants(id) ON DELETE CASCADE,
  contract_type text NOT NULL,
  source_type text NOT NULL DEFAULT 'merchant' CHECK (source_type IN ('merchant', 'surj', 'nab')),
  merchant_name text,
  processor text,
  total_volume numeric NOT NULL DEFAULT 0,
  monthly_volume numeric NOT NULL DEFAULT 0,
  gross_residual numeric NOT NULL DEFAULT 0,
  expenses numeric NOT NULL DEFAULT 0,
  net_residual numeric NOT NULL DEFAULT 0,
  tier_percentage numeric NOT NULL DEFAULT 0,
  payout_amount numeric NOT NULL DEFAULT 0,
  override_from_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE commission_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "SuperAdmin can manage commission results"
  ON commission_results FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'superadmin'
      AND users.agency_id = commission_results.agency_id
    )
  );

CREATE POLICY "Reps can view their own commission results"
  ON commission_results FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Create surj_entries table
CREATE TABLE IF NOT EXISTS surj_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  period_month text NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE surj_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "SuperAdmin can manage surj entries"
  ON surj_entries FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'superadmin'
      AND users.agency_id = surj_entries.agency_id
    )
  );

CREATE POLICY "Reps can view their own surj entries"
  ON surj_entries FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Create nab_records table
CREATE TABLE IF NOT EXISTS nab_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  rep_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  period_month text NOT NULL,
  merchant_name text NOT NULL,
  bonus_amount numeric NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE nab_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "SuperAdmin can manage nab records"
  ON nab_records FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'superadmin'
      AND users.agency_id = nab_records.agency_id
    )
  );

CREATE POLICY "Reps can view their own nab records"
  ON nab_records FOR SELECT
  TO authenticated
  USING (rep_user_id = auth.uid());