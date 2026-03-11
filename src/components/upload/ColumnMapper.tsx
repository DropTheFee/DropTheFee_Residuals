import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface ColumnMapping {
  mid_column: string;
  merchant_name_column: string;
  volume_column: string;
  residual_column: string;
  status_column?: string;
  rep_payout_column?: string;
  dba_column?: string;
}

interface ColumnMapperProps {
  headers: string[];
  processorName: string;
  onMappingComplete: (mapping: ColumnMapping) => void;
  onCancel: () => void;
  initialMapping?: Partial<ColumnMapping>;
}

const IGNORE_VALUE = '__ignore__';

export function ColumnMapper({ headers, processorName, onMappingComplete, onCancel, initialMapping }: ColumnMapperProps) {
  const cleanHeaders = Array.isArray(headers)
    ? headers.filter(h => h !== null && h !== undefined && String(h).trim() !== '')
    : [];

  const getCoastalPayMapping = () => {
    if (processorName !== 'CoastalPay') return {};

    const hasInitialMapping = initialMapping?.mid_column || initialMapping?.merchant_name_column ||
                              initialMapping?.volume_column || initialMapping?.residual_column;

    if (hasInitialMapping) return {};

    const hasColumn = (name: string) => cleanHeaders.includes(name);

    return {
      mid_column: hasColumn('Merchant ID') ? 'Merchant ID' : '',
      merchant_name_column: hasColumn('Merchant') ? 'Merchant' : '',
      volume_column: hasColumn('Sales Amount') ? 'Sales Amount' : '',
      residual_column: hasColumn('Agent Net') ? 'Agent Net' : '',
    };
  };

  const [mapping, setMapping] = useState<ColumnMapping>(() => {
    const coastalPayMapping = getCoastalPayMapping();
    return {
      mid_column: initialMapping?.mid_column || coastalPayMapping.mid_column || '',
      merchant_name_column: initialMapping?.merchant_name_column || coastalPayMapping.merchant_name_column || '',
      volume_column: initialMapping?.volume_column || coastalPayMapping.volume_column || '',
      residual_column: initialMapping?.residual_column || coastalPayMapping.residual_column || '',
      status_column: initialMapping?.status_column || '',
      rep_payout_column: initialMapping?.rep_payout_column || '',
      dba_column: initialMapping?.dba_column || '',
    };
  });

  const handleSubmit = () => {
    if (!mapping.mid_column || !mapping.merchant_name_column || !mapping.volume_column || !mapping.residual_column) {
      alert('Please select at least MID, Merchant Name, Volume, and Residual columns');
      return;
    }
    // Clean up ignore values before saving
    const cleanMapping: ColumnMapping = {
      mid_column: mapping.mid_column,
      merchant_name_column: mapping.merchant_name_column,
      volume_column: mapping.volume_column,
      residual_column: mapping.residual_column,
      status_column: mapping.status_column === IGNORE_VALUE ? '' : mapping.status_column,
      rep_payout_column: mapping.rep_payout_column === IGNORE_VALUE ? '' : mapping.rep_payout_column,
      dba_column: mapping.dba_column === IGNORE_VALUE ? '' : mapping.dba_column,
    };
    onMappingComplete(cleanMapping);
  };

  const renderSelect = (
    label: string,
    field: keyof ColumnMapping,
    required: boolean
  ) => (
    <div>
      <Label className="text-slate-300">{label}{required ? ' *' : ' (Optional)'}</Label>
      <Select
        value={mapping[field] || (required ? '' : IGNORE_VALUE)}
        onValueChange={(value) => setMapping({ ...mapping, [field]: value })}
      >
        <SelectTrigger className="bg-slate-700 border-slate-600 text-white mt-1">
          <SelectValue placeholder={required ? `Select ${label}` : 'Ignore this field'} />
        </SelectTrigger>
        <SelectContent className="bg-slate-800 border-slate-700">
          {!required && (
            <SelectItem value={IGNORE_VALUE} className="text-slate-400">
              — Ignore —
            </SelectItem>
          )}
          {cleanHeaders.map((header) => (
            <SelectItem key={header} value={header} className="text-white">
              {header}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );

  return (
    <Card className="bg-slate-800/50 border-slate-700">
      <CardHeader>
        <CardTitle className="text-white">Map Columns for {processorName}</CardTitle>
        <CardDescription className="text-slate-400">
          Match your file's column headers to the required fields. Required fields are marked with *.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {cleanHeaders.length === 0 ? (
          <div className="text-red-400 text-sm">
            No valid column headers found in file. Please check your file and try again.
          </div>
        ) : (
          <>
            <div className="text-slate-400 text-sm mb-2">
              {cleanHeaders.length} columns detected: {cleanHeaders.join(', ')}
            </div>
            <div className="grid gap-4">
              {renderSelect('MID Column', 'mid_column', true)}
              {renderSelect('Merchant Name Column', 'merchant_name_column', true)}
              {renderSelect('Volume Column', 'volume_column', true)}
              {renderSelect('Residual Amount Column', 'residual_column', true)}
              {renderSelect('DBA Column', 'dba_column', false)}
              {renderSelect('Status Column', 'status_column', false)}
              {renderSelect('Rep Payout Column', 'rep_payout_column', false)}
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="ghost" onClick={onCancel} className="text-slate-300">
                Cancel
              </Button>
              <Button onClick={handleSubmit} className="bg-cyan-500 hover:bg-cyan-600">
                Save Mapping & Continue
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
