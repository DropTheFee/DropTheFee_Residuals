import { useEffect, useState } from 'react';
import { User, DashboardData, PeriodStats } from '@/types';
import { MetricCard } from './MetricCard';
import { DollarSign, TrendingUp, Users, Activity } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import { getRepDisplayName } from '@/utils/displayNames';
import { startOfQuarter, startOfYear, format } from 'date-fns';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

interface DashboardProps {
  user: User;
  onNavigateToUpload: () => void;
  onNavigateToCommissions: () => void;
}

interface AgentRosterRecord {
  id: string;
  full_name: string | null;
  email: string;
  sales_rep_id: string | null;
  contract_types: string[];
  isActive: boolean;
}

interface HistoricalPoint {
  period: string;
  volume: number;
  residual: number;
}

interface ProcessorPoint {
  name: string;
  value: number;
}

interface RepPerformanceRow {
  rep_id: string;
  rep_name: string;
  volume: number;
  payout: number;
  merchant_count: number;
  pct: number;
}

const CHART_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316'];

export function Dashboard({ user, onNavigateToUpload, onNavigateToCommissions }: DashboardProps) {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [agentRoster, setAgentRoster] = useState<AgentRosterRecord[]>([]);
  const [historicalData, setHistoricalData] = useState<HistoricalPoint[]>([]);
  const [processorData, setProcessorData] = useState<ProcessorPoint[]>([]);
  const [repPerformance, setRepPerformance] = useState<RepPerformanceRow[]>([]);

  useEffect(() => {
    fetchDashboardData();
    if (user.role === 'SuperAdmin') {
      fetchAgentRoster();
    }
  }, [user]);

  const fetchDashboardData = async () => {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      console.log('1. authUser:', authUser?.id);

      const { data: profile } = await supabase
        .from('users')
        .select('agency_id')
        .eq('id', authUser?.id)
        .single();
      console.log('2. profile:', profile);

      if (!profile?.agency_id) throw new Error('No agency_id found');

      const { data: latestPeriod } = await supabase
        .from('merchant_history')
        .select('report_date')
        .eq('agency_id', profile.agency_id)
        .order('report_date', { ascending: false })
        .limit(1)
        .single();
      console.log('3. latestPeriod:', latestPeriod);

      if (!latestPeriod) {
        setDashboardData(null);
        return;
      }

      const latestDate = new Date(latestPeriod.report_date + 'T12:00:00');
      const quarterStart = startOfQuarter(latestDate);
      const ytdStart = startOfYear(latestDate);

      const prevMonthDate = new Date(latestDate);
      prevMonthDate.setMonth(prevMonthDate.getMonth() - 1);
      const prevMonthStr = prevMonthDate.toISOString().slice(0, 7) + '-01';

      const twelveMonthsAgo = new Date(latestDate);
      twelveMonthsAgo.setFullYear(twelveMonthsAgo.getFullYear() - 1);

      // Fetch all period data in parallel
      const [
        { data: currentPeriodData, error },
        { data: prevPeriodData },
        { data: quarterData },
        { data: ytdData },
        { data: allHistory },
        { data: processorHistory },
      ] = await Promise.all([
        supabase
          .from('merchant_history')
          .select('monthly_volume, monthly_income, merchant_id, agency_id')
          .eq('agency_id', profile.agency_id)
          .eq('report_date', latestPeriod.report_date),
        supabase
          .from('merchant_history')
          .select('monthly_volume, monthly_income, merchant_id')
          .eq('agency_id', profile.agency_id)
          .eq('report_date', prevMonthStr),
        supabase
          .from('merchant_history')
          .select('monthly_volume, monthly_income, merchant_id')
          .eq('agency_id', profile.agency_id)
          .gte('report_date', quarterStart.toISOString().slice(0, 10)),
        supabase
          .from('merchant_history')
          .select('monthly_volume, monthly_income, merchant_id')
          .eq('agency_id', profile.agency_id)
          .gte('report_date', ytdStart.toISOString().slice(0, 10)),
        supabase
          .from('merchant_history')
          .select('report_date, monthly_volume, monthly_income')
          .eq('agency_id', profile.agency_id)
          .gte('report_date', twelveMonthsAgo.toISOString().slice(0, 10))
          .order('report_date', { ascending: true }),
        supabase
          .from('merchant_history')
          .select('monthly_income, merchants!inner(processor)')
          .eq('agency_id', profile.agency_id)
          .eq('report_date', latestPeriod.report_date),
      ]);

      console.log('4. currentPeriodData:', currentPeriodData);
      console.log('5. error on currentPeriod query:', error);

      // ── Historical chart ────────────────────────────────────────────────
      if (allHistory) {
        const periodMap = new Map<string, { volume: number; residual: number }>();
        allHistory.forEach(r => {
          const existing = periodMap.get(r.report_date) || { volume: 0, residual: 0 };
          periodMap.set(r.report_date, {
            volume: existing.volume + (r.monthly_volume || 0),
            residual: existing.residual + (Number(r.monthly_income) || 0),
          });
        });
        setHistoricalData(
          Array.from(periodMap.entries()).map(([date, data]) => ({
            period: format(new Date(date + 'T12:00:00'), 'MMM yy'),
            volume: data.volume,
            residual: data.residual,
          }))
        );
      }

      // ── Processor donut ─────────────────────────────────────────────────
      if (processorHistory) {
        const procMap = new Map<string, number>();
        processorHistory.forEach((r: any) => {
          const md = Array.isArray(r.merchants) ? r.merchants[0] : r.merchants;
          const proc = md?.processor || 'Unknown';
          procMap.set(proc, (procMap.get(proc) || 0) + (Number(r.monthly_income) || 0));
        });
        setProcessorData(
          Array.from(procMap.entries())
            .filter(([, v]) => v > 0)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value)
        );
      }

      // ── Rep performance ──────────────────────────────────────────────────
      const { data: repResults } = await supabase
        .from('commission_results')
        .select('rep_user_id, rep_payout, monthly_volume, merchant_id, source_type')
        .eq('agency_id', profile.agency_id)
        .eq('period_month', latestPeriod.report_date);

      const agencyTotalResidual =
        currentPeriodData?.reduce((s, r) => s + (Number(r.monthly_income) || 0), 0) || 1;

      if (repResults && repResults.length > 0) {
        const repIds = [...new Set(repResults.map((r: any) => r.rep_user_id as string))];
        const { data: repUsers } = await supabase
          .from('users')
          .select('id, full_name')
          .in('id', repIds);
        const repNameMap = new Map(repUsers?.map(u => [u.id, u.full_name]) || []);

        const repMap = new Map<string, { volume: number; payout: number; merchantIds: Set<string> }>();
        repResults.forEach((r: any) => {
          const existing = repMap.get(r.rep_user_id) || { volume: 0, payout: 0, merchantIds: new Set() };
          existing.payout += r.rep_payout || 0;
          if (r.source_type === 'merchant') {
            existing.volume += r.monthly_volume || 0;
            if (r.merchant_id) existing.merchantIds.add(r.merchant_id);
          }
          repMap.set(r.rep_user_id, existing);
        });

        setRepPerformance(
          Array.from(repMap.entries())
            .map(([repId, data]) => ({
              rep_id: repId,
              rep_name: getRepDisplayName(repId, repNameMap.get(repId) ?? null),
              volume: data.volume,
              payout: data.payout,
              merchant_count: data.merchantIds.size,
              pct: (data.payout / agencyTotalResidual) * 100,
            }))
            .filter(r => r.payout > 0)
            .sort((a, b) => b.payout - a.payout)
        );
      } else {
        setRepPerformance([]);
      }

      // ── KPI stats ────────────────────────────────────────────────────────
      const totalVolume   = currentPeriodData?.reduce((s, r) => s + (r.monthly_volume || 0), 0) || 0;
      const totalResidual = currentPeriodData?.reduce((s, r) => s + (Number(r.monthly_income) || 0), 0) || 0;
      const liveMerchants = currentPeriodData?.filter(r => (r.monthly_volume || 0) > 0).length || 0;
      const merchantCount = currentPeriodData?.length || 0;
      const avgResidual   = liveMerchants > 0 ? totalResidual / liveMerchants : 0;

      const prevTotalVolume   = prevPeriodData?.reduce((s, r) => s + (r.monthly_volume || 0), 0) || 0;
      const prevTotalResidual = prevPeriodData?.reduce((s, r) => s + (Number(r.monthly_income) || 0), 0) || 0;
      const prevMerchantCount = prevPeriodData?.length || 0;
      const prevLiveMerchants = prevPeriodData?.filter(r => (r.monthly_volume || 0) > 0).length || 0;
      const prevAvgResidual   = prevLiveMerchants > 0 ? prevTotalResidual / prevLiveMerchants : 0;

      const quarterVolume        = quarterData?.reduce((s, r) => s + (r.monthly_volume || 0), 0) || 0;
      const quarterResidual      = quarterData?.reduce((s, r) => s + (Number(r.monthly_income) || 0), 0) || 0;
      const quarterMerchantCount = new Set(quarterData?.map(r => r.merchant_id)).size || 0;

      const ytdVolume        = ytdData?.reduce((s, r) => s + (r.monthly_volume || 0), 0) || 0;
      const ytdResidual      = ytdData?.reduce((s, r) => s + (Number(r.monthly_income) || 0), 0) || 0;
      const ytdMerchantCount = new Set(ytdData?.map(r => r.merchant_id)).size || 0;

      const currentMonth: PeriodStats = {
        period: format(new Date(latestPeriod.report_date + 'T12:00:00'), 'MMMM yyyy'),
        totalVolume,
        totalResidual,
        merchantCount,
        averageResidual: avgResidual,
        averageResidualPercentage: totalVolume > 0 ? (totalResidual / totalVolume) * 100 : 0,
        liveVolume: totalVolume,
        liveResidual: totalResidual,
        liveMerchantCount: liveMerchants,
      };

      const lastMonth: PeriodStats = {
        period: 'Last Month',
        totalVolume: prevTotalVolume,
        totalResidual: prevTotalResidual,
        merchantCount: prevMerchantCount,
        averageResidual: prevAvgResidual,
        averageResidualPercentage: prevTotalVolume > 0 ? (prevTotalResidual / prevTotalVolume) * 100 : 0,
        liveVolume: prevTotalVolume,
        liveResidual: prevTotalResidual,
        liveMerchantCount: prevMerchantCount,
      };

      const fiscalQuarter: PeriodStats = {
        period: 'This Quarter',
        totalVolume: quarterVolume,
        totalResidual: quarterResidual,
        merchantCount: quarterMerchantCount,
        averageResidual: quarterMerchantCount > 0 ? quarterResidual / quarterMerchantCount : 0,
        averageResidualPercentage: quarterVolume > 0 ? (quarterResidual / quarterVolume) * 100 : 0,
        liveVolume: quarterVolume,
        liveResidual: quarterResidual,
        liveMerchantCount: quarterMerchantCount,
      };

      const ytd: PeriodStats = {
        period: 'Year to Date',
        totalVolume: ytdVolume,
        totalResidual: ytdResidual,
        merchantCount: ytdMerchantCount,
        averageResidual: ytdMerchantCount > 0 ? ytdResidual / ytdMerchantCount : 0,
        averageResidualPercentage: ytdVolume > 0 ? (ytdResidual / ytdVolume) * 100 : 0,
        liveVolume: ytdVolume,
        liveResidual: ytdResidual,
        liveMerchantCount: ytdMerchantCount,
      };

      setDashboardData({ currentMonth, lastMonth, fiscalQuarter, ytd, lastYear: ytd });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setDashboardData(null);
    } finally {
      setLoading(false);
    }
  };

  const fetchAgentRoster = async () => {
    try {
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('id, full_name, email, sales_rep_id')
        .eq('agency_id', 'ed9c6a52-c619-4d92-82f2-2b9cb4b35622')
        .eq('role', 'sales_rep')
        .order('sales_rep_id', { nullsFirst: false });

      if (usersError) { console.error('Error fetching users:', usersError); return; }

      const { data: contracts, error: contractsError } = await supabase
        .from('rep_contracts')
        .select('user_id, contract_type')
        .eq('agency_id', 'ed9c6a52-c619-4d92-82f2-2b9cb4b35622');

      if (contractsError) { console.error('Error fetching contracts:', contractsError); return; }

      if (users && contracts) {
        const agencyId = 'ed9c6a52-c619-4d92-82f2-2b9cb4b35622';

        const { data: recentPeriods } = await supabase
          .from('commission_periods')
          .select('period_month')
          .eq('agency_id', agencyId)
          .order('period_month', { ascending: false })
          .limit(2);

        const activeRepIds = new Set<string>();

        if (recentPeriods && recentPeriods.length > 0) {
          const periodMonths = recentPeriods.map(p => p.period_month);
          const { data: activeRows } = await supabase
            .from('commission_results')
            .select('rep_user_id')
            .eq('agency_id', agencyId)
            .in('period_month', periodMonths)
            .gt('rep_payout', 0);
          activeRows?.forEach(r => activeRepIds.add(r.rep_user_id));
        }

        setAgentRoster(users.map(u => ({
          ...u,
          contract_types: contracts.filter(c => c.user_id === u.id).map(c => c.contract_type),
          isActive: activeRepIds.has(u.id),
        })));
      }
    } catch (error) {
      console.error('Error fetching agent roster:', error);
    }
  };

  const formatContractType = (contractType: string): string => {
    const mapping: Record<string, string> = {
      sr_sae: 'Sr SAE',
      jr_ae: 'Jr AE',
      katlyn_flat: 'Katlyn Flat',
      venture_apps: 'Venture Apps',
      sae_override: 'SAE Override',
    };
    return mapping[contractType] || contractType;
  };

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

  const formatCompact = (value: number) => {
    if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
    if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
    return `$${value.toFixed(0)}`;
  };

  const calculateTrend = (current: number, previous: number) => {
    if (previous === 0) return null;
    const change = ((current - previous) / previous) * 100;
    return { value: Math.abs(change), isPositive: change > 0 };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-slate-400">Loading dashboard...</div>
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <div className="text-slate-400">No data available</div>
        {(user.role === 'SuperAdmin' || user.role === 'admin') && (
          <Button onClick={onNavigateToUpload} className="bg-[#0f3460] hover:bg-[#0f3460]/90">
            Upload Your First Report
          </Button>
        )}
      </div>
    );
  }

  const { currentMonth, lastMonth, fiscalQuarter, ytd } = dashboardData;

  const periodComparisonItems = [
    { label: 'This Month', data: currentMonth },
    { label: 'This Quarter', data: fiscalQuarter },
    { label: 'Year to Date', data: ytd },
  ];

  return (
    <div className="space-y-8">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-slate-50">Dashboard</h2>
          <p className="text-slate-400 mt-1">Welcome back, {user.full_name || user.email}</p>
        </div>
        <div className="flex gap-2">
          {(user.role === 'SuperAdmin' || user.role === 'admin') && (
            <Button onClick={onNavigateToUpload} className="bg-[#0f3460] hover:bg-[#0f3460]/90">
              <img
                src="https://mgx-backend-cdn.metadl.com/generate/images/770325/2026-01-26/6864ace1-6db8-45c9-a011-3e16a50467f5.png"
                alt=""
                className="h-4 w-4 mr-2"
              />
              Upload Report
            </Button>
          )}
          <Button
            onClick={onNavigateToCommissions}
            variant="outline"
            className="border-slate-600 text-slate-300 hover:bg-[#1a1a2e]"
          >
            <img
              src="https://mgx-backend-cdn.metadl.com/generate/images/770325/2026-01-26/81728cf7-16bc-4bb3-91ef-dfced6267f3d.png"
              alt=""
              className="h-4 w-4 mr-2"
            />
            View Commissions
          </Button>
        </div>
      </div>

      {/* ── Row 1: Hero KPI Cards ────────────────────────────────────────── */}
      <div>
        <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-3">
          {currentMonth.period}
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            title="Total Volume"
            value={formatCurrency(currentMonth.totalVolume)}
            subtitle={`${currentMonth.merchantCount} merchants`}
            trend={calculateTrend(currentMonth.totalVolume, lastMonth.totalVolume) || undefined}
            icon={<Activity className="h-4 w-4" />}
          />
          <MetricCard
            title="Total Residual"
            value={formatCurrency(currentMonth.totalResidual)}
            subtitle={`${currentMonth.averageResidualPercentage.toFixed(2)}% avg rate`}
            trend={calculateTrend(currentMonth.totalResidual, lastMonth.totalResidual) || undefined}
            icon={<DollarSign className="h-4 w-4" />}
          />
          <MetricCard
            title="Live Merchants"
            value={currentMonth.liveMerchantCount.toString()}
            subtitle={formatCurrency(currentMonth.liveVolume)}
            trend={calculateTrend(currentMonth.liveMerchantCount, lastMonth.liveMerchantCount) || undefined}
            icon={<Users className="h-4 w-4" />}
          />
          <MetricCard
            title="Avg Residual / Merchant"
            value={formatCurrency(currentMonth.averageResidual)}
            subtitle="Live merchants only"
            trend={calculateTrend(currentMonth.averageResidual, lastMonth.averageResidual) || undefined}
            icon={<TrendingUp className="h-4 w-4" />}
          />
        </div>
      </div>

      {/* ── Row 2: Period Comparison ─────────────────────────────────────── */}
      <div>
        <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-3">
          Period Overview
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {periodComparisonItems.map(({ label, data }) => (
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
                    {formatCurrency(data.totalResidual)}
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

      {/* ── Row 3: Charts ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Left: Historical Volume & Residual */}
        <Card className="bg-[#16213e] border-slate-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-slate-300">
              Monthly Volume &amp; Residual
            </CardTitle>
          </CardHeader>
          <CardContent>
            {historicalData.length < 1 ? (
              <div className="h-56 flex items-center justify-center text-slate-500 text-sm">
                Not enough history to display
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <ComposedChart data={historicalData} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis
                    dataKey="period"
                    tick={{ fill: '#94a3b8', fontSize: 11 }}
                    axisLine={{ stroke: '#334155' }}
                    tickLine={false}
                  />
                  <YAxis
                    yAxisId="volume"
                    orientation="left"
                    tickFormatter={formatCompact}
                    tick={{ fill: '#94a3b8', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    width={56}
                  />
                  <YAxis
                    yAxisId="residual"
                    orientation="right"
                    tickFormatter={formatCompact}
                    tick={{ fill: '#94a3b8', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    width={56}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      border: '1px solid #334155',
                      borderRadius: '6px',
                      fontSize: '12px',
                    }}
                    labelStyle={{ color: '#e2e8f0' }}
                    formatter={(value: number, name: string) => [
                      formatCurrencyFull(value),
                      name === 'volume' ? 'Volume' : 'Residual',
                    ]}
                  />
                  <Legend
                    formatter={(value) => (
                      <span style={{ color: '#94a3b8', fontSize: 11 }}>
                        {value === 'volume' ? 'Volume' : 'Residual'}
                      </span>
                    )}
                  />
                  <Bar yAxisId="volume" dataKey="volume" fill="#3b82f6" radius={[2, 2, 0, 0]} opacity={0.85} />
                  <Line
                    yAxisId="residual"
                    type="monotone"
                    dataKey="residual"
                    stroke="#10b981"
                    strokeWidth={2}
                    dot={{ fill: '#10b981', r: 3 }}
                    activeDot={{ r: 5 }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Right: Residual by Processor */}
        <Card className="bg-[#16213e] border-slate-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-slate-300">
              Residual by Processor — {currentMonth.period}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {processorData.length === 0 ? (
              <div className="h-56 flex items-center justify-center text-slate-500 text-sm">
                No processor data for this period
              </div>
            ) : (
              <div className="flex items-center gap-4">
                <ResponsiveContainer width="55%" height={220}>
                  <PieChart>
                    <Pie
                      data={processorData}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={90}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {processorData.map((_, index) => (
                        <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#0f172a',
                        border: '1px solid #334155',
                        borderRadius: '6px',
                        fontSize: '12px',
                      }}
                      formatter={(value: number) => [formatCurrencyFull(value), 'Residual']}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex-1 space-y-2">
                  {processorData.map((entry, index) => {
                    const total = processorData.reduce((s, p) => s + p.value, 0);
                    const pct = total > 0 ? (entry.value / total) * 100 : 0;
                    return (
                      <div key={entry.name} className="flex items-center gap-2">
                        <span
                          className="inline-block w-2.5 h-2.5 rounded-sm flex-shrink-0"
                          style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}
                        />
                        <span className="text-slate-300 text-xs flex-1 truncate">{entry.name}</span>
                        <span className="text-slate-400 text-xs tabular-nums">{pct.toFixed(1)}%</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Row 4: Rep Performance ───────────────────────────────────────── */}
      <Card className="bg-[#16213e] border-slate-700">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-slate-300">
            Rep Performance — {currentMonth.period}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {repPerformance.length === 0 ? (
            <p className="text-slate-500 text-sm px-6 pb-4">
              No commission data for this period.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-slate-700 hover:bg-transparent">
                  <TableHead className="text-slate-400 font-medium pl-6">Rep</TableHead>
                  <TableHead className="text-right text-slate-400 font-medium">Volume</TableHead>
                  <TableHead className="text-right text-slate-400 font-medium">Payout</TableHead>
                  <TableHead className="text-right text-slate-400 font-medium">Merchants</TableHead>
                  <TableHead className="text-right text-slate-400 font-medium pr-6">% of Residual</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {repPerformance.map((rep) => (
                  <TableRow key={rep.rep_id} className="border-slate-700/50 hover:bg-slate-800/30">
                    <TableCell className="text-slate-50 font-medium pl-6">{rep.rep_name}</TableCell>
                    <TableCell className="text-right text-slate-300 tabular-nums">
                      {formatCurrency(rep.volume)}
                    </TableCell>
                    <TableCell className="text-right text-green-400 font-semibold tabular-nums">
                      {formatCurrencyFull(rep.payout)}
                    </TableCell>
                    <TableCell className="text-right text-slate-300 tabular-nums">
                      {rep.merchant_count}
                    </TableCell>
                    <TableCell className="text-right pr-6">
                      <div className="flex items-center justify-end gap-2">
                        <div className="w-16 bg-slate-700 rounded-full h-1.5 overflow-hidden">
                          <div
                            className="h-1.5 rounded-full bg-blue-500"
                            style={{ width: `${Math.min(rep.pct, 100)}%` }}
                          />
                        </div>
                        <span className="text-slate-400 text-xs tabular-nums w-10 text-right">
                          {rep.pct.toFixed(1)}%
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* ── Row 5: Agent Roster ──────────────────────────────────────────── */}
      {user.role === 'SuperAdmin' && (
        <Card className="bg-[#16213e] border border-slate-700">
          <CardHeader>
            <CardTitle className="text-slate-50">Agent Roster</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow className="border-slate-700 hover:bg-[#1a1a2e]">
                  <TableHead className="text-slate-300">Name</TableHead>
                  <TableHead className="text-slate-300">Email</TableHead>
                  <TableHead className="text-slate-300">Office Code</TableHead>
                  <TableHead className="text-slate-300">Contract Type</TableHead>
                  <TableHead className="text-slate-300">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {agentRoster.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-slate-400">
                      No agents found
                    </TableCell>
                  </TableRow>
                ) : (
                  agentRoster.map((agent) => (
                    <TableRow key={agent.id} className="border-slate-700 hover:bg-[#1a1a2e]">
                      <TableCell className="text-slate-50">
                        {getRepDisplayName(agent.id, agent.full_name) || 'N/A'}
                      </TableCell>
                      <TableCell className="text-slate-300">{agent.email}</TableCell>
                      <TableCell className="text-slate-300">{agent.sales_rep_id || 'N/A'}</TableCell>
                      <TableCell className="text-slate-300">
                        {agent.contract_types.length > 0
                          ? agent.contract_types.map(formatContractType).join(', ')
                          : 'N/A'}
                      </TableCell>
                      <TableCell>
                        {agent.isActive ? (
                          <span className="text-green-400">Active</span>
                        ) : (
                          <span className="text-slate-400">Dormant</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
