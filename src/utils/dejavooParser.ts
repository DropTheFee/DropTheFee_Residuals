import * as XLSX from 'xlsx';

// One row per TPN from the Dejavoo iPosPays "Details" sheet.
export interface DejavooExpenseRecord {
  merchantName: string;
  mid: string;
  expenseAmount: number;
}

export interface DejavooMatchedExpense extends DejavooExpenseRecord {
  merchantId: string | null;
  matched: boolean;
  matchedBy: 'mid' | 'mid_trailing_zero' | 'mapping' | null;
  tpnCount: number;
}

// Some Mid cells hold comma-separated duplicates ("530961120032735,530961120032735");
// use the first value.
function firstMid(value: unknown): string {
  if (value === null || value === undefined) return '';
  return String(value).split(',')[0].trim();
}

export async function parseDejavooFile(file: File): Promise<DejavooExpenseRecord[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const worksheet = workbook.Sheets['Details'];
        if (!worksheet) { reject(new Error('Sheet "Details" not found')); return; }

        const rows = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1 });
        const headers = rows[0] as string[];

        const nameIdx = headers.findIndex(h => String(h).trim() === 'Merchant DBA');
        const midIdx = headers.findIndex(h => String(h).trim() === 'Mid');
        const totalIdx = headers.findIndex(h => String(h).trim() === 'Total');

        if (nameIdx === -1) { reject(new Error('Merchant DBA column not found')); return; }
        if (midIdx === -1) { reject(new Error('Mid column not found')); return; }
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
            mid: firstMid(row[midIdx]),
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

// Match order: exact MID, MID with one trailing 0 removed, then saved
// expense_name_mappings by Merchant DBA. Anything else stays unmatched for
// manual mapping. TPN rows are summed per matched merchant; unmatched rows are
// summed per MID (or per DBA when the Mid cell is blank).
export async function matchMerchantsToExpenses(
  expenses: DejavooExpenseRecord[],
  existingMerchants: Array<{ id: string; merchant_name: string; merchant_id: string | null }>,
  savedMappings?: Array<{ expense_name: string; merchant_id: string }>
): Promise<DejavooMatchedExpense[]> {
  const savedMappingMap = new Map<string, string>();
  if (savedMappings) {
    savedMappings.forEach(m => {
      savedMappingMap.set(m.expense_name, m.merchant_id);
    });
  }

  // MID -> merchant ids. A MID shared by more than one merchant is ambiguous
  // and is not used for matching.
  const merchantsByMid = new Map<string, Set<string>>();
  existingMerchants.forEach(m => {
    const mid = m.merchant_id ? String(m.merchant_id).trim() : '';
    if (!mid) return;
    if (!merchantsByMid.has(mid)) merchantsByMid.set(mid, new Set());
    merchantsByMid.get(mid)!.add(m.id);
  });

  const lookupMid = (mid: string): string | null => {
    const ids = merchantsByMid.get(mid);
    return ids && ids.size === 1 ? [...ids][0] : null;
  };

  const grouped = new Map<string, DejavooMatchedExpense>();

  expenses.forEach(expense => {
    let merchantId: string | null = null;
    let matchedBy: DejavooMatchedExpense['matchedBy'] = null;

    if (expense.mid) {
      merchantId = lookupMid(expense.mid);
      if (merchantId) {
        matchedBy = 'mid';
      } else if (expense.mid.length > 1 && expense.mid.endsWith('0')) {
        merchantId = lookupMid(expense.mid.slice(0, -1));
        if (merchantId) matchedBy = 'mid_trailing_zero';
      }
    }

    if (!merchantId) {
      const savedMerchantId = savedMappingMap.get(expense.merchantName);
      if (savedMerchantId) {
        merchantId = savedMerchantId;
        matchedBy = 'mapping';
      }
    }

    const key = merchantId ? `merchant:${merchantId}` : `unmatched:${expense.mid || expense.merchantName}`;
    const existing = grouped.get(key);
    if (existing) {
      existing.expenseAmount += expense.expenseAmount;
      existing.tpnCount += 1;
    } else {
      grouped.set(key, {
        ...expense,
        merchantId,
        matched: merchantId !== null,
        matchedBy,
        tpnCount: 1,
      });
    }
  });

  return [...grouped.values()].map(e => ({
    ...e,
    expenseAmount: Math.round(e.expenseAmount * 100) / 100,
  }));
}
