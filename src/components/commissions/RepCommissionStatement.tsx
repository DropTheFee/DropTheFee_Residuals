import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/lib/supabase';
import { getRepDisplayName } from '@/utils/displayNames';
import { TrendingUp, DollarSign } from 'lucide-react';

interface RepCommissionStatementProps {
  repId: string;
  repName: string;
  periodMonth?: string;
  agencyId?: string;
  embedded?: boolean;
}

interface CommissionResult {
  id: string;
  merchant_name: string;
  processor: string | null;
  monthly_volume: number;
  gross_residual: number;
  expenses: number;
  net_residual: number;
  split_pct: number;
  rep_payout: number;
  source_type: string;
  contract_type: string;
  override_from_user_id: string | null;
  mid?: string;
  payout_date?: string;
}

export default function RepCommissionStatement({
  repId,
  repName,
  periodMonth: initialPeriodMonth,
  agencyId: propAgencyId,
  embedded = false
}: RepCommissionStatementProps) {
  const [periods, setPeriods] = useState<string[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<string>(initialPeriodMonth || '');
  const [results, setResults] = useState<CommissionResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [agencyId, setAgencyId] = useState<string>(propAgencyId || '');
  const [overrideRepNames, setOverrideRepNames] = useState<Map<string, string>>(new Map());

  useEffect(() => {
    loadPeriods();
  }, []);

  useEffect(() => {
    if (selectedPeriod) {
      loadCommissionResults();
    }
  }, [selectedPeriod, repId]);

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

      if (periodList.length > 0 && !selectedPeriod) {
        setSelectedPeriod(periodList[0]);
      } else if (initialPeriodMonth) {
        setSelectedPeriod(initialPeriodMonth);
      }

      setLoading(false);
    } catch (error) {
      console.error('Error loading periods:', error);
      setLoading(false);
    }
  };

  const loadCommissionResults = async () => {
    if (!selectedPeriod || !agencyId) return;

    try {
      const { data, error } = await supabase
        .from('commission_results')
        .select('*')
        .eq('agency_id', agencyId)
        .eq('period_month', selectedPeriod)
        .eq('rep_user_id', repId)
        .order('source_type', { ascending: true })
        .order('merchant_name', { ascending: true });

      if (error) throw error;

      const surjRows = (data || []).filter((r: any) => r.source_type === 'surj');
      console.log('[RepCommissionStatement] repId:', repId, 'period:', selectedPeriod, 'total rows:', data?.length, 'surj rows:', surjRows.length, surjRows.map((r: any) => ({ merchant_name: r.merchant_name, gross_residual: r.gross_residual, expenses: r.expenses, net_residual: r.net_residual, rep_payout: r.rep_payout })));

      setResults(data || []);

      // Fetch display names for any Jr AE reps referenced in SAE override debit rows
      const overrideIds = [
        ...new Set(
          (data || [])
            .filter(r => r.source_type === 'expense' && r.override_from_user_id)
            .map(r => r.override_from_user_id as string)
        ),
      ];

      if (overrideIds.length > 0) {
        const { data: users } = await supabase
          .from('users')
          .select('id, full_name')
          .in('id', overrideIds);

        const nameMap = new Map<string, string>();
        users?.forEach(u => nameMap.set(u.id, getRepDisplayName(u.id, u.full_name)));
        setOverrideRepNames(nameMap);
      } else {
        setOverrideRepNames(new Map());
      }
    } catch (error) {
      console.error('Error loading commission results:', error);
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

  // Section filters per spec
  const merchantResults      = results.filter(r => r.source_type === 'merchant' && !r.override_from_user_id);
  const saeOverrideResults   = results.filter(r => r.source_type === 'expense'  &&  r.override_from_user_id);
  const nabResults           = results.filter(r => r.source_type === 'nab');
  const surjResults          = results.filter(r => r.source_type === 'surj');
  const manualExpenseResults = results.filter(r => r.source_type === 'expense'  && !r.override_from_user_id);

  const totalVolume     = merchantResults.reduce((sum, r) => sum + r.monthly_volume, 0);
  const tierPercentage  = merchantResults.length > 0 ? merchantResults[0].split_pct : 0;

  // Total sums only the five defined sections
  const totalPayout =
    merchantResults.reduce((sum, r)      => sum + r.rep_payout, 0) +
    saeOverrideResults.reduce((sum, r)   => sum + r.rep_payout, 0) +
    nabResults.reduce((sum, r)           => sum + r.rep_payout, 0) +
    surjResults.reduce((sum, r)          => sum + r.rep_payout, 0) +
    manualExpenseResults.reduce((sum, r) => sum + r.rep_payout, 0);

  if (loading) {
    return <div className="text-center py-8 text-slate-400">Loading...</div>;
  }

  return (
    <div className={embedded ? '' : 'container mx-auto p-6 space-y-6'}>
      {!embedded && (
        <>
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold text-white">{repName} - Commission Statement</h1>
          </div>

          {periods.length > 0 && (
            <Card className="bg-slate-800/50 border-slate-700">
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <label className="text-sm font-medium text-slate-300">Period:</label>
                  <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                    <SelectTrigger className="w-[250px] bg-slate-900 border-slate-600 text-white">
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
              </CardContent>
            </Card>
          )}
        </>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
            <CardTitle className="text-sm font-medium text-slate-300">Tier Achieved</CardTitle>
            <TrendingUp className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{tierPercentage}%</div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-300">Total Payout</CardTitle>
            <DollarSign className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${totalPayout < 0 ? 'text-red-400' : 'text-white'}`}>
              {formatCurrency(totalPayout)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Merchant Commissions — source_type = 'merchant', no override */}
      {merchantResults.length > 0 && (
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">Merchant Commissions</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow className="border-slate-700">
                  <TableHead className="text-slate-300">Merchant Name</TableHead>
                  <TableHead className="text-slate-300">Processor</TableHead>
                  <TableHead className="text-right text-slate-300">Volume</TableHead>
                  <TableHead className="text-right text-slate-300">Gross Residual</TableHead>
                  <TableHead className="text-right text-slate-300">Expenses</TableHead>
                  <TableHead className="text-right text-slate-300">Net Residual</TableHead>
                  <TableHead className="text-right text-slate-300">Split %</TableHead>
                  <TableHead className="text-right text-slate-300">Payout</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {merchantResults.map((result) => (
                  <TableRow key={result.id} className="border-slate-700">
                    <TableCell className="text-white">{result.merchant_name}</TableCell>
                    <TableCell className="text-slate-300">{result.processor || 'N/A'}</TableCell>
                    <TableCell className="text-right text-slate-300">{formatCurrency(result.monthly_volume)}</TableCell>
                    <TableCell className="text-right text-slate-300">{formatCurrency(result.gross_residual)}</TableCell>
                    <TableCell className={`text-right ${result.expenses > 0 ? 'text-red-400' : 'text-slate-300'}`}>
                      {result.expenses > 0 ? formatCurrency(-result.expenses) : '$0.00'}
                    </TableCell>
                    <TableCell className={`text-right ${result.net_residual < 0 ? 'text-red-400' : 'text-slate-300'}`}>
                      {formatCurrency(result.net_residual)}
                    </TableCell>
                    <TableCell className="text-right text-slate-300">{result.split_pct}%</TableCell>
                    <TableCell className={`text-right font-medium ${result.rep_payout < 0 ? 'text-red-400' : 'text-green-400'}`}>
                      {formatCurrency(result.rep_payout)}
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow className="border-slate-700 bg-slate-700/30">
                  <TableCell colSpan={7} className="text-right font-semibold text-slate-300">Merchant Commissions Subtotal</TableCell>
                  <TableCell className={`text-right font-bold ${merchantResults.reduce((sum, r) => sum + r.rep_payout, 0) < 0 ? 'text-red-400' : 'text-green-400'}`}>
                    {formatCurrency(merchantResults.reduce((sum, r) => sum + r.rep_payout, 0))}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* SAE Override — source_type = 'expense', override_from_user_id present (Jr AE negative balance debit) */}
      {saeOverrideResults.length > 0 && (
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">SAE Override</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow className="border-slate-700">
                  <TableHead className="text-slate-300">Rep</TableHead>
                  <TableHead className="text-slate-300">Description</TableHead>
                  <TableHead className="text-right text-slate-300">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {saeOverrideResults.map((result) => (
                  <TableRow key={result.id} className="border-slate-700">
                    <TableCell className="text-white">
                      {result.override_from_user_id
                        ? (overrideRepNames.get(result.override_from_user_id) || result.override_from_user_id)
                        : '—'}
                    </TableCell>
                    <TableCell className="text-slate-300">{result.merchant_name}</TableCell>
                    <TableCell className="text-right font-medium text-red-400">
                      {formatCurrency(result.rep_payout)}
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow className="border-slate-700 bg-slate-700/30">
                  <TableCell colSpan={2} className="text-right font-semibold text-slate-300">SAE Override Subtotal</TableCell>
                  <TableCell className="text-right font-bold text-red-400">
                    {formatCurrency(saeOverrideResults.reduce((sum, r) => sum + r.rep_payout, 0))}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* EPI New Account Bonus — source_type = 'nab' */}
      {nabResults.length > 0 && (
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">EPI New Account Bonus</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow className="border-slate-700">
                  <TableHead className="text-slate-300">MID</TableHead>
                  <TableHead className="text-slate-300">DBA</TableHead>
                  <TableHead className="text-slate-300">Payout Date</TableHead>
                  <TableHead className="text-right text-slate-300">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {nabResults.map((result) => (
                  <TableRow key={result.id} className="border-slate-700">
                    <TableCell className="text-slate-300">{result.mid || 'N/A'}</TableCell>
                    <TableCell className="text-white">{result.merchant_name}</TableCell>
                    <TableCell className="text-slate-300">
                      {result.payout_date
                        ? new Date(result.payout_date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                        : 'N/A'}
                    </TableCell>
                    <TableCell className="text-right font-medium text-green-400">
                      {formatCurrency(result.rep_payout)}
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow className="border-slate-700 bg-slate-700/30">
                  <TableCell colSpan={3} className="text-right font-semibold text-slate-300">NAB Bonus Subtotal</TableCell>
                  <TableCell className="text-right font-bold text-green-400">
                    {formatCurrency(nabResults.reduce((sum, r) => sum + r.rep_payout, 0))}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* SüRJ Platform — source_type = 'surj' */}
      {surjResults.length > 0 && (
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">SüRJ Platform</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow className="border-slate-700">
                  <TableHead className="text-slate-300">Service</TableHead>
                  <TableHead className="text-right text-slate-300">Income</TableHead>
                  <TableHead className="text-right text-slate-300">Expenses</TableHead>
                  <TableHead className="text-right text-slate-300">Net Revenue</TableHead>
                  <TableHead className="text-right text-slate-300">Commission (50%)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {surjResults.map((result) => (
                  <TableRow key={result.id} className="border-slate-700">
                    <TableCell className="text-white">{result.merchant_name}</TableCell>
                    <TableCell className="text-right text-slate-300">{formatCurrency(result.gross_residual)}</TableCell>
                    <TableCell className={`text-right ${result.expenses > 0 ? 'text-red-400' : 'text-slate-300'}`}>
                      {result.expenses > 0 ? formatCurrency(-result.expenses) : '$0.00'}
                    </TableCell>
                    <TableCell className={`text-right ${result.net_residual < 0 ? 'text-red-400' : 'text-slate-300'}`}>
                      {formatCurrency(result.net_residual)}
                    </TableCell>
                    <TableCell className="text-right font-medium text-green-400">
                      {formatCurrency(result.rep_payout)}
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow className="border-slate-700 bg-slate-700/30">
                  <TableCell colSpan={4} className="text-right font-semibold text-slate-300">SüRJ Subtotal</TableCell>
                  <TableCell className="text-right font-bold text-green-400">
                    {formatCurrency(surjResults.reduce((sum, r) => sum + r.rep_payout, 0))}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Manual Expenses — source_type = 'expense', no override_from_user_id */}
      {manualExpenseResults.length > 0 && (
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">Manual Expenses</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow className="border-slate-700">
                  <TableHead className="text-slate-300">Description</TableHead>
                  <TableHead className="text-right text-slate-300">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {manualExpenseResults.map((result) => (
                  <TableRow key={result.id} className="border-slate-700">
                    <TableCell className="text-white">{result.merchant_name}</TableCell>
                    <TableCell className="text-right font-medium text-red-400">
                      {formatCurrency(result.rep_payout)}
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow className="border-slate-700 bg-slate-700/30">
                  <TableCell className="text-right font-semibold text-slate-300">Manual Expenses Subtotal</TableCell>
                  <TableCell className="text-right font-bold text-red-400">
                    {formatCurrency(manualExpenseResults.reduce((sum, r) => sum + r.rep_payout, 0))}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {results.length === 0 && (
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="py-8 text-center text-slate-400">
            No commission data available for this period.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
