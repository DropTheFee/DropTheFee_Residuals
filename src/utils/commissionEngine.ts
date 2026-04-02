import { supabase } from '@/lib/supabase';

export interface CommissionTier {
  min_volume: number;
  max_volume: number | null;
  split_percentage: number;
}

export interface CommissionOverrideTier {
  min_volume: number;
  max_volume: number | null;
  override_percentage: number;
}

export interface MerchantCommissionData {
  merchant_id: string;
  mid: string | null;
  merchant_name: string;
  processor: string | null;
  sales_rep_id: string;
  venture_source: string | null;
  monthly_volume: number;
  gross_residual: number;
  expenses: number;
  net_residual: number;
}

export interface RepContract {
  rep_user_id: string;
  contract_type: string;
  override_from_rep_user_id: string | null;
}

const SR_SAE_TIERS = [
  { min_volume: 0, max_volume: 499999, split_percentage: 60 },
  { min_volume: 500000, max_volume: 999999, split_percentage: 70 },
  { min_volume: 1000000, max_volume: 1999999, split_percentage: 75 },
  { min_volume: 2000000, max_volume: 3499999, split_percentage: 80 },
  { min_volume: 3500000, max_volume: 4999999, split_percentage: 85 },
  { min_volume: 5000000, max_volume: null, split_percentage: 90 },
];

const JR_AE_TIERS = [
  { min_volume: 0, max_volume: 499999, split_percentage: 50 },
  { min_volume: 500000, max_volume: 999999, split_percentage: 60 },
  { min_volume: 1000000, max_volume: 1999999, split_percentage: 65 },
  { min_volume: 2000000, max_volume: 3499999, split_percentage: 70 },
  { min_volume: 3500000, max_volume: null, split_percentage: 75 },
];

const SAE_OVERRIDE_TIERS = [
  { min_volume: 0, max_volume: 499999, override_percentage: 30 },
  { min_volume: 500000, max_volume: 999999, override_percentage: 20 },
  { min_volume: 1000000, max_volume: 1999999, override_percentage: 15 },
  { min_volume: 2000000, max_volume: null, override_percentage: 10 },
];

function getTierPercentage(totalVolume: number, tiers: CommissionTier[]): number {
  for (const tier of tiers) {
    if (totalVolume >= tier.min_volume && (tier.max_volume === null || totalVolume <= tier.max_volume)) {
      return tier.split_percentage;
    }
  }
  return tiers[0].split_percentage;
}

function getOverrideTierPercentage(totalVolume: number, tiers: CommissionOverrideTier[]): number {
  for (const tier of tiers) {
    if (totalVolume >= tier.min_volume && (tier.max_volume === null || totalVolume <= tier.max_volume)) {
      return tier.override_percentage;
    }
  }
  return tiers[0].override_percentage;
}

function calculatePayout(netResidual: number, pct: number): number {
  if (netResidual < 0) return netResidual;
  return netResidual * (pct / 100);
}

