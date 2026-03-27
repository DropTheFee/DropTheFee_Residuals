import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import { calculateCommissions } from '@/utils/commissionEngine';
import { toast } from 'sonner';
import { Loader as Loader2, Lock, Clock as Unlock, TrendingUp, DollarSign, Download } from 'lucide-react';
import { exportRepStatementToHTML } from '@/utils/csvExport';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useViewAs } from '@/contexts/ViewAsContext';
import RepCommissionStatement from '@/components/commissions/RepCommissionStatement';

interface CommissionPeriod {
  id: string;
  period_month: string;
  status: string;
}

interface RepSummary {
  rep_id: string;
  rep_name: string;
  total_volume: number;
  tier_percentage: number;
  total_net_residual: number;
  total_payout: number;
  contracts: string[];
}

export default function Commissions() {
  const { isViewingAsRep, viewAsRepId, viewAsRepName } = useViewAs();
  const [periods, setPeriods] = useState<CommissionPeriod[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<string>('');
  const [currentPeriodStatus, setCurrentPeriodStatus] = useState<string>('open');
  const [loading, setLoading] = useState(true);
  const [calculating, setCalculating] = useState(false);
  const [repSummaries, setRepSummaries] = useState<RepSummary[]>([]);
  const [expandedRep, setExpandedRep] = useState<string | null>(null);
  const [showFinalizeDialog, setShowFinalizeDialog] = useState(false);
  const [showUnlockDialog, setShowUnlockDialog] = useState(false);
  const [showRecurringExpensesDialog, setShowRecurringExpensesDialog] = useState(false);
  const [recurringExpenses, setRecurringExpenses] = useState<any[]>([]);
  const [agencyId, setAgencyId] = useState<string>('');
  const [userRole, setUserRole] = useState<string>('');

  useEffect(() => {
    loadPeriods();
  }, []);

  useEffect(() => {
    if (selectedPeriod) {
      loadCommissionResults();
    }
  }, [selectedPeriod]);

  const loadPeriods = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('users')
        .select('agency_id, role')
        .eq('id', user.id)
        .single();

      if (!profile?.agency_id) return;
      setAgencyId(profile.agency_id);
      setUserRole(profile.role || '');

      const { data: existingPeriods, error: periodsError } = await supabase
        .from('commission_periods')
        .select('*')
        .eq('agency_id', profile.agency_id)
        .order('period_month', { ascending: false });

      if (periodsError) throw periodsError;

      const allPeriods = existingPeriods || [];

      const currentDate = new Date();
      const lastSixMonths = [];
      for (let i = 0; i < 6; i++) {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth() - i;
        const d = new Date(year, month, 1);
        const periodMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
        if (!allPeriods.find(p => p.period_month === periodMonth)) {
          lastSixMonths.push({
            id: periodMonth,
            period_month: periodMonth,
            status: 'open',
          });
        }
      }

      const combinedPeriods = [...allPeriods, ...lastSixMonths].sort((a, b) =>
        b.period_month.localeCompare(a.period_month)
      );

      setPeriods(combinedPeriods);
      if (combinedPeriods.length > 0 && !selectedPeriod) {
        setSelectedPeriod(combinedPeriods[0].period_month);
        setCurrentPeriodStatus(combinedPeriods[0].status);
      }

      setLoading(false);
    } catch (error) {
      console.error('Error loading periods:', error);
      toast.error('Failed to load commission periods');
      setLoading(false);
    }
  };

  const loadCommissionResults = async () => {
    if (!selectedPeriod || !agencyId) return;

    try {
      const { data: results, error } = await supabase
        .from('commission_results')
        .select('*')
        .eq('agency_id', agencyId)
        .eq('period_month', selectedPeriod);

      if (error) throw error;

      const repIds = [...new Set(results?.map(r => r.rep_user_id) || [])];
      const { data: repUsers } = await supabase
        .from('users')
        .select('id, full_name')
        .in('id', repIds);

      const repMap = new Map<string, RepSummary>();

      for (const result of results || []) {
        const repId = result.rep_user_id;
        const repName = repUsers?.find(u => u.id === repId)?.full_name || 'Unknown';

        if (!repMap.has(repId)) {
          repMap.set(repId, {
            rep_id: repId,
            rep_name: repName,
            total_volume: 0,
            tier_percentage: 0,
            total_net_residual: 0,
            total_payout: 0,
            contracts: [],
          });
        }

        const summary = repMap.get(repId)!;

        if (result.source_type === 'merchant' && !result.override_from_user_id) {
          summary.total_volume = result.volume;
          summary.total_net_residual += result.net_residual;
          summary.tier_percentage = result.split_pct;
        }

        if (result.source_type === 'merchant') {
          if (!summary.contracts.includes(result.contract_type)) {
            summary.contracts.push(result.contract_type);
          }
        }

        summary.total_payout += result.rep_payout;
      }

      setRepSummaries(Array.from(repMap.values()));

      const period = periods.find(p => p.period_month === selectedPeriod);
      setCurrentPeriodStatus(period?.status || 'open');
    } catch (error) {
      console.error('Error loading commission results:', error);
      toast.error('Failed to load commission results');
    }
  };

  const checkRecurringExpenses = async () => {
    if (!selectedPeriod || !agencyId) return false;

    try {
      const currentPeriodDate = new Date(selectedPeriod + 'T12:00:00Z');
      const previousPeriodDate = new Date(currentPeriodDate);
      previousPeriodDate.setMonth(previousPeriodDate.getMonth() - 1);
      const previousPeriod = previousPeriodDate.toISOString();

      const { data: currentExpenses } = await supabase
        .from('expenses')
        .select('user_id, description, amount')
        .eq('agency_id', agencyId)
        .eq('period_month', currentPeriodDate.toISOString())
        .eq('expense_type', 'manual')
        .eq('status', 'active');

      const currentExpenseKeys = new Set(
        (currentExpenses || []).map((e: any) => `${e.user_id}-${e.description}`)
      );

      const { data: previousRecurringExpenses } = await supabase
        .from('expenses')
        .select('id, user_id, description, amount, users!expenses_user_id_fkey(full_name)')
        .eq('agency_id', agencyId)
        .eq('period_month', previousPeriod)
        .eq('expense_type', 'manual')
        .eq('recurring', true)
        .eq('status', 'active');

      const unappliedExpenses = (previousRecurringExpenses || []).filter((e: any) => {
        const key = `${e.user_id}-${e.description}`;
        return !currentExpenseKeys.has(key);
      });

      if (unappliedExpenses.length > 0) {
        setRecurringExpenses(unappliedExpenses);
        setShowRecurringExpensesDialog(true);
        return true;
      }

      return false;
    } catch (error) {
      console.error('Error checking recurring expenses:', error);
      return false;
    }
  };

  const applyRecurringExpenses = async () => {
    if (!selectedPeriod || !agencyId) return;

    try {
      const currentPeriodDate = new Date(selectedPeriod + 'T12:00:00Z');
      const expenseDate = new Date(currentPeriodDate);
      expenseDate.setDate(1);

      const newExpenses = recurringExpenses.map((e: any) => ({
        agency_id: agencyId,
        user_id: e.user_id,
        expense_type: 'manual',
        amount: e.amount,
        description: e.description,
        expense_date: expenseDate.toISOString(),
        recurring: true,
        period_month: currentPeriodDate.toISOString(),
        status: 'active',
      }));

      const { error } = await supabase.from('expenses').insert(newExpenses);

      if (error) throw error;

      toast.success(`Applied ${newExpenses.length} recurring expense(s)`);
      setShowRecurringExpensesDialog(false);
      await runCalculation();
    } catch (error) {
      console.error('Error applying recurring expenses:', error);
      toast.error('Failed to apply recurring expenses');
    }
  };

  const runCalculation = async () => {
    if (!selectedPeriod || !agencyId) return;

    setCalculating(true);
    try {
      const result = await calculateCommissions(selectedPeriod, agencyId);

      if (result.success) {
        toast.success('Commissions calculated successfully');
        await loadPeriods();
        await loadCommissionResults();
      } else {
        toast.error(result.error || 'Failed to calculate commissions');
      }
    } catch (error) {
      console.error('Error calculating commissions:', error);
      toast.error('Failed to calculate commissions');
    } finally {
      setCalculating(false);
    }
  };

  const handleCalculate = async () => {
    const hasRecurring = await checkRecurringExpenses();
    if (!hasRecurring) {
      await runCalculation();
    }
  };

  const handleFinalize = async () => {
    if (!selectedPeriod || !agencyId) return;

    try {
      console.log('Finalizing period with Supabase client:', {
        url: import.meta.env.VITE_SUPABASE_URL,
        period: selectedPeriod,
        agencyId
      });

      const { data, error } = await supabase
        .from('commission_periods')
        .upsert({
          agency_id: agencyId,
          period_month: selectedPeriod,
          status: 'finalized',
        }, {
          onConflict: 'agency_id,period_month'
        })
        .select();

      if (error) {
        console.error('Upsert error details:', error);
        throw error;
      }

      console.log('Finalize successful:', data);
      toast.success(`Period ${formatPeriodMonth(selectedPeriod)} has been finalized`);
      setShowFinalizeDialog(false);
      await loadPeriods();
      await loadCommissionResults();
    } catch (error) {
      console.error('Error finalizing period:', error);
      toast.error('Failed to finalize period');
    }
  };

  const handleUnlock = async () => {
    if (!selectedPeriod || !agencyId) return;

    try {
      const { data, error } = await supabase
        .from('commission_periods')
        .upsert({
          agency_id: agencyId,
          period_month: selectedPeriod,
          status: 'calculated',
        }, {
          onConflict: 'agency_id,period_month'
        })
        .select();

      if (error) {
        console.error('Upsert error details:', error);
        throw error;
      }

      toast.success(`Period ${formatPeriodMonth(selectedPeriod)} has been unlocked`);
      setShowUnlockDialog(false);
      await loadPeriods();
      await loadCommissionResults();
    } catch (error) {
      console.error('Error unlocking period:', error);
      toast.error('Failed to unlock period');
    }
  };

  const formatPeriodMonth = (period: string) => {
    const date = new Date(period + 'T12:00:00');
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  };

  const handleDownloadStatement = async (repId: string, repName: string) => {
    if (!selectedPeriod || !agencyId) return;

    try {
      const { data: results, error } = await supabase
        .from('commission_results')
        .select(`
          *,
          merchants!commission_results_merchant_id_fkey(merchant_id)
        `)
        .eq('agency_id', agencyId)
        .eq('period_month', selectedPeriod)
        .eq('rep_user_id', repId)
        .order('source_type', { ascending: true })
        .order('merchant_name', { ascending: true });

      if (error) throw error;

      if (!results || results.length === 0) {
        toast.error('No commission data found for this rep');
        return;
      }

      const resultsWithMID = results.map((r: any) => ({
        ...r,
        mid: r.merchants?.merchant_id || ''
      }));

      const filename = exportRepStatementToHTML(repName, selectedPeriod, resultsWithMID);
      toast.success(`Downloaded ${filename}`);
    } catch (error) {
      console.error('Error downloading statement:', error);
      toast.error('Failed to download statement');
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64">Loading...</div>;
  }

  if (isViewingAsRep && viewAsRepId) {
    return <RepCommissionStatement repId={viewAsRepId} repName={viewAsRepName || ''} />;
  }

  const totalVolume = repSummaries.reduce((sum, r) => sum + r.total_volume, 0);
  const totalPayout = repSummaries.reduce((sum, r) => sum + r.total_payout, 0);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-white">Commission Report</h1>
      </div>

      <Card className="bg-slate-800/50 border-slate-700">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4 items-end">
            <div className="flex-1">
              <label className="text-sm font-medium text-slate-300 mb-2 block">Period</label>
              <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                <SelectTrigger className="bg-slate-900 border-slate-600 text-white">
                  <SelectValue placeholder="Select period" />
                </SelectTrigger>
                <SelectContent>
                  {periods.map((period) => (
                    <SelectItem key={period.period_month} value={period.period_month}>
                      {formatPeriodMonth(period.period_month)} ({period.status})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button
              onClick={handleCalculate}
              disabled={calculating || currentPeriodStatus === 'finalized'}
              className="bg-cyan-600 hover:bg-cyan-700"
            >
              {calculating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Calculating...
                </>
              ) : (
                'Calculate / Recalculate'
              )}
            </Button>

            {currentPeriodStatus === 'finalized' ? (
              <Button
                onClick={() => setShowUnlockDialog(true)}
                variant="outline"
                className="border-amber-600 text-amber-600 hover:bg-amber-600/10"
              >
                <Unlock className="mr-2 h-4 w-4" />
                Unlock Period
              </Button>
            ) : (
              <Button
                onClick={() => setShowFinalizeDialog(true)}
                disabled={currentPeriodStatus === 'open'}
                className="bg-green-600 hover:bg-green-700"
              >
                <Lock className="mr-2 h-4 w-4" />
                Finalize Period
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-300">Total Volume</CardTitle>
            <TrendingUp className="h-4 w-4 text-cyan-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{formatCurrency(totalVolume)}</div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-300">Total Payouts</CardTitle>
            <DollarSign className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{formatCurrency(totalPayout)}</div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        {repSummaries.map((rep) => (
          <Card key={rep.rep_id} className="bg-slate-800/50 border-slate-700">
            <CardHeader
              className="cursor-pointer hover:bg-slate-700/30 transition-colors"
              onClick={() => setExpandedRep(expandedRep === rep.rep_id ? null : rep.rep_id)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div>
                    <CardTitle className="text-white">{rep.rep_name}</CardTitle>
                    <div className="text-sm text-slate-400 mt-1">
                      Volume: {formatCurrency(rep.total_volume)} | Tier: {rep.tier_percentage}% |
                      Contracts: {rep.contracts.join(', ')}
                    </div>
                  </div>
                  {userRole.toLowerCase() === 'superadmin' && (
                    <Button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDownloadStatement(rep.rep_id, rep.rep_name);
                      }}
                      size="sm"
                      variant="outline"
                      className="border-cyan-600 text-cyan-600 hover:bg-cyan-600/10"
                    >
                      <Download className="h-4 w-4 mr-1" />
                      Download Statement
                    </Button>
                  )}
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-green-400">{formatCurrency(rep.total_payout)}</div>
                  <div className="text-sm text-slate-400">Total Payout</div>
                </div>
              </div>
            </CardHeader>

            {expandedRep === rep.rep_id && (
              <CardContent className="pt-0">
                <RepCommissionStatement
                  repId={rep.rep_id}
                  repName={rep.rep_name}
                  periodMonth={selectedPeriod}
                  agencyId={agencyId}
                  embedded={true}
                />
              </CardContent>
            )}
          </Card>
        ))}

        {repSummaries.length === 0 && (
          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="py-8 text-center text-slate-400">
              No commission data for this period. Click "Calculate / Recalculate" to process commissions.
            </CardContent>
          </Card>
        )}
      </div>

      <AlertDialog open={showFinalizeDialog} onOpenChange={setShowFinalizeDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Finalize Commission Period</AlertDialogTitle>
            <AlertDialogDescription>
              This will lock {formatPeriodMonth(selectedPeriod)}. You can unlock it later if needed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleFinalize}>Finalize</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showUnlockDialog} onOpenChange={setShowUnlockDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unlock Commission Period</AlertDialogTitle>
            <AlertDialogDescription>
              This will unlock {formatPeriodMonth(selectedPeriod)}, allowing recalculation.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleUnlock}>Unlock</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showRecurringExpensesDialog} onOpenChange={setShowRecurringExpensesDialog}>
        <AlertDialogContent className="max-w-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Recurring Expenses Found</AlertDialogTitle>
            <AlertDialogDescription>
              You have {recurringExpenses.length} recurring expense(s) from last period:
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="max-h-60 overflow-y-auto">
            <ul className="space-y-2">
              {recurringExpenses.map((expense: any, index: number) => (
                <li key={index} className="text-sm">
                  <span className="font-semibold">{expense.users?.full_name || 'Unknown'}</span>
                  {' — '}
                  <span>{expense.description}</span>
                  {' — '}
                  <span className="text-green-600">{formatCurrency(expense.amount)}</span>
                </li>
              ))}
            </ul>
          </div>
          <AlertDialogDescription className="mt-2">
            Apply these to {formatPeriodMonth(selectedPeriod)}?
          </AlertDialogDescription>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => runCalculation()}>Skip</AlertDialogCancel>
            <AlertDialogAction onClick={applyRecurringExpenses}>Apply All</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
