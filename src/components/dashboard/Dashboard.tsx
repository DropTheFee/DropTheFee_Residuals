import { useEffect, useState } from 'react';
import { User, DashboardData, PeriodStats, ReportData } from '@/types';
import { MetricCard } from './MetricCard';
import { DollarSign, TrendingUp, Users, Activity } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import { startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, startOfYear, endOfYear, subMonths, subYears, format } from 'date-fns';

interface DashboardProps {
  user: User;
  onNavigateToUpload: () => void;
  onNavigateToCommissions: () => void;
}

export function Dashboard({ user, onNavigateToUpload, onNavigateToCommissions }: DashboardProps) {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, [user]);

  const fetchDashboardData = async () => {
    try {
      const now = new Date();
      
      // Calculate date ranges
      const currentMonthStart = startOfMonth(now);
      const currentMonthEnd = endOfMonth(now);
      const lastMonthStart = startOfMonth(subMonths(now, 1));
      const lastMonthEnd = endOfMonth(subMonths(now, 1));
      const quarterStart = startOfQuarter(now);
      const quarterEnd = endOfQuarter(now);
      const ytdStart = startOfYear(now);
      const ytdEnd = endOfYear(now);
      const lastYearStart = startOfYear(subYears(now, 1));
      const lastYearEnd = endOfYear(subYears(now, 1));

      // Fetch reports based on user role
      let query = supabase
        .from('reports')
        .select('*');

      if (user.role === 'sales_rep' || user.role === 'junior_sales_rep') {
        query = query.eq('sales_rep_id', user.id);
      }

      const { data: reports, error } = await query;

      if (error) throw error;

      // Calculate stats for each period
      const currentMonth = calculatePeriodStats(reports as ReportData[] || [], currentMonthStart, currentMonthEnd, 'Current Month');
      const lastMonth = calculatePeriodStats(reports as ReportData[] || [], lastMonthStart, lastMonthEnd, 'Last Month');
      const fiscalQuarter = calculatePeriodStats(reports as ReportData[] || [], quarterStart, quarterEnd, 'This Quarter');
      const ytd = calculatePeriodStats(reports as ReportData[] || [], ytdStart, ytdEnd, 'Year to Date');
      const lastYear = calculatePeriodStats(reports as ReportData[] || [], lastYearStart, lastYearEnd, 'Last Year');

      setDashboardData({
        currentMonth,
        lastMonth,
        fiscalQuarter,
        ytd,
        lastYear,
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculatePeriodStats = (reports: ReportData[], startDate: Date, endDate: Date, period: string): PeriodStats => {
    const periodReports = reports.filter(report => {
      const reportDate = new Date(report.report_date);
      return reportDate >= startDate && reportDate <= endDate;
    });

    let totalVolume = 0;
    let totalResidual = 0;
    let merchantCount = 0;
    let liveVolume = 0;
    let liveResidual = 0;
    let liveMerchantCount = 0;

    periodReports.forEach(report => {
      if (report.stats) {
        totalVolume += report.stats.totalVolume || 0;
        totalResidual += report.stats.totalResidual || 0;
        merchantCount += report.stats.merchantCount || 0;
        liveVolume += report.stats.liveVolume || 0;
        liveResidual += report.stats.liveResidual || 0;
        liveMerchantCount += report.stats.liveMerchantCount || 0;
      }
    });

    return {
      period,
      totalVolume,
      totalResidual,
      merchantCount,
      averageResidual: merchantCount > 0 ? totalResidual / merchantCount : 0,
      averageResidualPercentage: totalVolume > 0 ? (totalResidual / totalVolume) * 100 : 0,
      liveVolume,
      liveResidual,
      liveMerchantCount,
    };
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
        {(user.role === 'superadmin' || user.role === 'admin') && (
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
          {(user.role === 'superadmin' || user.role === 'admin') && (
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
        <h3 className="text-lg font-semibold text-slate-300 mb-4">Current Month ({format(new Date(), 'MMMM yyyy')})</h3>
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
    </div>
  );
}