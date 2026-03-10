import * as XLSX from 'xlsx';

export interface DejavooExpenseRecord {
  merchantName: string;
  expenseAmount: number;
}

function normalizeMerchantName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function columnToLetter(columnIndex: number): string {
  let letter = '';
  let temp = columnIndex;

  while (temp >= 0) {
    letter = String.fromCharCode((temp % 26) + 65) + letter;
    temp = Math.floor(temp / 26) - 1;
  }

  return letter;
}

export function parseDejavooFile(file: File): Promise<DejavooExpenseRecord[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        if (!data) {
          reject(new Error('No data in file'));
          return;
        }

        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];

        if (!worksheet || !worksheet['!ref']) {
          reject(new Error('Invalid worksheet'));
          return;
        }

        const range = XLSX.utils.decode_range(worksheet['!ref']);
        let merchantNameColIndex = -1;
        let totalColIndex = -1;

        for (let col = range.s.c; col <= range.e.c; col++) {
          const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
          const cell = worksheet[cellAddress];
          const headerValue = cell?.v?.toString().toLowerCase() || '';

          if (headerValue.includes('merchant') && headerValue.includes('dba')) {
            merchantNameColIndex = col;
          }
          if (headerValue === 'total') {
            totalColIndex = col;
          }
        }

        if (merchantNameColIndex === -1 || totalColIndex === -1) {
          reject(new Error('Required columns not found. Expected "Merchant DBA" and "Total" columns.'));
          return;
        }

        const merchantNameCol = columnToLetter(merchantNameColIndex);
        const totalCol = columnToLetter(totalColIndex);

        const records: DejavooExpenseRecord[] = [];
        let rowIndex = 1;

        while (true) {
          const merchantNameCell = `${merchantNameCol}${rowIndex}`;
          const expenseAmountCell = `${totalCol}${rowIndex}`;

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
              expenseAmount: typeof expenseAmount === 'number' ? expenseAmount : parseFloat(String(expenseAmount)),
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
