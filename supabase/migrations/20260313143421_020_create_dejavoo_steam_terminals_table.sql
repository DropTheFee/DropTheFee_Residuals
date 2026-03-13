/*
  # Create Dejavoo Steam Terminals Table

  1. New Tables
    - `dejavoo_steam_terminals`
      - `id` (uuid, primary key)
      - `agency_id` (uuid, references agencies)
      - `merchant_id` (uuid, references merchants)
      - `tpn` (text) - Terminal Product Number
      - `bundle_price` (numeric) - Monthly bundle price
      - `tpn_price` (numeric) - Monthly TPN fee
      - `spinproxy` (boolean) - Whether SPInProxy fee applies ($1.00)
      - `active` (boolean) - Whether terminal is currently active
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `dejavoo_steam_terminals` table
    - Add policies for authenticated users to manage terminals in their agency

  3. Indexes
    - Index on agency_id for fast lookups
    - Index on merchant_id for joins
*/

CREATE TABLE IF NOT EXISTS dejavoo_steam_terminals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  merchant_id uuid NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  tpn text NOT NULL,
  bundle_price numeric(10,2) NOT NULL DEFAULT 5.95,
  tpn_price numeric(10,2) NOT NULL DEFAULT 1.95,
  spinproxy boolean NOT NULL DEFAULT false,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE dejavoo_steam_terminals ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_dejavoo_steam_terminals_agency_id 
  ON dejavoo_steam_terminals(agency_id);

CREATE INDEX IF NOT EXISTS idx_dejavoo_steam_terminals_merchant_id 
  ON dejavoo_steam_terminals(merchant_id);

CREATE POLICY "Users can view terminals in their agency"
  ON dejavoo_steam_terminals
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.agency_id = dejavoo_steam_terminals.agency_id
    )
  );

CREATE POLICY "Users can insert terminals in their agency"
  ON dejavoo_steam_terminals
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.agency_id = dejavoo_steam_terminals.agency_id
    )
  );

CREATE POLICY "Users can update terminals in their agency"
  ON dejavoo_steam_terminals
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.agency_id = dejavoo_steam_terminals.agency_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.agency_id = dejavoo_steam_terminals.agency_id
    )
  );

CREATE POLICY "Users can delete terminals in their agency"
  ON dejavoo_steam_terminals
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.agency_id = dejavoo_steam_terminals.agency_id
    )
  );
