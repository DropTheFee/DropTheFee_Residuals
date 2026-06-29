// Shared period-list logic for the Upload and Commissions pages.
//
// A "period" is always a month, stored as a 'YYYY-MM-01' string. The dropdown is
// driven by a *date range* (not by whichever rows happen to exist in
// commission_periods), so the current month — and a few months either side — is
// always selectable even before any data has been uploaded for it.
//
// commission_periods remains the source of truth for STATUS. A generated month
// that has no row defaults to 'open'.

export interface PeriodOption {
  id: string;
  period_month: string; // 'YYYY-MM-01'
  status: string; // 'open' | 'calculated' | 'finalized'
}

interface DbPeriod {
  id?: string;
  period_month: string;
  status: string;
}

interface BuildOptions {
  yearsBack?: number;
  monthsForward?: number;
  now?: Date;
}

// 'YYYY-MM-01' for the given date's month (defaults to today).
export function currentPeriodMonth(now: Date = new Date()): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
}

// Build the period dropdown list: every month from `yearsBack` years ago through
// `monthsForward` months ahead, newest first, with status merged from the DB rows.
// Any DB rows older than the window are still included so nothing ever disappears.
export function buildPeriodOptions(
  dbPeriods: DbPeriod[],
  { yearsBack = 3, monthsForward = 6, now = new Date() }: BuildOptions = {}
): PeriodOption[] {
  const byMonth = new Map<string, DbPeriod>();
  for (const p of dbPeriods) byMonth.set(p.period_month, p);

  const seen = new Set<string>();
  const result: PeriodOption[] = [];

  const totalMonthsBack = yearsBack * 12;
  for (let i = monthsForward; i >= -totalMonthsBack; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const periodMonth = currentPeriodMonth(d);
    if (seen.has(periodMonth)) continue;
    seen.add(periodMonth);

    const dbRow = byMonth.get(periodMonth);
    result.push({
      id: dbRow?.id ?? periodMonth,
      period_month: periodMonth,
      status: dbRow?.status ?? 'open',
    });
  }

  // Keep any DB rows that fall outside the generated window.
  for (const p of dbPeriods) {
    if (seen.has(p.period_month)) continue;
    seen.add(p.period_month);
    result.push({
      id: p.id ?? p.period_month,
      period_month: p.period_month,
      status: p.status,
    });
  }

  result.sort((a, b) => b.period_month.localeCompare(a.period_month));
  return result;
}
