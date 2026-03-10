import * as XLSX from 'xlsx';

export interface DejavooExpenseRecord {
  merchantName: string;
  expenseAmount: number;
}

function normalizeMerchantName(name: string): string {
  return name.toLowerCase().replace(/[^\w\s]/g, '').replace(/\s+/g, ' ').trim();
}

export async function parseDejavooFile(file: File): Promise<DejavooExpenseRecord[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const worksheet = workbook.Sheets['Merchant Summary'];
        if (!worksheet) { reject(new Error('Sheet "Merchant Summary" not found')); return; }

        const rows = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1 });
        const headers = rows[0] as string[];
        
        const nameIdx = headers.findIndex(h => String(h).trim() === 'Merchant DBA');
        const totalIdx = headers.findIndex(h => String(h).trim() === 'Total');

        if (nameIdx === -1) { reject(new Error('Merchant DBA column not found')); return; }
        if (totalIdx === -1) { reject(new Error('Total column not found')); return; }

        const records: DejavooExpenseRecord[] = [];
        for (let i = 1; i < rows.length; i++) {
          const row = rows[i] as any[];
          const name = row[nameIdx];
          const amount = row[totalIdx];
          if (!name || name === '') continue;
          if (amount === undefined || amount === null) continue;
          records.push({
            merchantName: String(name).trim(),
            expenseAmount: Number(amount),
          });
        }
        resolve(records);
      } catch (error) { reject(error); }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsBinaryString(file);
  });
}

export async function matchMerchantsToExpenses(
  expenses: DejavooExpenseRecord[],
  existingMerchants: Array<{ id: string; merchant_name: string }>
): Promise<Array<DejavooExpenseRecord & { merchantId: string | null; matched: boolean }>> {
  const merchantMap = new Map<string, string>();
  existingMerchants.forEach(m => {
    merchantMap.set(normalizeMerchantName(m.merchant_name), m.id);
  });
  return expenses.map(expense => {
    const merchantId = merchantMap.get(normalizeMerchantName(expense.merchantName)) || null;
    return { ...expense, merchantId, matched: merchantId !== null };
  });
}