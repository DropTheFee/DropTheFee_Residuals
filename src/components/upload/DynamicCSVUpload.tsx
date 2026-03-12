import { useState, useEffect } from 'react';
import { Upload, FileText, CircleAlert as AlertCircle, CircleCheck as CheckCircle2, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { parseFileWithMapping, extractFileHeaders } from '@/utils/dynamicParser';
import { parsePaysafeFile } from '@/utils/paysafeParser';
import { parseLink2PayFile } from '@/utils/link2payParser';
import { parsePayarcFile } from '@/utils/payarcParser';
import { ColumnMapper } from './ColumnMapper';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

interface ProcessorMapping {
  id: string;
  processor_name: string;
  mid_column: string | null;
  merchant_name_column: string | null;
  volume_column: string | null;
  residual_column: string | null;
  status_column: string | null;
  rep_payout_column: string | null;
  dba_column: string | null;
  header_row_number: number;
}

interface DynamicCSVUploadProps {
  selectedMonth: number;
  selectedYear: number;
  onPeriodChange: (month: number, year: number) => void;
}

export default function DynamicCSVUpload({
  selectedMonth,
  selectedYear,
  onPeriodChange
}: DynamicCSVUploadProps) {
  const navigate = useNavigate();
  const [processors, setProcessors] = useState<ProcessorMapping[]>([]);
  const [selectedProcessor, setSelectedProcessor] = useState<string>('');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [agencyId, setAgencyId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  const [showMapper, setShowMapper] = useState(false);
  const [fileHeaders, setFileHeaders] = useState<string[]>([]);
  const [headerRowNumber, setHeaderRowNumber] = useState(0);
  const [agentFilter, setAgentFilter] = useState<string>('');

  useEffect(() => {
    fetchUserData();
  }, []);

  useEffect(() => {
    if (agencyId) {
      fetchProcessors();
    }
  }, [agencyId]);

  const fetchUserData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: userData } = await supabase
        .from('users')
        .select('id, agency_id')
        .eq('id', user.id)
        .maybeSingle();

      if (userData) {
        setAgencyId(userData.agency_id);
        setUserId(userData.id);
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    }
  };

  const fetchProcessors = async () => {
    try {
      const { data, error } = await supabase
        .from('processor_mappings')
        .select('*')
        .eq('agency_id', agencyId)
        .order('processor_name');

      if (error) throw error;

      const builtInProcessors = [
        { processor_name: 'Paysafe', isBuiltIn: true },
        { processor_name: 'PCS', isBuiltIn: true },
        { processor_name: 'Link2Pay', isBuiltIn: true },
        { processor_name: 'Payarc', isBuiltIn: true },
      ];

      const allProcessors = [
        ...builtInProcessors.map(p => ({
          id: p.processor_name,
          processor_name: p.processor_name,
          mid_column: 'built-in',
          merchant_name_column: null,
          volume_column: null,
          residual_column: null,
          status_column: null,
          rep_payout_column: null,
          dba_column: null,
          header_row_number: 2,
        })),
        ...(data || [])
      ];

      setProcessors(allProcessors);
    } catch (error) {
      console.error('Error fetching processors:', error);
      toast.error('Failed to load processors');
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    const isCSV = selectedFile.name.endsWith('.csv');
    const isExcel = selectedFile.name.endsWith('.xlsx') || selectedFile.name.endsWith('.xls');

    if (!isCSV && !isExcel) {
      toast.error('Please select a valid CSV or Excel file');
      return;
    }

    setFile(selectedFile);
  };

  const handleProcessorChange = async (processorName: string) => {
    setSelectedProcessor(processorName);

    if (file && processorName) {
      const processor = processors.find(p => p.processor_name === processorName);

      if (!processor || !processor.mid_column) {
        try {
          const headers = await extractFileHeaders(file, headerRowNumber);
          setFileHeaders(headers);
          setShowMapper(true);
        } catch (error) {
          console.error('Error extracting headers:', error);
          toast.error('Failed to read file headers');
        }
      }
    }
  };

  const handleMappingComplete = async (mapping: any) => {
    if (!agencyId || !userId) return;

    try {
      const processor = processors.find(p => p.processor_name === selectedProcessor);

      if (processor) {
        await supabase
          .from('processor_mappings')
          .update({
            ...mapping,
            header_row_number: headerRowNumber,
            updated_at: new Date().toISOString(),
          })
          .eq('id', processor.id);
      } else {
        await supabase
          .from('processor_mappings')
          .insert({
            agency_id: agencyId,
            processor_name: selectedProcessor,
            created_by: userId,
            header_row_number: headerRowNumber,
            ...mapping,
          });
      }

      toast.success('Column mapping saved');
      setShowMapper(false);
      await fetchProcessors();
      await handleUpload();
    } catch (error) {
      console.error('Error saving mapping:', error);
      toast.error('Failed to save column mapping');
    }
  };

  const handleUpload = async () => {
    if (!file || !selectedProcessor || !agencyId || !userId) {
      toast.error('Please select a processor and file');
      return;
    }

    const processor = processors.find(p => p.processor_name === selectedProcessor);

    if (!processor || (!processor.mid_column && processor.mid_column !== 'built-in')) {
      if (!showMapper) {
        try {
          const headers = await extractFileHeaders(file, headerRowNumber);
          setFileHeaders(headers);
          setShowMapper(true);
        } catch (error) {
          console.error('Error extracting headers:', error);
          toast.error('Failed to read file headers');
        }
      }
      return;
    }

    setUploading(true);
    setProgress(0);

    try {
      setProgress(20);

      let result;

      if (selectedProcessor === 'Paysafe' || selectedProcessor === 'PCS') {
        if (!file.name.endsWith('.xlsx')) {
          toast.error(`${selectedProcessor} requires an .xlsx file`);
          setUploading(false);
          return;
        }

        result = await parsePaysafeFile(
          file,
          selectedProcessor as 'Paysafe' | 'PCS',
          agentFilter || undefined
        );
      } else if (selectedProcessor === 'Link2Pay') {
        if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
          toast.error('Link2Pay requires an Excel file (.xlsx or .xls)');
          setUploading(false);
          return;
        }

        result = await parseLink2PayFile(file);
      } else if (selectedProcessor === 'Payarc') {
        if (!file.name.endsWith('.csv')) {
          toast.error('Payarc requires a CSV file');
          setUploading(false);
          return;
        }

        result = await parsePayarcFile(file);
      } else {
        result = await parseFileWithMapping(file, selectedProcessor, undefined, {
          mid_column: processor.mid_column,
          merchant_name_column: processor.merchant_name_column,
          volume_column: processor.volume_column,
          residual_column: processor.residual_column,
          status_column: processor.status_column,
          rep_payout_column: processor.rep_payout_column,
          dba_column: processor.dba_column,
          header_row_number: processor.header_row_number,
        });
      }

      setProgress(40);

      if (!result || result.data.length === 0) {
        throw new Error('No valid data found in file');
      }

      setProgress(60);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const reportInsert = {
        id: crypto.randomUUID(),
        user_id: user.id,
        processor: selectedProcessor,
        report_type: selectedProcessor,
        upload_date: new Date().toISOString(),
        data: result.data,
        stats: {},
        created_at: new Date().toISOString(),
        agency_id: agencyId,
      };

      console.log('Report insert object:', reportInsert);

      const { error: reportError } = await supabase
        .from('reports')
        .insert(reportInsert);

      if (reportError) throw reportError;

      setProgress(70);

      const month = String(selectedMonth).padStart(2, '0');
      const periodMonth = `${selectedYear}-${month}-01`;

      for (const merchant of result.data) {
        const merchantPayload = {
          id: crypto.randomUUID(),
          agency_id: agencyId,
          merchant_name: merchant.merchantName,
          merchant_id: merchant.merchantId?.toString().trim(),
          processor: selectedProcessor,
          dba_name: merchant.dbaName || merchant.merchantName,
          status: merchant.status || 'active',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        console.log('Merchant upsert payload:', merchantPayload);

        await supabase
          .from('merchants')
          .upsert(merchantPayload, {
            onConflict: 'agency_id,merchant_id,processor',
          });
      }

      setProgress(80);

      for (const merchant of result.data) {
        const { data: merchantRecord } = await supabase
          .from('merchants')
          .select('id')
          .eq('agency_id', agencyId)
          .eq('merchant_id', merchant.merchantId?.toString().trim())
          .eq('processor', selectedProcessor)
          .maybeSingle();

        if (merchantRecord) {
          const residualValue = parseFloat(merchant.residual as string) || 0;
          const historyPayload = {
            merchant_id: merchantRecord.id,
            agency_id: agencyId,
            report_date: periodMonth,
            monthly_volume: parseFloat(merchant.volume as string) || 0,
            monthly_income: residualValue,
            rep_payout: merchant.repPayout ? parseFloat(merchant.repPayout as string) || 0 : 0,
          };

          console.log('Merchant history upsert payload:', historyPayload);

          await supabase
            .from('merchant_history')
            .upsert(historyPayload, {
              onConflict: 'merchant_id,report_date',
            });
        }
      }

      setProgress(100);

      const totalVolume = result.data.reduce((sum, m) => sum + m.volume, 0);
      const totalResidual = result.data.reduce((sum, m) => sum + m.residual, 0);

      toast.success(
        `Successfully uploaded ${result.data.length} merchants\n` +
        `Total Volume: $${totalVolume.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n` +
        `Total Residual: $${totalResidual.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      );

      setFile(null);
      setSelectedProcessor('');
      setAgentFilter('');

      const input = document.getElementById('file-input') as HTMLInputElement;
      if (input) input.value = '';
    } catch (error) {
      console.error('Error uploading file:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to upload file');
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  if (showMapper && fileHeaders.length > 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">Configure Column Mapping</h1>
            <p className="text-slate-400 mt-1">Map columns from your file to the required fields</p>
          </div>
        </div>

        <div className="mb-4">
          <Label htmlFor="header-row" className="text-slate-300">Header Row Number (0 = first row)</Label>
          <Input
            id="header-row"
            type="number"
            min="0"
            value={headerRowNumber}
            onChange={(e) => setHeaderRowNumber(parseInt(e.target.value) || 0)}
            className="bg-slate-700 border-slate-600 text-white max-w-xs"
          />
        </div>

        <ColumnMapper
          headers={fileHeaders}
          processorName={selectedProcessor}
          onMappingComplete={handleMappingComplete}
          onCancel={() => {
            setShowMapper(false);
            setFileHeaders([]);
          }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Upload Reports</h1>
          <p className="text-slate-400 mt-1">Upload CSV or Excel files from your processor</p>
        </div>
        <Button
          variant="outline"
          onClick={() => navigate('/processors')}
          className="border-slate-600 text-slate-300 hover:bg-slate-700"
        >
          <Settings className="h-4 w-4 mr-2" />
          Manage Processors
        </Button>
      </div>

      {processors.length === 0 && (
        <Alert className="bg-amber-500/10 border-amber-500/50">
          <AlertCircle className="h-4 w-4 text-amber-500" />
          <AlertDescription className="text-amber-200">
            No processors configured. Please go to{' '}
            <button
              onClick={() => navigate('/processors')}
              className="underline font-medium"
            >
              Processor Management
            </button>
            {' '}to add processors.
          </AlertDescription>
        </Alert>
      )}

      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white">Select Processor & File</CardTitle>
          <CardDescription className="text-slate-400">
            Choose a processor and upload your CSV or Excel report file
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <Label htmlFor="report-period" className="text-slate-300 mb-2 block">
              Report Period
            </Label>
            <div className="flex gap-4">
              <div className="flex-1">
                <Select value={String(selectedMonth)} onValueChange={(val) => onPeriodChange(parseInt(val), selectedYear)}>
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
                <Select value={String(selectedYear)} onValueChange={(val) => onPeriodChange(selectedMonth, parseInt(val))}>
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

          <div>
            <Label htmlFor="processor" className="text-slate-300 mb-2 block">
              Processor
            </Label>
            <Select value={selectedProcessor} onValueChange={handleProcessorChange}>
              <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                <SelectValue placeholder="Select a processor" />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700">
                {processors.map((processor) => (
                  <SelectItem
                    key={processor.id}
                    value={processor.processor_name}
                    className="text-white"
                  >
                    {processor.processor_name}
                    {processor.mid_column === 'built-in' && ' (XLSX only)'}
                    {!processor.mid_column && processor.mid_column !== 'built-in' && ' (Not configured)'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {(selectedProcessor === 'Paysafe' || selectedProcessor === 'PCS') && (
            <div>
              <Label htmlFor="agent-filter" className="text-slate-300 mb-2 block">
                Oracle Agent Number (Optional - leave blank for all)
              </Label>
              <Input
                id="agent-filter"
                type="text"
                value={agentFilter}
                onChange={(e) => setAgentFilter(e.target.value)}
                placeholder="Enter agent number to filter"
                className="bg-slate-700 border-slate-600 text-white"
              />
            </div>
          )}

          <div>
            <Label htmlFor="file-input" className="text-slate-300 mb-2 block">
              Upload File (CSV or Excel)
            </Label>
            <div className="flex items-center gap-4">
              <input
                id="file-input"
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={handleFileChange}
                className="hidden"
              />
              <Button
                variant="outline"
                onClick={() => document.getElementById('file-input')?.click()}
                className="border-slate-600 text-slate-300 hover:bg-slate-700"
              >
                <Upload className="h-4 w-4 mr-2" />
                Choose File
              </Button>
              {file && (
                <div className="flex items-center gap-2 text-sm text-slate-300">
                  <FileText className="h-4 w-4" />
                  <span>{file.name}</span>
                </div>
              )}
            </div>
          </div>

          {uploading && (
            <div className="space-y-2">
              <Progress value={progress} className="h-2" />
              <p className="text-sm text-slate-400 text-center">{progress}% complete</p>
            </div>
          )}

          <Button
            onClick={handleUpload}
            disabled={!file || !selectedProcessor || uploading}
            className="w-full bg-cyan-500 hover:bg-cyan-600 disabled:opacity-50"
          >
            {uploading ? 'Uploading...' : 'Upload & Process'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
