import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Trash2, Edit2 } from 'lucide-react';
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
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingMapping, setEditingMapping] = useState<ProcessorMapping | null>(null);
  const [newProcessorName, setNewProcessorName] = useState('');
  const [agencyId, setAgencyId] = useState<string | null>(null);

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
        .eq('auth_id', user.id)
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
        .eq('auth_id', user.id)
        .maybeSingle();

      const { error } = await supabase
        .from('processor_mappings')
        .insert({
          agency_id: agencyId,
          processor_name: newProcessorName.trim(),
          created_by: userData?.id,
          header_row_number: 0,
        });

      if (error) throw error;

      toast.success('Processor added successfully');
      setNewProcessorName('');
      setIsAddDialogOpen(false);
      fetchMappings();
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
    setIsEditDialogOpen(true);
  };

  const handleUpdateMapping = async () => {
    if (!editingMapping) return;

    try {
      const { error } = await supabase
        .from('processor_mappings')
        .update({
          mid_column: editingMapping.mid_column || null,
          merchant_name_column: editingMapping.merchant_name_column || null,
          volume_column: editingMapping.volume_column || null,
          residual_column: editingMapping.residual_column || null,
          status_column: editingMapping.status_column || null,
          rep_payout_column: editingMapping.rep_payout_column || null,
          dba_column: editingMapping.dba_column || null,
          header_row_number: editingMapping.header_row_number,
          updated_at: new Date().toISOString(),
        })
        .eq('id', editingMapping.id);

      if (error) throw error;

      toast.success('Mapping updated successfully');
      setIsEditDialogOpen(false);
      setEditingMapping(null);
      fetchMappings();
    } catch (error) {
      console.error('Error updating mapping:', error);
      toast.error('Failed to update mapping');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-lg text-slate-300">Loading...</div>
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

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="bg-slate-800 border-slate-700 max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-white">Edit Mapping: {editingMapping?.processor_name}</DialogTitle>
            <DialogDescription className="text-slate-400">
              Configure which columns in your CSV/Excel file map to each field.
            </DialogDescription>
          </DialogHeader>
          {editingMapping && (
            <div className="space-y-4 max-h-[60vh] overflow-y-auto">
              <div>
                <Label htmlFor="header-row" className="text-slate-300">Header Row Number (0-indexed)</Label>
                <Input
                  id="header-row"
                  type="number"
                  min="0"
                  value={editingMapping.header_row_number}
                  onChange={(e) => setEditingMapping({
                    ...editingMapping,
                    header_row_number: parseInt(e.target.value) || 0
                  })}
                  className="bg-slate-700 border-slate-600 text-white"
                />
              </div>
              <div>
                <Label htmlFor="mid-column" className="text-slate-300">MID Column Name</Label>
                <Input
                  id="mid-column"
                  value={editingMapping.mid_column || ''}
                  onChange={(e) => setEditingMapping({
                    ...editingMapping,
                    mid_column: e.target.value
                  })}
                  placeholder="e.g., MID, Merchant ID"
                  className="bg-slate-700 border-slate-600 text-white"
                />
              </div>
              <div>
                <Label htmlFor="merchant-name" className="text-slate-300">Merchant Name Column</Label>
                <Input
                  id="merchant-name"
                  value={editingMapping.merchant_name_column || ''}
                  onChange={(e) => setEditingMapping({
                    ...editingMapping,
                    merchant_name_column: e.target.value
                  })}
                  placeholder="e.g., Merchant Name, Business Name"
                  className="bg-slate-700 border-slate-600 text-white"
                />
              </div>
              <div>
                <Label htmlFor="dba-column" className="text-slate-300">DBA Column (Optional)</Label>
                <Input
                  id="dba-column"
                  value={editingMapping.dba_column || ''}
                  onChange={(e) => setEditingMapping({
                    ...editingMapping,
                    dba_column: e.target.value
                  })}
                  placeholder="e.g., DBA, Doing Business As"
                  className="bg-slate-700 border-slate-600 text-white"
                />
              </div>
              <div>
                <Label htmlFor="volume-column" className="text-slate-300">Volume Column</Label>
                <Input
                  id="volume-column"
                  value={editingMapping.volume_column || ''}
                  onChange={(e) => setEditingMapping({
                    ...editingMapping,
                    volume_column: e.target.value
                  })}
                  placeholder="e.g., Volume, Total Volume"
                  className="bg-slate-700 border-slate-600 text-white"
                />
              </div>
              <div>
                <Label htmlFor="residual-column" className="text-slate-300">Residual Amount Column</Label>
                <Input
                  id="residual-column"
                  value={editingMapping.residual_column || ''}
                  onChange={(e) => setEditingMapping({
                    ...editingMapping,
                    residual_column: e.target.value
                  })}
                  placeholder="e.g., Residual, Commission"
                  className="bg-slate-700 border-slate-600 text-white"
                />
              </div>
              <div>
                <Label htmlFor="status-column" className="text-slate-300">Status Column (Optional)</Label>
                <Input
                  id="status-column"
                  value={editingMapping.status_column || ''}
                  onChange={(e) => setEditingMapping({
                    ...editingMapping,
                    status_column: e.target.value
                  })}
                  placeholder="e.g., Status, Account Status"
                  className="bg-slate-700 border-slate-600 text-white"
                />
              </div>
              <div>
                <Label htmlFor="rep-payout-column" className="text-slate-300">Rep Payout Column (Optional)</Label>
                <Input
                  id="rep-payout-column"
                  value={editingMapping.rep_payout_column || ''}
                  onChange={(e) => setEditingMapping({
                    ...editingMapping,
                    rep_payout_column: e.target.value
                  })}
                  placeholder="e.g., Rep Payout, Agent Commission"
                  className="bg-slate-700 border-slate-600 text-white"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateMapping} className="bg-cyan-500 hover:bg-cyan-600">
              Save Mapping
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
