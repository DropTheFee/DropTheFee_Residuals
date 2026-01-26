import { MerchantData } from '@/types';

// Simple CSV parser that returns merchant data array
export function parseCSV(csvText: string, processor: string): MerchantData[] {
  const lines = csvText.split('\n').filter(line => line.trim());
  if (lines.length < 2) return [];

  const headers = lines[0].split(',').map(h => h.trim());
  const data: MerchantData[] = [];

  // Simple column detection
  const merchantNameIdx = headers.findIndex(h => 
    h.toLowerCase().includes('merchant') || h.toLowerCase().includes('name') || h.toLowerCase().includes('dba')
  );
  const merchantIdIdx = headers.findIndex(h => 
    h.toLowerCase().includes('mid') || h.toLowerCase().includes('merchant id') || h.toLowerCase().includes('account')
  );
  const volumeIdx = headers.findIndex(h => 
    h.toLowerCase().includes('volume') || h.toLowerCase().includes('sales')
  );
  const residualIdx = headers.findIndex(h => 
    h.toLowerCase().includes('residual') || h.toLowerCase().includes('commission') || h.toLowerCase().includes('income')
  );

  if (merchantNameIdx === -1 || merchantIdIdx === -1 || volumeIdx === -1 || residualIdx === -1) {
    console.warn('Could not detect all required columns');
    return [];
  }

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim());
    
    const merchantName = values[merchantNameIdx] || '';
    const merchantId = values[merchantIdIdx] || '';
    const volumeStr = values[volumeIdx]?.replace(/[^0-9.-]/g, '') || '0';
    const residualStr = values[residualIdx]?.replace(/[^0-9.-]/g, '') || '0';

    if (!merchantName || !merchantId) continue;

    const volume = parseFloat(volumeStr) || 0;
    const income = parseFloat(residualStr) || 0;

    if (volume === 0 && income === 0) continue;

    data.push({
      merchantName,
      merchantId,
      mid: merchantId,
      volume,
      residual: income,
      income,
      residualPercentage: volume > 0 ? (income / volume) * 100 : 0,
      processor,
      reportDate: new Date().toISOString(),
      status: 'active',
      isActive: true,
      repPayout: income * 0.6, // Default 60% split
      agencyIncome: income * 0.4,
      originalRow: {}
    });
  }

  return data;
}