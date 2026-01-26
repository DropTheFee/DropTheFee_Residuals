-- Add GoHighLevel integration fields to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS ghl_user_id TEXT UNIQUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS agency_id TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_ghl_user_id ON users(ghl_user_id);
CREATE INDEX IF NOT EXISTS idx_users_agency_id ON users(agency_id);

-- Update RLS policies to use agency_id for multi-tenancy
DROP POLICY IF EXISTS "Users can view their own data" ON users;
DROP POLICY IF EXISTS "Users can update their own data" ON users;

CREATE POLICY "Users can view their agency data" ON users
  FOR SELECT
  USING (
    agency_id = (SELECT agency_id FROM users WHERE id = auth.uid())
    OR id = auth.uid()
  );

CREATE POLICY "Users can update their own data" ON users
  FOR UPDATE
  USING (id = auth.uid());

-- Update merchants table policies for agency isolation
DROP POLICY IF EXISTS "Users can view merchants" ON merchants;
DROP POLICY IF EXISTS "Users can insert merchants" ON merchants;
DROP POLICY IF EXISTS "Users can update merchants" ON merchants;

CREATE POLICY "Users can view their agency merchants" ON merchants
  FOR SELECT
  USING (
    agency_id = (SELECT agency_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "Users can insert their agency merchants" ON merchants
  FOR INSERT
  WITH CHECK (
    agency_id = (SELECT agency_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "Users can update their agency merchants" ON merchants
  FOR UPDATE
  USING (
    agency_id = (SELECT agency_id FROM users WHERE id = auth.uid())
  );

-- Update merchant_history table policies
DROP POLICY IF EXISTS "Users can view merchant history" ON merchant_history;
DROP POLICY IF EXISTS "Users can insert merchant history" ON merchant_history;

CREATE POLICY "Users can view their agency merchant history" ON merchant_history
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM merchants
      WHERE merchants.id = merchant_history.merchant_id
      AND merchants.agency_id = (SELECT agency_id FROM users WHERE id = auth.uid())
    )
  );

CREATE POLICY "Users can insert their agency merchant history" ON merchant_history
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM merchants
      WHERE merchants.id = merchant_history.merchant_id
      AND merchants.agency_id = (SELECT agency_id FROM users WHERE id = auth.uid())
    )
  );

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();