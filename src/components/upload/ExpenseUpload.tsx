import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Upload, FileSpreadsheet, CircleAlert as AlertCircle, CircleCheck as CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { parseDejavooFile, matchMerchantsToExpenses, DejavooExpenseRecord } from '@/utils/dejavooParser';
import { parseAuthNetTxt, AuthNetExpense } from '@/utils/authnetParser';
import UnmatchedMerchantMapping from './UnmatchedMerchantMapping';

interface UploadSummary {
  totalRecords: number;
  totalAmount: number;
  matchedCount: number;
  unmatchedCount: number;
  unmatchedNames: string[];
  unmatchedExpenses: DejavooExpenseRecord[];
}

interface Merchant {
  id: string;
  merchant_name: string;
  processor: string | null;
}

export default function ExpenseUpload() {
  const [selectedVendor, setSelectedVendor] = useState<string>('');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadSummary, setUploadSummary] = useState<UploadSummary | null>(null);
  const [currentAgencyId, setCurrentAgencyId] = useState<string>('');
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [selectedMerchantId, setSelectedMerchantId] = useState<string>('');

  const hasUnmatchedMerchants = uploadSummary && uploadSummary.unmatchedCount > 0;

  useEffect(() => {
    checkForPendingMappings();
    loadMerchants();
  }, []);

  async function loadMerchants() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: userData } = await supabase
        .from('users')
        .select('agency_id')
        .eq('id', user.id)
        .maybeSingle();

      if (!userData?.agency_id) return;

      const { data } = await supabase
        .from('merchants')
        .select('id, merchant_name, processor')
        .eq('agency_id', userData.agency_id)
        .order('merchant_name', { ascending: true });

      if (data) {
        setMerchants(data);
      }
    } catch (error) {
      console.error('Error loading merchants:', error);
    }
  }

  async function checkForPendingMappings() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: userData } = await supabase
        .from('users')
        .select('agency_id')
        .eq('id', user.id)
        .maybeSingle();

      if (!userData?.agency_id) return;

      const agencyId = userData.agency_id;
      setCurrentAgencyId(agencyId);

      const { data } = await supabase
        .from('merchant_expenses')
        .select('*')
        .eq('agency_id', agencyId)
        .eq('matched', false)
        .eq('skipped', false)
        .order('expense_amount', { ascending: false });

      if (data && data.length > 0) {
        const { data: allExpenses } = await supabase
          .from('merchant_expenses')
          .select('expense_amount, matched, skipped')
          .eq('agency_id', agencyId);

        const totalRecords = allExpenses?.length || 0;
        const totalAmount = allExpenses?.reduce((sum, e) => sum + Number(e.expense_amount), 0) || 0;
        const matchedCount = allExpenses?.filter(e => e.matched).length || 0;

        const uniqueUnmatched = Array.from(
          new Map(
            data.map(record => [
              record.merchant_name,
              {
                merchantName: record.merchant_name,
                expenseAmount: Number(record.expense_amount),
              }
            ])
          ).values()
        );

        setUploadSummary({
          totalRecords,
          totalAmount,
          matchedCount,
          unmatchedCount: uniqueUnmatched.length,
          unmatchedNames: uniqueUnmatched.map(e => e.merchantName),
          unmatchedExpenses: uniqueUnmatched,
        });
      } else {
        setUploadSummary(null);
      }
    } catch (error) {
      console.error('Error checking for pending mappings:', error);
    }
  }

  async function loadUnmatchedExpenses() {
    await checkForPendingMappings();
  }

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

    if (selectedVendor === 'authnet') {
      if (!selectedFile.name.endsWith('.txt')) {
        toast.error('Please select a valid .txt file for Auth.net');
        return;
      }
    } else {
      if (!selectedFile.name.endsWith('.xlsx')) {
        toast.error('Please select a valid .xlsx file');
        return;
      }
    }

    setFile(selectedFile);
  };

  const handleUpload = async () => {
    if (!file || !selectedVendor) {
      toast.error('Please select a vendor and file');
      return;
    }

    if (selectedVendor === 'authnet' && !selectedMerchantId) {
      toast.error('Please select a merchant for this Auth.net file');
      return;
    }

    await processExpenseFile(file);
  };

  async function processExpenseFile(file: File) {
    setUploading(true);

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
      setCurrentAgencyId(agencyId);

      if (selectedVendor === 'dejavoo') {
        await processDejavooFile(file, agencyId);
      } else if (selectedVendor === 'authnet') {
        await processAuthNetFile(file, agencyId);
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

      const { data: savedMappings } = await supabase
        .from('expense_name_mappings')
        .select('expense_name, merchant_id')
        .eq('agency_id', agencyId)
        .eq('expense_source', 'Dejavoo');

      const matchedExpenses = await matchMerchantsToExpenses(
        expenses,
        merchants || [],
        savedMappings || []
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

      const initialUnmatchedCount = matchedExpenses.filter(e => !e.matched).length;

      if (initialUnmatchedCount > 0) {
        toast.warning(`Upload complete. ${initialUnmatchedCount} merchants need mapping.`);
      } else {
        toast.success(`Successfully uploaded ${expenses.length} expense records`);
      }

      setFile(null);
      const input = document.getElementById('expense-file-input') as HTMLInputElement;
      if (input) input.value = '';

      await loadUnmatchedExpenses();
    } catch (error) {
      console.error('Error processing Dejavoo file:', error);
      throw error;
    }
  }

  async function processAuthNetFile(file: File, agencyId: string) {
    try {
      const fileContent = await file.text();
      const expenses = parseAuthNetTxt(fileContent);

      if (expenses.length === 0) {
        toast.error('No Transfer expenses found in Auth.net file');
        return;
      }

      const selectedMerchant = merchants.find(m => m.id === selectedMerchantId);
      if (!selectedMerchant) {
        toast.error('Selected merchant not found');
        return;
      }

      const expenseRecords = expenses.map(expense => ({
        agency_id: agencyId,
        merchant_id: selectedMerchantId,
        merchant_name: selectedMerchant.merchant_name,
        expense_source: 'Auth.net',
        expense_amount: expense.expenseAmount,
        report_date: expense.reportDate,
        matched: true,
      }));

      const { error } = await supabase
        .from('merchant_expenses')
        .insert(expenseRecords);

      if (error) {
        console.error('Insert error:', error);
        throw error;
      }

      toast.success(`Successfully uploaded ${expenses.length} Auth.net expense records for ${selectedMerchant.merchant_name}`);

      setFile(null);
      setSelectedMerchantId('');
      const input = document.getElementById('expense-file-input') as HTMLInputElement;
      if (input) input.value = '';

      await loadUnmatchedExpenses();
    } catch (error) {
      console.error('Error processing Auth.net file:', error);
      throw error;
    }
  }

  async function handleMappingComplete() {
    await loadUnmatchedExpenses();
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
                <SelectItem value="authnet" className="text-white">
                  Auth.net
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {selectedVendor === 'authnet' && (
            <div className="space-y-2">
              <Label htmlFor="merchant-select" className="text-slate-300">
                Select Merchant
              </Label>
              <Select value={selectedMerchantId} onValueChange={setSelectedMerchantId}>
                <SelectTrigger
                  id="merchant-select"
                  className="bg-slate-700 border-slate-600 text-white"
                >
                  <SelectValue placeholder="Select merchant for this file" />
                </SelectTrigger>
                <SelectContent className="bg-slate-700 border-slate-600">
                  {merchants.map(merchant => (
                    <SelectItem key={merchant.id} value={merchant.id} className="text-white">
                      {merchant.merchant_name}{merchant.processor ? ` — ${merchant.processor}` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-slate-400">
                Auth.net files contain expenses for one merchant per file
              </p>
            </div>
          )}

          <div>
            <Label htmlFor="expense-file-input" className="text-slate-300 mb-2 block">
              Upload File ({selectedVendor === 'authnet' ? '.txt' : '.xlsx'})
            </Label>
            <div className="flex items-center gap-4">
              <input
                id="expense-file-input"
                type="file"
                accept={selectedVendor === 'authnet' ? '.txt' : '.xlsx'}
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
            disabled={!file || !selectedVendor || uploading || hasUnmatchedMerchants}
            className="w-full bg-cyan-500 hover:bg-cyan-600 disabled:opacity-50"
          >
            {uploading ? 'Uploading...' : 'Upload & Process'}
          </Button>
          {hasUnmatchedMerchants && (
            <div className="text-sm text-yellow-400 text-center">
              Complete merchant mappings below before uploading another file
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
          </CardContent>
        </Card>
      )}

      {uploadSummary && uploadSummary.unmatchedCount > 0 && (
        <UnmatchedMerchantMapping
          unmatchedExpenses={uploadSummary.unmatchedExpenses}
          agencyId={currentAgencyId}
          reportDate=""
          onMappingComplete={handleMappingComplete}
        />
      )}
    </div>
  );
}
