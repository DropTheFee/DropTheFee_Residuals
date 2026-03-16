const CYBERSOURCE_MERCHANT_IDS = [
  { id: '3f66dd80-f806-497c-a52c-036e55912c29', name: 'EARNHEART CRESCENT LLC' },
  { id: '2a278096-1488-4f89-bc3b-a148ed720669', name: 'EARNHEART PROPANE LLC' },
  { id: 'edea099c-ad05-4d43-808a-46768db3e444', name: 'EARNHEART STATIONS LLC' },
  { id: '4a2f9808-94e8-4c29-99d9-79be8e2f46e7', name: 'TRIANGLE TRAILER REPAIR LLC' },
];

export interface CyberSourceExpenseRecord {
  merchantName: string;
  merchantId: string;
  expenseAmount: number;
  matched: boolean;
}

export function parseCyberSourceFile(csvText: string): CyberSourceExpenseRecord[] {
  const lines = csvText.split('\n').filter(line => line.trim());
  if (lines.length < 2) return [];

  const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim());
  const totalIdx = headers.indexOf('Total Amount Due');

  if (totalIdx === -1) {
    throw new Error('Invalid CyberSource file format: missing Total Amount Due column');
  }

  let grandTotal = 0;
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',').map(c => c.replace(/"/g, '').trim());
    const amount = parseFloat(cols[totalIdx]) || 0;
    grandTotal += amount;
  }

  const splitAmount = parseFloat((grandTotal / CYBERSOURCE_MERCHANT_IDS.length).toFixed(2));

  // Handle rounding remainder on first merchant
  const remainder = parseFloat(
    (grandTotal - splitAmount * CYBERSOURCE_MERCHANT_IDS.length).toFixed(2)
  );

  return CYBERSOURCE_MERCHANT_IDS.map((merchant, idx) => ({
    merchantName: merchant.name,
    merchantId: merchant.id,
    expenseAmount: idx === 0 ? parseFloat((splitAmount + remainder).toFixed(2)) : splitAmount,
    matched: true,
  }));
}