export async function calculateCommissions(periodMonth: string, agencyId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const reportDate = new Date(periodMonth + 'T12:00:00');

    const { data: currentPeriod } = await supabase
      .from('commission_periods')
      .select('period_month')
      .eq('agency_id', agencyId)
      .eq('period_month', periodMonth)
      .maybeSingle();

    if (!currentPeriod) {
      await supabase
        .from('commission_periods')
        .insert({
          agency_id: agencyId,
          period_month: periodMonth,
          status: 'open',
        });
    }

    const { data: merchants, error: merchantsError } = await supabase
      .from('merchants')
      .select(`
        id,
        merchant_id,
        merchant_name,
        processor,
        sales_rep_id,
        venture_source,
        merchant_history!inner (
          monthly_volume,
          monthly_income,
          report_date
        ),
        merchant_expenses (
          expense_amount,
          report_date,
          matched
        )
      `)
      .eq('agency_id', agencyId);

    if (merchantsError) throw merchantsError;

    const { data: repContracts, error: contractsError } = await supabase
      .from('rep_contracts')
      .select('*');

    if (contractsError) throw contractsError;

    const merchantCommissionData: MerchantCommissionData[] = [];

    const historyMonth = periodMonth.substring(0, 7);

    for (const merchant of merchants || []) {
      if (!merchant.sales_rep_id) continue;

const history = (merchant as any).merchant_history?.find((h: any) => {
  return h.report_date?.substring(0, 7) === historyMonth;
});

      if (!history) continue;

      const grossResidual = parseFloat(history.monthly_income || 0);
      const expenses = (merchant as any).merchant_expenses
        ?.filter((e: any) => {
          if (!e.matched) return false;
          return e.report_date?.substring(0, 7) === historyMonth;
        })
        .reduce((sum: number, e: any) => sum + parseFloat(e.expense_amount || 0), 0) || 0;

      if (grossResidual === 0 && expenses === 0) continue;

      const netResidual = grossResidual - expenses;

      merchantCommissionData.push({
        merchant_id: merchant.id,
        mid: merchant.merchant_id,
        merchant_name: merchant.merchant_name,
        processor: merchant.processor,
        sales_rep_id: merchant.sales_rep_id,
        venture_source: merchant.venture_source,
        monthly_volume: parseFloat(history.monthly_volume || 0),
        gross_residual: grossResidual,
        expenses,
        net_residual: netResidual,
      });
    }

    const repMerchantMap = new Map<string, MerchantCommissionData[]>();
    for (const data of merchantCommissionData) {
      if (!repMerchantMap.has(data.sales_rep_id)) {
        repMerchantMap.set(data.sales_rep_id, []);
      }
      repMerchantMap.get(data.sales_rep_id)!.push(data);
    }

    const { error: deleteError } = await supabase
      .from('commission_results')
      .delete()
      .eq('agency_id', agencyId)
      .eq('period_month', periodMonth)
      .neq('source_type', 'manual');

    if (deleteError) {
      console.error('Delete error:', deleteError);
      throw deleteError;
    }

    const { data: remainingManual } = await supabase
      .from('commission_results')
      .select('id, source_type')
      .eq('agency_id', agencyId)
      .eq('period_month', periodMonth);

    const commissionResults: any[] = [];

    for (const [repId, repMerchants] of repMerchantMap.entries()) {
      const contracts = repContracts?.filter(c => c.user_id === repId) || [];
      const totalVolume = repMerchants.reduce((sum, m) => sum + m.monthly_volume, 0);

      for (const contract of contracts) {
        if (contract.contract_type === 'sr_sae') {
          const tierPct = getTierPercentage(totalVolume, SR_SAE_TIERS);

          for (const merchant of repMerchants) {
            const payout = calculatePayout(merchant.net_residual, tierPct);

            commissionResults.push({
              agency_id: agencyId,
              period_month: periodMonth,
              rep_user_id: repId,
              merchant_id: merchant.id,
              contract_type: 'sr_sae',
              source_type: 'merchant',
              merchant_name: merchant.merchant_name,
              processor: merchant.processor,
              volume: totalVolume,
              monthly_volume: merchant.monthly_volume,
              gross_residual: merchant.gross_residual,
              expenses: merchant.expenses,
              net_residual: merchant.net_residual,
              split_pct: tierPct,
              rep_payout: payout,
              override_from_user_id: null,
            });
          }
        } else if (contract.contract_type === 'jr_ae') {
          const tierPct = getTierPercentage(totalVolume, JR_AE_TIERS);

          for (const merchant of repMerchants) {
            const payout = calculatePayout(merchant.net_residual, tierPct);

            commissionResults.push({
              agency_id: agencyId,
              period_month: periodMonth,
              rep_user_id: repId,
              merchant_id: merchant.id,
              contract_type: 'jr_ae',
              source_type: 'merchant',
              merchant_name: merchant.merchant_name,
              processor: merchant.processor,
              volume: totalVolume,
              monthly_volume: merchant.monthly_volume,
              gross_residual: merchant.gross_residual,
              expenses: merchant.expenses,
              net_residual: merchant.net_residual,
              split_pct: tierPct,
              rep_payout: payout,
              override_from_user_id: null,
            });
          }
        } else if (contract.contract_type === 'katlyn_flat') {
          for (const merchant of repMerchants) {
            const payout = calculatePayout(merchant.net_residual, 50);

            commissionResults.push({
              agency_id: agencyId,
              period_month: periodMonth,
              rep_user_id: repId,
              merchant_id: merchant.id,
              contract_type: 'katlyn_flat',
              source_type: 'merchant',
              merchant_name: merchant.merchant_name,
              processor: merchant.processor,
              volume: totalVolume,
              monthly_volume: merchant.monthly_volume,
              gross_residual: merchant.gross_residual,
              expenses: merchant.expenses,
              net_residual: merchant.net_residual,
              split_pct: 50,
              rep_payout: payout,
              override_from_user_id: null,
            });
          }
        } else if (contract.contract_type === 'venture_apps') {
  for (const merchant of repMerchants) {
    let tierPct = merchant.venture_source === 'venture' ? 70 : 20;

            const payout = calculatePayout(merchant.net_residual, tierPct);

            commissionResults.push({
              agency_id: agencyId,
              period_month: periodMonth,
              rep_user_id: repId,
              merchant_id: merchant.id,
              contract_type: 'venture_apps',
              source_type: 'merchant',
              merchant_name: merchant.merchant_name,
              processor: merchant.processor,
              volume: totalVolume,
              monthly_volume: merchant.monthly_volume,
              gross_residual: merchant.gross_residual,
              expenses: merchant.expenses,
              net_residual: merchant.net_residual,
              split_pct: tierPct,
              rep_payout: payout,
              override_from_user_id: null,
            });
          }
        } else if (contract.contract_type === 'sae_override' && contract.override_target_user_id) {
          const jrAeMerchants = repMerchantMap.get(contract.override_target_user_id) || [];
          const jrAeTotalVolume = jrAeMerchants.reduce((sum, m) => sum + m.monthly_volume, 0);
          const overridePct = getOverrideTierPercentage(jrAeTotalVolume, SAE_OVERRIDE_TIERS);

          for (const merchant of jrAeMerchants) {
            const payout = calculatePayout(merchant.net_residual, overridePct);

            commissionResults.push({
              agency_id: agencyId,
              period_month: periodMonth,
              rep_user_id: repId,
              merchant_id: merchant.id,
              contract_type: 'sae_override',
              source_type: 'merchant',
              merchant_name: merchant.merchant_name,
              processor: merchant.processor,
              volume: jrAeTotalVolume,
              monthly_volume: merchant.monthly_volume,
              gross_residual: merchant.gross_residual,
              expenses: merchant.expenses,
              net_residual: merchant.net_residual,
              split_pct: overridePct,
              rep_payout: payout,
              override_from_user_id: contract.override_target_user_id,
            });
          }
        }
      }
    }

    // Query surj_entries — try both date formats since the SuRJ page stores
    // period_month as 'YYYY-MM-DDT12:00:00' while commissions uses 'YYYY-MM-DD'
    const surjPeriodDate = periodMonth.includes('T') ? periodMonth : periodMonth + 'T12:00:00';
    const surjPeriodDateAlt = periodMonth.substring(0, 10);

    const [{ data: surjEntriesPrimary }, { data: surjEntriesAlt }] = await Promise.all([
      supabase
        .from('surj_entries')
        .select(`
          rep_user_id,
          merchant_name,
          entry_type,
          amount,
          surj_service_id,
          surj_services (
            id,
            service_type,
            surj_clients (
              company_name
            )
          )
        `)
        .eq('agency_id', agencyId)
        .eq('period_month', surjPeriodDate),
      supabase
        .from('surj_entries')
        .select(`
          rep_user_id,
          merchant_name,
          entry_type,
          amount,
          surj_service_id,
          surj_services (
            id,
            service_type,
            surj_clients (
              company_name
            )
          )
        `)
        .eq('agency_id', agencyId)
        .eq('period_month', surjPeriodDateAlt),
    ]);

    // Deduplicate by combining both result sets (use a Set of stringified entries)
    const seenIds = new Set<string>();
    const surjEntries: any[] = [];
    for (const entry of [...(surjEntriesPrimary || []), ...(surjEntriesAlt || [])]) {
      const key = `${entry.rep_user_id}-${entry.surj_service_id}-${entry.entry_type}-${entry.amount}`;
      if (!seenIds.has(key)) {
        seenIds.add(key);
        surjEntries.push(entry);
      }
    }

    console.log('[commissionEngine] surjEntries count:', surjEntries.length,
      'entries:', surjEntries.map(e => ({
        merchant: e.merchant_name,
        type: e.entry_type,
        amount: e.amount,
        serviceId: e.surj_service_id,
      }))
    );

    // Group by surj_service_id. Each unique service ID is a separate line item.
    // Entries without surj_service_id fall back to merchant_name grouping.
    const serviceGroups = new Map<string, {
      rep_user_id: string;
      service_name: string;
      client_name: string;
      income: number;
      expenses: number;
    }>();

    for (const entry of surjEntries) {
      // Use surj_service_id as primary key; fall back to merchant_name for entries without one
      const serviceKey = entry.surj_service_id || `merchant:${entry.merchant_name}:${entry.rep_user_id}`;

      if (!serviceGroups.has(serviceKey)) {
        // surj_services may be a single object or an array depending on PostgREST FK resolution
        const svc = Array.isArray((entry as any).surj_services)
          ? (entry as any).surj_services[0]
          : (entry as any).surj_services;
        const serviceName = svc?.service_type || 'Unknown Service';
        const svcClient = Array.isArray(svc?.surj_clients) ? svc.surj_clients[0] : svc?.surj_clients;
        const clientName = svcClient?.company_name || entry.merchant_name;

        serviceGroups.set(serviceKey, {
          rep_user_id: entry.rep_user_id,
          service_name: serviceName,
          client_name: clientName,
          income: 0,
          expenses: 0,
        });
      }

      const group = serviceGroups.get(serviceKey)!;

      if (entry.entry_type === 'expense') {
        group.expenses += Math.abs(entry.amount);
      } else {
        group.income += entry.amount;
      }
    }

    console.log('[commissionEngine] surj serviceGroups:', Array.from(serviceGroups.entries()).map(([k, g]) => ({
      key: k, client: g.client_name, service: g.service_name, income: g.income, expenses: g.expenses,
    })));

    // Also look up service_type directly from surj_services as a fallback,
    // in case the nested join didn't resolve
    const allServiceIds = [...new Set(
      surjEntries.map((e: any) => e.surj_service_id).filter(Boolean)
    )];
    const serviceTypeMap = new Map<string, string>();
    if (allServiceIds.length > 0) {
      const { data: svcRows } = await supabase
        .from('surj_services')
        .select('id, service_type, surj_clients(company_name)')
        .in('id', allServiceIds);
      svcRows?.forEach((s: any) => {
        serviceTypeMap.set(s.id, s.service_type || 'Unknown Service');
        // Also patch group names if they were Unknown
        const group = serviceGroups.get(s.id);
        if (group) {
          if (group.service_name === 'Unknown Service' && s.service_type) {
            group.service_name = s.service_type;
          }
          const client = Array.isArray(s.surj_clients) ? s.surj_clients[0] : s.surj_clients;
          if (client?.company_name && group.client_name === group.client_name) {
            group.client_name = client.company_name;
          }
        }
      });
    }

    for (const [serviceId, group] of serviceGroups.entries()) {
      const netRevenue = group.income - group.expenses;
      const commission = netRevenue > 0 ? netRevenue * 0.5 : 0;
      const merchantLabel = `${group.client_name} - ${group.service_name}`;

      console.log('[commissionEngine] surj row:', { serviceId, merchantLabel, income: group.income, expenses: group.expenses, netRevenue, commission });

      commissionResults.push({
        agency_id: agencyId,
        period_month: periodMonth,
        rep_user_id: group.rep_user_id,
        merchant_id: null,
        contract_type: 'surj',
        source_type: 'surj',
        merchant_name: merchantLabel,
        processor: null,
        volume: 0,
        monthly_volume: 0,
        gross_residual: group.income,
        expenses: group.expenses,
        net_residual: netRevenue,
        split_pct: 50,
        rep_payout: commission,
        override_from_user_id: null,
      });
    }

    const { data: nabRecords } = await supabase
      .from('nab_records')
      .select('rep_user_id, merchant_name, amount')
      .eq('agency_id', agencyId)
      .eq('period_month', periodMonth);

    const nabByRep = new Map<string, number>();
    for (const nab of nabRecords || []) {
      const current = nabByRep.get(nab.rep_user_id) || 0;
      nabByRep.set(nab.rep_user_id, current + parseFloat(nab.amount));
    }

    for (const [repId, totalAmount] of nabByRep.entries()) {
      commissionResults.push({
        agency_id: agencyId,
        period_month: periodMonth,
        rep_user_id: repId,
        merchant_id: null,
        contract_type: 'nab',
        source_type: 'nab',
        merchant_name: 'EPI New Account Bonus',
        processor: null,
        volume: 0,
        monthly_volume: 0,
        gross_residual: 0,
        expenses: 0,
        net_residual: 0,
        split_pct: 0,
        rep_payout: totalAmount,
        override_from_user_id: null,
      });
    }

    const { data: manualExpenses } = await supabase
      .from('expenses')
      .select('user_id, description, amount')
      .eq('agency_id', agencyId)
      .eq('period_month', periodMonth.substring(0, 10))
      .eq('expense_type', 'manual');

    for (const expense of manualExpenses || []) {
      commissionResults.push({
        agency_id: agencyId,
        period_month: periodMonth,
        rep_user_id: expense.user_id,
        merchant_id: null,
        contract_type: 'expense',
        source_type: 'expense',
        merchant_name: expense.description,
        processor: null,
        volume: 0,
        monthly_volume: 0,
        gross_residual: 0,
        expenses: expense.amount,
        net_residual: -expense.amount,
        split_pct: 0,
        rep_payout: -expense.amount,
        override_from_user_id: null,
      });
    }

    const repTotals = new Map<string, number>();
    const repContractsMap = new Map<string, string>();
    for (const result of commissionResults) {
      const current = repTotals.get(result.rep_user_id) || 0;
      repTotals.set(result.rep_user_id, current + result.rep_payout);

      if (result.contract_type && !['surj', 'nab', 'subscription', 'setup_full', 'setup_split', 'expense', 'manual_expense'].includes(result.contract_type)) {
        repContractsMap.set(result.rep_user_id, result.contract_type);
      }
    }

    const jordanId = repContracts?.find(c => c.contract_type === 'sae_override')?.user_id;

    console.log('[commissionEngine] repTotals:', Object.fromEntries(repTotals));
    console.log('[commissionEngine] repContractsMap:', Object.fromEntries(repContractsMap));
    console.log('[commissionEngine] jordanId:', jordanId);

    for (const [repId, total] of repTotals.entries()) {
      const contractType = repContractsMap.get(repId);
      if (total < 0 && contractType === 'jr_ae' && jordanId) {
        commissionResults.push({
          agency_id: agencyId,
          period_month: periodMonth,
          rep_user_id: jordanId,
          merchant_id: null,
          contract_type: 'jr_ae',
          source_type: 'expense',
          merchant_name: `Jr AE Negative Balance Rollup`,
          processor: null,
          volume: 0,
          monthly_volume: 0,
          gross_residual: 0,
          expenses: Math.abs(total),
          net_residual: total,
          split_pct: 0,
          rep_payout: total,
          override_from_user_id: repId,
        });
      }
    }

    if (commissionResults.length > 0) {
      const { error: insertError } = await supabase
        .from('commission_results')
        .insert(commissionResults);

      if (insertError) {
        console.error('Insert error:', JSON.stringify(insertError, null, 2));
        throw insertError;
      }
    }

    await supabase
      .from('commission_periods')
      .upsert({
        agency_id: agencyId,
        period_month: periodMonth,
        status: 'calculated',
      }, {
        onConflict: 'agency_id,period_month'
      });

    return { success: true };
  } catch (error) {
    console.error('Commission calculation error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}
