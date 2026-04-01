import { useState, useEffect } from 'react';
import PendingMappings from '@/components/upload/PendingMappings';
import DynamicCSVUpload from '@/components/upload/DynamicCSVUpload';
import ExpenseUpload from '@/components/upload/ExpenseUpload';
import UploadStatus from '@/components/upload/UploadStatus';
import DejavooSteamTerminals from '@/components/upload/DejavooSteamTerminals';
import ManualExpenses from '@/components/upload/ManualExpenses';
import { NABUpload } from '@/components/upload/NABUpload';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronRight, MonitorSmartphone, DollarSign, Gift, Download } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

interface CommissionPeriod {
  period_month: string;
  status: string;
}

export default function Upload() {
  const [instructionsOpen, setInstructionsOpen] = useState(false);
  const [steamTerminalsOpen, setSteamTerminalsOpen] = useState(false);
  const [manualExpensesOpen, setManualExpensesOpen] = useState(false);
  const [nabOpen, setNabOpen] = useState(false);
  const [agencyId, setAgencyId] = useState<string>('');
  const [periods, setPeriods] = useState<CommissionPeriod[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<string>('');
  const [selectedMonth, setSelectedMonth] = useState<number>(0);
  const [selectedYear, setSelectedYear] = useState<number>(0);
  const [isFetchingVivid, setIsFetchingVivid] = useState(false);

  useEffect(() => {
    loadAgencyAndPeriods();
  }, []);

  useEffect(() => {
    if (selectedPeriod) {
      const date = new Date(selectedPeriod + 'T12:00:00');
      setSelectedMonth(date.getMonth() + 1);
      setSelectedYear(date.getFullYear());
    }
  }, [selectedPeriod]);

  const loadAgencyAndPeriods = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profile } = await supabase
      .from('users')
      .select('agency_id')
      .eq('id', user.id)
      .maybeSingle();

    if (!profile?.agency_id) return;

    setAgencyId(profile.agency_id);

    const { data: periods, error: periodsError } = await supabase
      .from('commission_periods')
      .select('*')
      .eq('agency_id', profile.agency_id)
      .order('period_month', { ascending: false });

    if (periodsError) {
      console.error('Error loading periods:', periodsError);
      return;
    }

    console.log('Upload page - Raw periods from DB:', periods);
    console.log('Upload page - Agency ID:', profile.agency_id);
    console.log('Upload page - Periods count:', periods?.length);

    setPeriods(periods || []);
    if (periods && periods.length > 0 && !selectedPeriod) {
      setSelectedPeriod(periods[0].period_month);
    }

    console.log('Upload page - State set to periods:', periods);
  };

  const formatPeriodDisplay = (periodMonth: string) => {
    const date = new Date(periodMonth + 'T12:00:00');
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  const fetchFromVividAPI = async () => {
    if (!agencyId || !selectedPeriod) {
      toast.error('Agency ID or period not selected');
      return;
    }

    setIsFetchingVivid(true);

    try {
      const { data: settingData, error: settingError } = await supabase
        .from('agency_settings')
        .select('value')
        .eq('agency_id', agencyId)
        .eq('key', 'vivid_api_token')
        .maybeSingle();

      if (settingError) throw settingError;
      if (!settingData?.value) {
        toast.error('Vivid API token not configured for this agency');
        return;
      }

      const token = settingData.value;
      const periodPrefix = selectedPeriod.substring(0, 7);

      let allResults: any[] = [];
      let currentPage = 1;
      let totalPages = 1;

      while (currentPage <= totalPages) {
        const response = await fetch('/api/vivid-residuals', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ token, page: currentPage }),
        });

        if (!response.ok) {
          throw new Error(`API request failed: ${response.statusText}`);
        }

        const data = await response.json();

        if (data._meta) {
          totalPages = data._meta.pageCount;
        }

        if (data.items && Array.isArray(data.items)) {
  const filteredResults = data.items.filter((item: any) =>
    item.date && item.date.startsWith(periodPrefix)
  );
  allResults = [...allResults, ...filteredResults];
}

        currentPage++;
      }

      let matchedCount = 0;
      let totalCount = allResults.length;

      for (const result of allResults) {
        const merchantMID = String(result.mid || '');
        if (!merchantMID) continue;

        const { data: merchantData } = await supabase
          .from('merchants')
          .select('id')
          .eq('merchant_id', merchantMID)
          .maybeSingle();

        if (merchantData) {
          const { error: upsertError } = await supabase
            .from('merchant_history')
            .upsert({
              merchant_id: merchantData.id,
              report_date: result.date,
              monthly_volume: result.merchant?.sales?.amount || 0,
              monthly_income: result.revenue || 0,
              agency_id: agencyId,
            }, {
              onConflict: 'merchant_id,report_date',
            });

          if (!upsertError) {
            matchedCount++;
          }
        }
      }

      toast.success(`Imported ${matchedCount} of ${totalCount} merchants matched`);
    } catch (error: any) {
      console.error('Error fetching from Vivid API:', error);
      toast.error(`Failed to fetch from Vivid API: ${error.message}`);
    } finally {
      setIsFetchingVivid(false);
    }
  };

  if (!selectedPeriod || selectedMonth === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-400">
        Loading periods...
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white">Select Report Period</CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-full bg-slate-900 border-slate-700 text-white">
              <SelectValue placeholder="Select a period" />
            </SelectTrigger>
            <SelectContent className="bg-slate-900 border-slate-700">
              {console.log('Upload page - Rendering dropdown with periods:', periods)}
              {periods.map((period) => {
                console.log('Upload page - Rendering period option:', period.period_month, period.status);
                return (
                  <SelectItem
                    key={period.period_month}
                    value={period.period_month}
                    className="text-white hover:bg-slate-800"
                  >
                    {formatPeriodDisplay(period.period_month)}
                    {period.status === 'active' && (
                      <span className="ml-2 text-green-400 text-sm">(Active)</span>
                    )}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <PendingMappings />

      <UploadStatus selectedMonth={selectedMonth} selectedYear={selectedYear} />

      <DynamicCSVUpload
        selectedMonth={selectedMonth}
        selectedYear={selectedYear}
        onPeriodChange={(month, year) => {
          setSelectedMonth(month);
          setSelectedYear(year);
        }}
      />

      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white">Fetch from Vivid API</CardTitle>
        </CardHeader>
        <CardContent>
          <Button
            onClick={fetchFromVividAPI}
            disabled={isFetchingVivid}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Download className="mr-2 h-4 w-4" />
            {isFetchingVivid ? 'Fetching...' : 'Fetch from Vivid API'}
          </Button>
          {isFetchingVivid && (
            <p className="text-slate-400 text-sm mt-2 text-center">
              Fetching and importing data, please wait...
            </p>
          )}
        </CardContent>
      </Card>

      <div className="relative py-8">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t-4 border-slate-600"></div>
        </div>
        <div className="relative flex justify-center">
          <span className="bg-slate-900 px-6 text-lg font-bold text-slate-300 tracking-wide">
            EXPENSE UPLOAD
          </span>
        </div>
      </div>

      <ExpenseUpload
        selectedMonth={selectedMonth}
        selectedYear={selectedYear}
        onPeriodChange={(month, year) => {
          setSelectedMonth(month);
          setSelectedYear(year);
        }}
      />

      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader
          className="cursor-pointer hover:bg-slate-800/30 transition-colors"
          onClick={() => setNabOpen(!nabOpen)}
        >
          <CardTitle className="text-white flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Gift className="h-5 w-5" />
              EPI New Account Bonus (NAB)
            </span>
            {nabOpen ? (
              <ChevronDown className="h-5 w-5" />
            ) : (
              <ChevronRight className="h-5 w-5" />
            )}
          </CardTitle>
        </CardHeader>
        {nabOpen && (
          <CardContent className="pt-0">
            <NABUpload />
          </CardContent>
        )}
      </Card>

      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader
          className="cursor-pointer hover:bg-slate-800/30 transition-colors"
          onClick={() => setSteamTerminalsOpen(!steamTerminalsOpen)}
        >
          <CardTitle className="text-white flex items-center justify-between">
            <span className="flex items-center gap-2">
              <MonitorSmartphone className="h-5 w-5" />
              Dejavoo Steam Terminals
            </span>
            {steamTerminalsOpen ? (
              <ChevronDown className="h-5 w-5" />
            ) : (
              <ChevronRight className="h-5 w-5" />
            )}
          </CardTitle>
        </CardHeader>
        {steamTerminalsOpen && agencyId && (
          <CardContent className="pt-0">
            <DejavooSteamTerminals agencyId={agencyId} selectedPeriod={selectedPeriod} />
          </CardContent>
        )}
      </Card>

      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader
          className="cursor-pointer hover:bg-slate-800/30 transition-colors"
          onClick={() => setManualExpensesOpen(!manualExpensesOpen)}
        >
          <CardTitle className="text-white flex items-center justify-between">
            <span className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Manual Rep Expenses
            </span>
            {manualExpensesOpen ? (
              <ChevronDown className="h-5 w-5" />
            ) : (
              <ChevronRight className="h-5 w-5" />
            )}
          </CardTitle>
        </CardHeader>
        {manualExpensesOpen && (
          <CardContent className="pt-0">
            <ManualExpenses selectedPeriod={selectedPeriod} />
          </CardContent>
        )}
      </Card>

      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader
          className="cursor-pointer hover:bg-slate-800/30 transition-colors"
          onClick={() => setInstructionsOpen(!instructionsOpen)}
        >
          <CardTitle className="text-white flex items-center justify-between">
            <span>Instructions</span>
            {instructionsOpen ? (
              <ChevronDown className="h-5 w-5" />
            ) : (
              <ChevronRight className="h-5 w-5" />
            )}
          </CardTitle>
        </CardHeader>
        {instructionsOpen && (
          <CardContent className="text-slate-300 space-y-2 pt-0">
            <div className="space-y-4">
              <div>
                <p className="font-semibold text-white mb-2">Residual Upload:</p>
                <p>1. Select the report period (month and year)</p>
                <p>2. Select the processor from the dropdown</p>
                <p>3. For Paysafe/PCS: optionally enter an Oracle Agent Number to filter</p>
                <p>4. Click "Choose File" to select your file</p>
                <p>5. If using a custom processor for the first time, you'll be asked to map columns</p>
                <p>6. Click "Upload & Process" to import the data</p>
                <p className="text-slate-400 text-sm mt-2">
                  Supported formats: CSV (.csv), Excel (.xlsx, .xls)
                </p>
                <p className="text-slate-400 text-sm">
                  Note: Paysafe and PCS require .xlsx files, Link2Pay requires .xlsx or .xls files, Payarc requires .csv files
                </p>
              </div>
              <div>
                <p className="font-semibold text-white mb-2">Expense Upload:</p>
                <p>1. Select the report period (month and year)</p>
                <p>2. Select the expense vendor (currently Dejavoo)</p>
                <p>3. Click "Choose File" to select your .xlsx file</p>
                <p>4. Click "Upload & Process" to import expense data</p>
                <p className="text-slate-400 text-sm mt-2">
                  Expenses will be matched to merchants automatically
                </p>
              </div>
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
}