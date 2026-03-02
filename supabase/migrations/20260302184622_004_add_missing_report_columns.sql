/*
  # Add Missing Report Columns
  
  ## Changes Made
  
  1. **Add report_date column**
     - Add report_date column to store the date of the report (as opposed to upload_date)
     - Default to upload_date for existing records
  
  2. **Add sales_rep_id column**
     - Add sales_rep_id to track which sales rep a report belongs to
     - Add foreign key constraint
  
  3. **Add file_name column**
     - Add file_name to track the original uploaded file name
  
  4. **Add merchant_data and processor_stats columns**
     - These are expected by the frontend but stored as JSONB
*/

-- Add report_date column (the date the report covers, not when it was uploaded)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'reports' AND column_name = 'report_date'
  ) THEN
    ALTER TABLE public.reports ADD COLUMN report_date timestamptz DEFAULT NOW();
  END IF;
END $$;

-- Add sales_rep_id column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'reports' AND column_name = 'sales_rep_id'
  ) THEN
    ALTER TABLE public.reports ADD COLUMN sales_rep_id uuid REFERENCES public.users(id);
  END IF;
END $$;

-- Add file_name column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'reports' AND column_name = 'file_name'
  ) THEN
    ALTER TABLE public.reports ADD COLUMN file_name text;
  END IF;
END $$;

-- Add merchant_data column (jsonb)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'reports' AND column_name = 'merchant_data'
  ) THEN
    ALTER TABLE public.reports ADD COLUMN merchant_data jsonb DEFAULT '[]'::jsonb;
  END IF;
END $$;

-- Add processor_stats column (jsonb)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'reports' AND column_name = 'processor_stats'
  ) THEN
    ALTER TABLE public.reports ADD COLUMN processor_stats jsonb DEFAULT '[]'::jsonb;
  END IF;
END $$;

-- Create index on sales_rep_id for better query performance
CREATE INDEX IF NOT EXISTS idx_reports_sales_rep_id ON public.reports(sales_rep_id);
CREATE INDEX IF NOT EXISTS idx_reports_report_date ON public.reports(report_date);