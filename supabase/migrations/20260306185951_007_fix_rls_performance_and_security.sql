/*
  # Fix RLS Performance and Security Issues

  ## Changes Made
  
  1. **Optimize RLS Policies for Performance**
     - Wrap all auth.uid() calls in SELECT subqueries to prevent re-evaluation per row
     - This significantly improves query performance at scale
  
  2. **Remove Duplicate Policies**
     - Consolidate multiple permissive policies into single policies
     - Remove redundant policies that serve the same purpose
  
  3. **Fix Function Search Paths**
     - Set explicit search_path on all functions to prevent security issues
*/

-- ============================================================================
-- STEP 1: Drop all existing policies to start fresh
-- ============================================================================

-- Users table
DROP POLICY IF EXISTS "Users can view users in their agency" ON public.users;
DROP POLICY IF EXISTS "Admins can manage users in their agency" ON public.users;
DROP POLICY IF EXISTS "Users can view their agency data" ON public.users;
DROP POLICY IF EXISTS "Users can update their own data" ON public.users;
DROP POLICY IF EXISTS "Users can view own agency data" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;

-- Profiles table
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

-- Commission tiers
DROP POLICY IF EXISTS "Admins can manage commission tiers" ON public.commission_tiers;
DROP POLICY IF EXISTS "Authenticated users can read commission tiers" ON public.commission_tiers;
DROP POLICY IF EXISTS "Users can view own agency commission tiers" ON public.commission_tiers;
DROP POLICY IF EXISTS "Users can insert own agency commission tiers" ON public.commission_tiers;

-- Commission override tiers
DROP POLICY IF EXISTS "Admins can manage override tiers" ON public.commission_override_tiers;
DROP POLICY IF EXISTS "Authenticated users can read override tiers" ON public.commission_override_tiers;
DROP POLICY IF EXISTS "Users can view own agency override tiers" ON public.commission_override_tiers;
DROP POLICY IF EXISTS "Users can insert own agency override tiers" ON public.commission_override_tiers;

-- Merchants
DROP POLICY IF EXISTS "Users can view merchants in their agency" ON public.merchants;
DROP POLICY IF EXISTS "Users can create merchants in their agency" ON public.merchants;
DROP POLICY IF EXISTS "Users can update merchants in their agency" ON public.merchants;
DROP POLICY IF EXISTS "Users can view their agency merchants" ON public.merchants;
DROP POLICY IF EXISTS "Users can insert their agency merchants" ON public.merchants;
DROP POLICY IF EXISTS "Users can update their agency merchants" ON public.merchants;

-- Merchant history
DROP POLICY IF EXISTS "Users can view merchant history in their agency" ON public.merchant_history;
DROP POLICY IF EXISTS "Users can create merchant history in their agency" ON public.merchant_history;
DROP POLICY IF EXISTS "Users can view their agency merchant history" ON public.merchant_history;
DROP POLICY IF EXISTS "Users can insert their agency merchant history" ON public.merchant_history;

-- Reports
DROP POLICY IF EXISTS "Users can view reports in their agency" ON public.reports;
DROP POLICY IF EXISTS "Users can create reports in their agency" ON public.reports;
DROP POLICY IF EXISTS "Admins can manage reports in their agency" ON public.reports;
DROP POLICY IF EXISTS "Users can view own agency reports" ON public.reports;
DROP POLICY IF EXISTS "Users can insert own agency reports" ON public.reports;

-- ============================================================================
-- STEP 2: Create optimized RLS policies with SELECT subqueries
-- ============================================================================

-- Users table policies (optimized with SELECT)
CREATE POLICY "Users can view users in their agency"
  ON public.users FOR SELECT
  TO authenticated
  USING (
    agency_id = (
      SELECT agency_id FROM public.users WHERE auth_id = (SELECT auth.uid()) LIMIT 1
    )
  );

CREATE POLICY "Users can update their own data"
  ON public.users FOR UPDATE
  TO authenticated
  USING (auth_id = (SELECT auth.uid()))
  WITH CHECK (auth_id = (SELECT auth.uid()));

CREATE POLICY "Admins can manage users in their agency"
  ON public.users FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE auth_id = (SELECT auth.uid())
      AND role IN ('superadmin', 'admin')
      AND agency_id = public.users.agency_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE auth_id = (SELECT auth.uid())
      AND role IN ('superadmin', 'admin')
      AND agency_id = public.users.agency_id
    )
  );

