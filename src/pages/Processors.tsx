import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Trash2, CreditCard as Edit2, Upload } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { ColumnMapper } from '@/components/upload/ColumnMapper';
import { extractFileHeaders } from '@/utils/dynamicParser';

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
  created_at: string;
}

export default function Processors() {
  const [mappings, setMappings] = useState<ProcessorMapping[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newProcessorName, setNewProcessorName] = useState('');
  const [agencyId, setAgencyId] = useState<string | null>(null);
  const [showMapper, setShowMapper] = useState(false);
  const [fileHeaders, setFileHeaders] = useState<string[]>([]);
  const [headerRowNumber, setHeaderRowNumber] = useState(0);
  const [editingMapping, setEditingMapping] = useState<ProcessorMapping | null>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);

  useEffect(() => {
    fetchUserAgency();
  }, []);

  useEffect(() => {
    if (agencyId) {
      fetchMappings();
    }
  }, [agencyId]);

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

  const fetchMappings = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('processor_mappings')
        .select('*')
        .eq('agency_id', agencyId)
        .order('processor_name');

      if (error) throw error;
      setMappings(data || []);
    } catch (error) {
      console.error('Error fetching processor mappings:', error);
      toast.error('Failed to load processor mappings');
    } finally {
      setLoading(false);
    }
  };

  const handleAddProcessor = async () => {
    if (!newProcessorName.trim() || !agencyId) {
      toast.error('Please enter a processor name');
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: userData } = await supabase
        .from('users')
        .select('id')
        .eq('id', user.id)
        .maybeSingle();

      const { data: newMapping, error } = await supabase
        .from('processor_mappings')
        .insert({
          agency_id: agencyId,
          processor_name: newProcessorName.trim(),
          created_by: userData?.id,
          header_row_number: 0,
        })
        .select()
        .single();

      if (error) throw error;

      toast.success('Processor added. Now upload a sample file to configure column mappings.');
      setIsAddDialogOpen(false);
      setEditingMapping(newMapping);
      setNewProcessorName('');
      await fetchMappings();
    } catch (error: any) {
      console.error('Error adding processor:', error);
      if (error.code === '23505') {
        toast.error('A processor with this name already exists');
      } else {
        toast.error('Failed to add processor');
      }
    }
  };

  const handleDeleteProcessor = async (id: string) => {
    if (!confirm('Are you sure you want to delete this processor mapping?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('processor_mappings')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('Processor deleted successfully');
      fetchMappings();
    } catch (error) {
      console.error('Error deleting processor:', error);
      toast.error('Failed to delete processor');
    }
  };

  const handleEditProcessor = (mapping: ProcessorMapping) => {
    setEditingMapping(mapping);
    setUploadFile(null);
    setFileHeaders([]);
    setHeaderRowNumber(mapping.header_row_number);
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

    setUploadFile(selectedFile);

    try {
      const headers = await extractFileHeaders(selectedFile, headerRowNumber);
      setFileHeaders(headers);
      setShowMapper(true);
    } catch (error) {
      console.error('Error extracting headers:', error);
      toast.error('Failed to read file headers');
    }
  };

  const handleMappingComplete = async (mapping: any) => {
    if (!editingMapping || !agencyId) return;

    try {
      const { error } = await supabase
        .from('processor_mappings')
        .update({
          mid_column: mapping.mid_column || null,
          merchant_name_column: mapping.merchant_name_column || null,
          volume_column: mapping.volume_column || null,
          residual_column: mapping.residual_column || null,
          status_column: mapping.status_column || null,
          rep_payout_column: mapping.rep_payout_column || null,
          dba_column: mapping.dba_column || null,
          header_row_number: headerRowNumber,
          updated_at: new Date().toISOString(),
        })
        .eq('id', editingMapping.id);

      if (error) throw error;

      toast.success('Mapping updated successfully');
      setShowMapper(false);
      setEditingMapping(null);
      setFileHeaders([]);
      setUploadFile(null);
      fetchMappings();
    } catch (error) {
      console.error('Error updating mapping:', error);
      toast.error('Failed to update mapping');
    }
  };

  const handleCancelMapping = () => {
    setShowMapper(false);
    setEditingMapping(null);
    setFileHeaders([]);
    setUploadFile(null);
    setHeaderRowNumber(0);
  };

  const handleHeaderRowNumberChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const newRowNumber = parseInt(e.target.value) || 0;

    console.log('Header row number changing to:', newRowNumber);
    console.log('Upload file exists:', !!uploadFile);
    console.log('Editing mapping:', editingMapping?.processor_name);

    setHeaderRowNumber(newRowNumber);

    if (uploadFile) {
      try {
        const headers = await extractFileHeaders(uploadFile, newRowNumber);
        console.log('New headers extracted:', headers.length, 'columns');
        setFileHeaders(headers);
      } catch (error) {
        console.error('Error re-extracting headers:', error);
        toast.error('Failed to read headers from the specified row');
      }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-lg text-slate-300">Loading...</div>
      </div>
    );
  }

  if (showMapper && fileHeaders.length > 0 && editingMapping) {
    console.log('Rendering mapper view with:', {
      headerRowNumber,
      fileHeadersCount: fileHeaders.length,
      processorName: editingMapping.processor_name,
      hasUploadFile: !!uploadFile
    });

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">Configure Column Mapping</h1>
            <p className="text-slate-400 mt-1">Map columns for {editingMapping.processor_name}</p>
          </div>
        </div>

        <div className="mb-4">
          <Label htmlFor="header-row" className="text-slate-300">
            Header Row Number (0 = first row)
            {editingMapping.processor_name === 'CoastalPay' && (
              <span className="text-xs text-cyan-400 ml-2">Hint: CoastalPay files typically have headers on row 4</span>
            )}
          </Label>
          <Input
            id="header-row"
            type="number"
            min="0"
            value={headerRowNumber}
            onChange={handleHeaderRowNumberChange}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
              }
            }}
            className="bg-slate-700 border-slate-600 text-white max-w-xs"
          />
        </div>

        <ColumnMapper
          key={`${editingMapping.id}-${headerRowNumber}`}
          headers={fileHeaders}
          processorName={editingMapping.processor_name}
          onMappingComplete={handleMappingComplete}
          onCancel={handleCancelMapping}
          initialMapping={{
            mid_column: editingMapping.mid_column || undefined,
            merchant_name_column: editingMapping.merchant_name_column || undefined,
            volume_column: editingMapping.volume_column || undefined,
            residual_column: editingMapping.residual_column || undefined,
            status_column: editingMapping.status_column || undefined,
            rep_payout_column: editingMapping.rep_payout_column || undefined,
            dba_column: editingMapping.dba_column || undefined,
          }}
        />
      </div>
    );
  }

  if (editingMapping && !showMapper) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">Upload Sample File</h1>
            <p className="text-slate-400 mt-1">Upload a sample file for {editingMapping.processor_name} to configure column mappings</p>
          </div>
        </div>

        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">Select Sample File</CardTitle>
            <CardDescription className="text-slate-400">
              Upload a CSV or Excel file from {editingMapping.processor_name} to map columns
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
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
                {uploadFile && (
                  <span className="text-sm text-slate-300">{uploadFile.name}</span>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={handleCancelMapping}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Processor Management</h1>
          <p className="text-slate-400 mt-1">Manage processors and their column mappings</p>
        </div>
        <Button onClick={() => setIsAddDialogOpen(true)} className="bg-cyan-500 hover:bg-cyan-600">
          <Plus className="h-4 w-4 mr-2" />
          Add Processor
        </Button>
      </div>

      <div className="grid gap-4">
        {mappings.length === 0 ? (
          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="pt-6">
              <p className="text-center text-slate-400">
                No processors configured yet. Click "Add Processor" to get started.
              </p>
            </CardContent>
          </Card>
        ) : (
          mappings.map((mapping) => (
            <Card key={mapping.id} className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-white">{mapping.processor_name}</CardTitle>
                    <CardDescription className="text-slate-400">
                      {mapping.mid_column ? 'Configured' : 'Not configured yet'}
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEditProcessor(mapping)}
                      className="text-cyan-400 hover:text-cyan-300 hover:bg-slate-700"
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteProcessor(mapping.id)}
                      className="text-red-400 hover:text-red-300 hover:bg-slate-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              {mapping.mid_column && (
                <CardContent>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-slate-400">MID Column:</span>
                      <span className="text-white ml-2">{mapping.mid_column}</span>
                    </div>
                    <div>
                      <span className="text-slate-400">Merchant Name:</span>
                      <span className="text-white ml-2">{mapping.merchant_name_column || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400">Volume:</span>
                      <span className="text-white ml-2">{mapping.volume_column || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400">Residual:</span>
                      <span className="text-white ml-2">{mapping.residual_column || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400">Status:</span>
                      <span className="text-white ml-2">{mapping.status_column || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400">Rep Payout:</span>
                      <span className="text-white ml-2">{mapping.rep_payout_column || 'N/A'}</span>
                    </div>
                  </div>
                </CardContent>
              )}
            </Card>
          ))
        )}
      </div>

      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="bg-slate-800 border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-white">Add New Processor</DialogTitle>
            <DialogDescription className="text-slate-400">
              Enter the name of the processor/ISO you want to add.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="processor-name" className="text-slate-300">Processor Name</Label>
              <Input
                id="processor-name"
                value={newProcessorName}
                onChange={(e) => setNewProcessorName(e.target.value)}
                placeholder="e.g., First Data, TSYS, etc."
                className="bg-slate-700 border-slate-600 text-white"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddProcessor} className="bg-cyan-500 hover:bg-cyan-600">
              Add Processor
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
