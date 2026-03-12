import { useEffect, useState } from 'react';
import { User, DashboardData, PeriodStats } from '@/types';
import { MetricCard } from './MetricCard';
import { DollarSign, TrendingUp, Users, Activity } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import { startOfQuarter, startOfYear, format } from 'date-fns';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

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
}

export function Dashboard({ user, onNavigateToUpload, onNavigateToCommissions }: DashboardProps) {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [agentRoster, setAgentRoster] = useState<AgentRosterRecord[]>([]);

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

      // Get user profile
      const { data: profile } = await supabase
        .from('users')
        .select('agency_id')
        .eq('id', authUser?.id)
        .single();
      console.log('2. profile:', profile);

      if (!profile?.agency_id) {
        throw new Error('No agency_id found');
      }

      // Get most recent report period for this agency
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

      const latestDate = new Date(latestPeriod.report_date);
      const quarterStart = startOfQuarter(latestDate);
      const ytdStart = startOfYear(latestDate);

      // Get all merchant history for the latest period
      const { data: currentPeriodData, error } = await supabase
        .from('merchant_history')
        .select('monthly_volume, monthly_income, merchant_id, agency_id')
        .eq('agency_id', profile.agency_id)
        .eq('report_date', latestPeriod.report_date);
      console.log('4. currentPeriodData:', currentPeriodData);
      console.log('5. error on currentPeriod query:', error);

      // Get previous month data (if exists)
      const prevMonthDate = new Date(latestDate);
      prevMonthDate.setMonth(prevMonthDate.getMonth() - 1);
      const prevMonthStr = prevMonthDate.toISOString().slice(0, 7) + '-01';

      const { data: prevPeriodData } = await supabase
        .from('merchant_history')
        .select('monthly_volume, monthly_income, merchant_id')
        .eq('agency_id', profile.agency_id)
        .eq('report_date', prevMonthStr);

      // Get quarter data
      const { data: quarterData } = await supabase
        .from('merchant_history')
        .select('monthly_volume, monthly_income, merchant_id')
        .eq('agency_id', profile.agency_id)
        .gte('report_date', quarterStart.toISOString().slice(0, 10));

      // Get YTD data
      const { data: ytdData } = await supabase
        .from('merchant_history')
        .select('monthly_volume, monthly_income, merchant_id')
        .eq('agency_id', profile.agency_id)
        .gte('report_date', ytdStart.toISOString().slice(0, 10));

      // Calculate current month stats
      const totalVolume = currentPeriodData?.reduce((sum, record) => sum + (record.monthly_volume || 0), 0) || 0;
      const totalResidual = currentPeriodData?.reduce((sum, record) => sum + (record.monthly_income || 0), 0) || 0;
      const liveMerchants = currentPeriodData?.filter(record => (record.monthly_volume || 0) > 0).length || 0;
      const avgResidual = liveMerchants > 0 ? totalResidual / liveMerchants : 0;
      const merchantCount = currentPeriodData?.length || 0;

      // Calculate previous month stats
      const prevTotalVolume = prevPeriodData?.reduce((sum, record) => sum + (record.monthly_volume || 0), 0) || 0;
      const prevTotalResidual = prevPeriodData?.reduce((sum, record) => sum + (record.monthly_income || 0), 0) || 0;
      const prevMerchantCount = prevPeriodData?.length || 0;

      // Calculate quarter stats
      const quarterVolume = quarterData?.reduce((sum, record) => sum + (record.monthly_volume || 0), 0) || 0;
      const quarterResidual = quarterData?.reduce((sum, record) => sum + (record.monthly_income || 0), 0) || 0;
      const quarterMerchantCount = new Set(quarterData?.map(record => record.merchant_id)).size || 0;

      // Calculate YTD stats
      const ytdVolume = ytdData?.reduce((sum, record) => sum + (record.monthly_volume || 0), 0) || 0;
      const ytdResidual = ytdData?.reduce((sum, record) => sum + (record.monthly_income || 0), 0) || 0;
      const ytdMerchantCount = new Set(ytdData?.map(record => record.merchant_id)).size || 0;

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
        averageResidual: prevMerchantCount > 0 ? prevTotalResidual / prevMerchantCount : 0,
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

      setDashboardData({
        currentMonth,
        lastMonth,
        fiscalQuarter,
        ytd,
        lastYear: ytd,
      });
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
        .order('full_name');

      if (usersError) {
        console.error('Error fetching users:', usersError);
        return;
      }

      const { data: contracts, error: contractsError } = await supabase
        .from('rep_contracts')
        .select('user_id, contract_type')
        .eq('agency_id', 'ed9c6a52-c619-4d92-82f2-2b9cb4b35622');

      if (contractsError) {
        console.error('Error fetching contracts:', contractsError);
        return;
      }

      if (users && contracts) {
        const result = users.map(user => ({
          ...user,
          contract_types: contracts
            .filter(c => c.user_id === user.id)
            .map(c => c.contract_type)
        }));
        setAgentRoster(result);
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

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const calculateTrend = (current: number, previous: number) => {
    if (previous === 0) return null;
    const change = ((current - previous) / previous) * 100;
    return {
      value: Math.abs(change),
      isPositive: change > 0,
    };
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-slate-50">Dashboard</h2>
          <p className="text-slate-400 mt-1">Welcome back, {user.full_name || user.email}</p>
        </div>
        <div className="flex gap-2">
          {(user.role === 'SuperAdmin' || user.role === 'admin') && (
            <Button onClick={onNavigateToUpload} className="bg-[#0f3460] hover:bg-[#0f3460]/90">
              <img src="https://mgx-backend-cdn.metadl.com/generate/images/770325/2026-01-26/6864ace1-6db8-45c9-a011-3e16a50467f5.png" alt="" className="h-4 w-4 mr-2" />
              Upload Report
            </Button>
          )}
          <Button onClick={onNavigateToCommissions} variant="outline" className="border-slate-600 text-slate-300 hover:bg-[#1a1a2e]">
            <img src="https://mgx-backend-cdn.metadl.com/generate/images/770325/2026-01-26/81728cf7-16bc-4bb3-91ef-dfced6267f3d.png" alt="" className="h-4 w-4 mr-2" />
            View Commissions
          </Button>
        </div>
      </div>

      {/* Current Month Stats */}
      <div>
        <h3 className="text-lg font-semibold text-slate-300 mb-4">Current Month ({currentMonth.period})</h3>
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
            icon={<Users className="h-4 w-4" />}
          />
          <MetricCard
            title="Avg Residual"
            value={formatCurrency(currentMonth.averageResidual)}
            subtitle="Per merchant"
            icon={<TrendingUp className="h-4 w-4" />}
          />
        </div>
      </div>

      {/* Quarter & YTD Stats */}
      <div>
        <h3 className="text-lg font-semibold text-slate-300 mb-4">Period Overview</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-[#16213e] border border-slate-700 rounded-lg p-6">
            <h4 className="text-sm font-medium text-slate-400 mb-4">This Quarter</h4>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-slate-300">Volume</span>
                <span className="text-slate-50 font-semibold">{formatCurrency(fiscalQuarter.totalVolume)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-300">Residual</span>
                <span className="text-slate-50 font-semibold">{formatCurrency(fiscalQuarter.totalResidual)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-300">Merchants</span>
                <span className="text-slate-50 font-semibold">{fiscalQuarter.merchantCount}</span>
              </div>
            </div>
          </div>

          <div className="bg-[#16213e] border border-slate-700 rounded-lg p-6">
            <h4 className="text-sm font-medium text-slate-400 mb-4">Year to Date</h4>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-slate-300">Volume</span>
                <span className="text-slate-50 font-semibold">{formatCurrency(ytd.totalVolume)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-300">Residual</span>
                <span className="text-slate-50 font-semibold">{formatCurrency(ytd.totalResidual)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-300">Merchants</span>
                <span className="text-slate-50 font-semibold">{ytd.merchantCount}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Agent Roster - SuperAdmin Only */}
      {user.role === 'SuperAdmin' && (
        <div>
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
                        <TableCell className="text-slate-50">{agent.full_name || 'N/A'}</TableCell>
                        <TableCell className="text-slate-300">{agent.email}</TableCell>
                        <TableCell className="text-slate-300">{agent.sales_rep_id || 'N/A'}</TableCell>
                        <TableCell className="text-slate-300">
                          {agent.contract_types.length > 0
                            ? agent.contract_types.map(formatContractType).join(', ')
                            : 'N/A'}
                        </TableCell>
                        <TableCell className="text-slate-400">Dormant</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}