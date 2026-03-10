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

function columnToLetter(columnIndex: number): string {
  let letter = '';
  while (columnIndex >= 0) {
    letter = String.fromCharCode((columnIndex % 26) + 65) + letter;
    columnIndex = Math.floor(columnIndex / 26) - 1;
  }
  return letter;
}

function findColumnByHeader(worksheet: XLSX.WorkSheet, headerText: string, headerRow: number = 0): number | null {
  const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');

  for (let col = range.s.c; col <= range.e.c; col++) {
    const cellAddress = XLSX.utils.encode_cell({ r: headerRow, c: col });
    const cell = worksheet[cellAddress];

    if (cell && cell.v) {
      const cellValue = String(cell.v).toLowerCase().trim();
      const searchText = headerText.toLowerCase().trim();

      if (cellValue.includes(searchText)) {
        return col;
      }
    }
  }

  return null;
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

        const merchantNameColIndex = findColumnByHeader(worksheet, 'Merchant DBA');
        const totalColIndex = findColumnByHeader(worksheet, 'Total');

        if (merchantNameColIndex === null) {
          reject(new Error('Could not find "Merchant DBA" column in header row'));
          return;
        }

        if (totalColIndex === null) {
          reject(new Error('Could not find "Total" column in header row'));
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
