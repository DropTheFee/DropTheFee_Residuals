const getLogoBase64 = (): string => {
  return 'data:image/png;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/4gHYSUNDX1BST0ZJTEUAAQEAAAHIAAAAAAQwAABtbnRyUkdCIFhZWiAH4AABAAEAAAAAAABhY3NwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAA9tYAAQAAAADTLQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAlkZXNjAAAA8AAAACRyWFlaAAABFAAAABRnWFlaAAABKAAAABRiWFlaAAABPAAAABR3dHB0AAABUAAAABRyVFJDAAABZAAAAChnVFJDAAABZAAAAChiVFJDAAABZAAAAChjcHJ0AAABjAAAADxtbHVjAAAAAAAAAAEAAAAMZW5VUwAAAAgAAAAcAHMAUgBHAEJYWVogAAAAAAAAb6IAADj1AAADkFhZWiAAAAAAAABimQAAt4UAABjaWFlaIAAAAAAAACSgAAAPhAAAts9YWVogAAAAAAAA9tYAAQAAAADTLXBhcmEAAAAAAAQAAAACZmYAAPKnAAANWQAAE9AAAApbAAAAAAAAAABtbHVjAAAAAAAAAAEAAAAMZW5VUwAAACAAAAAcAEcAbwBvAGcAbABlACAASQBuAGMALgAgADIAMAAxADb/2wBDAAUDBAQEAwUEBAQFBQUGBwwIBwcHBw8LCwkMEQ8SEhEPERETFhwXExQaFRERGCEYGh0dHx8fExciJCIeJBweHx7/2wBDAQUFBQcGBw4ICA4eFBEUHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh7/wAARCACeAdQDASIAAhEBAxEB/8QAHAABAAEFAQEAAAAAAAAAAAAAAAYDBAUHCAIB/8QAVhAAAQMDAQQECQYJBgsJAQAAAQACAwQFEQYHEiExE0FRYQgUFSJxgZGhsTI1QnOj0RYjUlRicoLB4TeSorKz8BczNlVWZHWTpMLTJCU0Q1NjZYPi8f/EABsBAQADAQEBAQAAAAAAAAAAAAACAwQBBQYH/8QANhEAAgIBAgMECAQGAwAAAAAAAAECAxEEEgUhMRNBUWEUIjJxgZGh8AYjscEzQlLR4fEVU3L/2gAMAwEAAhEDEQA/AOMkREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREARFfUdprqoBzIS1h+k/gFKMJSeIrJxyUebLFFmayyx0NIZ6qrG9yaxjflHsyVJNmmzC9a2pamuikZQ0UTHCKeZhImlHJo7s83dXeVKVU4vDXMot1VVUHZOWEiBIr2+Wq4WS6z2u6Uz6argduyRu+I7QeYI4EKyVZfGSksp8giIh0IiIAiIgCIiAIiIAiIgCIiAIiIAiIgCIiAIiIAiIgCIiAIiIAiIgCIiAIiIAiIgCIiAIiIAiIgCIiAIiIAiIgCIiAIiIAriho562booGZPWTyaO9KCllrKlsEQ4nmepo7VNbfSQ0VOIYRw+k483HtK1abTO15fQouuVawupaWyzUtGA9wE035ThwHoCvquoipYHTTO3WN9/csdebzFRkwwgST9fY30/cpHse2cXTaFdWXG6umjssT8Of8AJM5HNjOwdrurkOPLbO+FPqVrmYLZKEHbc8L9fce9lGz247RbyLpcmSU9hgfgkHBmxzY09n5TurkOPLp6lpKK30UNvt8EcFLTsDI2MbgADqA7FWgp6K12+K1WuGOCmhYGBsbcNwOQHcvKyxTzl9T4zifEJ6ueOiXReH+fFkH2s7Pbfri1ZG5TXaBp8Vqsf0H9rT7QeI6weTb5arhZLrPa7pTPpquB27JG74jtB5gjgQu6TwGStEeEXd9DXekZRQSiu1JCQ2CSiw4MGeLJHciOfAZIPZk5hbBPn3np8A4jdCaoaco/p/g0AirPgMFV0NUHxbpw/Dd4gdwyM+1SG26Nq73HI7TdworvNG0vdSMcYqkNHM9G8De/YLlm2vOD7Kd0K1mTwvHu+ZGEVSohmp53wVEUkMsbi18b2lrmkdRB5FU1ws6hERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREARFfWOnFTcomOGWNO+70D+4UoRcpKKOSe1ZJHp6hFHRB7h+NlAc7uHUF41Dc/E4RDCfx7xz/JHasjLI2KJ0jzhrQXH0BRCnjlvF3O9kB53nH8lo/vherdJ1QVdfVmCtb5OcuhZwSNZUMllibM1rw5zHEgPGeIJBB49xyum9nW1i111vht1BRU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';
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

  const logoBase64 = getLogoBase64();

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  };

  const merchantResults = results.filter(
    r => r.source_type === 'merchant' && !r.override_from_user_id && r.rep_payout !== 0
  );

  const totalVolume = merchantResults.reduce((sum, r) => sum + (r.monthly_volume || 0), 0);
  const totalGrossResidual = merchantResults.reduce((sum, r) => sum + (r.gross_residual || 0), 0);
  const totalExpenses = merchantResults.reduce((sum, r) => sum + (r.expenses || 0), 0);
  const totalNetResidual = merchantResults.reduce((sum, r) => sum + (r.net_residual || 0), 0);
  const totalPayout = results
    .filter(r => r.rep_payout !== 0)
    .reduce((sum, r) => sum + (r.rep_payout || 0), 0);

  const tableRows = merchantResults.map(result => `
    <tr>
      <td>${result.merchant_name || ''}</td>
      <td>${result.merchants?.merchant_id || result.mid || ''}</td>
      <td>${result.processor || ''}</td>
      <td style="text-align: right;">${formatCurrency(result.monthly_volume || 0)}</td>
      <td style="text-align: right;">${(result.split_pct || 0).toFixed(2)}%</td>
      <td style="text-align: right;">${formatCurrency(result.gross_residual || 0)}</td>
      <td style="text-align: right;">${formatCurrency(result.expenses || 0)}</td>
      <td style="text-align: right;">${formatCurrency(result.net_residual || 0)}</td>
      <td style="text-align: right;">${formatCurrency(result.rep_payout || 0)}</td>
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
    .header-left { flex: 1; }
    .header-logo { height: 60px; margin-left: 20px; background-color: white; padding: 4px; }
    .rep-name { font-size: 32px; font-weight: bold; margin: 0 0 10px 0; }
    .period { font-size: 18px; color: #333333; margin: 0 0 5px 0; }
    .agency { font-size: 16px; color: #666666; margin: 0; }
    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
    th {
      background-color: #f8f9fa;
      padding: 12px 8px;
      text-align: left;
      border: 1px solid #dee2e6;
      font-weight: 600;
      font-size: 14px;
    }
    td { padding: 10px 8px; border: 1px solid #dee2e6; font-size: 14px; }
    tr:nth-child(even) { background-color: #f8f9fa; }
    .totals-row { font-weight: bold; background-color: #e9ecef !important; }
    .totals-row td { border-top: 2px solid #000000; }
    @media print {
      @page { orientation: landscape; size: landscape; }
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
    <img src="${logoBase64}" alt="DropTheFee" class="header-logo" />
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