import * as XLSX from 'xlsx';
import { MerchantData, ProcessingStats, ProcessorStats, ParsedCSVResult } from '@/types';

interface PaysafeConfig {
  midColumn: number;
  merchantNameColumn: number;
  volumeColumns: number[];
  residualColumn: number;
  agentFilterColumn: number;
  openDateColumn: number;
  closeDateColumn: number | null;
  skipRows: number;
}

const PAYSAFE_CONFIG: PaysafeConfig = {
  midColumn: 1,
  merchantNameColumn: 2,
  volumeColumns: [14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24],
  residualColumn: 261,
  agentFilterColumn: 9,
  openDateColumn: 8,
  closeDateColumn: null,
  skipRows: 2,
};

const PCS_CONFIG: PaysafeConfig = {
  midColumn: 1,
  merchantNameColumn: 2,
  volumeColumns: [18, 19, 20, 21, 22, 23],
  residualColumn: 164,
  agentFilterColumn: 11,
  openDateColumn: 10,
  closeDateColumn: null,
  skipRows: 2,
};

export const parsePaysafeFile = async (
  file: File,
  processor: 'Paysafe' | 'PCS',
  agentFilter?: string
): Promise<ParsedCSVResult> => {
  const config = processor === 'Paysafe' ? PAYSAFE_CONFIG : PCS_CONFIG;

  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: null }) as any[][];

        if (jsonData.length <= config.skipRows) {
          reject(new Error('File does not have enough rows'));
          return;
        }

        const row0 = jsonData[0] || [];
        const row1 = jsonData[1] || [];

        let residualColumn = config.residualColumn;
        for (let i = 0; i < row1.length; i++) {
          if (String(row1[i]).trim() === 'Residual') {
            residualColumn = i;
            break;
          }
        }

        let volumeColumns = config.volumeColumns;
        for (let i = 0; i < row1.length; i++) {
          if (String(row1[i]).trim() === 'SalesVolume') {
            const detectedColumns: number[] = [];
            let j = i + 1;
    while (j < row1.length) {
      const cellVal = row1[j];
      // Stop when we hit the next non-empty header
      if (cellVal !== null && cellVal !== undefined && String(cellVal).trim() !== '') {
        break;
      }
      detectedColumns.push(j);
      j++;
    }
    if (detectedColumns.length > 0) {
      volumeColumns = detectedColumns;
    }
    break;
  }
}

        const merchantData: MerchantData[] = [];
        const errors: string[] = [];

        const dataRows = jsonData.slice(config.skipRows);

        dataRows.forEach((row, index) => {
          try {
            const mid = row[config.midColumn] ? String(row[config.midColumn]).trim() : '';
            const merchantName = row[config.merchantNameColumn] ? String(row[config.merchantNameColumn]).trim() : '';
            const agentNumber = row[config.agentFilterColumn] ? String(row[config.agentFilterColumn]).trim() : '';
            const openDate = row[config.openDateColumn] ? row[config.openDateColumn] : null;
            const closeDate = config.closeDateColumn !== null && row[config.closeDateColumn]
              ? row[config.closeDateColumn]
              : null;

            if (!mid || !merchantName) {
              return;
            }

            if (agentFilter && agentNumber !== agentFilter) {
              return;
            }

            let volume = 0;
            for (const colIndex of volumeColumns) {
              const value = row[colIndex];
              if (value !== null && value !== undefined && value !== '') {
                const num = parseFloat(String(value).replace(/[$,\s]/g, ''));
                if (!isNaN(num)) {
                  volume += num;
                }
              }
            }

            const residualValue = row[residualColumn];
            const residual = parseNumber(residualValue);

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
              processor,
              reportType: processor,
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
                agentNumber,
                openDate,
                closeDate,
              },
            });
          } catch (error) {
            errors.push(`Row ${index + config.skipRows + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
        });

        const stats = calculateStats(merchantData);
        const processorStats = calculateProcessorStats(merchantData, processor);

        resolve({
          data: merchantData,
          stats,
          processorStats,
          errors,
          fileName: file.name,
          processor,
          reportType: processor,
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

const calculateProcessorStats = (data: MerchantData[], processor: string): ProcessorStats[] => {
  const totalVolume = data.reduce((sum, m) => sum + m.volume, 0);
  const totalResidual = data.reduce((sum, m) => sum + m.residual, 0);
  const averageResidual = data.length > 0 ? totalResidual / data.length : 0;
  const averageResidualPercentage = totalVolume > 0 ? (totalResidual / totalVolume) * 100 : 0;

  return [{
    processor,
    reportType: processor,
    merchantCount: data.length,
    totalVolume,
    totalResidual,
    averageResidual,
    averageResidualPercentage,
  }];
};
