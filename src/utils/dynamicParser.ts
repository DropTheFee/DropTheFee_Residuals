import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { MerchantData, ProcessingStats, ProcessorStats, ParsedCSVResult } from '@/types';

interface ProcessorMapping {
  mid_column: string | null;
  merchant_name_column: string | null;
  volume_column: string | null;
  residual_column: string | null;
  status_column: string | null;
  rep_payout_column: string | null;
  dba_column: string | null;
  header_row_number: number;
}

export const parseFileWithMapping = async (
  file: File,
  processor: string,
  reportType: string | undefined,
  mapping: ProcessorMapping
): Promise<ParsedCSVResult> => {
  const isExcel = file.name.endsWith('.xlsx') || file.name.endsWith('.xls');

  let rows: any[] = [];

  if (isExcel) {
    rows = await parseExcelFile(file, mapping.header_row_number);
  } else {
    rows = await parseCSVFile(file, mapping.header_row_number);
  }

  const merchantData: MerchantData[] = [];
  const errors: string[] = [];

  rows.forEach((row, index) => {
    try {
      const mid = mapping.mid_column ? String(row[mapping.mid_column] || '').trim() : '';
      const merchantName = mapping.merchant_name_column ? String(row[mapping.merchant_name_column] || '').trim() : '';
      const dba = mapping.dba_column ? String(row[mapping.dba_column] || '').trim() : undefined;
      const volumeStr = mapping.volume_column ? String(row[mapping.volume_column] || '0') : '0';
      const residualStr = mapping.residual_column ? String(row[mapping.residual_column] || '0') : '0';
      const rawStatus = mapping.status_column ? String(row[mapping.status_column] || '').trim() : undefined;
      const status = rawStatus && rawStatus.toLowerCase() === 'open' ? 'active' : rawStatus;
      const repPayoutStr = mapping.rep_payout_column ? String(row[mapping.rep_payout_column] || '0') : undefined;

      if (!mid || !merchantName) {
        return;
      }

      const volume = parseNumber(volumeStr);
      const residual = parseNumber(residualStr);
      const repPayout = repPayoutStr ? parseNumber(repPayoutStr) : undefined;

      const residualPercentage = volume > 0 ? (residual / volume) * 100 : 0;
      const agencyIncome = repPayout !== undefined ? residual - repPayout : residual;

      const isActive = status ?
        !status.toLowerCase().includes('closed') &&
        !status.toLowerCase().includes('inactive') :
        true;

      const isClosed = status ?
        status.toLowerCase().includes('closed') :
        false;

      merchantData.push({
        merchantName,
        merchantId: mid,
        dba,
        mid,
        volume,
        residual,
        income: residual,
        residualPercentage,
        processor,
        reportType,
        reportDate: new Date().toISOString(),
        status,
        isActive,
        isClosed,
        repPayout,
        agencyIncome,
        originalRow: row,
      });
    } catch (error) {
      errors.push(`Row ${index + mapping.header_row_number + 2}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  });

  const stats = calculateStats(merchantData);
  const processorStats = calculateProcessorStats(merchantData);

  return {
    data: merchantData,
    stats,
    processorStats,
    errors,
    fileName: file.name,
    processor,
    reportType,
  };
};

const parseExcelFile = async (file: File, headerRow: number): Promise<any[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' }) as any[][];

        if (jsonData.length <= headerRow) {
          reject(new Error('File does not have enough rows'));
          return;
        }

        const headers = jsonData[headerRow];
        const dataRows = jsonData.slice(headerRow + 1);

        const objects = dataRows.map(row => {
          const obj: any = {};
          headers.forEach((header, index) => {
            obj[String(header)] = row[index];
          });
          return obj;
        });

        resolve(objects);
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsBinaryString(file);
  });
};

const parseCSVFile = async (file: File, headerRow: number): Promise<any[]> => {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: false,
      skipEmptyLines: true,
      complete: (results) => {
        try {
          const allRows = results.data as any[][];

          if (allRows.length <= headerRow) {
            reject(new Error('File does not have enough rows'));
            return;
          }

          const headers = allRows[headerRow];
          const dataRows = allRows.slice(headerRow + 1);

          const objects = dataRows.map(row => {
            const obj: any = {};
            headers.forEach((header, index) => {
              obj[String(header)] = row[index];
            });
            return obj;
          });

          resolve(objects);
        } catch (error) {
          reject(error);
        }
      },
      error: (error) => reject(error),
    });
  });
};

export const extractFileHeaders = async (file: File, headerRow: number = 0): Promise<string[]> => {
  const isExcel = file.name.endsWith('.xlsx') || file.name.endsWith('.xls');

  if (isExcel) {
    return extractExcelHeaders(file, headerRow);
  } else {
    return extractCSVHeaders(file, headerRow);
  }
};

const extractExcelHeaders = async (file: File, headerRow: number): Promise<string[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

        if (jsonData.length <= headerRow) {
          reject(new Error('File does not have enough rows'));
          return;
        }

        const headers = jsonData[headerRow].map(h => String(h).trim()).filter(h => h);
        resolve(headers);
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsBinaryString(file);
  });
};

const extractCSVHeaders = async (file: File, headerRow: number): Promise<string[]> => {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      preview: headerRow + 1,
      skipEmptyLines: true,
      complete: (results) => {
        try {
          const rows = results.data as any[][];
          if (rows.length <= headerRow) {
            reject(new Error('File does not have enough rows'));
            return;
          }
          const headers = rows[headerRow].map((h: any) => String(h).trim()).filter((h: string) => h);
          resolve(headers);
        } catch (error) {
          reject(error);
        }
      },
      error: (error) => reject(error),
    });
  });
};

const parseNumber = (value: string): number => {
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
  const processorMap = new Map<string, MerchantData[]>();

  data.forEach((merchant) => {
    const key = `${merchant.processor}-${merchant.reportType || 'default'}`;
    if (!processorMap.has(key)) {
      processorMap.set(key, []);
    }
    processorMap.get(key)!.push(merchant);
  });

  const stats: ProcessorStats[] = [];

  processorMap.forEach((merchants, key) => {
    const totalVolume = merchants.reduce((sum, m) => sum + m.volume, 0);
    const totalResidual = merchants.reduce((sum, m) => sum + m.residual, 0);
    const averageResidual = merchants.length > 0 ? totalResidual / merchants.length : 0;
    const averageResidualPercentage = totalVolume > 0 ? (totalResidual / totalVolume) * 100 : 0;

    stats.push({
      processor: merchants[0].processor,
      reportType: merchants[0].reportType,
      merchantCount: merchants.length,
      totalVolume,
      totalResidual,
      averageResidual,
      averageResidualPercentage,
    });
  });

  return stats;
};
