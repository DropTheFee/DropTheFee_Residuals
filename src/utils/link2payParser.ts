import * as XLSX from 'xlsx';
import { MerchantData, ProcessingStats, ProcessorStats, ParsedCSVResult } from '@/types';

interface Link2PayConfig {
  sheetName: string;
  midColumn: number;
  merchantNameColumn: number;
  volumeColumn: number;
  residualColumn: number;
  closeDateColumn: number;
  headerRow: number;
  dataStartRow: number;
}

const LINK2PAY_CONFIG: Link2PayConfig = {
  sheetName: 'Summary',
  midColumn: 0,
  merchantNameColumn: 1,
  volumeColumn: 3,
  residualColumn: 9,
  closeDateColumn: 7,
  headerRow: 4,
  dataStartRow: 5,
};

export const parseLink2PayFile = async (
  file: File
): Promise<ParsedCSVResult> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });

        if (!workbook.SheetNames.includes(LINK2PAY_CONFIG.sheetName)) {
          reject(new Error(`Sheet "${LINK2PAY_CONFIG.sheetName}" not found in file`));
          return;
        }

        const worksheet = workbook.Sheets[LINK2PAY_CONFIG.sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: null }) as any[][];

        if (jsonData.length <= LINK2PAY_CONFIG.dataStartRow) {
          reject(new Error('File does not have enough rows'));
          return;
        }

        const merchantData: MerchantData[] = [];
        const errors: string[] = [];

        const dataRows = jsonData.slice(LINK2PAY_CONFIG.dataStartRow);

        dataRows.forEach((row, index) => {
          try {
            const mid = row[LINK2PAY_CONFIG.midColumn] ? String(row[LINK2PAY_CONFIG.midColumn]).trim() : '';
            const merchantName = row[LINK2PAY_CONFIG.merchantNameColumn] ? String(row[LINK2PAY_CONFIG.merchantNameColumn]).trim() : '';
            const closeDate = row[LINK2PAY_CONFIG.closeDateColumn];

            if (!mid.startsWith('51')) {
              return;
            }

            if (!merchantName) {
              return;
            }

            const volumeValue = row[LINK2PAY_CONFIG.volumeColumn];
            const volume = parseNumber(volumeValue);

            const residualValue = row[LINK2PAY_CONFIG.residualColumn];
            let residual = parseNumber(residualValue);

            const residualPercentage = volume > 0 ? (residual / volume) * 100 : 0;

            const normalizedStatus = closeDate ? 'closed' : 'active';
            const isActive = normalizedStatus === 'active';

            merchantData.push({
              merchantName,
              merchantId: mid,
              dba: merchantName,
              mid,
              volume,
              residual,
              income: residual,
              residualPercentage,
              processor: 'Link2Pay',
              reportType: 'Link2Pay',
              reportDate: new Date().toISOString(),
              status: normalizedStatus,
              isActive: isActive,
              isClosed: !isActive,
              agencyIncome: residual,
              originalRow: {
                mid,
                merchantName,
                volume,
                residual,
                closeDate,
              },
            });
          } catch (error) {
            errors.push(`Row ${index + LINK2PAY_CONFIG.dataStartRow + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
        });

        const stats = calculateStats(merchantData);
        const processorStats = calculateProcessorStats(merchantData);

        resolve({
          data: merchantData,
          stats,
          processorStats,
          errors,
          fileName: file.name,
          processor: 'Link2Pay',
          reportType: 'Link2Pay',
        });
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsBinaryString(file);
  });
};

const parseNumber = (value: any): number => {
  if (value === null || value === undefined || value === '') return 0;
  if (typeof value === 'number') return value;
  const cleaned = String(value).replace(/[$,\s]/g, '');
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
};

const calculateStats = (data: MerchantData[]): ProcessingStats => {
  let totalVolume = 0;
  let totalResidual = 0;
  let liveVolume = 0;
  let liveResidual = 0;
  let liveMerchantCount = 0;
  let inactiveVolume = 0;
  let inactiveResidual = 0;
  let inactiveMerchantCount = 0;

  data.forEach((merchant) => {
    totalVolume += merchant.volume;
    totalResidual += merchant.residual;

    if (merchant.isActive) {
      liveVolume += merchant.volume;
      liveResidual += merchant.residual;
      liveMerchantCount++;
    } else {
      inactiveVolume += merchant.volume;
      inactiveResidual += merchant.residual;
      inactiveMerchantCount++;
    }
  });

  const averageResidual = data.length > 0 ? totalResidual / data.length : 0;
  const averageResidualPercentage = totalVolume > 0 ? (totalResidual / totalVolume) * 100 : 0;

  return {
    totalVolume,
    totalResidual,
    averageResidual,
    averageResidualPercentage,
    merchantCount: data.length,
    liveVolume,
    liveResidual,
    liveMerchantCount,
    inactiveVolume,
    inactiveResidual,
    inactiveMerchantCount,
    excludedCount: 0,
    zeroAmountExcluded: 0,
  };
};

const calculateProcessorStats = (data: MerchantData[]): ProcessorStats[] => {
  const totalVolume = data.reduce((sum, m) => sum + m.volume, 0);
  const totalResidual = data.reduce((sum, m) => sum + m.residual, 0);
  const averageResidual = data.length > 0 ? totalResidual / data.length : 0;
  const averageResidualPercentage = totalVolume > 0 ? (totalResidual / totalVolume) * 100 : 0;

  return [{
    processor: 'Link2Pay',
    reportType: 'Link2Pay',
    merchantCount: data.length,
    totalVolume,
    totalResidual,
    averageResidual,
    averageResidualPercentage,
  }];
};
