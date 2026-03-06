export interface ProcessorMapping {
  id: string;
  agency_id: string;
  processor_name: string;
  mid_column: string | null;
  merchant_name_column: string | null;
  volume_column: string | null;
  residual_column: string | null;
  status_column: string | null;
  rep_payout_column: string | null;
  dba_column: string | null;
  header_row_number: number;
  created_at: string;
  updated_at: string | null;
  created_by: string | null;
}

export interface ColumnMappingInput {
  mid_column: string;
  merchant_name_column: string;
  volume_column: string;
  residual_column: string;
  status_column?: string;
  rep_payout_column?: string;
  dba_column?: string;
}
