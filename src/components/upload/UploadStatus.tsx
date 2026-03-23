import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/supabase';

interface UploadStatusProps {
  selectedMonth: number;
  selectedYear: number;
}

interface ProcessorStatus {
  processor: string;
  merchant_count: number;
  total_residual: number;
  status: 'uploaded' | 'missing';
}

interface ExpenseStatus {
  expense_source: string;
  record_count: number;
  total_expenses: number;
  matched_count: number;
  status: 'uploaded' | 'missing';
}

interface NABStatus {
  record_count: number;
  total_amount: number;
  status: 'uploaded' | 'missing';
}

export default function UploadStatus({ selectedMonth, selectedYear }: UploadStatusProps) {
  const [processorStatuses, setProcessorStatuses] = useState<ProcessorStatus[]>([]);
  const [expenseStatuses, setExpenseStatuses] = useState<ExpenseStatus[]>([]);
  const [nabStatus, setNabStatus] = useState<NABStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [agencyId, setAgencyId] = useState<string>('');

  useEffect(() => {
    fetchUserAgency();
  }, []);

  useEffect(() => {
    if (agencyId) {
      loadUploadStatus();
    }
  }, [agencyId, selectedMonth, selectedYear]);

  const fetchUserAgency = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: userData } = await supabase
        .from('users')
        .select('agency_id')
        .eq('id', user.id)
        .maybeSingle();

      if (userData?.agency_id) {
        setAgencyId(userData.agency_id);
      }
    } catch (error) {
      console.error('Error fetching user agency:', error);
    }
  };

  const loadUploadStatus = async () => {
    if (!agencyId) return;

    setLoading(true);
    try {
      const month = String(selectedMonth).padStart(2, '0');
      const periodMonth = `${selectedYear}-${month}-01`;

      const { data: historyData, error: historyError } = await supabase
        .from('merchant_history')
        .select(`
          monthly_income,
          monthly_volume,
          merchant_id,
          merchants!inner(processor)
        `)
        .eq('agency_id', agencyId)
        .eq('report_date', periodMonth);

      if (historyError) throw historyError;

      const processorMap = new Map<string, { count: number; total: number }>();

      historyData?.forEach((record: any) => {
        const processor = record.merchants?.processor || 'Unknown';
        const existing = processorMap.get(processor) || { count: 0, total: 0 };
        processorMap.set(processor, {
          count: existing.count + 1,
          total: existing.total + (record.monthly_income || 0),
        });
      });

      const knownProcessors = ['Paysafe', 'PCS', 'Link2Pay', 'Payarc'];
      const processorStatusList: ProcessorStatus[] = knownProcessors.map(processor => {
        const data = processorMap.get(processor);
        return {
          processor,
          merchant_count: data?.count || 0,
          total_residual: data?.total || 0,
          status: data && data.count > 0 ? 'uploaded' : 'missing',
        };
      });

      processorMap.forEach((data, processor) => {
        if (!knownProcessors.includes(processor)) {
          processorStatusList.push({
            processor,
            merchant_count: data.count,
            total_residual: data.total,
            status: 'uploaded',
          });
        }
      });

      setProcessorStatuses(processorStatusList);

      const { data: expenseData, error: expenseError } = await supabase
        .from('merchant_expenses')
        .select('expense_source, expense_amount, matched, skipped')
        .eq('agency_id', agencyId)
        .eq('report_date', periodMonth);

      if (expenseError) throw expenseError;

      const expenseMap = new Map<string, { count: number; total: number; matched: number }>();

      expenseData?.forEach((record: any) => {
        const source = record.expense_source || 'Unknown';
        const existing = expenseMap.get(source) || { count: 0, total: 0, matched: 0 };
        expenseMap.set(source, {
          count: existing.count + 1,
          total: existing.total + (record.expense_amount || 0),
          matched: existing.matched + (record.matched && !record.skipped ? 1 : 0),
        });
      });

      const expenseStatusList: ExpenseStatus[] = [];
      expenseMap.forEach((data, source) => {
        expenseStatusList.push({
          expense_source: source,
          record_count: data.count,
          total_expenses: data.total,
          matched_count: data.matched,
          status: 'uploaded',
        });
      });

      setExpenseStatuses(expenseStatusList);

      const periodMonthNAB = `${selectedYear}-${month}`;
      const { data: nabData, error: nabError } = await supabase
        .from('nab_records')
        .select('amount')
        .eq('agency_id', agencyId)
        .eq('period_month', periodMonthNAB);

      if (nabError) {
        console.error('Error loading NAB status:', nabError);
      } else if (nabData && nabData.length > 0) {
        const totalAmount = nabData.reduce((sum, record) => sum + (record.amount || 0), 0);
        setNabStatus({
          record_count: nabData.length,
          total_amount: totalAmount,
          status: 'uploaded',
        });
      } else {
        setNabStatus({
          record_count: 0,
          total_amount: 0,
          status: 'missing',
        });
      }
    } catch (error) {
      console.error('Error loading upload status:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const formatPeriodMonth = (month: number, year: number) => {
    const date = new Date(year, month - 1, 1);
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  if (loading) {
    return (
      <Card className="bg-slate-800/50 border-slate-700">
        <CardContent className="py-8 text-center text-slate-400">
          Loading upload status...
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-slate-800/50 border-slate-700">
      <CardHeader>
        <CardTitle className="text-white">
          {formatPeriodMonth(selectedMonth, selectedYear)} Upload Status
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold text-white mb-3">Residual Reports</h3>
          {processorStatuses.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow className="border-slate-700">
                  <TableHead className="text-slate-300">Processor</TableHead>
                  <TableHead className="text-right text-slate-300">Merchant Count</TableHead>
                  <TableHead className="text-right text-slate-300">Total Residual</TableHead>
                  <TableHead className="text-center text-slate-300">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {processorStatuses.map((processor) => (
                  <TableRow key={processor.processor} className="border-slate-700">
                    <TableCell className="text-white">{processor.processor}</TableCell>
                    <TableCell className="text-right text-slate-300">
                      {processor.merchant_count.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right text-slate-300">
                      {formatCurrency(processor.total_residual)}
                    </TableCell>
                    <TableCell className="text-center">
                      {processor.status === 'uploaded' ? (
                        <Badge className="bg-green-500/20 text-green-400 border-green-500/50">
                          Uploaded
                        </Badge>
                      ) : (
                        <Badge className="bg-red-500/20 text-red-400 border-red-500/50">
                          Missing
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-slate-400 text-sm">No residual reports uploaded for this period.</p>
          )}
        </div>

        <div>
          <h3 className="text-lg font-semibold text-white mb-3">Expense Files</h3>
          {expenseStatuses.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow className="border-slate-700">
                  <TableHead className="text-slate-300">Source</TableHead>
                  <TableHead className="text-right text-slate-300">Record Count</TableHead>
                  <TableHead className="text-right text-slate-300">Total Expenses</TableHead>
                  <TableHead className="text-right text-slate-300">Matched Count</TableHead>
                  <TableHead className="text-center text-slate-300">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {expenseStatuses.map((expense) => (
                  <TableRow key={expense.expense_source} className="border-slate-700">
                    <TableCell className="text-white">{expense.expense_source}</TableCell>
                    <TableCell className="text-right text-slate-300">
                      {expense.record_count.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right text-slate-300">
                      {formatCurrency(expense.total_expenses)}
                    </TableCell>
                    <TableCell className="text-right text-slate-300">
                      {expense.matched_count.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge className="bg-green-500/20 text-green-400 border-green-500/50">
                        Uploaded
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-slate-400 text-sm">No expense files uploaded for this period.</p>
          )}
        </div>

        {nabStatus && (
          <div>
            <h3 className="text-lg font-semibold text-white mb-3">EPI New Account Bonus (NAB)</h3>
            <Table>
              <TableHeader>
                <TableRow className="border-slate-700">
                  <TableHead className="text-slate-300">Source</TableHead>
                  <TableHead className="text-right text-slate-300">Record Count</TableHead>
                  <TableHead className="text-right text-slate-300">Total Amount</TableHead>
                  <TableHead className="text-center text-slate-300">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow className="border-slate-700">
                  <TableCell className="text-white">EPI NAB</TableCell>
                  <TableCell className="text-right text-slate-300">
                    {nabStatus.record_count.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right text-slate-300">
                    {formatCurrency(nabStatus.total_amount)}
                  </TableCell>
                  <TableCell className="text-center">
                    {nabStatus.status === 'uploaded' ? (
                      <Badge className="bg-green-500/20 text-green-400 border-green-500/50">
                        Uploaded
                      </Badge>
                    ) : (
                      <Badge className="bg-red-500/20 text-red-400 border-red-500/50">
                        Missing
                      </Badge>
                    )}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
