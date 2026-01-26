/*
  # Initial Database Schema for DropTheFee Residuals
  
  This migration creates the complete database structure including:
  1. Users and profiles tables with role-based access
  2. Commission tier structures (standard and override)
  3. Reports table for CSV uploads
  4. Multi-tenancy support with agency_id
  5. Row Level Security (RLS) policies for data isolation
  
  ## Tables Created:
  - profiles: User profile information linked to auth.users
  - users: Application user data with roles and agency association
  - commission_tiers: Standard commission split percentages by volume
  - commission_override_tiers: Trainer override percentages
  - reports: Uploaded CSV report data
  
  ## Security:
  - RLS enabled on all tables
  - Policies enforce agency-level data isolation
  - Role-based access control for admin functions
*/

-- Create profiles table (links to auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  full_name text,
  role text DEFAULT 'sales_rep' CHECK (role IN ('superadmin', 'admin', 'sales_rep', 'junior_sales_rep')),
  created_at timestamptz DEFAULT now()
);

-- Create users table with multi-tenancy support
CREATE TABLE IF NOT EXISTS public.users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  role text NOT NULL DEFAULT 'sales_rep' CHECK (role IN ('superadmin', 'admin', 'sales_rep', 'junior_sales_rep')),
  sales_rep_id text,
  agency_id uuid NOT NULL, -- Multi-tenancy: each user belongs to an agency
  trainer_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(email, agency_id)
);

-- Create commission_tiers table for standard rep splits
CREATE TABLE IF NOT EXISTS public.commission_tiers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  min_volume numeric NOT NULL,
  max_volume numeric,
  split_percentage numeric NOT NULL CHECK (split_percentage >= 0 AND split_percentage <= 100),
  created_at timestamptz DEFAULT now()
);

-- Create commission_override_tiers table for trainer overrides
CREATE TABLE IF NOT EXISTS public.commission_override_tiers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  min_volume numeric NOT NULL,
  max_volume numeric,
  override_percentage numeric NOT NULL CHECK (override_percentage >= 0 AND override_percentage <= 100),
  created_at timestamptz DEFAULT now()
);

-- Create reports table
CREATE TABLE IF NOT EXISTS public.reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  agency_id uuid NOT NULL, -- Multi-tenancy: reports belong to an agency
  processor text NOT NULL,
  report_type text NOT NULL,
  upload_date timestamptz NOT NULL DEFAULT now(),
  data jsonb NOT NULL,
  stats jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Create merchants table for long-term value tracking
CREATE TABLE IF NOT EXISTS public.merchants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL, -- Multi-tenancy
  merchant_id text NOT NULL,
  merchant_name text NOT NULL,
  sales_rep_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  first_report_date timestamptz,
  last_report_date timestamptz,
  total_lifetime_volume numeric DEFAULT 0,
  total_lifetime_income numeric DEFAULT 0,
  average_monthly_income numeric DEFAULT 0,
  months_active integer DEFAULT 0,
  status text DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'churned')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(merchant_id, agency_id)
);

-- Create merchant_history table for tracking changes over time
CREATE TABLE IF NOT EXISTS public.merchant_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id uuid NOT NULL REFERENCES public.merchants(id) ON DELETE CASCADE,
  report_date timestamptz NOT NULL,
  monthly_volume numeric NOT NULL,
  monthly_income numeric NOT NULL,
  rep_payout numeric,
  agency_income numeric,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commission_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commission_override_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.merchants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.merchant_history ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Users policies (with multi-tenancy)
CREATE POLICY "Users can view users in their agency"
  ON public.users FOR SELECT
  TO authenticated
  USING (
    agency_id = (
      SELECT agency_id FROM public.users WHERE auth_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage users in their agency"
  ON public.users FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE auth_id = auth.uid()
      AND role IN ('superadmin', 'admin')
      AND agency_id = public.users.agency_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE auth_id = auth.uid()
      AND role IN ('superadmin', 'admin')
      AND agency_id = public.users.agency_id
    )
  );

-- Commission tiers policies (global read, admin write)
CREATE POLICY "Authenticated users can read commission tiers"
  ON public.commission_tiers FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage commission tiers"
  ON public.commission_tiers FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE auth_id = auth.uid()
      AND role IN ('superadmin', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE auth_id = auth.uid()
      AND role IN ('superadmin', 'admin')
    )
  );

-- Commission override tiers policies
CREATE POLICY "Authenticated users can read override tiers"
  ON public.commission_override_tiers FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage override tiers"
  ON public.commission_override_tiers FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE auth_id = auth.uid()
      AND role IN ('superadmin', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE auth_id = auth.uid()
      AND role IN ('superadmin', 'admin')
    )
  );

-- Reports policies (agency-level isolation)
CREATE POLICY "Users can view reports in their agency"
  ON public.reports FOR SELECT
  TO authenticated
  USING (
    agency_id = (
      SELECT agency_id FROM public.users WHERE auth_id = auth.uid()
    )
  );

