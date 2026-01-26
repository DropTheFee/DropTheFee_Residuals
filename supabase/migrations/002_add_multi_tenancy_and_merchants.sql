-- Add multi-tenancy support to existing tables
-- Add agency_id to users table for multi-tenancy
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS agency_id uuid;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS agency_name text;

-- Add agency_id to reports table
ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS agency_id uuid;

-- Add agency_id to commission tiers
ALTER TABLE public.commission_tiers ADD COLUMN IF NOT EXISTS agency_id uuid;
ALTER TABLE public.commission_override_tiers ADD COLUMN IF NOT EXISTS agency_id uuid;

-- Create merchants table for tracking merchant lifetime value
CREATE TABLE IF NOT EXISTS public.merchants (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL,
  merchant_name text NOT NULL,
  merchant_id text NOT NULL,
  dba_name text,
  processor text NOT NULL,
  sales_rep_id uuid,
  onboarding_date timestamp with time zone,
  status text DEFAULT 'active'::text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT merchants_pkey PRIMARY KEY (id),
  CONSTRAINT merchants_sales_rep_id_fkey FOREIGN KEY (sales_rep_id) REFERENCES public.users(id),
  CONSTRAINT merchants_unique_per_agency UNIQUE (agency_id, merchant_id, processor)
);

-- Create merchant_history table for tracking monthly performance
CREATE TABLE IF NOT EXISTS public.merchant_history (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  merchant_id uuid NOT NULL,
  agency_id uuid NOT NULL,
  report_date date NOT NULL,
  monthly_volume numeric DEFAULT 0,
  monthly_income numeric DEFAULT 0,
  rep_payout numeric DEFAULT 0,
  net_income numeric DEFAULT 0,
  transaction_count integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT merchant_history_pkey PRIMARY KEY (id),
  CONSTRAINT merchant_history_merchant_id_fkey FOREIGN KEY (merchant_id) REFERENCES public.merchants(id) ON DELETE CASCADE,
  CONSTRAINT merchant_history_unique_month UNIQUE (merchant_id, report_date)
);

-- Create merchant_stats table for calculated lifetime metrics
CREATE TABLE IF NOT EXISTS public.merchant_stats (
  merchant_id uuid NOT NULL,
  agency_id uuid NOT NULL,
  total_months_active integer DEFAULT 0,
  lifetime_volume numeric DEFAULT 0,
  lifetime_income numeric DEFAULT 0,
  lifetime_rep_payout numeric DEFAULT 0,
  lifetime_net_income numeric DEFAULT 0,
  avg_monthly_volume numeric DEFAULT 0,
  avg_monthly_income numeric DEFAULT 0,
  annualized_value numeric DEFAULT 0,
  last_activity_date date,
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT merchant_stats_pkey PRIMARY KEY (merchant_id),
  CONSTRAINT merchant_stats_merchant_id_fkey FOREIGN KEY (merchant_id) REFERENCES public.merchants(id) ON DELETE CASCADE
);

-- Create commissions table for tracking payouts
CREATE TABLE IF NOT EXISTS public.commissions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL,
  sales_rep_id uuid NOT NULL,
  merchant_id uuid,
  report_id uuid,
  commission_amount numeric NOT NULL,
  commission_date date NOT NULL,
  status text DEFAULT 'pending'::text,
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT commissions_pkey PRIMARY KEY (id),
  CONSTRAINT commissions_sales_rep_id_fkey FOREIGN KEY (sales_rep_id) REFERENCES public.users(id),
  CONSTRAINT commissions_merchant_id_fkey FOREIGN KEY (merchant_id) REFERENCES public.merchants(id),
  CONSTRAINT commissions_report_id_fkey FOREIGN KEY (report_id) REFERENCES public.reports(id)
);

-- Create expenses table
CREATE TABLE IF NOT EXISTS public.expenses (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL,
  user_id uuid NOT NULL,
  expense_type text NOT NULL,
  amount numeric NOT NULL,
  expense_date date NOT NULL,
  description text,
  status text DEFAULT 'pending'::text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT expenses_pkey PRIMARY KEY (id),
  CONSTRAINT expenses_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);

