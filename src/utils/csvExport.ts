export const exportRepStatementToCSV = (
  repName: string,
  periodMonth: string,
  results: any[]
) => {
  const date = new Date(periodMonth + 'T12:00:00');
  const month = date.toLocaleDateString('en-US', { month: 'long' });
  const year = date.getFullYear();

  const sanitizeName = (name: string) => name.replace(/[^a-zA-Z0-9]/g, '_');
  const filename = `${sanitizeName(repName)}_${month}_${year}_Statement.csv`;

  const merchantResults = results.filter(
    r => r.source_type === 'merchant' && !r.override_from_user_id
  );

  const headers = [
    'Merchant Name',
    'Processor',
    'Volume',
    'Gross Residual',
    'Expenses',
    'Net Residual',
    'Split %',
    'Rep Payout'
  ];

  const rows = merchantResults.map(result => [
    `"${(result.merchant_name || '').replace(/"/g, '""')}"`,
    `"${(result.processor || '').replace(/"/g, '""')}"`,
    result.monthly_volume.toFixed(2),
    result.gross_residual.toFixed(2),
    result.expenses.toFixed(2),
    result.net_residual.toFixed(2),
    result.split_pct.toFixed(2),
    result.rep_payout.toFixed(2)
  ]);

  const totalVolume = merchantResults.reduce((sum, r) => sum + r.monthly_volume, 0);
  const totalGrossResidual = merchantResults.reduce((sum, r) => sum + r.gross_residual, 0);
  const totalExpenses = merchantResults.reduce((sum, r) => sum + r.expenses, 0);
  const totalNetResidual = merchantResults.reduce((sum, r) => sum + r.net_residual, 0);
  const totalPayout = results.reduce((sum, r) => sum + r.rep_payout, 0);

  rows.push([
    '"TOTAL"',
    '""',
    totalVolume.toFixed(2),
    totalGrossResidual.toFixed(2),
    totalExpenses.toFixed(2),
    totalNetResidual.toFixed(2),
    '""',
    totalPayout.toFixed(2)
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.join(','))
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  return filename;
};
