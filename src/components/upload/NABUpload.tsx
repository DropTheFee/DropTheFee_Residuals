import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';

const OFFICE_CODE_MAP: Record<string, string> = {
  'RMSOK': '5798d80d-bad6-4750-a489-988e2e1ef96e',
  'RMSOK01': '12460340-130f-427f-8854-448176bfb461',
  'RMSOK02': '359b517f-b301-4ae5-a99a-958bd8778e13',
  'RMSOK03': 'd35f117e-c56a-41dc-a08c-97923686c99d',
  'RMSOK05': '4dd7f6f6-5a40-4d2e-be1d-4398937a015d',
  'RMSOK06': '8740941d-8b0c-4d26-a87e-d3ba1e56fadb',
};

export function NABUpload() {
  const [selectedMonth, setSelectedMonth] = useState('');
  const [selectedYear, setSelectedYear] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (!selectedFile.name.endsWith('.xlsx')) {
        toast.error('Please select an .xlsx file');
        return;
      }
      setFile(selectedFile);
    }
  };

  const extractMerchantName = (description: string): string => {
    const match = description.match(/Merchant Name:\s*([^|]+)\s*\|/);
    return match ? match[1].trim() : '';
  };

  const handleUpload = async () => {
    if (!file || !selectedMonth || !selectedYear) {
      toast.error('Please select a period and file');
      return;
    }

    setIsProcessing(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Not authenticated');
        return;
      }

      const { data: userData } = await supabase
        .from('users')
        .select('agency_id')
        .eq('id', user.id)
        .single();

      if (!userData?.agency_id) {
        toast.error('User agency not found');
        return;
      }

      const periodMonth = `${selectedYear}-${selectedMonth.padStart(2, '0')}-01`;

      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

      if (jsonData.length < 2) {
        toast.error('File appears to be empty');
        return;
      }

      const headerRow = jsonData[1];
      const dateProcessedIdx = headerRow.findIndex((h: string) => h === 'Date Processed');
      const nachaNameIdx = headerRow.findIndex((h: string) => h === 'NACHA Name');
      const officeCodeIdx = headerRow.findIndex((h: string) => h === 'Office Code');
      const merchantIdIdx = headerRow.findIndex((h: string) => h === 'Merchant ID');
      const descriptionIdx = headerRow.findIndex((h: string) => h === 'Description');
      const amountIdx = headerRow.findIndex((h: string) => h === 'Amount');

      if (officeCodeIdx === -1 || merchantIdIdx === -1 || descriptionIdx === -1 || amountIdx === -1) {
        toast.error('Required columns not found in file');
        return;
      }

      const { data: uploadData, error: uploadError } = await supabase
        .from('nab_uploads')
        .insert({
          upload_date: new Date().toISOString(),
          period_month: periodMonth,
          file_name: file.name,
          uploaded_by: user.id,
          agency_id: userData.agency_id,
        })
        .select()
        .single();

      if (uploadError) {
        toast.error('Failed to create upload record');
        console.error(uploadError);
        return;
      }

      const records = [];
      for (let i = 2; i < jsonData.length; i++) {
        const row = jsonData[i];
        if (!row || row.length === 0) continue;

        const officeCode = row[officeCodeIdx]?.toString().trim();
        const merchantIdRaw = row[merchantIdIdx]?.toString().trim();
        const description = row[descriptionIdx]?.toString().trim();
        const amount = parseFloat(row[amountIdx]?.toString() || '0');

        if (!officeCode || !merchantIdRaw || !description) continue;

        const repUserId = OFFICE_CODE_MAP[officeCode];
        if (!repUserId) {
          console.warn(`Unknown office code: ${officeCode}`);
          continue;
        }

        const merchantName = extractMerchantName(description);

        records.push({
          nab_upload_id: uploadData.id,
          office_code: officeCode,
          merchant_id_raw: merchantIdRaw,
          merchant_name: merchantName,
          amount: amount,
          rep_user_id: repUserId,
          agency_id: userData.agency_id,
          period_month: periodMonth,
        });
      }

      if (records.length === 0) {
        toast.error('No valid records found in file');
        return;
      }

      const { error: insertError } = await supabase
        .from('nab_records')
        .insert(records);

      if (insertError) {
        toast.error('Failed to insert NAB records');
        console.error(insertError);
        return;
      }

      toast.success(`Successfully processed ${records.length} NAB records`);
      setFile(null);
      if (document.getElementById('nab-file-input')) {
        (document.getElementById('nab-file-input') as HTMLInputElement).value = '';
      }

    } catch (error) {
      console.error('Error processing NAB file:', error);
      toast.error('Error processing file');
    } finally {
      setIsProcessing(false);
    }
  };

  const months = [
    { value: '1', label: 'January' },
    { value: '2', label: 'February' },
    { value: '3', label: 'March' },
    { value: '4', label: 'April' },
    { value: '5', label: 'May' },
    { value: '6', label: 'June' },
    { value: '7', label: 'July' },
    { value: '8', label: 'August' },
    { value: '9', label: 'September' },
    { value: '10', label: 'October' },
    { value: '11', label: 'November' },
    { value: '12', label: 'December' },
  ];

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);

  return (
    <Card className="p-6">
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold mb-4">Report Period</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Month</Label>
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger>
                  <SelectValue placeholder="Select month" />
                </SelectTrigger>
                <SelectContent>
                  {months.map((month) => (
                    <SelectItem key={month.value} value={month.value}>
                      {month.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Year</Label>
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger>
                  <SelectValue placeholder="Select year" />
                </SelectTrigger>
                <SelectContent>
                  {years.map((year) => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <div>
          <Label htmlFor="nab-file-input">Upload NAB File (.xlsx)</Label>
          <Input
            id="nab-file-input"
            type="file"
            accept=".xlsx"
            onChange={handleFileSelect}
            className="mt-2"
          />
          {file && (
            <p className="text-sm text-muted-foreground mt-2">
              Selected: {file.name}
            </p>
          )}
        </div>

        <Button
          onClick={handleUpload}
          disabled={!file || !selectedMonth || !selectedYear || isProcessing}
          className="w-full"
        >
          {isProcessing ? 'Processing...' : 'Upload & Process'}
        </Button>
      </div>
    </Card>
  );
}