-- Create function to update merchant stats
CREATE OR REPLACE FUNCTION public.update_merchant_stats()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.merchant_stats (
    merchant_id,
    agency_id,
    total_months_active,
    lifetime_volume,
    lifetime_income,
    lifetime_rep_payout,
    lifetime_net_income,
    avg_monthly_volume,
    avg_monthly_income,
    annualized_value,
    last_activity_date,
    updated_at
  )
  SELECT
    NEW.merchant_id,
    NEW.agency_id,
    COUNT(DISTINCT report_date) as total_months_active,
    SUM(monthly_volume) as lifetime_volume,
    SUM(monthly_income) as lifetime_income,
    SUM(rep_payout) as lifetime_rep_payout,
    SUM(net_income) as lifetime_net_income,
    AVG(monthly_volume) as avg_monthly_volume,
    AVG(monthly_income) as avg_monthly_income,
    AVG(monthly_income) * 12 as annualized_value,
    MAX(report_date) as last_activity_date,
    NOW() as updated_at
  FROM public.merchant_history
  WHERE merchant_id = NEW.merchant_id
  GROUP BY merchant_id, agency_id
  ON CONFLICT (merchant_id)
  DO UPDATE SET
    total_months_active = EXCLUDED.total_months_active,
    lifetime_volume = EXCLUDED.lifetime_volume,
    lifetime_income = EXCLUDED.lifetime_income,
    lifetime_rep_payout = EXCLUDED.lifetime_rep_payout,
    lifetime_net_income = EXCLUDED.lifetime_net_income,
    avg_monthly_volume = EXCLUDED.avg_monthly_volume,
    avg_monthly_income = EXCLUDED.avg_monthly_income,
    annualized_value = EXCLUDED.annualized_value,
    last_activity_date = EXCLUDED.last_activity_date,
    updated_at = NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for merchant stats updates
DROP TRIGGER IF EXISTS on_merchant_history_insert ON public.merchant_history;
CREATE TRIGGER on_merchant_history_insert
  AFTER INSERT ON public.merchant_history
  FOR EACH ROW EXECUTE FUNCTION public.update_merchant_stats();

DROP TRIGGER IF EXISTS on_merchant_history_update ON public.merchant_history;
CREATE TRIGGER on_merchant_history_update
  AFTER UPDATE ON public.merchant_history
  FOR EACH ROW EXECUTE FUNCTION public.update_merchant_stats();

-- Enable Row Level Security on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.merchants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.merchant_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.merchant_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commission_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commission_override_tiers ENABLE ROW LEVEL SECURITY;

