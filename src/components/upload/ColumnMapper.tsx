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
}

export function ColumnMapper({ headers, processorName, onMappingComplete, onCancel }: ColumnMapperProps) {
  const [mapping, setMapping] = useState<ColumnMapping>({
    mid_column: '',
    merchant_name_column: '',
    volume_column: '',
    residual_column: '',
    status_column: '',
    rep_payout_column: '',
    dba_column: '',
  });

  const handleSubmit = () => {
    if (!mapping.mid_column || !mapping.merchant_name_column || !mapping.volume_column || !mapping.residual_column) {
      alert('Please select at least MID, Merchant Name, Volume, and Residual columns');
      return;
    }
    onMappingComplete(mapping);
  };

  return (
    <Card className="bg-slate-800/50 border-slate-700">
      <CardHeader>
        <CardTitle className="text-white">Map Columns for {processorName}</CardTitle>
        <CardDescription className="text-slate-400">
          Select which columns from your file correspond to each field. Required fields are marked with *.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4">
          <div>
            <Label htmlFor="mid" className="text-slate-300">MID Column *</Label>
            <Select value={mapping.mid_column} onValueChange={(value) => setMapping({ ...mapping, mid_column: value })}>
              <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                <SelectValue placeholder="Select MID column" />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700">
                {headers.map((header) => (
                  <SelectItem key={header} value={header} className="text-white">
                    {header}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="merchant-name" className="text-slate-300">Merchant Name Column *</Label>
            <Select value={mapping.merchant_name_column} onValueChange={(value) => setMapping({ ...mapping, merchant_name_column: value })}>
              <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                <SelectValue placeholder="Select merchant name column" />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700">
                {headers.map((header) => (
                  <SelectItem key={header} value={header} className="text-white">
                    {header}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="dba" className="text-slate-300">DBA Column (Optional)</Label>
            <Select value={mapping.dba_column} onValueChange={(value) => setMapping({ ...mapping, dba_column: value })}>
              <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                <SelectValue placeholder="Select DBA column" />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700">
                <SelectItem value="" className="text-white">None</SelectItem>
                {headers.map((header) => (
                  <SelectItem key={header} value={header} className="text-white">
                    {header}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="volume" className="text-slate-300">Volume Column *</Label>
            <Select value={mapping.volume_column} onValueChange={(value) => setMapping({ ...mapping, volume_column: value })}>
              <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                <SelectValue placeholder="Select volume column" />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700">
                {headers.map((header) => (
                  <SelectItem key={header} value={header} className="text-white">
                    {header}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="residual" className="text-slate-300">Residual Amount Column *</Label>
            <Select value={mapping.residual_column} onValueChange={(value) => setMapping({ ...mapping, residual_column: value })}>
              <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                <SelectValue placeholder="Select residual column" />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700">
                {headers.map((header) => (
                  <SelectItem key={header} value={header} className="text-white">
                    {header}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="status" className="text-slate-300">Status Column (Optional)</Label>
            <Select value={mapping.status_column} onValueChange={(value) => setMapping({ ...mapping, status_column: value })}>
              <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                <SelectValue placeholder="Select status column" />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700">
                <SelectItem value="" className="text-white">None</SelectItem>
                {headers.map((header) => (
                  <SelectItem key={header} value={header} className="text-white">
                    {header}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="rep-payout" className="text-slate-300">Rep Payout Column (Optional)</Label>
            <Select value={mapping.rep_payout_column} onValueChange={(value) => setMapping({ ...mapping, rep_payout_column: value })}>
              <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                <SelectValue placeholder="Select rep payout column" />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700">
                <SelectItem value="" className="text-white">None</SelectItem>
                {headers.map((header) => (
                  <SelectItem key={header} value={header} className="text-white">
                    {header}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <Button variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} className="bg-cyan-500 hover:bg-cyan-600">
            Save Mapping & Continue
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
