import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { Check } from 'lucide-react';

interface UnmatchedExpense {
  merchantName: string;
  expenseAmount: number;
}

interface Merchant {
  id: string;
  merchant_name: string;
}

interface UnmatchedMerchantMappingProps {
  unmatchedExpenses: UnmatchedExpense[];
  agencyId: string;
  reportDate: string;
  onMappingComplete: () => void;
}

export default function UnmatchedMerchantMapping({
  unmatchedExpenses,
  agencyId,
  reportDate,
  onMappingComplete,
}: UnmatchedMerchantMappingProps) {
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [selectedMappings, setSelectedMappings] = useState<Map<string, string>>(new Map());
  const [savingAll, setSavingAll] = useState(false);
  const [savingIndividual, setSavingIndividual] = useState<Set<string>>(new Set());
  const [initialUnmatchedCount, setInitialUnmatchedCount] = useState(unmatchedExpenses.length);

  useEffect(() => {
    setInitialUnmatchedCount(unmatchedExpenses.length);
  }, [unmatchedExpenses.length]);

  useEffect(() => {
    loadMerchants();
  }, [agencyId]);

  async function loadMerchants() {
    const { data } = await supabase
      .from('merchants')
      .select('id, merchant_name')
      .eq('agency_id', agencyId)
      .order('merchant_name');

    if (data) {
      setMerchants(data);
    }
  }

  function handleMerchantSelect(expenseName: string, merchantId: string) {
    setSelectedMappings(prev => {
      const newMap = new Map(prev);
      newMap.set(expenseName, merchantId);
      return newMap;
    });
  }

  async function saveSingleMapping(expenseName: string) {
    const merchantId = selectedMappings.get(expenseName);
    if (!merchantId) {
      toast.error('Please select a merchant');
      return;
    }

    setSavingIndividual(prev => new Set(prev).add(expenseName));

    try {
      await supabase
        .from('expense_name_mappings')
        .upsert({
          agency_id: agencyId,
          expense_source: 'Dejavoo',
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
        .eq('expense_source', 'Dejavoo')
        .eq('report_date', reportDate);

      toast.success(`Mapping saved for ${expenseName}`);
      onMappingComplete();
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

  async function saveAllMappings() {
    if (selectedMappings.size === 0) {
      toast.error('Please select at least one merchant mapping');
      return;
    }

    setSavingAll(true);

    try {
      const mappingsToSave = Array.from(selectedMappings.entries()).map(([expenseName, merchantId]) => ({
        agency_id: agencyId,
        expense_source: 'Dejavoo',
        expense_name: expenseName,
        merchant_id: merchantId,
      }));

      await supabase
        .from('expense_name_mappings')
        .upsert(mappingsToSave);

      for (const [expenseName, merchantId] of selectedMappings.entries()) {
        await supabase
          .from('merchant_expenses')
          .update({
            merchant_id: merchantId,
            matched: true,
          })
          .eq('agency_id', agencyId)
          .eq('merchant_name', expenseName)
          .eq('expense_source', 'Dejavoo')
          .eq('report_date', reportDate);
      }

      toast.success(`Saved ${selectedMappings.size} mappings successfully`);
      onMappingComplete();
    } catch (error) {
      console.error('Error saving mappings:', error);
      toast.error('Failed to save mappings');
    } finally {
      setSavingAll(false);
    }
  }

  if (unmatchedExpenses.length === 0) {
    return null;
  }

  const mappedCount = initialUnmatchedCount - unmatchedExpenses.length;
  const progressPercentage = initialUnmatchedCount > 0
    ? Math.round((mappedCount / initialUnmatchedCount) * 100)
    : 0;

  return (
    <Card className="bg-slate-800/50 border-slate-700">
      <CardHeader>
        <div className="space-y-2">
          <CardTitle className="text-white">Unmatched Merchants — Action Required</CardTitle>
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-400">
              {mappedCount} of {initialUnmatchedCount} merchants mapped
            </span>
            <span className="text-cyan-400 font-semibold">
              {progressPercentage}% complete
            </span>
          </div>
          <div className="w-full bg-slate-700 rounded-full h-2">
            <div
              className="bg-cyan-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          {unmatchedExpenses.map((expense, index) => (
            <div
              key={index}
              className="flex items-center gap-3 bg-slate-700/30 p-3 rounded-lg"
            >
              <div className="flex-1">
                <div className="text-sm font-medium text-white">
                  {expense.merchantName}
                </div>
                <div className="text-xs text-slate-400">
                  ${expense.expenseAmount.toLocaleString('en-US', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </div>
              </div>

              <div className="flex-1">
                <Select
                  value={selectedMappings.get(expense.merchantName) || ''}
                  onValueChange={(value) => handleMerchantSelect(expense.merchantName, value)}
                >
                  <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                    <SelectValue placeholder="Select merchant..." />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700 max-h-[300px]">
                    {merchants.map((merchant) => (
                      <SelectItem
                        key={merchant.id}
                        value={merchant.id}
                        className="text-white"
                      >
                        {merchant.merchant_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button
                size="sm"
                onClick={() => saveSingleMapping(expense.merchantName)}
                disabled={
                  !selectedMappings.get(expense.merchantName) ||
                  savingIndividual.has(expense.merchantName)
                }
                className="bg-cyan-500 hover:bg-cyan-600 disabled:opacity-50"
              >
                {savingIndividual.has(expense.merchantName) ? (
                  'Saving...'
                ) : (
                  <>
                    <Check className="h-4 w-4 mr-1" />
                    Save Mapping
                  </>
                )}
              </Button>
            </div>
          ))}
        </div>

        <div className="pt-4 border-t border-slate-700">
          <Button
            onClick={saveAllMappings}
            disabled={selectedMappings.size === 0 || savingAll}
            className="w-full bg-cyan-500 hover:bg-cyan-600 disabled:opacity-50"
          >
            {savingAll ? 'Saving All...' : `Save All Mappings (${selectedMappings.size})`}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
