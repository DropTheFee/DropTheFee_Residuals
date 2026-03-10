import * as XLSX from 'xlsx';

export interface DejavooExpenseRecord {
  merchantName: string;
  expenseAmount: number;
}

function normalizeMerchantName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export async function parseDejavooFile(file: File): Promise<DejavooExpenseRecord[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });

        const sheetName = 'Merchant Summary';
        const worksheet = workbook.Sheets[sheetName];

        if (!worksheet) {
          reject(new Error(`Sheet "${sheetName}" not found in file`));
          return;
        }

        const records: DejavooExpenseRecord[] = [];
        let rowIndex = 1;

        while (true) {
          const merchantNameCell = `B${rowIndex}`;
          const expenseAmountCell = `O${rowIndex}`;

          const merchantName = worksheet[merchantNameCell]?.v;
          const expenseAmount = worksheet[expenseAmountCell]?.v;

          if (merchantName === undefined || merchantName === null || merchantName === '') {
            if (rowIndex > 1000) break;
            rowIndex++;
            continue;
          }

          if (expenseAmount !== undefined && expenseAmount !== null) {
            records.push({
              merchantName: String(merchantName).trim(),
              expenseAmount: Number(expenseAmount),
            });
          }

          rowIndex++;

          if (rowIndex > 10000) break;
        }

        resolve(records);
      } catch (error) {
        reject(error);
      }
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

  existingMerchants.forEach(merchant => {
    const normalizedName = normalizeMerchantName(merchant.merchant_name);
    merchantMap.set(normalizedName, merchant.id);
  });

  return expenses.map(expense => {
    const normalizedExpenseName = normalizeMerchantName(expense.merchantName);
    const merchantId = merchantMap.get(normalizedExpenseName) || null;

    return {
      ...expense,
      merchantId,
      matched: merchantId !== null,
    };
  });
}
