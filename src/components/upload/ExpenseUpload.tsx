import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Upload, FileSpreadsheet, CircleAlert as AlertCircle, CircleCheck as CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { parseDejavooFile, matchMerchantsToExpenses } from '@/utils/dejavooParser';

interface UploadSummary {
  totalRecords: number;
  totalAmount: number;
  matchedCount: number;
  unmatchedCount: number;
  unmatchedNames: string[];
}

export default function ExpenseUpload() {
  const [selectedVendor, setSelectedVendor] = useState<string>('');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadSummary, setUploadSummary] = useState<UploadSummary | null>(null);

  const getPreviousMonth = () => {
    const now = new Date();
    const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    return {
      month: prevMonth.getMonth() + 1,
      year: prevMonth.getFullYear(),
    };
  };

  const { month: defaultMonth, year: defaultYear } = getPreviousMonth();
  const [selectedMonth, setSelectedMonth] = useState<number>(defaultMonth);
  const [selectedYear, setSelectedYear] = useState<number>(defaultYear);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (!selectedFile.name.endsWith('.xlsx')) {
      toast.error('Please select a valid .xlsx file');
      return;
    }

    setFile(selectedFile);
  };

  const handleUpload = async () => {
    if (!file || !selectedVendor) {
      toast.error('Please select a vendor and file');
      return;
    }

    await processExpenseFile(file);
  };

  async function processExpenseFile(file: File) {
    setUploading(true);
    setUploadSummary(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('You must be logged in to upload expenses');
        return;
      }

      const { data: userData } = await supabase
        .from('users')
        .select('agency_id')
        .eq('id', user.id)
        .maybeSingle();

      if (!userData?.agency_id) {
        toast.error('No agency found for user');
        return;
      }

      const agencyId = userData.agency_id;

      if (selectedVendor === 'dejavoo') {
        await processDejavooFile(file, agencyId);
      } else {
        toast.error('Unsupported vendor');
      }
    } catch (error) {
      console.error('Error processing expense file:', error);
      toast.error('Failed to process expense file');
    } finally {
      setUploading(false);
    }
  }

  async function processDejavooFile(file: File, agencyId: string) {
    try {
      const expenses = await parseDejavooFile(file);

      if (expenses.length === 0) {
        toast.error('No expense records found in file');
        return;
      }

      const { data: merchants } = await supabase
        .from('merchants')
        .select('id, merchant_name')
        .eq('agency_id', agencyId);

      const matchedExpenses = await matchMerchantsToExpenses(
        expenses,
        merchants || []
      );

      const month = String(selectedMonth).padStart(2, '0');
      const reportDate = `${selectedYear}-${month}-01`;

      const expenseRecords = matchedExpenses.map(expense => ({
        agency_id: agencyId,
        merchant_id: expense.merchantId || null,
        merchant_name: expense.merchantName,
        expense_source: 'Dejavoo',
        expense_amount: expense.expenseAmount,
        report_date: reportDate,
        matched: Boolean(expense.matched),
      }));

      const { error } = await supabase
        .from('merchant_expenses')
        .insert(expenseRecords);

      if (error) {
        console.error('Insert error:', error);
        throw error;
      }

      const totalAmount = expenses.reduce((sum, exp) => sum + exp.expenseAmount, 0);
      const matchedCount = matchedExpenses.filter(e => e.matched).length;
      const unmatchedExpenses = matchedExpenses.filter(e => !e.matched);

      setUploadSummary({
        totalRecords: expenses.length,
        totalAmount,
        matchedCount,
        unmatchedCount: unmatchedExpenses.length,
        unmatchedNames: unmatchedExpenses.map(e => e.merchantName),
      });

      toast.success(`Successfully uploaded ${expenses.length} expense records`);

      setFile(null);
      const input = document.getElementById('expense-file-input') as HTMLInputElement;
      if (input) input.value = '';
    } catch (error) {
      console.error('Error processing Dejavoo file:', error);
      throw error;
    }
  }

  return (
    <div className="space-y-6">
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white">Upload Expenses</CardTitle>
          <CardDescription className="text-slate-400">
            Upload merchant expense reports from various vendors
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <Label htmlFor="expense-report-period" className="text-slate-300 mb-2 block">
              Report Period
            </Label>
            <div className="flex gap-4">
              <div className="flex-1">
                <Select value={String(selectedMonth)} onValueChange={(val) => setSelectedMonth(parseInt(val))}>
                  <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                    <SelectValue placeholder="Select month" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    <SelectItem value="1" className="text-white">January</SelectItem>
                    <SelectItem value="2" className="text-white">February</SelectItem>
                    <SelectItem value="3" className="text-white">March</SelectItem>
                    <SelectItem value="4" className="text-white">April</SelectItem>
                    <SelectItem value="5" className="text-white">May</SelectItem>
                    <SelectItem value="6" className="text-white">June</SelectItem>
                    <SelectItem value="7" className="text-white">July</SelectItem>
                    <SelectItem value="8" className="text-white">August</SelectItem>
                    <SelectItem value="9" className="text-white">September</SelectItem>
                    <SelectItem value="10" className="text-white">October</SelectItem>
                    <SelectItem value="11" className="text-white">November</SelectItem>
                    <SelectItem value="12" className="text-white">December</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-1">
                <Select value={String(selectedYear)} onValueChange={(val) => setSelectedYear(parseInt(val))}>
                  <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                    <SelectValue placeholder="Select year" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    <SelectItem value="2023" className="text-white">2023</SelectItem>
                    <SelectItem value="2024" className="text-white">2024</SelectItem>
                    <SelectItem value="2025" className="text-white">2025</SelectItem>
                    <SelectItem value="2026" className="text-white">2026</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="vendor" className="text-slate-300">
              Expense Vendor
            </Label>
            <Select value={selectedVendor} onValueChange={setSelectedVendor}>
              <SelectTrigger
                id="vendor"
                className="bg-slate-700 border-slate-600 text-white"
              >
                <SelectValue placeholder="Select expense vendor" />
              </SelectTrigger>
              <SelectContent className="bg-slate-700 border-slate-600">
                <SelectItem value="dejavoo" className="text-white">
                  Dejavoo
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="expense-file-input" className="text-slate-300 mb-2 block">
              Upload File (.xlsx)
            </Label>
            <div className="flex items-center gap-4">
              <input
                id="expense-file-input"
                type="file"
                accept=".xlsx"
                onChange={handleFileChange}
                className="hidden"
              />
              <Button
                variant="outline"
                onClick={() => document.getElementById('expense-file-input')?.click()}
                className="border-slate-600 text-slate-300 hover:bg-slate-700"
              >
                <Upload className="h-4 w-4 mr-2" />
                Choose File
              </Button>
              {file && (
                <div className="flex items-center gap-2 text-sm text-slate-300">
                  <FileSpreadsheet className="h-4 w-4" />
                  <span>{file.name}</span>
                </div>
              )}
            </div>
          </div>

          {uploading && (
            <div className="flex items-center justify-center p-4">
              <div className="text-slate-300">Processing expense file...</div>
            </div>
          )}

          <Button
            onClick={handleUpload}
            disabled={!file || !selectedVendor || uploading}
            className="w-full bg-cyan-500 hover:bg-cyan-600 disabled:opacity-50"
          >
            {uploading ? 'Uploading...' : 'Upload & Process'}
          </Button>
        </CardContent>
      </Card>

      {uploadSummary && (
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-400" />
              Upload Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-700/50 p-4 rounded-lg">
                <div className="text-sm text-slate-400">Total Records</div>
                <div className="text-2xl font-bold text-white">
                  {uploadSummary.totalRecords}
                </div>
              </div>
              <div className="bg-slate-700/50 p-4 rounded-lg">
                <div className="text-sm text-slate-400">Total Amount</div>
                <div className="text-2xl font-bold text-white">
                  ${uploadSummary.totalAmount.toLocaleString('en-US', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </div>
              </div>
              <div className="bg-slate-700/50 p-4 rounded-lg">
                <div className="text-sm text-slate-400">Matched Merchants</div>
                <div className="text-2xl font-bold text-green-400">
                  {uploadSummary.matchedCount}
                </div>
              </div>
              <div className="bg-slate-700/50 p-4 rounded-lg">
                <div className="text-sm text-slate-400">Unmatched</div>
                <div className="text-2xl font-bold text-yellow-400">
                  {uploadSummary.unmatchedCount}
                </div>
              </div>
            </div>

            {uploadSummary.unmatchedCount > 0 && (
              <div className="bg-yellow-900/20 border border-yellow-700/50 rounded-lg p-4">
                <div className="flex items-start gap-2 mb-2">
                  <AlertCircle className="h-5 w-5 text-yellow-400 mt-0.5" />
                  <div className="text-sm font-medium text-yellow-300">
                    Unmatched Merchants ({uploadSummary.unmatchedCount})
                  </div>
                </div>
                <div className="ml-7 space-y-1">
                  {uploadSummary.unmatchedNames.slice(0, 10).map((name, index) => (
                    <div key={index} className="text-sm text-slate-300">
                      {name}
                    </div>
                  ))}
                  {uploadSummary.unmatchedNames.length > 10 && (
                    <div className="text-sm text-slate-400 italic">
                      And {uploadSummary.unmatchedNames.length - 10} more...
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
