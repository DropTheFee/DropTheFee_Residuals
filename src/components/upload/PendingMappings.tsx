import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { Check, X, CircleAlert as AlertCircle } from 'lucide-react';

interface PendingExpense {
  id: string;
  merchant_name: string;
  expense_amount: number;
  expense_source: string;
  report_date: string;
}

interface Merchant {
  id: string;
  merchant_name: string;
}

export default function PendingMappings() {
  const [pendingExpenses, setPendingExpenses] = useState<PendingExpense[]>([]);
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [selectedMappings, setSelectedMappings] = useState<Map<string, string>>(new Map());
  const [savingIndividual, setSavingIndividual] = useState<Set<string>>(new Set());
  const [skipping, setSkipping] = useState<Set<string>>(new Set());
  const [confirmingSkip, setConfirmingSkip] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [agencyId, setAgencyId] = useState<string | null>(null);

  useEffect(() => {
    loadAgencyId();
  }, []);

  useEffect(() => {
    if (agencyId) {
      loadPendingMappings();
    }
  }, [agencyId]);

  async function loadAgencyId() {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();

      if (!authUser) {
        setLoading(false);
        return;
      }

      const { data: profile } = await supabase
        .from('users')
        .select('agency_id')
        .eq('auth_id', authUser.id)
        .single();

      if (profile?.agency_id) {
        setAgencyId(profile.agency_id);
      } else {
        setLoading(false);
      }
    } catch (error) {
      console.error('Error loading agency ID:', error);
      setLoading(false);
    }
  }

  async function loadPendingMappings() {
    if (!agencyId) return;

    setLoading(true);
    try {
      const { data: pendingData } = await supabase
        .from('merchant_expenses')
        .select('*')
        .eq('agency_id', agencyId)
        .eq('matched', false)
        .eq('skipped', false);

      if (pendingData && pendingData.length > 0) {
        setPendingExpenses(pendingData);
      }

      const { data: merchantsData } = await supabase
        .from('merchants')
        .select('id, merchant_name')
        .eq('agency_id', agencyId)
        .order('merchant_name');

      if (merchantsData) {
        setMerchants(merchantsData);
      }
    } catch (error) {
      console.error('Error loading pending mappings:', error);
    } finally {
      setLoading(false);
    }
  }

  function handleMerchantSelect(expenseName: string, merchantId: string) {
    setSelectedMappings(prev => {
      const newMap = new Map(prev);
      newMap.set(expenseName, merchantId);
      return newMap;
    });
  }

  async function saveSingleMapping(expenseName: string, expenseSource: string) {
    const merchantId = selectedMappings.get(expenseName);
    if (!merchantId || !agencyId) {
      toast.error('Please select a merchant');
      return;
    }

    setSavingIndividual(prev => new Set(prev).add(expenseName));

    try {
      await supabase
        .from('expense_name_mappings')
        .upsert({
          agency_id: agencyId,
          expense_source: expenseSource,
          expense_name: expenseName,
          merchant_id: merchantId,
        });

      await supabase
        .from('merchant_expenses')
        .update({
          merchant_id: merchantId,
          matched: true,
        })
        .eq('agency_id', agencyId)
        .eq('merchant_name', expenseName)
        .eq('expense_source', expenseSource);

      toast.success(`Mapping saved for ${expenseName}`);
      await loadPendingMappings();
    } catch (error) {
      console.error('Error saving mapping:', error);
      toast.error('Failed to save mapping');
    } finally {
      setSavingIndividual(prev => {
        const newSet = new Set(prev);
        newSet.delete(expenseName);
        return newSet;
      });
    }
  }

  async function skipMerchant(expenseName: string, expenseSource: string) {
    if (!agencyId) return;

    setSkipping(prev => new Set(prev).add(expenseName));

    try {
      await supabase
        .from('merchant_expenses')
        .update({ skipped: true })
        .eq('agency_id', agencyId)
        .eq('merchant_name', expenseName)
        .eq('expense_source', expenseSource);

      toast.success(`Skipped ${expenseName}`);
      setConfirmingSkip(null);
      await loadPendingMappings();
    } catch (error) {
      console.error('Error skipping merchant:', error);
      toast.error('Failed to skip merchant');
    } finally {
      setSkipping(prev => {
        const newSet = new Set(prev);
        newSet.delete(expenseName);
        return newSet;
      });
    }
  }

  if (loading) {
    return null;
  }

  if (pendingExpenses.length === 0) {
    return null;
  }

  return (
    <Card className="bg-red-900/20 border-red-500/50 border-2">
      <CardHeader>
        <div className="flex items-start gap-3">
          <AlertCircle className="h-6 w-6 text-red-400 flex-shrink-0 mt-1" />
          <div className="space-y-2 flex-1">
            <CardTitle className="text-white text-xl">
              Pending Expense Mappings — Action Required
            </CardTitle>
            <p className="text-red-200 text-sm">
              {pendingExpenses.length} expense {pendingExpenses.length === 1 ? 'entry' : 'entries'} need to be matched to merchants before they can be processed.
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          {pendingExpenses.map((expense) => (
            <div key={expense.id}>
              {confirmingSkip === expense.merchant_name ? (
                <div className="bg-yellow-900/30 border border-yellow-600/50 p-4 rounded-lg space-y-3">
                  <div className="text-sm text-yellow-200">
                    This merchant is no longer active and cannot be matched. Skip permanently?
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => skipMerchant(expense.merchant_name, expense.expense_source)}
                      disabled={skipping.has(expense.merchant_name)}
                      className="bg-yellow-600 hover:bg-yellow-700 disabled:opacity-50"
                    >
                      {skipping.has(expense.merchant_name) ? 'Skipping...' : 'Yes, Skip'}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setConfirmingSkip(null)}
                      disabled={skipping.has(expense.merchant_name)}
                      className="border-slate-600 text-slate-300 hover:bg-slate-700"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3 bg-slate-800/50 p-4 rounded-lg border border-slate-700">
                  <div className="flex-1">
                    <div className="text-sm font-semibold text-white">
                      {expense.merchant_name}
                    </div>
                    <div className="text-xs text-slate-400 mt-1">
                      ${expense.expense_amount.toLocaleString('en-US', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })} • {expense.expense_source} • {new Date(expense.report_date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                    </div>
                  </div>

                  <div className="flex-1">
                    <Select
                      value={selectedMappings.get(expense.merchant_name) || ''}
                      onValueChange={(value) => handleMerchantSelect(expense.merchant_name, value)}
                    >
                      <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                        <SelectValue placeholder="Select merchant..." />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-800 border-slate-700 max-h-[300px]">
                        {merchants.map((merchant) => (
                          <SelectItem
                            key={merchant.id}
                            value={merchant.id}
                            className="text-white hover:bg-slate-700"
                          >
                            {merchant.merchant_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <Button
                    size="sm"
                    onClick={() => saveSingleMapping(expense.merchant_name, expense.expense_source)}
                    disabled={
                      !selectedMappings.get(expense.merchant_name) ||
                      savingIndividual.has(expense.merchant_name)
                    }
                    className="bg-green-600 hover:bg-green-700 disabled:opacity-50"
                  >
                    {savingIndividual.has(expense.merchant_name) ? (
                      'Saving...'
                    ) : (
                      <>
                        <Check className="h-4 w-4 mr-1" />
                        Save
                      </>
                    )}
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setConfirmingSkip(expense.merchant_name)}
                    className="border-slate-600 text-slate-300 hover:bg-slate-700"
                  >
                    <X className="h-4 w-4 mr-1" />
                    Skip
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
