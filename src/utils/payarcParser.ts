import Papa from 'papaparse';
import { MerchantData, ProcessingStats, ProcessorStats, ParsedCSVResult } from '@/types';

export const parsePayarcFile = async (
  file: File
): Promise<ParsedCSVResult> => {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        try {
          const merchantData: MerchantData[] = [];
          const errors: string[] = [];

          results.data.forEach((row: any, index: number) => {
            try {
              const mid = row['MID'] ? String(row['MID']).trim() : '';
              const merchantName = row['Merchant'] ? String(row['Merchant']).trim() : '';

              if (!mid || !merchantName) {
                return;
              }

              const volumeValue = row['Captured sales'];
              const volume = parseNumber(volumeValue);

              const residualValue = row['Agent income'];
              let residual = parseNumber(residualValue);

              if (residual < 0) {
                residual = 0;
              }

              const residualPercentage = volume > 0 ? (residual / volume) * 100 : 0;

              const agentIncome = parseNumber(row['Agent income']);
              const normalizedStatus = agentIncome < 0 ? 'closed' : 'active';
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
                processor: 'Payarc',
                reportType: 'Payarc',
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
                  agentIncome,
                },
              });
            } catch (error) {
              errors.push(`Row ${index + 2}: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
            processor: 'Payarc',
            reportType: 'Payarc',
          });
        } catch (error) {
          reject(error);
        }
      },
      error: (error) => {
        reject(new Error(`Failed to parse CSV: ${error.message}`));
      },
    });
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
    processor: 'Payarc',
    reportType: 'Payarc',
    merchantCount: data.length,
    totalVolume,
    totalResidual,
    averageResidual,
    averageResidualPercentage,
  }];
};
