// Single source of truth for the rep Commission Statement's headline numbers.
// Used by the monthly statement detail and by Payout History so both show the
// same figures for a period.

export interface StatementRow {
  source_type: string;
  override_from_user_id: string | null;
  monthly_volume: number;
  split_pct: number;
  rep_payout: number;
}

export interface StatementSections<T extends StatementRow> {
  merchant: T[];
  saeOverride: T[];
  nab: T[];
  surj: T[];
  manualExpense: T[];
}

export interface StatementTotals {
  totalVolume: number;
  tierPercentage: number;
  merchantPayout: number;
  saeOverridePayout: number;
  nabPayout: number;
  surjPayout: number;
  manualExpensePayout: number;
  totalPayout: number;
}

// Section filters per spec
export function splitStatementSections<T extends StatementRow>(results: T[]): StatementSections<T> {
  return {
    merchant:      results.filter(r => r.source_type === 'merchant' && !r.override_from_user_id),
    saeOverride:   results.filter(r => r.source_type === 'expense'  &&  r.override_from_user_id),
    nab:           results.filter(r => r.source_type === 'nab'),
    surj:          results.filter(r => r.source_type === 'surj'),
    manualExpense: results.filter(r => r.source_type === 'expense'  && !r.override_from_user_id),
  };
}

const sumPayout = (rows: StatementRow[]) => rows.reduce((sum, r) => sum + r.rep_payout, 0);

export function computeStatementTotals(results: StatementRow[]): StatementTotals {
  const sections = splitStatementSections(results);

  const merchantPayout      = sumPayout(sections.merchant);
  const saeOverridePayout   = sumPayout(sections.saeOverride);
  const nabPayout           = sumPayout(sections.nab);
  const surjPayout          = sumPayout(sections.surj);
  const manualExpensePayout = sumPayout(sections.manualExpense);

  return {
    totalVolume: sections.merchant.reduce((sum, r) => sum + r.monthly_volume, 0),
    tierPercentage: sections.merchant.length > 0 ? sections.merchant[0].split_pct : 0,
    merchantPayout,
    saeOverridePayout,
    nabPayout,
    surjPayout,
    manualExpensePayout,
    // Total sums only the five defined sections
    totalPayout: merchantPayout + saeOverridePayout + nabPayout + surjPayout + manualExpensePayout,
  };
}