-- Profiles table policies (optimized)
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (id = (SELECT auth.uid()));

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (id = (SELECT auth.uid()))
  WITH CHECK (id = (SELECT auth.uid()));

-- Commission tiers policies (single consolidated policy per action)
CREATE POLICY "Users can view commission tiers"
  ON public.commission_tiers FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage commission tiers"
  ON public.commission_tiers FOR ALL
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

-- Commission override tiers policies (single consolidated policy per action)
CREATE POLICY "Users can view override tiers"
  ON public.commission_override_tiers FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage override tiers"
  ON public.commission_override_tiers FOR ALL
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

-- Merchants policies (single policy per action, optimized)
CREATE POLICY "Users can view merchants in their agency"
  ON public.merchants FOR SELECT
  TO authenticated
  USING (
    agency_id = (
      SELECT agency_id FROM public.users WHERE auth_id = (SELECT auth.uid()) LIMIT 1
    )
  );

CREATE POLICY "Users can insert merchants in their agency"
  ON public.merchants FOR INSERT
  TO authenticated
  WITH CHECK (
    agency_id = (
      SELECT agency_id FROM public.users WHERE auth_id = (SELECT auth.uid()) LIMIT 1
    )
  );

CREATE POLICY "Users can update merchants in their agency"
  ON public.merchants FOR UPDATE
  TO authenticated
  USING (
    agency_id = (
      SELECT agency_id FROM public.users WHERE auth_id = (SELECT auth.uid()) LIMIT 1
    )
  )
  WITH CHECK (
    agency_id = (
      SELECT agency_id FROM public.users WHERE auth_id = (SELECT auth.uid()) LIMIT 1
    )
  );

-- Merchant history policies (single policy per action, optimized)
CREATE POLICY "Users can view merchant history in their agency"
  ON public.merchant_history FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.merchants
      WHERE merchants.id = merchant_history.merchant_id
      AND merchants.agency_id = (
        SELECT agency_id FROM public.users WHERE auth_id = (SELECT auth.uid()) LIMIT 1
      )
    )
  );

CREATE POLICY "Users can insert merchant history in their agency"
  ON public.merchant_history FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.merchants
      WHERE merchants.id = merchant_history.merchant_id
      AND merchants.agency_id = (
        SELECT agency_id FROM public.users WHERE auth_id = (SELECT auth.uid()) LIMIT 1
      )
    )
  );

-- Reports policies (consolidated, optimized)
CREATE POLICY "Users can view reports in their agency"
  ON public.reports FOR SELECT
  TO authenticated
  USING (
    agency_id = (
      SELECT agency_id FROM public.users WHERE auth_id = (SELECT auth.uid()) LIMIT 1
    )
  );

CREATE POLICY "Users can insert reports in their agency"
  ON public.reports FOR INSERT
  TO authenticated
  WITH CHECK (
    agency_id = (
      SELECT agency_id FROM public.users WHERE auth_id = (SELECT auth.uid()) LIMIT 1
    )
  );

CREATE POLICY "Admins can update reports in their agency"
  ON public.reports FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE auth_id = (SELECT auth.uid())
      AND role IN ('superadmin', 'admin')
      AND agency_id = public.reports.agency_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE auth_id = (SELECT auth.uid())
      AND role IN ('superadmin', 'admin')
      AND agency_id = public.reports.agency_id
    )
  );

CREATE POLICY "Admins can delete reports in their agency"
  ON public.reports FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE auth_id = (SELECT auth.uid())
      AND role IN ('superadmin', 'admin')
      AND agency_id = public.reports.agency_id
    )
  );

-- ============================================================================
-- STEP 3: Fix function search paths for security
-- ============================================================================

-- Fix update_updated_at_column function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Fix handle_new_user_signup function
CREATE OR REPLACE FUNCTION public.handle_new_user_signup()
RETURNS trigger
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  default_agency_id uuid;
BEGIN
  default_agency_id := gen_random_uuid();
  
  INSERT INTO public.users (auth_id, email, role, agency_id, full_name, created_at)
  VALUES (
    NEW.id,
    NEW.email,
    'sales_rep',
    default_agency_id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NOW()
  )
  ON CONFLICT (auth_id) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
