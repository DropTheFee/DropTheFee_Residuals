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
