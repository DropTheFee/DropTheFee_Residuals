import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { PlusCircle, Pencil, Trash2, Play } from 'lucide-react';

interface SteamTerminal {
  id: string;
  merchant_id: string;
  merchant_name: string;
  tpn: string;
  bundle_price: number;
  tpn_price: number;
  spinproxy: boolean;
  active: boolean;
}

interface Merchant {
  id: string;
  merchant_name: string;
}

interface Props {
  agencyId: string;
  selectedPeriod: string;
}

export default function DejavooSteamTerminals({ agencyId, selectedPeriod }: Props) {
  const [terminals, setTerminals] = useState<SteamTerminal[]>([]);
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    merchant_id: '',
    tpn: '',
    bundle_price: '5.95',
    tpn_price: '1.95',
    spinproxy: false,
    active: true,
  });

  useEffect(() => {
    if (agencyId) {
      loadTerminals();
      loadMerchants();
    }
  }, [agencyId]);

  const loadTerminals = async () => {
    const { data, error } = await supabase
      .from('dejavoo_steam_terminals')
      .select(`
        id, merchant_id, tpn, bundle_price, tpn_price, spinproxy, active,
        merchants(merchant_name)
      `)
      .eq('agency_id', agencyId)
      .order('active', { ascending: false });

    if (error) { toast.error('Failed to load terminals'); return; }

    setTerminals((data || []).map((t: any) => ({
      ...t,
      merchant_name: t.merchants?.merchant_name || 'Unknown',
    })));
    setLoading(false);
  };

  const loadMerchants = async () => {
    const { data } = await supabase
      .from('merchants')
      .select('id, merchant_name')
      .eq('agency_id', agencyId)
      .order('merchant_name');
    setMerchants(data || []);
  };

  const monthlyAmount = (t: SteamTerminal) =>
    parseFloat((t.bundle_price + t.tpn_price + (t.spinproxy ? 1.00 : 0)).toFixed(2));

  const handleSave = async () => {
    if (!form.merchant_id || !form.tpn) {
      toast.error('Merchant and TPN are required');
      return;
    }

    const payload = {
      agency_id: agencyId,
      merchant_id: form.merchant_id,
      tpn: form.tpn,
      bundle_price: parseFloat(form.bundle_price),
      tpn_price: parseFloat(form.tpn_price),
      spinproxy: form.spinproxy,
      active: form.active,
    };

    if (editingId) {
      const { error } = await supabase
        .from('dejavoo_steam_terminals')
        .update(payload)
        .eq('id', editingId);
      if (error) { toast.error('Failed to update terminal'); return; }
      toast.success('Terminal updated');
    } else {
      const { error } = await supabase
        .from('dejavoo_steam_terminals')
        .insert(payload);
      if (error) { toast.error('Failed to add terminal'); return; }
      toast.success('Terminal added');
    }

    setShowForm(false);
    setEditingId(null);
    setForm({ merchant_id: '', tpn: '', bundle_price: '5.95', tpn_price: '1.95', spinproxy: false, active: true });
    loadTerminals();
  };

  const handleEdit = (t: SteamTerminal) => {
    setForm({
      merchant_id: t.merchant_id,
      tpn: t.tpn,
      bundle_price: t.bundle_price.toString(),
      tpn_price: t.tpn_price.toString(),
      spinproxy: t.spinproxy,
      active: t.active,
    });
    setEditingId(t.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase
      .from('dejavoo_steam_terminals')
      .delete()
      .eq('id', id);
    if (error) { toast.error('Failed to delete terminal'); return; }
    toast.success('Terminal removed');
    loadTerminals();
  };

  const handleApplyToPeriod = async () => {
    if (!selectedPeriod) { toast.error('No period selected'); return; }
    setApplying(true);

    try {
      const activeTerminals = terminals.filter(t => t.active);

      await supabase
        .from('merchant_expenses')
        .delete()
        .eq('agency_id', agencyId)
        .eq('expense_source', 'Dejavoo Steam')
        .eq('report_date', selectedPeriod);

      if (activeTerminals.length === 0) {
        toast.success('No active terminals to apply');
        setApplying(false);
        return;
      }

      const merchantTotals = new Map<string, { merchant_id: string; merchant_name: string; total: number }>();
      for (const t of activeTerminals) {
        const amount = monthlyAmount(t);
        if (merchantTotals.has(t.merchant_id)) {
          merchantTotals.get(t.merchant_id)!.total += amount;
        } else {
          merchantTotals.set(t.merchant_id, {
            merchant_id: t.merchant_id,
            merchant_name: t.merchant_name,
            total: amount,
          });
        }
      }

      const inserts = Array.from(merchantTotals.values()).map(m => ({
        agency_id: agencyId,
        merchant_id: m.merchant_id,
        merchant_name: m.merchant_name,
        expense_source: 'Dejavoo Steam',
        expense_amount: parseFloat(m.total.toFixed(2)),
        report_date: selectedPeriod,
        matched: true,
        skipped: false,
      }));

      const { error } = await supabase
        .from('merchant_expenses')
        .insert(inserts);

      if (error) throw error;

      toast.success(`Steam expenses applied to ${inserts.length} merchants for ${selectedPeriod}`);
    } catch (error) {
      toast.error('Failed to apply Steam expenses');
    } finally {
      setApplying(false);
    }
  };

  const formatCurrency = (v: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(v);

  if (loading) return <div className="text-slate-400 text-sm">Loading terminals...</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-sm text-slate-400">
          {terminals.filter(t => t.active).length} active terminal(s) —
          Monthly total: {formatCurrency(terminals.filter(t => t.active).reduce((sum, t) => sum + monthlyAmount(t), 0))}
        </div>
        <div className="flex gap-2">
          <Button
            onClick={handleApplyToPeriod}
            disabled={applying}
            className="bg-cyan-600 hover:bg-cyan-700 text-sm"
          >
            <Play className="h-3 w-3 mr-1" />
            {applying ? 'Applying...' : 'Apply to Period'}
          </Button>
          <Button
            onClick={() => { setShowForm(true); setEditingId(null); }}
            className="bg-slate-600 hover:bg-slate-500 text-sm"
          >
            <PlusCircle className="h-3 w-3 mr-1" />
            Add Terminal
          </Button>
        </div>
      </div>

      {showForm && (
        <Card className="bg-slate-700/50 border-slate-600">
          <CardContent className="pt-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Merchant</label>
                <select
                  value={form.merchant_id}
                  onChange={e => setForm(f => ({ ...f, merchant_id: e.target.value }))}
                  className="w-full bg-slate-800 border border-slate-600 text-white text-sm rounded p-2"
                >
                  <option value="">Select merchant...</option>
                  {merchants.map(m => (
                    <option key={m.id} value={m.id}>{m.merchant_name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">TPN</label>
                <input
                  value={form.tpn}
                  onChange={e => setForm(f => ({ ...f, tpn: e.target.value }))}
                  className="w-full bg-slate-800 border border-slate-600 text-white text-sm rounded p-2"
                  placeholder="e.g. Z11811032979"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Bundle Price</label>
                <input
                  type="number"
                  step="0.01"
                  value={form.bundle_price}
                  onChange={e => setForm(f => ({ ...f, bundle_price: e.target.value }))}
                  className="w-full bg-slate-800 border border-slate-600 text-white text-sm rounded p-2"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">TPN Price</label>
                <input
                  type="number"
                  step="0.01"
                  value={form.tpn_price}
                  onChange={e => setForm(f => ({ ...f, tpn_price: e.target.value }))}
                  className="w-full bg-slate-800 border border-slate-600 text-white text-sm rounded p-2"
                />
              </div>
            </div>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.spinproxy}
                  onChange={e => setForm(f => ({ ...f, spinproxy: e.target.checked }))}
                  className="rounded"
                />
                SPInProxy Fee ($1.00)
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.active}
                  onChange={e => setForm(f => ({ ...f, active: e.target.checked }))}
                  className="rounded"
                />
                Active
              </label>
            </div>
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                className="text-sm"
                onClick={() => { setShowForm(false); setEditingId(null); }}
              >
                Cancel
              </Button>
              <Button onClick={handleSave} className="bg-cyan-600 hover:bg-cyan-700 text-sm">
                {editingId ? 'Update' : 'Add'} Terminal
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {terminals.length > 0 && (
        <Table>
          <TableHeader>
            <TableRow className="border-slate-700">
              <TableHead className="text-slate-300">Merchant</TableHead>
              <TableHead className="text-slate-300">TPN</TableHead>
              <TableHead className="text-right text-slate-300">Bundle</TableHead>
              <TableHead className="text-right text-slate-300">TPN Fee</TableHead>
              <TableHead className="text-center text-slate-300">SPInProxy</TableHead>
              <TableHead className="text-right text-slate-300">Monthly</TableHead>
              <TableHead className="text-center text-slate-300">Active</TableHead>
              <TableHead className="text-slate-300"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {terminals.map(t => (
              <TableRow key={t.id} className={`border-slate-700 ${!t.active ? 'opacity-40' : ''}`}>
                <TableCell className="text-white">{t.merchant_name}</TableCell>
                <TableCell className="text-slate-300 font-mono text-sm">{t.tpn}</TableCell>
                <TableCell className="text-right text-slate-300">{formatCurrency(t.bundle_price)}</TableCell>
                <TableCell className="text-right text-slate-300">{formatCurrency(t.tpn_price)}</TableCell>
                <TableCell className="text-center text-slate-300">{t.spinproxy ? '✓' : '—'}</TableCell>
                <TableCell className="text-right font-medium text-white">{formatCurrency(monthlyAmount(t))}</TableCell>
                <TableCell className="text-center">
                  <span className={`text-xs px-2 py-1 rounded-full ${t.active ? 'bg-green-900/50 text-green-400' : 'bg-slate-700 text-slate-400'}`}>
                    {t.active ? 'Yes' : 'No'}
                  </span>
                </TableCell>
                <TableCell>
                  <div className="flex gap-1 justify-end">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleEdit(t)}
                      className="h-7 w-7 p-0 text-slate-400 hover:text-white"
                    >
                      <Pencil className="h-3 w-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDelete(t.id)}
                      className="h-7 w-7 p-0 text-slate-400 hover:text-red-400"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {terminals.length === 0 && (
        <div className="text-center py-6 text-slate-400 text-sm">
          No terminals configured. Click "Add Terminal" to get started.
        </div>
      )}
    </div>
  );
}
