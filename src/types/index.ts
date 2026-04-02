export interface User {
  id: string;
  ghl_user_id?: string;
  email: string;
  role: 'SuperAdmin' | 'admin' | 'sales_rep' | 'junior_sales_rep';
  sales_rep_id?: string;
  trainer_id?: string;
  agency_id?: string;
  created_at: string;
  full_name?: string;
  updated_at?: string;
}

export interface Merchant {
  id: string;
  agency_id: string;
  merchant_id: string;
  merchant_name: string;
  processor?: string;
  sales_rep_id?: string;
  first_report_date?: string;
  last_report_date?: string | null;
  total_lifetime_volume?: number;
  total_lifetime_income?: number;
  average_monthly_income?: number;
  months_active?: number;
  status: 'active' | 'inactive' | 'churned';
  created_at?: string;
  updated_at?: string;
}

export interface MerchantData {
  merchantName: string;
  merchantId: string;
  dba?: string;
  mid: string;
  volume: number;
  residual: number;
  income: number;
  residualPercentage: number;
  processor: string;
  reportType?: string;
  reportDate: string;
  status?: string;
  isActive?: boolean;
  isClosed?: boolean;
  repPayout?: number;
  agencyIncome?: number;
  originalRow: Record<string, string | number | boolean | null>;
}

export interface ColumnMapping {
  merchantName: string;
  dba?: string;
  mid: string;
  volume: string;
  residual: string;
  status?: string;
}

export interface ProcessingStats {
  totalVolume: number;
  totalResidual: number;
  averageResidual: number;
  averageResidualPercentage: number;
  merchantCount: number;
  liveVolume: number;
  liveResidual: number;
  liveMerchantCount: number;
  inactiveVolume: number;
  inactiveResidual: number;
  inactiveMerchantCount: number;
  excludedCount: number;
  zeroAmountExcluded: number;
}

export interface ProcessorStats {
  processor: string;
  reportType?: string;
  merchantCount: number;
  totalVolume: number;
  totalResidual: number;
  averageResidual: number;
  averageResidualPercentage: number;
}

export interface ParsedCSVResult {
  data: MerchantData[];
  stats: ProcessingStats;
  processorStats: ProcessorStats[];
  errors: string[];
  fileName: string;
  processor: string;
  reportType?: string;
}

export interface ProcessorOption {
  id: string;
  name: string;
  reportTypes?: string[];
}

export interface FilterOptions {
  includeInactive: boolean;
  includeZeroAmount: boolean;
  showOnlyLive: boolean;
}

export interface ReportData {
  id: string;
  user_id: string;
  sales_rep_id?: string;
  processor: string;
  report_type?: string;
  report_date: string;
  file_name: string;
  merchant_data: MerchantData[];
  stats: ProcessingStats;
  processor_stats: ProcessorStats[];
  created_at: string;
}

export interface PeriodStats {
  period: string;
  totalVolume: number;
  totalResidual: number;
  merchantCount: number;
  averageResidual: number;
  averageResidualPercentage: number;
  liveVolume: number;
  liveResidual: number;
  liveMerchantCount: number;
  openAccountCount: number;
}

export interface DashboardData {
  currentMonth: PeriodStats;
  lastMonth: PeriodStats;
  fiscalQuarter: PeriodStats;
  ytd: PeriodStats;
  lastYear: PeriodStats;
}

export interface ExpenseData {
  id?: string;
  description: string;
  category: string;
  amount: number;
  date: string;
  vendor?: string;
  processor?: string;
  salesRepId?: string;
  isRecurring?: boolean;
  originalRow: Record<string, string | number | boolean | null>;
}

export interface ExpenseColumnMapping {
  description: string;
  category?: string;
  amount: string;
  date: string;
  vendor?: string;
  processor?: string;
}

export interface ExpenseStats {
  totalExpenses: number;
  averageExpense: number;
  expenseCount: number;
  categoryBreakdown: CategoryStats[];
  monthlyTotal: number;
  recurringTotal: number;
}

export interface CategoryStats {
  category: string;
  totalAmount: number;
  expenseCount: number;
  percentage: number;
}

export interface ParsedExpenseResult {
  data: ExpenseData[];
  stats: ExpenseStats;
  errors: string[];
  fileName: string;
}

export interface CommissionTier {
  id: string;
  min_volume: number;
  max_volume: number | null;
  split_percentage: number;
  created_at: string;
}

export interface CommissionOverrideTier {
  id: string;
  min_volume: number;
  max_volume: number | null;
  override_percentage: number;
  created_at: string;
}

export interface CommissionCalculation {
  totalVolume: number;
  baseCommission: number;
  trainerOverride?: number;
  netCommission: number;
  tier: CommissionTier;
  overrideTier?: CommissionOverrideTier;
}