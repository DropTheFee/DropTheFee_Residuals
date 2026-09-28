import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/lib/supabase';
import { computeStatementTotals, StatementRow, StatementTotals } from '@/utils/statementTotals';

interface PayoutHistoryProps {
  repId: string;
  agencyId: string;
  selectedPeriod: string;
  onSelectPeriod: (period: string) => void;
}

interface PeriodHistory extends StatementTotals {
  period: string;
}

type SectionKey = 'merchantPayout' | 'saeOverridePayout' | 'nabPayout' | 'surjPayout' | 'manualExpensePayout';

const SECTION_COLUMNS: { key: SectionKey; label: string }[] = [
  { key: 'merchantPayout',      label: 'Merchant' },
  { key: 'saeOverridePayout',   label: 'SAE Override' },
  { key: 'nabPayout',           label: 'NAB' },
  { key: 'surjPayout',          label: 'SüRJ' },
  { key: 'manualExpensePayout', label: 'Manual Expense' },
];

const PAGE_SIZE = 1000;

export default function PayoutHistory({ repId, agencyId, selectedPeriod, onSelectPeriod }: PayoutHistoryProps) {
  const [history, setHistory] = useState<PeriodHistory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [repId, agencyId]);

  const loadHistory = async () => {
    setLoading(true);
    try {
      // Only finalized periods appear in the history.
      const { data: finalizedPeriods, error: periodsError } = await supabase
        .from('commission_periods')
        .select('period_month')
        .eq('agency_id', agencyId)
        .eq('status', 'finalized')
        .order('period_month', { ascending: false });

      if (periodsError) throw periodsError;

      const periodList = finalizedPeriods?.map(p => p.period_month) || [];
      if (periodList.length === 0) {
        setHistory([]);
        return;
      }

      // Page through results so long histories aren't cut off at the row limit.
      const rows: (StatementRow & { period_month: string })[] = [];
      for (let from = 0; ; from += PAGE_SIZE) {
        const { data, error } = await supabase
          .from('commission_results')
          .select('id, period_month, source_type, override_from_user_id, monthly_volume, split_pct, rep_payout')
          .eq('agency_id', agencyId)
          .eq('rep_user_id', repId)
          .in('period_month', periodList)
          .order('id', { ascending: true })
          .range(from, from + PAGE_SIZE - 1);

        if (error) throw error;
        rows.push(...(data || []));
        if (!data || data.length < PAGE_SIZE) break;
      }

      // One row per finalized period this rep has results in, newest first.
      setHistory(
        periodList
          .map(period => ({ period, rows: rows.filter(r => r.period_month === period) }))
          .filter(p => p.rows.length > 0)
          .map(p => ({ period: p.period, ...computeStatementTotals(p.rows) }))
      );
    } catch (error) {
      console.error('Error loading payout history:', error);
      setHistory([]);
    } finally {
      setLoading(false);
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

  const payoutClass = (value: number) => (value < 0 ? 'text-red-400' : 'text-slate-300');

  if (loading) {
    return null;
  }

  // Hide section columns that are $0 in every period for this rep.
  const visibleSections = SECTION_COLUMNS.filter(col =>
    history.some(h => Math.abs(h[col.key]) >= 0.005)
  );

  const sumOf = (fn: (h: PeriodHistory) => number) => history.reduce((sum, h) => sum + fn(h), 0);
  const totalVolume = sumOf(h => h.totalVolume);
  const totalPayout = sumOf(h => h.totalPayout);

  const currentYear = new Date().getFullYear();
  const ytdPayout = history
    .filter(h => h.period.startsWith(`${currentYear}-`))
    .reduce((sum, h) => sum + h.totalPayout, 0);

  return (
    <Card className="bg-slate-800/50 border-slate-700">
      <CardHeader>
        <CardTitle className="text-white">Payout History</CardTitle>
      </CardHeader>
      <CardContent>
        {history.length === 0 ? (
          <div className="py-4 text-center text-slate-400">No finalized periods yet.</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="border-slate-700">
                <TableHead className="text-slate-300">Period</TableHead>
                <TableHead className="text-right text-slate-300">Total Volume</TableHead>
                <TableHead className="text-right text-slate-300">Tier Achieved</TableHead>
                {visibleSections.map(col => (
                  <TableHead key={col.key} className="text-right text-slate-300">{col.label}</TableHead>
                ))}
                <TableHead className="text-right text-slate-300">Total Payout</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {history.map(h => (
                <TableRow
                  key={h.period}
                  onClick={() => onSelectPeriod(h.period)}
                  className={`border-slate-700 cursor-pointer ${h.period === selectedPeriod ? 'bg-slate-700/50' : ''}`}
                >
                  <TableCell className="text-white">{formatPeriodMonth(h.period)}</TableCell>
                  <TableCell className="text-right text-slate-300">{formatCurrency(h.totalVolume)}</TableCell>
                  <TableCell className="text-right text-slate-300">{h.tierPercentage}%</TableCell>
                  {visibleSections.map(col => (
                    <TableCell key={col.key} className={`text-right ${payoutClass(h[col.key])}`}>
                      {formatCurrency(h[col.key])}
                    </TableCell>
                  ))}
                  <TableCell className={`text-right font-medium ${h.totalPayout < 0 ? 'text-red-400' : 'text-green-400'}`}>
                    {formatCurrency(h.totalPayout)}
                  </TableCell>
                </TableRow>
              ))}
              <TableRow className="border-slate-700 bg-slate-700/30">
                <TableCell className="font-semibold text-slate-300">Total</TableCell>
                <TableCell className="text-right font-semibold text-slate-300">{formatCurrency(totalVolume)}</TableCell>
                <TableCell />
                {visibleSections.map(col => {
                  const value = sumOf(h => h[col.key]);
                  return (
                    <TableCell key={col.key} className={`text-right font-semibold ${payoutClass(value)}`}>
                      {formatCurrency(value)}
                    </TableCell>
                  );
                })}
                <TableCell className={`text-right font-bold ${totalPayout < 0 ? 'text-red-400' : 'text-green-400'}`}>
                  {formatCurrency(totalPayout)}
                </TableCell>
              </TableRow>
              <TableRow className="border-slate-700 bg-slate-700/30">
                <TableCell colSpan={3 + visibleSections.length} className="text-right font-semibold text-slate-300">
                  {currentYear} Year-to-Date Payout
                </TableCell>
                <TableCell className={`text-right font-bold ${ytdPayout < 0 ? 'text-red-400' : 'text-green-400'}`}>
                  {formatCurrency(ytdPayout)}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
