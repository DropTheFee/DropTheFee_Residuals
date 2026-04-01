import { supabase } from '@/lib/supabase';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { getRepDisplayName } from '@/utils/displayNames';

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
  results: any[],
  repId?: string
) => {
  const displayName = repId ? getRepDisplayName(repId, repName) : repName;
  const date = new Date(periodMonth + 'T12:00:00');
  const month = date.toLocaleDateString('en-US', { month: 'long' });
  const year = date.getFullYear();
  const sanitizeName = (name: string) => name.replace(/[^a-zA-Z0-9]/g, '_');
  const filename = `${sanitizeName(displayName)}_${month}_${year}_Statement.pdf`;

  const merchantResults = results.filter(
    (r) => r.source_type === 'merchant' && !r.override_from_user_id && r.rep_payout !== 0
  );

  // Look up MIDs by merchant name
  const merchantNames = merchantResults.map((r) => r.merchant_name).filter(Boolean);
  const merchantMidMap: Record<string, string> = {};

  if (merchantNames.length > 0) {
    const { data: merchantData } = await supabase
      .from('merchants')
      .select('merchant_name, merchant_id')
      .in('merchant_name', merchantNames);

    if (merchantData) {
      merchantData.forEach((m: any) => {
        merchantMidMap[m.merchant_name] = m.merchant_id || '';
      });
    }
  }

  // Look up rep names for SAE override debit rows
  const saeOverrideResults = results.filter(
    (r) => r.source_type === 'expense' && r.override_from_user_id != null && r.override_from_user_id !== ''
  );
  const overrideRepNames: Record<string, string> = {};

  if (saeOverrideResults.length > 0) {
    const overrideIds = [...new Set(saeOverrideResults.map((r: any) => r.override_from_user_id as string))];
    const { data: users } = await supabase
      .from('users')
      .select('id, full_name')
      .in('id', overrideIds);
    users?.forEach((u: any) => {
      overrideRepNames[u.id] = u.full_name || u.id;
    });
  }

  const nabResults     = results.filter((r) => r.source_type === 'nab');
  const surjResults    = results.filter((r) => r.source_type === 'surj');
  const manualResults  = results.filter(
    (r) => r.source_type === 'expense' && (r.override_from_user_id == null || r.override_from_user_id === '')
  );

  const totalVolume = merchantResults.reduce((s, r) => s + (r.monthly_volume || 0), 0);
  const totalGross = merchantResults.reduce((s, r) => s + (r.gross_residual || 0), 0);
  const totalExpenses = merchantResults.reduce((s, r) => s + (r.expenses || 0), 0);
  const totalNet = merchantResults.reduce((s, r) => s + (r.net_residual || 0), 0);
  const totalPayout = results
    .filter((r) => r.rep_payout !== 0)
    .reduce((s, r) => s + (r.rep_payout || 0), 0);

  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'letter' });

  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text(displayName, 40, 50);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text(`${month} ${year}`, 40, 68);
  doc.text('Recherché Merchant Solutions', 40, 84);

