import { useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle2 } from 'lucide-react';
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
  const [uploading, setUploading] = useState(false);
  const [uploadSummary, setUploadSummary] = useState<UploadSummary | null>(null);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
    },
    multiple: false,
    onDrop: handleFileDrop,
  });

  async function handleFileDrop(files: File[]) {
    if (files.length === 0) return;

    if (!selectedVendor) {
      toast.error('Please select an expense vendor first');
      return;
    }

    const file = files[0];
    await processExpenseFile(file);
  }

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

      const reportDate = new Date().toISOString().split('T')[0];

      const expenseRecords = matchedExpenses.map(expense => ({
        agency_id: agencyId,
        merchant_id: expense.merchantId,
        merchant_name: expense.merchantName,
        expense_source: 'Dejavoo',
        expense_amount: expense.expenseAmount,
        report_date: reportDate,
        matched: expense.matched,
      }));

      const { error } = await supabase
        .from('merchant_expenses')
        .insert(expenseRecords);

      if (error) throw error;

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

          {selectedVendor && (
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                isDragActive
                  ? 'border-cyan-400 bg-cyan-400/10'
                  : 'border-slate-600 hover:border-slate-500 bg-slate-700/30'
              }`}
            >
              <input {...getInputProps()} />
              <FileSpreadsheet className="h-12 w-12 mx-auto mb-4 text-slate-400" />
              <p className="text-slate-300 mb-2">
                {isDragActive
                  ? 'Drop the file here'
                  : 'Drag and drop an Excel file, or click to select'}
              </p>
              <p className="text-sm text-slate-500">Only .xlsx files are supported</p>
            </div>
          )}

          {uploading && (
            <div className="flex items-center justify-center p-4">
              <div className="text-slate-300">Processing expense file...</div>
            </div>
          )}
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
