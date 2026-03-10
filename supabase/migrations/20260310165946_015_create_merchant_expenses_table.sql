/*
  # Create merchant_expenses table

  1. New Tables
    - `merchant_expenses`
      - `id` (uuid, primary key)
      - `agency_id` (uuid, not null) - links to agencies table
      - `merchant_id` (uuid, nullable) - links to merchants table when matched
      - `merchant_name` (text, not null) - merchant name from expense file
      - `expense_source` (text, not null) - vendor/source of the expense (e.g., "Dejavoo")
      - `expense_amount` (numeric, not null) - expense amount
      - `report_date` (date, not null) - date of the expense report
      - `matched` (boolean, default false) - whether merchant was matched to existing merchant
      - `created_at` (timestamptz, default now())
      
  2. Security
    - Enable RLS on merchant_expenses table
    - Add policies for authenticated users to view/insert their agency's expenses
    
  3. Indexes
    - Create indexes for agency_id, merchant_id, and report_date for better query performance
*/

CREATE TABLE IF NOT EXISTS merchant_expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL,
  merchant_id uuid,
  merchant_name text NOT NULL,
  expense_source text NOT NULL,
  expense_amount numeric NOT NULL DEFAULT 0,
  report_date date NOT NULL,
  matched boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT merchant_expenses_merchant_id_fkey FOREIGN KEY (merchant_id) REFERENCES merchants(id) ON DELETE SET NULL
);

ALTER TABLE merchant_expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own agency expenses"
  ON merchant_expenses
  FOR SELECT
  TO authenticated
  USING (agency_id = (SELECT agency_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can insert own agency expenses"
  ON merchant_expenses
  FOR INSERT
  TO authenticated
  WITH CHECK (agency_id = (SELECT agency_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can update own agency expenses"
  ON merchant_expenses
  FOR UPDATE
  TO authenticated
  USING (agency_id = (SELECT agency_id FROM users WHERE id = auth.uid()))
  WITH CHECK (agency_id = (SELECT agency_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can delete own agency expenses"
  ON merchant_expenses
  FOR DELETE
  TO authenticated
  USING (agency_id = (SELECT agency_id FROM users WHERE id = auth.uid()));

CREATE INDEX IF NOT EXISTS idx_merchant_expenses_agency_id ON merchant_expenses(agency_id);
CREATE INDEX IF NOT EXISTS idx_merchant_expenses_merchant_id ON merchant_expenses(merchant_id);
CREATE INDEX IF NOT EXISTS idx_merchant_expenses_report_date ON merchant_expenses(report_date);
CREATE INDEX IF NOT EXISTS idx_merchant_expenses_matched ON merchant_expenses(matched);
CREATE INDEX IF NOT EXISTS idx_merchant_expenses_expense_source ON merchant_expenses(expense_source);
