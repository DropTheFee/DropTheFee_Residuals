export interface NMIExpenseRecord {
  merchantName: string;
  expenseAmount: number;
  matched: boolean;
  merchantId: string | null;
}

export function parseNMIFile(csvText: string): NMIExpenseRecord[] {
  const lines = csvText.split('\n').filter(line => line.trim());
  if (lines.length < 2) return [];

  const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim());
  const merchantIdx = headers.indexOf('Merchant');
  const yourCostIdx = headers.indexOf('Your Cost');
  const quantityIdx = headers.indexOf('Quantity');

  if (merchantIdx === -1 || yourCostIdx === -1 || quantityIdx === -1) {
    throw new Error('Invalid NMI file format: missing Merchant, Your Cost, or Quantity columns');
  }

  const totals = new Map<string, number>();

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',').map(c => c.replace(/"/g, '').trim());
    if (!cols[merchantIdx]) continue;
    const name = cols[merchantIdx];
    const cost = parseFloat(cols[yourCostIdx]) || 0;
    const qty = parseFloat(cols[quantityIdx]) || 0;
    totals.set(name, (totals.get(name) || 0) + (cost * qty));
  }

  return Array.from(totals.entries()).map(([merchantName, expenseAmount]) => ({
    merchantName,
    expenseAmount,
    matched: false,
    merchantId: null,
  }));
}

export function matchNMIMerchants(
  expenses: NMIExpenseRecord[],
  merchants: { id: string; merchant_name: string }[],
  savedMappings: { expense_name: string; merchant_id: string }[]
): NMIExpenseRecord[] {
  return expenses.map(expense => {
    const savedMapping = savedMappings.find(
      m => m.expense_name.toLowerCase() === expense.merchantName.toLowerCase()
    );
    if (savedMapping) {
      return { ...expense, matched: true, merchantId: savedMapping.merchant_id };
    }
    const exactMatch = merchants.find(
      m => m.merchant_name.toLowerCase() === expense.merchantName.toLowerCase()
    );
    if (exactMatch) {
      return { ...expense, matched: true, merchantId: exactMatch.id };
    }
    return expense;
  });
}
