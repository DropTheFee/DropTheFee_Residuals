import { supabase } from '@/lib/supabase';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);

export const exportRepStatementToHTML = async (
  repName: string,
  periodMonth: string,
  results: any[]
) => {
  const date = new Date(periodMonth + 'T12:00:00');
  const month = date.toLocaleDateString('en-US', { month: 'long' });
  const year = date.getFullYear();

  const sanitizeName = (name: string) => name.replace(/[^a-zA-Z0-9]/g, '_');
  const filename = `${sanitizeName(repName)}_${month}_${year}_Statement.pdf`;

  // Fetch merchant MIDs
  const merchantIds = results.map((r) => r.merchant_id).filter(Boolean);
  const merchantMidMap: Record<string, string> = {};

  if (merchantIds.length > 0) {
    const { data: merchantData } = await supabase
      .from('merchants')
      .select('id, merchant_id')
      .in('id', merchantIds);

    if (merchantData) {
      merchantData.forEach((m: any) => {
        merchantMidMap[m.id] = m.merchant_id || '';
      });
    }
  }

  const merchantResults = results.filter(
    (r) => r.source_type === 'merchant' && !r.override_from_user_id && r.rep_payout !== 0
  );

  const totalVolume = merchantResults.reduce((s, r) => s + (r.monthly_volume || 0), 0);
  const totalGross = merchantResults.reduce((s, r) => s + (r.gross_residual || 0), 0);
  const totalExpenses = merchantResults.reduce((s, r) => s + (r.expenses || 0), 0);
  const totalNet = merchantResults.reduce((s, r) => s + (r.net_residual || 0), 0);
  const totalPayout = results
    .filter((r) => r.rep_payout !== 0)
    .reduce((s, r) => s + (r.rep_payout || 0), 0);

  // Build PDF landscape
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'letter' });

  // Header
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text(repName, 40, 50);

  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text(`${month} ${year}`, 40, 68);
  doc.text('Recherché Merchant Solutions', 40, 84);

  // Table
  const tableRows = merchantResults.map((r) => [
    r.merchant_name || '',
    merchantMidMap[r.merchant_id] || r.mid || '',
    r.processor || '',
    formatCurrency(r.monthly_volume || 0),
    `${(r.split_pct || 0).toFixed(2)}%`,
    formatCurrency(r.gross_residual || 0),
    formatCurrency(r.expenses || 0),
    formatCurrency(r.net_residual || 0),
    formatCurrency(r.rep_payout || 0),
  ]);

  // Totals row
  tableRows.push([
    'TOTALS', '', '',
    formatCurrency(totalVolume),
    '',
    formatCurrency(totalGross),
    formatCurrency(totalExpenses),
    formatCurrency(totalNet),
    formatCurrency(totalPayout),
  ]);

  autoTable(doc, {
    startY: 100,
    head: [[
      'Merchant Name', 'MID', 'Processor',
      'Volume', 'Split %',
      'Gross Residual', 'Expenses', 'Net Residual', 'Rep Payout',
    ]],
    body: tableRows,
    styles: { fontSize: 8, cellPadding: 4 },
    headStyles: { fillColor: [40, 40, 40], textColor: 255, fontStyle: 'bold' },
    columnStyles: {
      0: { cellWidth: 120 },
      1: { cellWidth: 70 },
      2: { cellWidth: 60 },
      3: { halign: 'right', cellWidth: 75 },
      4: { halign: 'right', cellWidth: 45 },
      5: { halign: 'right', cellWidth: 80 },
      6: { halign: 'right', cellWidth: 65 },
      7: { halign: 'right', cellWidth: 80 },
      8: { halign: 'right', cellWidth: 75 },
    },
    didParseCell: (data) => {
      // Bold the totals row
      if (data.row.index === tableRows.length - 1) {
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.fillColor = [230, 230, 230];
      }
    },
  });

  doc.save(filename);
  return filename;
};