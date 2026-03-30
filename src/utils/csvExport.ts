const getLogoBase64 = async (): Promise<string> => {
  try {
    const response = await fetch('https://mgx-backend-cdn.metadl.com/generate/images/770325/2026-01-26/7cffe5ff-62e8-41d1-92d2-8e125cff7f5f.png');
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error('Error loading logo:', error);
    return '';
  }
};

export const exportRepStatementToHTML = async (
  repName: string,
  periodMonth: string,
  results: any[]
) => {
  const date = new Date(periodMonth + 'T12:00:00');
  const month = date.toLocaleDateString('en-US', { month: 'long' });
  const year = date.getFullYear();

  const sanitizeName = (name: string) => name.replace(/[^a-zA-Z0-9]/g, '_');
  const filename = `${sanitizeName(repName)}_${month}_${year}_Statement.html`;

  const logoBase64 = await getLogoBase64();

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  };

  const merchantResults = results.filter(
    r => r.source_type === 'merchant' && !r.override_from_user_id && r.payout_amount !== 0
  );

  const totalVolume = merchantResults.reduce((sum, r) => sum + r.monthly_volume, 0);
  const totalGrossResidual = merchantResults.reduce((sum, r) => sum + r.gross_residual, 0);
  const totalExpenses = merchantResults.reduce((sum, r) => sum + r.expenses, 0);
  const totalNetResidual = merchantResults.reduce((sum, r) => sum + r.net_residual, 0);
  const totalPayout = results
    .filter(r => r.payout_amount !== 0)
    .reduce((sum, r) => sum + r.payout_amount, 0);

  const tableRows = merchantResults.map(result => `
    <tr>
      <td>${result.merchant_name || ''}</td>
      <td>${result.mid || ''}</td>
      <td>${result.processor || ''}</td>
      <td style="text-align: right;">${formatCurrency(result.monthly_volume)}</td>
      <td style="text-align: right;">${result.tier_percentage.toFixed(2)}%</td>
      <td style="text-align: right;">${formatCurrency(result.gross_residual)}</td>
      <td style="text-align: right;">${formatCurrency(result.expenses)}</td>
      <td style="text-align: right;">${formatCurrency(result.net_residual)}</td>
      <td style="text-align: right;">${formatCurrency(result.payout_amount)}</td>
    </tr>
  `).join('');

  const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${repName} - ${month} ${year} Commission Statement</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      margin: 0;
      padding: 40px;
      background: #ffffff;
      color: #000000;
    }
    .header {
      margin-bottom: 40px;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }
    .header-left {
      flex: 1;
    }
    .header-logo {
      height: 60px;
      margin-left: 20px;
    }
    .rep-name {
      font-size: 32px;
      font-weight: bold;
      margin: 0 0 10px 0;
    }
    .period {
      font-size: 18px;
      color: #333333;
      margin: 0 0 5px 0;
    }
    .agency {
      font-size: 16px;
      color: #666666;
      margin: 0;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 20px;
    }
    th {
      background-color: #f8f9fa;
      padding: 12px 8px;
      text-align: left;
      border: 1px solid #dee2e6;
      font-weight: 600;
      font-size: 14px;
    }
    td {
      padding: 10px 8px;
      border: 1px solid #dee2e6;
      font-size: 14px;
    }
    tr:nth-child(even) {
      background-color: #f8f9fa;
    }
    .totals-row {
      font-weight: bold;
      background-color: #e9ecef !important;
    }
    .totals-row td {
      border-top: 2px solid #000000;
    }
    @media print {
      @page {
        orientation: landscape;
        size: landscape;
      }
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="header-left">
      <h1 class="rep-name">${repName}</h1>
      <p class="period">${month} ${year}</p>
      <p class="agency">Recherché Merchant Solutions</p>
    </div>
    ${logoBase64 ? `<img src="${logoBase64}" alt="DropTheFee" class="header-logo" />` : ''}
  </div>

  <table>
    <thead>
      <tr>
        <th>Merchant Name</th>
        <th>MID</th>
        <th>Processor</th>
        <th style="text-align: right;">Total Volume</th>
        <th style="text-align: right;">Split %</th>
        <th style="text-align: right;">Gross Residual</th>
        <th style="text-align: right;">Expenses</th>
        <th style="text-align: right;">Net Residual</th>
        <th style="text-align: right;">Rep Payout</th>
      </tr>
    </thead>
    <tbody>
      ${tableRows}
      <tr class="totals-row">
        <td colspan="3"><strong>TOTALS</strong></td>
        <td style="text-align: right;">${formatCurrency(totalVolume)}</td>
        <td style="text-align: right;"></td>
        <td style="text-align: right;">${formatCurrency(totalGrossResidual)}</td>
        <td style="text-align: right;">${formatCurrency(totalExpenses)}</td>
        <td style="text-align: right;">${formatCurrency(totalNetResidual)}</td>
        <td style="text-align: right;">${formatCurrency(totalPayout)}</td>
      </tr>
    </tbody>
  </table>
</body>
</html>`;

  const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8;' });
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

export default exportRepStatementToHTML;
