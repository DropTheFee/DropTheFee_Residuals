import { useState } from 'react';
import { Upload, FileText, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { parseCSV } from '@/utils/csvParser';
import { supabase } from '@/lib/supabase';

const PROCESSORS = [
  'EPI',
  'Paysafe',
  'Vivid',
  'Link2Pay',
  'Payarc',
  'CoastalPay',
  'BCMS/Card-X',
  'Paya ACH'
];

interface UploadResult {
  success: boolean;
  message: string;
  details?: {
    processedCount: number;
    errorCount: number;
    errors: string[];
  };
}

export default function CSVUpload() {
  const [selectedProcessor, setSelectedProcessor] = useState<string>('');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<UploadResult | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile && selectedFile.type === 'text/csv') {
      setFile(selectedFile);
      setResult(null);
    } else {
      setResult({ success: false, message: 'Please select a valid CSV file' });
    }
  };

  const handleUpload = async () => {
    if (!file || !selectedProcessor) {
      setResult({ success: false, message: 'Please select both a processor and a file' });
      return;
    }

    setUploading(true);
    setProgress(0);
    setResult(null);

    try {
      // Read file content
      const text = await file.text();
      setProgress(20);

      // Parse CSV
      const parsedData = parseCSV(text, selectedProcessor);
      setProgress(40);

      if (!parsedData || parsedData.length === 0) {
        throw new Error('No valid data found in CSV file');
      }

      // Get current user and agency
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id, agency_id')
        .eq('auth_id', user.id)
        .single();

      if (userError || !userData) throw new Error('User data not found');

      setProgress(60);

      // Process each merchant
      let processedCount = 0;
      let errorCount = 0;
      const errors: string[] = [];

      for (const row of parsedData) {
        try {
          // Upsert merchant
          const { data: merchant, error: merchantError } = await supabase
            .from('merchants')
            .upsert({
              agency_id: userData.agency_id,
              merchant_id: row.merchantId,
              merchant_name: row.merchantName,
              sales_rep_id: userData.id,
              status: 'active'
            }, {
              onConflict: 'merchant_id,agency_id',
              ignoreDuplicates: false
            })
            .select()
            .single();

          if (merchantError) throw merchantError;

          // Insert merchant history
          const { error: historyError } = await supabase
            .from('merchant_history')
            .insert({
              merchant_id: merchant.id,
              report_date: row.reportDate,
              monthly_volume: row.volume,
              monthly_income: row.income,
              rep_payout: row.repPayout || 0,
              agency_income: row.agencyIncome || 0
            });

          if (historyError) throw historyError;

          processedCount++;
        } catch (err) {
          errorCount++;
          errors.push(`Row ${processedCount + errorCount}: ${err instanceof Error ? err.message : 'Unknown error'}`);
        }
      }

      setProgress(100);

      // Save report metadata
      await supabase.from('reports').insert({
        user_id: userData.id,
        agency_id: userData.agency_id,
        processor: selectedProcessor,
        report_type: 'residual',
        data: parsedData,
        stats: {
          totalRecords: parsedData.length,
          processedCount,
          errorCount
        }
      });

      setResult({
        success: true,
        message: `Successfully processed ${processedCount} merchants${errorCount > 0 ? ` with ${errorCount} errors` : ''}`,
        details: { processedCount, errorCount, errors: errors.slice(0, 5) }
      });

    } catch (error) {
      setResult({
        success: false,
        message: error instanceof Error ? error.message : 'Upload failed'
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-6 w-6" />
            Upload Residual Report
          </CardTitle>
          <CardDescription>
            Upload CSV files from your payment processor to track merchant residuals
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Processor Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Select Processor</label>
            <Select value={selectedProcessor} onValueChange={setSelectedProcessor}>
              <SelectTrigger>
                <SelectValue placeholder="Choose your payment processor" />
              </SelectTrigger>
              <SelectContent>
                {PROCESSORS.map((processor) => (
                  <SelectItem key={processor} value={processor}>
                    {processor}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* File Upload */}
          <div className="space-y-2">
            <label className="text-sm font-medium">CSV File</label>
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                className="w-full"
                onClick={() => document.getElementById('csv-file')?.click()}
                disabled={uploading}
              >
                <FileText className="mr-2 h-4 w-4" />
                {file ? file.name : 'Choose CSV File'}
              </Button>
              <input
                id="csv-file"
                type="file"
                accept=".csv"
                className="hidden"
                onChange={handleFileChange}
                disabled={uploading}
              />
            </div>
          </div>

          {/* Progress Bar */}
          {uploading && (
            <div className="space-y-2">
              <Progress value={progress} className="w-full" />
              <p className="text-sm text-muted-foreground text-center">
                Processing... {progress}%
              </p>
            </div>
          )}

          {/* Result Message */}
          {result && (
            <Alert variant={result.success ? 'default' : 'destructive'}>
              {result.success ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                <AlertCircle className="h-4 w-4" />
              )}
              <AlertDescription>
                {result.message}
                {result.details?.errors && result.details.errors.length > 0 && (
                  <ul className="mt-2 text-xs space-y-1">
                    {result.details.errors.map((err: string, idx: number) => (
                      <li key={idx}>{err}</li>
                    ))}
                  </ul>
                )}
              </AlertDescription>
            </Alert>
          )}

          {/* Upload Button */}
          <Button
            onClick={handleUpload}
            disabled={!file || !selectedProcessor || uploading}
            className="w-full"
            size="lg"
          >
            {uploading ? 'Uploading...' : 'Upload and Process'}
          </Button>

          {/* Instructions */}
          <div className="bg-muted p-4 rounded-lg space-y-2">
            <h4 className="font-medium text-sm">Instructions:</h4>
            <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
              <li>Select your payment processor from the dropdown</li>
              <li>Choose the CSV file from your computer</li>
              <li>Click "Upload and Process" to import the data</li>
              <li>The system will automatically calculate merchant lifetime values</li>
            </ol>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}