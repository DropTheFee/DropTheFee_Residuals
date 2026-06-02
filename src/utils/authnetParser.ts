export interface AuthNetExpense {
  merchantName: string;
  expenseAmount: number;
  reportDate: string;
}

export function parseAuthNetTxt(fileContent: string): AuthNetExpense[] {
  const lines = fileContent.split('\n');
  const expenses: AuthNetExpense[] = [];

  let headerIndex = -1;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.includes('Date\t') && line.includes('Item\t') && line.includes('Type\t') && line.includes('Amount\t')) {
      headerIndex = i;
      break;
    }
  }

  if (headerIndex === -1) {
    throw new Error('Invalid Auth.net file format: Header row not found');
  }

  const headers = lines[headerIndex].split('\t').map(h => h.trim());
  const dateIndex = headers.indexOf('Date');
  const itemIndex = headers.indexOf('Item');
  const typeIndex = headers.indexOf('Type');
  const amountIndex = headers.indexOf('Amount');

  if (dateIndex === -1 || itemIndex === -1 || typeIndex === -1 || amountIndex === -1) {
    throw new Error('Invalid Auth.net file format: Missing required columns');
  }

  for (let i = headerIndex + 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const columns = line.split('\t');

    if (columns.length <= Math.max(dateIndex, itemIndex, typeIndex, amountIndex)) {
      continue;
    }

    const item = columns[itemIndex]?.trim() || '';
    const type = columns[typeIndex]?.trim() || '';
    const dateStr = columns[dateIndex]?.trim() || '';
    const amountStr = columns[amountIndex]?.trim() || '';

    if (type === 'Transfer' && item === 'Intra Account Transfer') {
      const cleanAmount = amountStr.replace(/[$,]/g, '');
      const amount = parseFloat(cleanAmount);

      if (isNaN(amount)) {
        console.warn(`Skipping row with invalid amount: ${amountStr}`);
        continue;
      }

      const dateParts = dateStr.split(' ')[0];
      const [month, day, year] = dateParts.split('-');
      const reportDate = `${year}-${month.padStart(2, '0')}-01`;

      expenses.push({
        merchantName: '',
        expenseAmount: amount,
        reportDate: reportDate
      });
    }
  }

  if (expenses.length === 0) {
    throw new Error('No Transfer expenses found in Auth.net file');
  }

  return expenses;
}

export interface AuthNetCsvExpense {
  paymentGatewayId: string;
  expenseAmount: number;
  reportDate: string;
  matched: boolean;
  merchantId: string | null;
}

function splitCsvRow(line: string): string[] {
  return line.split(',').map(c => c.replace(/^"|"$/g, '').trim());
}

export function parseAuthNetCsv(csvText: string): AuthNetCsvExpense[] {
  const lines = csvText.split(/\r?\n/).filter(line => line.trim());
  if (lines.length < 2) return [];

  const headers = splitCsvRow(lines[0]);
  const gatewayIdx = headers.indexOf('Payment Gateway ID');
  const residualIdx = headers.indexOf('Residual Amount');
  const monthIdx = headers.indexOf('Collection Month');
  const yearIdx = headers.indexOf('Collection Year');

  if (gatewayIdx === -1 || residualIdx === -1 || monthIdx === -1 || yearIdx === -1) {
    throw new Error('Invalid Auth.net CSV format: missing one of Payment Gateway ID, Residual Amount, Collection Month, Collection Year');
  }

  const expenses: AuthNetCsvExpense[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = splitCsvRow(lines[i]);
    const gatewayId = cols[gatewayIdx];
    if (!gatewayId) continue;

    const residual = parseFloat(cols[residualIdx]);
    if (isNaN(residual)) continue;

    const month = parseInt(cols[monthIdx], 10);
    const year = parseInt(cols[yearIdx], 10);
    if (isNaN(month) || isNaN(year)) continue;

    const reportDate = `${year}-${String(month).padStart(2, '0')}-01`;

    expenses.push({
      paymentGatewayId: gatewayId,
      expenseAmount: residual,
      reportDate,
      matched: false,
      merchantId: null,
    });
  }

  return expenses;
}

export function matchAuthNetCsvMerchants(
  expenses: AuthNetCsvExpense[],
  savedMappings: { expense_name: string; merchant_id: string }[]
): AuthNetCsvExpense[] {
  return expenses.map(expense => {
    const savedMapping = savedMappings.find(
      m => m.expense_name === expense.paymentGatewayId
    );
    if (savedMapping) {
      return { ...expense, matched: true, merchantId: savedMapping.merchant_id };
    }
    return expense;
  });
}
