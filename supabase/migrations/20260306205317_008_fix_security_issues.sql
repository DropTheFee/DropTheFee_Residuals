/*
  # Fix Security Issues

  ## Security Issues Addressed

  1. **Remove Unused Indexes**
     - Drop all unused indexes that are not being utilized by queries
     - These indexes consume storage and slow down write operations without providing value
     - Indexes being removed:
       - `idx_users_ghl_user_id` - not used in queries
       - `idx_users_agency_id` - redundant with other access patterns
       - `idx_users_auth_id` - not needed as auth_id has unique constraint
       - `idx_users_trainer_id` - not used in queries
       - `idx_reports_agency_id` - not used with current RLS policies
       - `idx_reports_user_id` - not used in current queries
       - `idx_reports_sales_rep_id` - not used in current queries
       - `idx_reports_report_date` - not used in current queries
       - `idx_merchants_agency_id` - redundant with RLS patterns
       - `idx_merchants_sales_rep_id` - not used in current queries
       - `idx_merchant_history_merchant_id` - covered by foreign key
       - `idx_merchant_history_report_date` - not used in current queries
       - `idx_commission_tiers_volume` - not used in queries
       - `idx_commission_override_tiers_volume` - not used in queries

  2. **Fix Multiple Permissive Policies**
     - Consolidate overlapping SELECT policies into single restrictive policies
     - Remove redundant admin policies that overlap with user policies
     - Tables affected: users, commission_tiers, commission_override_tiers

  3. **Fix Function Search Path**
     - Update `update_merchant_stats` function with explicit search_path
     - Prevents security vulnerabilities from mutable search paths

  ## Important Notes
  - Indexes can always be recreated if query patterns change
  - RLS policies are now simpler and more maintainable
  - Function security is improved with explicit search_path
*/

-- ============================================================================
-- STEP 1: Drop unused indexes
-- ============================================================================

DROP INDEX IF EXISTS public.idx_users_ghl_user_id;
DROP INDEX IF EXISTS public.idx_users_agency_id;
DROP INDEX IF EXISTS public.idx_users_auth_id;
DROP INDEX IF EXISTS public.idx_users_trainer_id;
DROP INDEX IF EXISTS public.idx_reports_agency_id;
DROP INDEX IF EXISTS public.idx_reports_user_id;
DROP INDEX IF EXISTS public.idx_reports_sales_rep_id;
DROP INDEX IF EXISTS public.idx_reports_report_date;
DROP INDEX IF EXISTS public.idx_merchants_agency_id;
DROP INDEX IF EXISTS public.idx_merchants_sales_rep_id;
DROP INDEX IF EXISTS public.idx_merchant_history_merchant_id;
DROP INDEX IF EXISTS public.idx_merchant_history_report_date;
DROP INDEX IF EXISTS public.idx_commission_tiers_volume;
DROP INDEX IF EXISTS public.idx_commission_override_tiers_volume;

-- ============================================================================
-- STEP 2: Fix multiple permissive policies
-- ============================================================================

-- Drop overlapping policies on commission_tiers
DROP POLICY IF EXISTS "Admins can manage commission tiers" ON public.commission_tiers;
DROP POLICY IF EXISTS "Users can view commission tiers" ON public.commission_tiers;

-- Create single consolidated SELECT policy for commission_tiers
CREATE POLICY "Authenticated users can view commission tiers"
  ON public.commission_tiers FOR SELECT
  TO authenticated
  USING (true);

-- Create admin-only management policy for commission_tiers
CREATE POLICY "Admins can manage commission tiers"
  ON public.commission_tiers FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE auth_id = (SELECT auth.uid())
      AND role IN ('superadmin', 'admin')
    )
  );

CREATE POLICY "Admins can update commission tiers"
  ON public.commission_tiers FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE auth_id = (SELECT auth.uid())
      AND role IN ('superadmin', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE auth_id = (SELECT auth.uid())
      AND role IN ('superadmin', 'admin')
    )
  );

CREATE POLICY "Admins can delete commission tiers"
  ON public.commission_tiers FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE auth_id = (SELECT auth.uid())
      AND role IN ('superadmin', 'admin')
    )
  );

-- Drop overlapping policies on commission_override_tiers
DROP POLICY IF EXISTS "Admins can manage override tiers" ON public.commission_override_tiers;
DROP POLICY IF EXISTS "Users can view override tiers" ON public.commission_override_tiers;

-- Create single consolidated SELECT policy for commission_override_tiers
CREATE POLICY "Authenticated users can view override tiers"
  ON public.commission_override_tiers FOR SELECT
  TO authenticated
  USING (true);

-- Create admin-only management policy for commission_override_tiers
CREATE POLICY "Admins can manage override tiers"
  ON public.commission_override_tiers FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE auth_id = (SELECT auth.uid())
      AND role IN ('superadmin', 'admin')
    )
  );

CREATE POLICY "Admins can update override tiers"
  ON public.commission_override_tiers FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE auth_id = (SELECT auth.uid())
      AND role IN ('superadmin', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE auth_id = (SELECT auth.uid())
      AND role IN ('superadmin', 'admin')
    )
  );

CREATE POLICY "Admins can delete override tiers"
  ON public.commission_override_tiers FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE auth_id = (SELECT auth.uid())
      AND role IN ('superadmin', 'admin')
    )
  );

-- Fix overlapping policies on users table
DROP POLICY IF EXISTS "Admins can manage users in their agency" ON public.users;
DROP POLICY IF EXISTS "Users can view users in their agency" ON public.users;
DROP POLICY IF EXISTS "Users can update their own data" ON public.users;

-- Create single SELECT policy for users
CREATE POLICY "Users can view users in their agency"
  ON public.users FOR SELECT
  TO authenticated
  USING (
    agency_id = (
      SELECT agency_id FROM public.users WHERE auth_id = (SELECT auth.uid()) LIMIT 1
    )
  );

-- Create separate UPDATE policies without overlap
CREATE POLICY "Users can update their own profile"
  ON public.users FOR UPDATE
  TO authenticated
  USING (auth_id = (SELECT auth.uid()))
  WITH CHECK (auth_id = (SELECT auth.uid()));

CREATE POLICY "Admins can manage other users in agency"
  ON public.users FOR UPDATE
  TO authenticated
  USING (
    auth_id != (SELECT auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.users
      WHERE auth_id = (SELECT auth.uid())
      AND role IN ('superadmin', 'admin')
      AND agency_id = public.users.agency_id
    )
  )
  WITH CHECK (
    auth_id != (SELECT auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.users
      WHERE auth_id = (SELECT auth.uid())
      AND role IN ('superadmin', 'admin')
      AND agency_id = public.users.agency_id
    )
  );

CREATE POLICY "Admins can insert users in their agency"
  ON public.users FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE auth_id = (SELECT auth.uid())
      AND role IN ('superadmin', 'admin')
    )
  );

CREATE POLICY "Admins can delete users in their agency"
  ON public.users FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE auth_id = (SELECT auth.uid())
      AND role IN ('superadmin', 'admin')
      AND agency_id = public.users.agency_id
    )
  );

-- ============================================================================
-- STEP 3: Fix function search path for update_merchant_stats
-- ============================================================================

CREATE OR REPLACE FUNCTION public.update_merchant_stats()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
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
    (AVG(monthly_income) * 12) as annualized_value,
    MAX(report_date) as last_activity_date,
    NOW() as updated_at
  FROM public.merchant_history
  WHERE merchant_id = NEW.merchant_id
  GROUP BY merchant_id, agency_id
  ON CONFLICT (merchant_id) DO UPDATE SET
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
$$ LANGUAGE plpgsql;