const imgProps = (doc as any).getImageProperties('/logo.png');
const logoWidth = 120;
const logoHeight = (imgProps.height * logoWidth) / imgProps.width;
doc.addImage('/logo.png', 'PNG', 650, 10, logoWidth, logoHeight);

  const tableRows = merchantResults.map((r) => [
    r.merchant_name || '',
    merchantMidMap[r.merchant_name] || r.mid || '',
    r.processor || '',
    formatCurrency(r.monthly_volume || 0),
    `${(r.split_pct || 0).toFixed(2)}%`,
    formatCurrency(r.gross_residual || 0),
    formatCurrency(r.expenses || 0),
    formatCurrency(r.net_residual || 0),
    formatCurrency(r.rep_payout || 0),
  ]);

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
      0: { cellWidth: 120},
      1: { cellWidth: 100},
      2: { cellWidth: 90},
      3: { halign: 'right', cellWidth: 75 },
      4: { halign: 'right', cellWidth: 45 },
      5: { halign: 'right', cellWidth: 80 },
      6: { halign: 'right', cellWidth: 65 },
      7: { halign: 'right', cellWidth: 80 },
      8: { halign: 'right', cellWidth: 75 },
    },
    didParseCell: (data) => {
      if (data.row.index === tableRows.length - 1) {
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.fillColor = [230, 230, 230];
      }
    },
  });

  // ── SAE Override Deductions ──────────────────────────────────────────────
  if (saeOverrideResults.length > 0) {
    const saeSubtotal = saeOverrideResults.reduce((s: number, r: any) => s + (r.rep_payout || 0), 0);
    const saeY = (doc as any).lastAutoTable.finalY + 20;

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('SAE Override Deductions', 40, saeY);

    const saeRows: any[] = saeOverrideResults.map((r: any) => [
      overrideRepNames[r.override_from_user_id] || r.override_from_user_id || '—',
      r.merchant_name || '',
      formatCurrency(r.rep_payout || 0),
    ]);
    saeRows.push([{ content: 'Subtotal', colSpan: 2, styles: { halign: 'right', fontStyle: 'bold', fillColor: [230, 230, 230] } }, { content: formatCurrency(saeSubtotal), styles: { halign: 'right', fontStyle: 'bold', fillColor: [230, 230, 230] } }]);

    autoTable(doc, {
      startY: saeY + 14,
      head: [['Rep', 'Description', 'Amount']],
      body: saeRows,
      styles: { fontSize: 8, cellPadding: 4 },
      headStyles: { fillColor: [40, 40, 40], textColor: 255, fontStyle: 'bold' },
      columnStyles: {
        0: { cellWidth: 160 },
        1: { cellWidth: 440 },
        2: { halign: 'right', cellWidth: 100 },
      },
    });
  }

  // ── EPI New Account Bonus ────────────────────────────────────────────────
  if (nabResults.length > 0) {
    const nabSubtotal = nabResults.reduce((s: number, r: any) => s + (r.rep_payout || 0), 0);
    const nabY = (doc as any).lastAutoTable.finalY + 20;

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('EPI New Account Bonus', 40, nabY);

    const nabRows: any[] = nabResults.map((r: any) => [
      r.merchant_name || '',
      formatCurrency(r.rep_payout || 0),
    ]);
    nabRows.push([{ content: 'Subtotal', styles: { halign: 'right', fontStyle: 'bold', fillColor: [230, 230, 230] } }, { content: formatCurrency(nabSubtotal), styles: { halign: 'right', fontStyle: 'bold', fillColor: [230, 230, 230] } }]);

    autoTable(doc, {
      startY: nabY + 14,
      head: [['Description', 'Amount']],
      body: nabRows,
      styles: { fontSize: 8, cellPadding: 4 },
      headStyles: { fillColor: [40, 40, 40], textColor: 255, fontStyle: 'bold' },
      columnStyles: {
        0: { cellWidth: 600 },
        1: { halign: 'right', cellWidth: 100 },
      },
    });
  }

  // ── SüRJ Platform ────────────────────────────────────────────────────────
  if (surjResults.length > 0) {
    const surjSubtotal = surjResults.reduce((s: number, r: any) => s + (r.rep_payout || 0), 0);
    const surjY = (doc as any).lastAutoTable.finalY + 20;

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('SüRJ Platform', 40, surjY);

    const surjRows: any[] = surjResults.map((r: any) => [
      r.merchant_name || '',
      formatCurrency(r.rep_payout || 0),
    ]);
    surjRows.push([{ content: 'Subtotal', styles: { halign: 'right', fontStyle: 'bold', fillColor: [230, 230, 230] } }, { content: formatCurrency(surjSubtotal), styles: { halign: 'right', fontStyle: 'bold', fillColor: [230, 230, 230] } }]);

    autoTable(doc, {
      startY: surjY + 14,
      head: [['Description', 'Amount']],
      body: surjRows,
      styles: { fontSize: 8, cellPadding: 4 },
      headStyles: { fillColor: [40, 40, 40], textColor: 255, fontStyle: 'bold' },
      columnStyles: {
        0: { cellWidth: 600 },
        1: { halign: 'right', cellWidth: 100 },
      },
    });
  }

  // ── Manual Expenses ──────────────────────────────────────────────────────
  if (manualResults.length > 0) {
    const manualSubtotal = manualResults.reduce((s: number, r: any) => s + (r.rep_payout || 0), 0);
    const manualY = (doc as any).lastAutoTable.finalY + 20;

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Manual Expenses', 40, manualY);

    const manualRows: any[] = manualResults.map((r: any) => [
      r.merchant_name || '',
      formatCurrency(r.rep_payout || 0),
    ]);
    manualRows.push([{ content: 'Subtotal', styles: { halign: 'right', fontStyle: 'bold', fillColor: [230, 230, 230] } }, { content: formatCurrency(manualSubtotal), styles: { halign: 'right', fontStyle: 'bold', fillColor: [230, 230, 230] } }]);

    autoTable(doc, {
      startY: manualY + 14,
      head: [['Description', 'Amount']],
      body: manualRows,
      styles: { fontSize: 8, cellPadding: 4 },
      headStyles: { fillColor: [40, 40, 40], textColor: 255, fontStyle: 'bold' },
      columnStyles: {
        0: { cellWidth: 600 },
        1: { halign: 'right', cellWidth: 100 },
      },
    });
  }

  // ── Total Payout ─────────────────────────────────────────────────────────
  const totalY = (doc as any).lastAutoTable.finalY + 24;
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('TOTAL PAYOUT', 600, totalY, { align: 'right' });
  doc.text(formatCurrency(totalPayout), 752, totalY, { align: 'right' });

  doc.save(filename);
  return filename;
};