CREATE POLICY "Users can create reports in their agency"
  ON public.reports FOR INSERT
  TO authenticated
  WITH CHECK (
    agency_id = (
      SELECT agency_id FROM public.users WHERE auth_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage reports in their agency"
  ON public.reports FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE auth_id = auth.uid()
      AND role IN ('superadmin', 'admin')
      AND agency_id = public.reports.agency_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE auth_id = auth.uid()
      AND role IN ('superadmin', 'admin')
      AND agency_id = public.reports.agency_id
    )
  );

-- Merchants policies (agency-level isolation)
CREATE POLICY "Users can view merchants in their agency"
  ON public.merchants FOR SELECT
  TO authenticated
  USING (
    agency_id = (
      SELECT agency_id FROM public.users WHERE auth_id = auth.uid()
    )
  );

CREATE POLICY "Users can create merchants in their agency"
  ON public.merchants FOR INSERT
  TO authenticated
  WITH CHECK (
    agency_id = (
      SELECT agency_id FROM public.users WHERE auth_id = auth.uid()
    )
  );

CREATE POLICY "Users can update merchants in their agency"
  ON public.merchants FOR UPDATE
  TO authenticated
  USING (
    agency_id = (
      SELECT agency_id FROM public.users WHERE auth_id = auth.uid()
    )
  )
  WITH CHECK (
    agency_id = (
      SELECT agency_id FROM public.users WHERE auth_id = auth.uid()
    )
  );

-- Merchant history policies (inherits from merchants)
CREATE POLICY "Users can view merchant history in their agency"
  ON public.merchant_history FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.merchants
      WHERE merchants.id = merchant_history.merchant_id
      AND merchants.agency_id = (
        SELECT agency_id FROM public.users WHERE auth_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can create merchant history in their agency"
  ON public.merchant_history FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.merchants
      WHERE merchants.id = merchant_history.merchant_id
      AND merchants.agency_id = (
        SELECT agency_id FROM public.users WHERE auth_id = auth.uid()
      )
    )
  );

-- Insert standard commission tier data
INSERT INTO public.commission_tiers (min_volume, max_volume, split_percentage) VALUES
  (0, 500000, 60),
  (500001, 1000000, 70),
  (1000001, 2000000, 75),
  (2000001, 3500000, 80),
  (3500001, NULL, 85)
ON CONFLICT DO NOTHING;

-- Insert override commission tier data (for trainers)
INSERT INTO public.commission_override_tiers (min_volume, max_volume, override_percentage) VALUES
  (0, 500000, 30),
  (500001, 1000000, 20),
  (1000001, 2000000, 15),
  (2000001, 3500000, 10)
ON CONFLICT DO NOTHING;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_agency_id ON public.users(agency_id);
CREATE INDEX IF NOT EXISTS idx_users_auth_id ON public.users(auth_id);
CREATE INDEX IF NOT EXISTS idx_users_trainer_id ON public.users(trainer_id);
CREATE INDEX IF NOT EXISTS idx_reports_agency_id ON public.reports(agency_id);
CREATE INDEX IF NOT EXISTS idx_reports_user_id ON public.reports(user_id);
CREATE INDEX IF NOT EXISTS idx_merchants_agency_id ON public.merchants(agency_id);
CREATE INDEX IF NOT EXISTS idx_merchants_sales_rep_id ON public.merchants(sales_rep_id);
CREATE INDEX IF NOT EXISTS idx_merchant_history_merchant_id ON public.merchant_history(merchant_id);
CREATE INDEX IF NOT EXISTS idx_merchant_history_report_date ON public.merchant_history(report_date);
CREATE INDEX IF NOT EXISTS idx_commission_tiers_volume ON public.commission_tiers(min_volume, max_volume);
CREATE INDEX IF NOT EXISTS idx_commission_override_tiers_volume ON public.commission_override_tiers(min_volume, max_volume);

-- Create function to auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (new.id, new.email, new.raw_user_meta_data->>'full_name', 'sales_rep');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for auto-profile creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create function to update merchant statistics
CREATE OR REPLACE FUNCTION public.update_merchant_stats()
RETURNS trigger AS $$
BEGIN
  UPDATE public.merchants
  SET
    last_report_date = NEW.report_date,
    total_lifetime_volume = total_lifetime_volume + NEW.monthly_volume,
    total_lifetime_income = total_lifetime_income + NEW.monthly_income,
    months_active = months_active + 1,
    average_monthly_income = (total_lifetime_income + NEW.monthly_income) / (months_active + 1),
    updated_at = now()
  WHERE id = NEW.merchant_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for merchant stats update
DROP TRIGGER IF EXISTS on_merchant_history_insert ON public.merchant_history;
CREATE TRIGGER on_merchant_history_insert
  AFTER INSERT ON public.merchant_history
  FOR EACH ROW EXECUTE FUNCTION public.update_merchant_stats();