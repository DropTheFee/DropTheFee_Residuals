import { useEffect, useState } from 'react';
import { MetricCard } from './MetricCard';
import { DollarSign, TrendingUp, Users, Activity, BookOpen } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { startOfQuarter, startOfYear, format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface RepDashboardProps {
  repId: string;
  repName: string;
}

// Only the columns we actually read from commission_results.
interface CommissionResultRow {
  merchant_id: string | null;
  merchant_name: string;
  monthly_volume: number;
  net_residual: number;
  rep_payout: number;
  source_type: string;
  override_from_user_id: string | null;
  period_month: string;
}

interface PeriodMetrics {
  totalVolume: number;
  totalPayout: number;
  totalNetResidual: number;
  liveMerchants: number;
  openAccounts: number;
  merchantCount: number;
  avgResidual: number;
}

const EMPTY_METRICS: PeriodMetrics = {
  totalVolume: 0,
  totalPayout: 0,
  totalNetResidual: 0,
  liveMerchants: 0,
  openAccounts: 0,
  merchantCount: 0,
  avgResidual: 0,
};

// 'YYYY-MM-01' for the first of the given date's month.
const monthStr = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;

// Dedup key for counting distinct merchants — merchant_id, falling back to name.
const merchantKey = (r: CommissionResultRow) => r.merchant_id || r.merchant_name;

// Compute rep KPIs from a set of commission_results rows. Section filters mirror
// RepCommissionStatement.tsx exactly so the numbers reconcile with the statement.
function computeMetrics(rows: CommissionResultRow[]): PeriodMetrics {
  const merchantResults      = rows.filter(r => r.source_type === 'merchant' && !r.override_from_user_id);
  const saeOverrideResults   = rows.filter(r => r.source_type === 'expense'  &&  r.override_from_user_id);
  const nabResults           = rows.filter(r => r.source_type === 'nab');
  const surjResults          = rows.filter(r => r.source_type === 'surj');
  const manualExpenseResults = rows.filter(r => r.source_type === 'expense'  && !r.override_from_user_id);

  const totalVolume = merchantResults.reduce((s, r) => s + (r.monthly_volume || 0), 0);

  // Five-section payout sum — identical shape to RepCommissionStatement's totalPayout,
  // combining the rep's personal commissions AND their SAE override rows.
  const totalPayout =
    merchantResults.reduce((s, r)      => s + (r.rep_payout || 0), 0) +
    saeOverrideResults.reduce((s, r)   => s + (r.rep_payout || 0), 0) +
    nabResults.reduce((s, r)           => s + (r.rep_payout || 0), 0) +
    surjResults.reduce((s, r)          => s + (r.rep_payout || 0), 0) +
    manualExpenseResults.reduce((s, r) => s + (r.rep_payout || 0), 0);

  const totalNetResidual = merchantResults.reduce((s, r) => s + (r.net_residual || 0), 0);

  // Live/Open counts use ONLY the rep's own book (source_type 'merchant', no override),
  // so override-only merchants (e.g. an SAE override on another rep's accounts) are excluded.
  const liveMerchants = new Set(
    merchantResults.filter(r => (r.monthly_volume || 0) > 0).map(merchantKey)
  ).size;
  const openAccounts = new Set(
    merchantResults.filter(r => (r.net_residual || 0) !== 0).map(merchantKey)
  ).size;
  const merchantCount = new Set(merchantResults.map(merchantKey)).size;

  const avgResidual = liveMerchants > 0 ? totalNetResidual / liveMerchants : 0;

  return { totalVolume, totalPayout, totalNetResidual, liveMerchants, openAccounts, merchantCount, avgResidual };
}

export function RepDashboard({ repId, repName }: RepDashboardProps) {
  const [loading, setLoading] = useState(true);
  const [agencyId, setAgencyId] = useState<string>('');
  const [periods, setPeriods] = useState<string[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<string>('');
  const [monthMetrics, setMonthMetrics] = useState<PeriodMetrics>(EMPTY_METRICS);
  const [quarterMetrics, setQuarterMetrics] = useState<PeriodMetrics>(EMPTY_METRICS);
  const [ytdMetrics, setYtdMetrics] = useState<PeriodMetrics>(EMPTY_METRICS);

  // Load the rep's selectable periods (calculated/finalized only) — same source and
  // filter as RepCommissionStatement.loadPeriods. Default to the most recent.
  useEffect(() => {
    loadPeriods();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (selectedPeriod && agencyId) {
      fetchData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPeriod, agencyId, repId]);

  const loadPeriods = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('users')
        .select('agency_id')
        .eq('id', user.id)
        .single();

      if (!profile?.agency_id) return;
      setAgencyId(profile.agency_id);

      const { data: commissionPeriods, error } = await supabase
        .from('commission_periods')
        .select('period_month')
        .eq('agency_id', profile.agency_id)
        .in('status', ['calculated', 'finalized'])
        .order('period_month', { ascending: false });

      if (error) throw error;

      const periodList = commissionPeriods?.map(p => p.period_month) || [];
      setPeriods(periodList);
      if (periodList.length > 0) {
        setSelectedPeriod(periodList[0]);
      } else {
        setLoading(false);
      }
    } catch (error) {
      console.error('Error loading rep dashboard periods:', error);
      setLoading(false);
    }
  };

  const fetchData = async () => {
    try {
      const anchor = selectedPeriod; // 'YYYY-MM-01'
      const anchorDate = new Date(anchor + 'T12:00:00');
      const quarterStart = monthStr(startOfQuarter(anchorDate));
      const yearStart = monthStr(startOfYear(anchorDate));

      // One query covers month + quarter + YTD (year-start through the anchor month).
      const { data, error } = await supabase
        .from('commission_results')
        .select('merchant_id, merchant_name, monthly_volume, net_residual, rep_payout, source_type, override_from_user_id, period_month')
        .eq('agency_id', agencyId)
        .eq('rep_user_id', repId)
        .gte('period_month', yearStart)
        .lte('period_month', anchor);

      if (error) throw error;

      const rows = (data || []) as CommissionResultRow[];

      const monthRows   = rows.filter(r => r.period_month === anchor);
      const quarterRows = rows.filter(r => r.period_month >= quarterStart);
      const ytdRows     = rows; // already bounded to [yearStart, anchor]

      setMonthMetrics(computeMetrics(monthRows));
      setQuarterMetrics(computeMetrics(quarterRows));
      setYtdMetrics(computeMetrics(ytdRows));
    } catch (error) {
      console.error('Error fetching rep dashboard data:', error);
      setMonthMetrics(EMPTY_METRICS);
      setQuarterMetrics(EMPTY_METRICS);
      setYtdMetrics(EMPTY_METRICS);
    } finally {
      setLoading(false);
    }
  };

  const formatPeriodMonth = (period: string) =>
    format(new Date(period + 'T12:00:00'), 'MMMM yyyy');

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);

  const formatCurrencyFull = (value: number) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-slate-400">Loading dashboard...</div>
      </div>
    );
  }

  if (periods.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-2">
        <div className="text-slate-400">No commission data available yet.</div>
      </div>
    );
  }

  const periodOverviewItems = [
    { label: 'This Month', data: monthMetrics },
    { label: 'This Quarter', data: quarterMetrics },
    { label: 'Year to Date', data: ytdMetrics },
  ];

  return (
    <div className="space-y-8">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-slate-50">Dashboard</h2>
          <p className="text-slate-400 mt-1">{repName}</p>
        </div>
        <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
          <SelectTrigger className="w-[180px] bg-[#16213e] border-slate-600 text-slate-200">
            <SelectValue placeholder="Select period" />
          </SelectTrigger>
          <SelectContent>
            {periods.map((period) => (
              <SelectItem key={period} value={period}>
                {formatPeriodMonth(period)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* ── Row 1: KPI Cards ─────────────────────────────────────────────── */}
      <div>
        <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-3">
          {formatPeriodMonth(selectedPeriod)}
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <MetricCard
            title="Total Volume"
            value={formatCurrency(monthMetrics.totalVolume)}
            subtitle={`${monthMetrics.merchantCount} merchants`}
            icon={<Activity className="h-4 w-4" />}
          />
          <MetricCard
            title="Total Payout"
            value={formatCurrencyFull(monthMetrics.totalPayout)}
            subtitle="Commissions + SAE overrides"
            icon={<DollarSign className="h-4 w-4" />}
          />
          <MetricCard
            title="Live Merchants"
            value={monthMetrics.liveMerchants.toString()}
            subtitle="Processing volume this period"
            icon={<Users className="h-4 w-4" />}
          />
          <MetricCard
            title="Open Accounts"
            value={monthMetrics.openAccounts.toString()}
            subtitle="Earning residual this period"
            icon={<BookOpen className="h-4 w-4" />}
          />
          <MetricCard
            title="Avg Residual / Merchant"
            value={formatCurrency(monthMetrics.avgResidual)}
            subtitle="Live merchants only"
            icon={<TrendingUp className="h-4 w-4" />}
          />
        </div>
      </div>

      {/* ── Row 2: Period Overview ───────────────────────────────────────── */}
      <div>
        <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-3">
          Period Overview
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {periodOverviewItems.map(({ label, data }) => (
            <Card key={label} className="bg-[#16213e] border-slate-700">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold text-slate-300">{label}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 text-sm">Volume</span>
                  <span className="text-slate-50 font-semibold tabular-nums">
                    {formatCurrency(data.totalVolume)}
                  </span>
                </div>
                <div className="border-t border-slate-700/50" />
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 text-sm">Residual</span>
                  <span className="text-green-400 font-semibold tabular-nums">
                    {formatCurrency(data.totalNetResidual)}
                  </span>
                </div>
                <div className="border-t border-slate-700/50" />
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 text-sm">Merchants</span>
                  <span className="text-slate-50 font-semibold tabular-nums">
                    {data.merchantCount.toLocaleString()}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