-- RLS Policies for multi-tenancy (users can only see their agency's data)

-- Users table policies
DROP POLICY IF EXISTS "Users can view own agency data" ON public.users;
CREATE POLICY "Users can view own agency data" ON public.users
  FOR SELECT USING (agency_id = (SELECT agency_id FROM public.users WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE USING (id = auth.uid());

-- Reports table policies
DROP POLICY IF EXISTS "Users can view own agency reports" ON public.reports;
CREATE POLICY "Users can view own agency reports" ON public.reports
  FOR SELECT USING (agency_id = (SELECT agency_id FROM public.users WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Users can insert own agency reports" ON public.reports;
CREATE POLICY "Users can insert own agency reports" ON public.reports
  FOR INSERT WITH CHECK (agency_id = (SELECT agency_id FROM public.users WHERE id = auth.uid()));

-- Merchants table policies
DROP POLICY IF EXISTS "Users can view own agency merchants" ON public.merchants;
CREATE POLICY "Users can view own agency merchants" ON public.merchants
  FOR SELECT USING (agency_id = (SELECT agency_id FROM public.users WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Users can insert own agency merchants" ON public.merchants;
CREATE POLICY "Users can insert own agency merchants" ON public.merchants
  FOR INSERT WITH CHECK (agency_id = (SELECT agency_id FROM public.users WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Users can update own agency merchants" ON public.merchants;
CREATE POLICY "Users can update own agency merchants" ON public.merchants
  FOR UPDATE USING (agency_id = (SELECT agency_id FROM public.users WHERE id = auth.uid()));

-- Merchant history policies
DROP POLICY IF EXISTS "Users can view own agency merchant history" ON public.merchant_history;
CREATE POLICY "Users can view own agency merchant history" ON public.merchant_history
  FOR SELECT USING (agency_id = (SELECT agency_id FROM public.users WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Users can insert own agency merchant history" ON public.merchant_history;
CREATE POLICY "Users can insert own agency merchant history" ON public.merchant_history
  FOR INSERT WITH CHECK (agency_id = (SELECT agency_id FROM public.users WHERE id = auth.uid()));

-- Merchant stats policies
DROP POLICY IF EXISTS "Users can view own agency merchant stats" ON public.merchant_stats;
CREATE POLICY "Users can view own agency merchant stats" ON public.merchant_stats
  FOR SELECT USING (agency_id = (SELECT agency_id FROM public.users WHERE id = auth.uid()));

-- Commissions policies
DROP POLICY IF EXISTS "Users can view own agency commissions" ON public.commissions;
CREATE POLICY "Users can view own agency commissions" ON public.commissions
  FOR SELECT USING (agency_id = (SELECT agency_id FROM public.users WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Users can insert own agency commissions" ON public.commissions;
CREATE POLICY "Users can insert own agency commissions" ON public.commissions
  FOR INSERT WITH CHECK (agency_id = (SELECT agency_id FROM public.users WHERE id = auth.uid()));

-- Expenses policies
DROP POLICY IF EXISTS "Users can view own agency expenses" ON public.expenses;
CREATE POLICY "Users can view own agency expenses" ON public.expenses
  FOR SELECT USING (agency_id = (SELECT agency_id FROM public.users WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Users can insert own agency expenses" ON public.expenses;
CREATE POLICY "Users can insert own agency expenses" ON public.expenses
  FOR INSERT WITH CHECK (agency_id = (SELECT agency_id FROM public.users WHERE id = auth.uid()));

-- Commission tiers policies
DROP POLICY IF EXISTS "Users can view own agency commission tiers" ON public.commission_tiers;
CREATE POLICY "Users can view own agency commission tiers" ON public.commission_tiers
  FOR SELECT USING (agency_id IS NULL OR agency_id = (SELECT agency_id FROM public.users WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Users can insert own agency commission tiers" ON public.commission_tiers;
CREATE POLICY "Users can insert own agency commission tiers" ON public.commission_tiers
  FOR INSERT WITH CHECK (agency_id = (SELECT agency_id FROM public.users WHERE id = auth.uid()));

-- Commission override tiers policies
DROP POLICY IF EXISTS "Users can view own agency override tiers" ON public.commission_override_tiers;
CREATE POLICY "Users can view own agency override tiers" ON public.commission_override_tiers
  FOR SELECT USING (agency_id IS NULL OR agency_id = (SELECT agency_id FROM public.users WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Users can insert own agency override tiers" ON public.commission_override_tiers;
CREATE POLICY "Users can insert own agency override tiers" ON public.commission_override_tiers
  FOR INSERT WITH CHECK (agency_id = (SELECT agency_id FROM public.users WHERE id = auth.uid()));

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_agency_id ON public.users(agency_id);
CREATE INDEX IF NOT EXISTS idx_reports_agency_id ON public.reports(agency_id);
CREATE INDEX IF NOT EXISTS idx_merchants_agency_id ON public.merchants(agency_id);
CREATE INDEX IF NOT EXISTS idx_merchants_sales_rep_id ON public.merchants(sales_rep_id);
CREATE INDEX IF NOT EXISTS idx_merchant_history_merchant_id ON public.merchant_history(merchant_id);
CREATE INDEX IF NOT EXISTS idx_merchant_history_agency_id ON public.merchant_history(agency_id);
CREATE INDEX IF NOT EXISTS idx_merchant_history_report_date ON public.merchant_history(report_date);
CREATE INDEX IF NOT EXISTS idx_commissions_agency_id ON public.commissions(agency_id);
CREATE INDEX IF NOT EXISTS idx_commissions_sales_rep_id ON public.commissions(sales_rep_id);
CREATE INDEX IF NOT EXISTS idx_expenses_agency_id ON public.expenses(agency_id);